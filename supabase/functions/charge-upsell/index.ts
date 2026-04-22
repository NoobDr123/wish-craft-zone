import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, createStripeClient, type StripeEnv } from "../_shared/stripe.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

// Upsell catalog. Server is the source of truth — never trust client amounts.
const UPSELL_PRICES: Record<string, { amount: number; flagColumn: string }> = {
  extra_verse: { amount: 1999, flagColumn: "has_3rd_verse" },
  rush_delivery: { amount: 5900, flagColumn: "is_rush" },
  unlimited_edits: { amount: 3299, flagColumn: "has_unlimited_edits" },
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { orderId, upsellType, environment } = await req.json();
    if (!orderId || !upsellType) return json({ success: false, reason: "missing_params" }, 400);

    const upsell = UPSELL_PRICES[upsellType];
    if (!upsell) return json({ success: false, reason: "unknown_upsell" }, 400);

    const { data: order, error } = await supabase
      .from("orders")
      .select("stripe_customer_id, stripe_payment_method_id, product_config")
      .eq("id", orderId)
      .single();

    if (error || !order) return json({ success: false, reason: "order_not_found" }, 404);
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
        amount: upsell.amount,
        currency: "usd",
        customer: order.stripe_customer_id,
        payment_method: order.stripe_payment_method_id,
        off_session: true,
        confirm: true,
        metadata: { orderId, upsellType },
        description: `RibbonSong upsell: ${upsellType}`,
      });

      // Webhook will update the order row when payment_intent.succeeded fires,
      // but we also update optimistically so the next page sees it immediately.
      if (pi.status === "succeeded") {
        productConfig[upsellType] = true;
        await supabase
          .from("orders")
          .update({
            [upsell.flagColumn]: true,
            product_config: productConfig,
          })
          .eq("id", orderId);

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
