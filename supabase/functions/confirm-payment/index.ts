// Server-side payment confirmation fallback.
//
// Apple/Google Pay + Link confirm the PaymentIntent client-side and then
// land the buyer on /checkout/return. The webhook (`payments-webhook`) is
// supposed to mark the order as paid, but we've seen cases where the
// webhook delivery is delayed or fails (Stripe registration issues,
// signing-secret rotations, etc.). The return page polls the DB and would
// otherwise hang.
//
// This function:
//   1. Looks up the PaymentIntent on Stripe directly (source of truth).
//   2. If it's `succeeded`, runs the same DB updates the webhook would.
//   3. Returns the resulting order state to the client.
//
// It is fully idempotent — safe to call multiple times.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, createStripeClient, type StripeEnv } from "../_shared/stripe.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { paymentIntentId, sessionId, environment } = body || {};
    const env = (environment === "live" ? "live" : "sandbox") as StripeEnv;
    const stripe = createStripeClient(env);

    // Resolve to a PaymentIntent — accept either a PI id directly OR a
    // Checkout Session id (the new embedded-checkout flow returns this).
    let pi: any = null;
    let resolvedSessionId: string | null = sessionId || null;

    if (paymentIntentId && typeof paymentIntentId === "string") {
      pi = await stripe.paymentIntents.retrieve(paymentIntentId, {
        expand: ["latest_charge"],
      });
    } else if (sessionId && typeof sessionId === "string") {
      const session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ["payment_intent", "payment_intent.latest_charge"],
      });
      resolvedSessionId = session.id;
      const piRef = session.payment_intent;
      if (typeof piRef === "string") {
        pi = await stripe.paymentIntents.retrieve(piRef, {
          expand: ["latest_charge"],
        });
      } else if (piRef && typeof piRef === "object") {
        pi = piRef;
      }
      // Pull orderId from session metadata if PI lacks it
      if (pi && !pi.metadata?.orderId && session.metadata?.orderId) {
        pi.metadata = { ...(pi.metadata || {}), orderId: session.metadata.orderId, kind: "base_order" };
      }
    } else {
      return json({ error: "Missing paymentIntentId or sessionId" }, 400);
    }

    if (!pi) {
      return json({ error: "Could not resolve payment intent" }, 400);
    }

    const orderId = pi.metadata?.orderId;
    const kind = pi.metadata?.kind;
    const upsellType = pi.metadata?.upsellType;

    if (!orderId) {
      return json({ error: "PaymentIntent has no orderId metadata", status: pi.status }, 400);
    }

    if (pi.status !== "succeeded") {
      return json({
        ok: false,
        paid: false,
        status: pi.status,
        orderId,
      });
    }

    // ---- Base order: same logic as payments-webhook handlePaymentSucceeded ----
    if (kind === "base_order" || (!upsellType && !kind)) {
      // Read current state first so we don't clobber a webhook that already ran.
      const { data: existing } = await supabase
        .from("orders")
        .select("id, payment_status, status, buyer_email, buyer_name, confirmation_email_sent_at, promo_code_id")
        .eq("id", orderId)
        .maybeSingle();

      if (!existing) {
        return json({ error: "Order not found", orderId }, 404);
      }

      // Detect T3ST end-to-end test orders so we can fast-track straight to
      // upsells_complete (upsells are pre-added by apply-promo-code).
      let isT3st = false;
      if (existing.promo_code_id) {
        const { data: promo } = await supabase
          .from("promo_codes")
          .select("code")
          .eq("id", existing.promo_code_id)
          .maybeSingle();
        isT3st = (promo?.code || "").toUpperCase() === "T3ST";
      }

      // If the buyer never typed their email into the form (e.g. tapped Apple
      // Pay too fast and the debounced save didn't fire), pull the real email
      // from Stripe's PI / latest charge billing details so the confirmation
      // email + dashboard lookup work.
      const placeholder = typeof existing.buyer_email === "string"
        && /^pending\+.*@ribbonsong\.com$/i.test(existing.buyer_email);
      let realEmail: string | null = null;
      let realName: string | null = null;
      if (placeholder) {
        const charge = (pi as any).latest_charge && typeof (pi as any).latest_charge === "object"
          ? (pi as any).latest_charge
          : null;
        const billingDetails = charge?.billing_details ?? null;
        realEmail = (pi.receipt_email as string | null)
          || (billingDetails?.email as string | null)
          || null;
        realName = (billingDetails?.name as string | null) || null;
      }

      // Always update payment ids / status if not already paid.
      if (existing.payment_status !== "paid") {
        const updates: Record<string, unknown> = {
          stripe_customer_id: pi.customer as string | null,
          stripe_payment_intent_id: pi.id,
          stripe_payment_method_id: pi.payment_method as string | null,
          stripe_env: env,
          payment_status: "paid",
          amount_paid_cents: pi.amount_received ?? pi.amount ?? 0,
          // T3ST: skip upsell pages — go straight to brief generation.
          status: isT3st ? "upsells_complete" : "awaiting_upsells",
        };
        if (resolvedSessionId) updates.stripe_checkout_session_id = resolvedSessionId;
        if (placeholder && realEmail) updates.buyer_email = realEmail.toLowerCase();
        if (placeholder && realName) updates.buyer_name = realName;

        const { error: updErr } = await supabase
          .from("orders")
          .update(updates)
          .eq("id", orderId);

        if (updErr) {
          console.error("orders update failed:", updErr);
          return json({ error: "Failed to update order" }, 500);
        }

        await supabase.from("job_events").insert({
          order_id: orderId,
          event_type: "base_payment_confirmed_via_return",
          payload: {
            paymentIntentId: pi.id,
            amount: pi.amount_received ?? pi.amount,
            source: "confirm-payment",
          },
        });

        // Issue reaction-reward code (idempotent in the SQL function).
        supabase
          .rpc("issue_reward_code_for_order", { _order_id: orderId })
          .then(({ error }) => {
            if (error) console.error("issue_reward_code_for_order failed:", error);
          });

        // Send confirmation email NOW only for T3ST orders (which skip the
        // upsell pages entirely). For normal orders, mark-upsells-complete
        // sends it after upsell decisions are settled — so the email reflects
        // the real add-ons + total paid.
        if (isT3st && !existing.confirmation_email_sent_at) {
          sendOrderConfirmation(orderId).catch((e) =>
            console.error("sendOrderConfirmation failed:", e),
          );
        }
      }

      return json({
        ok: true,
        paid: true,
        orderId,
        status: isT3st ? "upsells_complete" : "awaiting_upsells",
        skipUpsells: isT3st,
      });
    }

    // ---- Upsell ----
    if (upsellType) {
      const flagMap: Record<string, string> = {
        extra_verse: "has_3rd_verse",
        rush_delivery: "is_rush",
        unlimited_edits: "has_unlimited_edits",
        delivery_48h: "is_rush",
      };
      const tierMap: Record<string, "rush_24h" | "express_48h" | undefined> = {
        rush_delivery: "rush_24h",
        delivery_48h: "express_48h",
      };
      const tierRank: Record<string, number> = { standard: 0, express_48h: 1, rush_24h: 2 };
      const flagColumn = flagMap[upsellType];
      if (!flagColumn) {
        return json({ error: `Unknown upsellType: ${upsellType}` }, 400);
      }

      const { data: order } = await supabase
        .from("orders")
        .select("product_config, amount_paid_cents, delivery_tier")
        .eq("id", orderId)
        .single();

      const productConfig = (order?.product_config as Record<string, boolean>) || {};
      if (productConfig[upsellType]) {
        // Already applied — idempotent no-op.
        return json({ ok: true, paid: true, orderId, alreadyApplied: true });
      }
      productConfig[upsellType] = true;

      const updates: Record<string, unknown> = {
        [flagColumn]: true,
        product_config: productConfig,
        amount_paid_cents:
          (order?.amount_paid_cents ?? 0) + (pi.amount_received ?? pi.amount ?? 0),
      };

      const newTier = tierMap[upsellType];
      if (newTier) {
        const currentRank = tierRank[(order?.delivery_tier as string) ?? "standard"] ?? 0;
        const newRank = tierRank[newTier] ?? 0;
        if (newRank > currentRank) updates.delivery_tier = newTier;
      }

      await supabase.from("orders").update(updates).eq("id", orderId);

      await supabase.from("job_events").insert({
        order_id: orderId,
        event_type: "upsell_confirmed_via_return",
        payload: { upsellType, paymentIntentId: pi.id, amount: pi.amount_received },
      });

      return json({ ok: true, paid: true, orderId, upsellType });
    }

    return json({ ok: true, paid: true, orderId });
  } catch (e: any) {
    console.error("confirm-payment error:", e);
    return json({ error: e.message || "Internal error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function sendOrderConfirmation(orderId: string) {
  const { data: order } = await supabase
    .from("orders")
    .select(
      "id, buyer_email, buyer_name, dog_name, dog_breed, genre, tempo, voice, song_title_idea, amount_cents, amount_paid_cents, currency, has_3rd_verse, is_rush, has_unlimited_edits, delivery_date, is_gift, recipient_email, created_at, product_config, confirmation_email_sent_at",
    )
    .eq("id", orderId)
    .maybeSingle();

  if (!order) return;
  if (order.confirmation_email_sent_at) return;
  if (!order.buyer_email) return;

  const cfg = (order.product_config as Record<string, boolean>) || {};
  const deliverySpeed = cfg.rush_delivery
    ? "24h"
    : cfg.delivery_48h
      ? "48h"
      : order.is_rush
        ? "24h"
        : "standard";

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const res = await fetch(`${supabaseUrl}/functions/v1/send-app-email`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${serviceKey}`,
    },
    body: JSON.stringify({
      template: "order_confirmation",
      to: order.buyer_email,
      data: {
        buyer_name: order.buyer_name,
        buyer_email: order.buyer_email,
        recipient_name: order.dog_name,
        relationship: order.dog_breed,
        genre: order.genre,
        tempo: order.tempo,
        voice: order.voice,
        song_title_idea: order.song_title_idea,
        is_gift: order.is_gift,
        recipient_email: order.recipient_email,
        amount_paid_cents: order.amount_paid_cents,
        amount_cents: order.amount_cents,
        currency: order.currency,
        order_id: order.id,
        order_ref: order.id.slice(0, 8).toUpperCase(),
        delivery_speed: deliverySpeed,
        has_3rd_verse: order.has_3rd_verse,
        has_unlimited_edits: order.has_unlimited_edits,
        created_at: order.created_at,
        dashboard_url: "https://ribbonsong.com/login?redirect=/dashboard",
      },
    }),
  });

  if (!res.ok) {
    console.error("send-app-email returned", res.status, await res.text());
    return;
  }

  await supabase
    .from("orders")
    .update({ confirmation_email_sent_at: new Date().toISOString() })
    .eq("id", orderId);
}
