import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, createStripeClient, type StripeEnv } from "../_shared/stripe.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

// Upsell catalog. Server is the source of truth — never trust client amounts.
// `tier` (when present) upgrades the order's delivery_tier. rush_24h beats
// express_48h; we never downgrade.
const UPSELL_PRICES: Record<
  string,
  { amount: number; flagColumn: string | null; tier?: "rush_24h" | "express_48h" }
> = {
  extra_verse: { amount: 1999, flagColumn: "has_3rd_verse" },
  rush_delivery: { amount: 2999, flagColumn: "is_rush", tier: "rush_24h" },
  unlimited_edits: { amount: 3299, flagColumn: "has_unlimited_edits" },
  // Downsell after declining the 24h rush — 48h delivery for $19.99.
  delivery_48h: { amount: 1999, flagColumn: "is_rush", tier: "express_48h" },
};

const TIER_RANK: Record<string, number> = {
  standard: 0,
  express_48h: 1,
  rush_24h: 2,
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { orderId, upsellType, environment, sessionId } = await req.json();
    if (!orderId || !upsellType) return json({ success: false, reason: "missing_params" }, 400);

    const upsell = UPSELL_PRICES[upsellType];
    if (!upsell) return json({ success: false, reason: "unknown_upsell" }, 400);

    // ---- AuthZ: prove caller owns this order ----
    // Accept EITHER (a) an authenticated user matching the order, OR
    // (b) the Stripe checkout session_id the buyer received on the return URL.
    // The session_id is an unguessable, single-purchase-scoped token issued by Stripe.
    const authHeader = req.headers.get("Authorization");
    let authedUserId: string | null = null;
    let authedEmail: string | null = null;
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      const { data: userData } = await supabase.auth.getUser(token);
      authedUserId = userData?.user?.id ?? null;
      authedEmail = userData?.user?.email?.toLowerCase() ?? null;
    }

    const { data: order, error } = await supabase
      .from("orders")
      .select(
        "user_id, buyer_email, status, stripe_customer_id, stripe_payment_method_id, stripe_checkout_session_id, stripe_payment_intent_id, product_config, delivery_tier, promo_code_id, amount_paid_cents",
      )
      .eq("id", orderId)
      .single();

    if (error || !order) return json({ success: false, reason: "order_not_found" }, 404);

    // ---- T3ST2 special case: 99% off any upsell taken ----
    let chargeAmount = upsell.amount;
    if (order.promo_code_id) {
      const { data: promo } = await supabase
        .from("promo_codes")
        .select("code")
        .eq("id", order.promo_code_id)
        .maybeSingle();
      if (promo?.code?.toUpperCase() === "T3ST2") {
        // 99% off, with a 50¢ Stripe minimum.
        chargeAmount = Math.max(50, Math.round(upsell.amount * 0.01));
      }
    }

    const ownsViaAuth =
      (authedUserId && order.user_id && order.user_id === authedUserId) ||
      (authedEmail && order.buyer_email && order.buyer_email.toLowerCase() === authedEmail);
    // Accept either the legacy checkout session id OR the current PaymentIntent id
    // as buyer proof — the client now stores the PI id as checkoutSessionId.
    const ownsViaSession =
      typeof sessionId === "string" &&
      sessionId.length > 0 &&
      (order.stripe_checkout_session_id === sessionId ||
        order.stripe_payment_intent_id === sessionId);

    if (!ownsViaAuth && !ownsViaSession) {
      return json({ success: false, reason: "unauthorized" }, 401);
    }

    // Defence-in-depth: only allow charges while the order is in the upsell window.
    if (order.status !== "awaiting_upsells") {
      return json({ success: false, reason: "not_in_upsell_window" }, 409);
    }

    if (!order.stripe_customer_id || !order.stripe_payment_method_id) {
      return json({ success: false, reason: "no_saved_card" }, 400);
    }

    // Already charged for this upsell? Idempotency.
    const productConfig = (order.product_config as Record<string, boolean>) || {};
    if (productConfig[upsellType]) {
      return json({ success: true, alreadyCharged: true });
    }

    const env = (environment || "sandbox") as StripeEnv;
    const stripe = createStripeClient(env);

    try {
      const pi = await stripe.paymentIntents.create({
        amount: chargeAmount,
        currency: "usd",
        customer: order.stripe_customer_id,
        payment_method: order.stripe_payment_method_id,
        off_session: true,
        confirm: true,
        metadata: { orderId, upsellType, originalAmount: String(upsell.amount) },
        description: `PawPrint Song upsell: ${upsellType}`,
      });

      // Webhook will update the order row when payment_intent.succeeded fires,
      // but we also update optimistically so the next page sees it immediately.
      if (pi.status === "succeeded") {
        productConfig[upsellType] = true;
        const chargedAmount = pi.amount_received ?? pi.amount ?? chargeAmount;
        const updates: Record<string, unknown> = {
          product_config: productConfig,
          // Increment optimistically so /processing + the order-confirmation
          // email show the real total even if the Stripe webhook is delayed.
          amount_paid_cents: (order.amount_paid_cents ?? 0) + chargedAmount,
        };
        if (upsell.flagColumn) updates[upsell.flagColumn] = true;

        // Upgrade delivery_tier only if the new tier outranks the current one.
        if (upsell.tier) {
          const currentRank = TIER_RANK[(order.delivery_tier as string) ?? "standard"] ?? 0;
          const newRank = TIER_RANK[upsell.tier] ?? 0;
          if (newRank > currentRank) updates.delivery_tier = upsell.tier;
        }

        await supabase.from("orders").update(updates).eq("id", orderId);

        // Log success so admins / debug tooling can see the upsell landed.
        await supabase.from("job_events").insert({
          order_id: orderId,
          event_type: "upsell_charged",
          payload: {
            upsellType,
            paymentIntentId: pi.id,
            amount: chargedAmount,
            source: "charge-upsell",
          },
        });

        return json({ success: true });
      }

      // Anything other than succeeded (e.g. requires_action / 3DS challenge) we treat as a silent skip.
      console.log("Upsell PI did not succeed silently:", pi.status, "for order", orderId);
      await supabase.from("job_events").insert({
        order_id: orderId,
        event_type: "upsell_skipped",
        payload: { upsellType, reason: pi.status, paymentIntentId: pi.id },
      });
      return json({ success: false, reason: pi.status });
    } catch (stripeError: any) {
      // Card declined, insufficient funds, fraud block, 3DS required — all silent skip.
      console.log(
        "Upsell charge failed (silent skip):",
        upsellType,
        stripeError.code,
        stripeError.decline_code,
      );
      await supabase.from("job_events").insert({
        order_id: orderId,
        event_type: "upsell_skipped",
        payload: {
          upsellType,
          code: stripeError.code,
          declineCode: stripeError.decline_code,
          message: stripeError.message,
        },
      });
      return json({ success: false, reason: stripeError.code || "charge_failed" });
    }
  } catch (e: any) {
    console.error("charge-upsell error:", e);
    return json({ success: false, reason: "internal_error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
