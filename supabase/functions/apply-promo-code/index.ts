// Validates and applies a promo code to an order. If the discount brings the
// total to $0, the order is marked paid immediately and the pipeline is kicked
// off. Otherwise we return the new amount and the checkout flow continues
// (Stripe PI will be re-created at the discounted amount).

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { createStripeClient, type StripeEnv } from "../_shared/stripe.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { orderId, code, environment } = await req.json();

    if (!orderId || typeof orderId !== "string") {
      return json({ ok: false, error: "missing_order_id" }, 400);
    }
    if (!code || typeof code !== "string" || code.trim().length === 0) {
      return json({ ok: false, error: "missing_code" }, 400);
    }
    if (code.length > 64) {
      return json({ ok: false, error: "invalid_code" }, 400);
    }

    const env: StripeEnv = environment === "live" ? "live" : "sandbox";

    // Load the order to get the base amount + buyer email + PI id
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select("id, amount_cents, buyer_email, payment_status, status, stripe_payment_intent_id")
      .eq("id", orderId)
      .maybeSingle();

    if (orderErr || !order) {
      return json({ ok: false, error: "order_not_found" }, 404);
    }

    if (order.payment_status === "paid") {
      return json({ ok: false, error: "order_already_paid" }, 400);
    }

    const baseAmount = order.amount_cents ?? 4999;

    // Atomic redeem via DB function (handles race conditions + max_uses)
    const { data: result, error: redeemErr } = await supabase.rpc(
      "redeem_promo_code",
      {
        _code: code,
        _order_id: orderId,
        _base_amount_cents: baseAmount,
      },
    );

    if (redeemErr) {
      console.error("redeem_promo_code rpc failed:", redeemErr);
      return json({ ok: false, error: "internal_error" }, 500);
    }

    if (!result?.ok) {
      return json({ ok: false, error: result?.error || "invalid_code" }, 400);
    }

    let finalAmount = Number(result.final_amount_cents);
    let discountCents = Number(result.discount_cents);
    const promoCodeId = result.promo_code_id as string;

    // ---- Special-cased test codes ----
    // T3ST  → flat $5 base + auto-adds every upsell + fast-tracks delivery.
    // T3ST2 → flat $2 base. Does NOT auto-add upsells; if buyer takes any,
    //          they're charged at 1% of normal price (handled in charge-upsell).
    // T3ST1 → flat $1 base. Upsells charge at full price.
    const upperCode = code.trim().toUpperCase();
    const isT3st = upperCode === "T3ST";
    const isT3st2 = upperCode === "T3ST2";
    const isT3st1 = upperCode === "T3ST1";
    if (isT3st) {
      finalAmount = 500; // $5.00 flat
      discountCents = Math.max(0, baseAmount - finalAmount);
    } else if (isT3st2) {
      finalAmount = 200; // $2.00 flat
      discountCents = Math.max(0, baseAmount - finalAmount);
    } else if (isT3st1) {
      finalAmount = 100; // $1.00 flat
      discountCents = Math.max(0, baseAmount - finalAmount);
    }

    // Update order with discount + promo link
    const updatePayload: Record<string, unknown> = {
      promo_code_id: promoCodeId,
      discount_cents: discountCents,
    };

    if (isT3st) {
      // Auto-add every upsell so the buyer doesn't have to click through them.
      // The webhook / confirm-payment will see status === "upsells_complete"
      // already and skip the upsell pages entirely.
      const fullProductConfig = {
        extra_verse: true,
        rush_delivery: true,
        unlimited_edits: true,
        delivery_48h: true,
      };
      updatePayload.product_config = fullProductConfig;
      updatePayload.has_3rd_verse = true;
      updatePayload.has_unlimited_edits = true;
      updatePayload.is_rush = true;
      updatePayload.priority = "priority";
      updatePayload.delivery_tier = "rush_24h";
      // Note: status stays "checkout_started" until the $5 actually clears.
      // The webhook / confirm-payment will advance it through paid →
      // awaiting_upsells → upsells_complete in one shot for T3ST orders.
    }

    if (finalAmount === 0) {
      // Free order — short-circuit the whole payment flow.
      // Also mark it as rush + priority so process-kie-callback schedules
      // delivery immediately (instead of the default +24h) — useful for
      // 100% test/promo codes where we want instant end-to-end.
      updatePayload.payment_status = "paid";
      updatePayload.amount_paid_cents = 0;
      updatePayload.status = "upsells_complete"; // jumps straight to brief generation via trigger
      updatePayload.is_rush = true;
      updatePayload.priority = "priority";
    } else if (order.stripe_payment_intent_id) {
      // Partial discount — update the existing PaymentIntent so the user is
      // charged the discounted amount when they confirm.
      try {
        const stripe = createStripeClient(env);
        await stripe.paymentIntents.update(order.stripe_payment_intent_id, {
          amount: finalAmount,
        });
      } catch (e) {
        console.error("stripe PI update failed:", e);
        return json({ ok: false, error: "internal_error" }, 500);
      }
    }

    // Backfill buyer_email on redemption row for reporting
    await supabase
      .from("promo_code_redemptions")
      .update({ buyer_email: order.buyer_email })
      .eq("promo_code_id", promoCodeId)
      .eq("order_id", orderId);

    const { error: updateErr } = await supabase
      .from("orders")
      .update(updatePayload)
      .eq("id", orderId);

    if (updateErr) {
      console.error("orders.update after promo failed:", updateErr);
      return json({ ok: false, error: "internal_error" }, 500);
    }

    return json({
      ok: true,
      free: finalAmount === 0,
      discount_pct: result.discount_pct,
      discount_cents: discountCents,
      final_amount_cents: finalAmount,
    });
  } catch (e: any) {
    console.error("apply-promo-code error:", e);
    return json({ ok: false, error: "internal_error" }, 500);
  }
});
