// Validates and applies a promo code to an order. If the discount brings the
// total to $0, the order is marked paid immediately and the pipeline is kicked
// off. Otherwise we return the new amount and the checkout flow continues
// (Stripe PI will be re-created at the discounted amount).

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

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
    const { orderId, code } = await req.json();

    if (!orderId || typeof orderId !== "string") {
      return json({ ok: false, error: "missing_order_id" }, 400);
    }
    if (!code || typeof code !== "string" || code.trim().length === 0) {
      return json({ ok: false, error: "missing_code" }, 400);
    }
    if (code.length > 64) {
      return json({ ok: false, error: "invalid_code" }, 400);
    }

    // Load the order to get the base amount + buyer email
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select("id, amount_cents, buyer_email, payment_status, status")
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

    const finalAmount = Number(result.final_amount_cents);
    const discountCents = Number(result.discount_cents);
    const promoCodeId = result.promo_code_id as string;

    // Update order with discount + promo link
    const updatePayload: Record<string, unknown> = {
      promo_code_id: promoCodeId,
      discount_cents: discountCents,
    };

    if (finalAmount === 0) {
      // Free order — short-circuit the whole payment flow
      updatePayload.payment_status = "paid";
      updatePayload.amount_paid_cents = 0;
      updatePayload.status = "upsells_complete"; // jumps straight to brief generation via trigger
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
