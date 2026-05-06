// Charge $5 off-session against the saved card and unlock the second song variant.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, createStripeClient, type StripeEnv } from "../_shared/stripe.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const UNLOCK_PRICE_CENTS = 500;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) return json({ error: "Login required" }, 401);

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: `Bearer ${token}` } } },
    );
    const { data: userResp } = await userClient.auth.getUser();
    const user = userResp?.user;
    if (!user) return json({ error: "Login required" }, 401);

    const { orderId } = await req.json();
    if (!orderId) return json({ error: "Missing orderId" }, 400);

    const { data: order } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();
    if (!order) return json({ error: "Order not found" }, 404);

    // Ownership check
    const userEmail = (user.email ?? "").toLowerCase();
    const owns =
      (order.user_id && order.user_id === user.id) ||
      (order.buyer_email && order.buyer_email.toLowerCase() === userEmail);
    if (!owns) return json({ error: "Forbidden" }, 403);

    if (order.second_variant_unlocked_at) {
      return json({ ok: true, alreadyUnlocked: true });
    }

    const variants = (order.audio_variants as any[]) ?? [];
    if (variants.length < 2) {
      return json({ error: "Only one variant available for this song" }, 400);
    }

    if (
      !order.stripe_payment_method_id ||
      !order.stripe_customer_id ||
      !order.stripe_env
    ) {
      return json(
        { error: "no_saved_card", message: "No saved card available for this order" },
        402,
      );
    }

    const stripe = createStripeClient(order.stripe_env as StripeEnv);
    let pi;
    try {
      pi = await stripe.paymentIntents.create({
        amount: UNLOCK_PRICE_CENTS,
        currency: order.currency?.toLowerCase() ?? "usd",
        customer: order.stripe_customer_id,
        payment_method: order.stripe_payment_method_id,
        confirm: true,
        off_session: true,
        description: "PawPrint Song — alternate version unlock",
        metadata: {
          orderId,
          kind: "second_variant_unlock",
        },
      });
    } catch (e: any) {
      console.error("Stripe charge failed:", e);
      return json({ error: e.message ?? "Charge failed" }, 402);
    }

    if (pi.status !== "succeeded") {
      return json({ error: `Charge status: ${pi.status}` }, 402);
    }

    await supabase
      .from("orders")
      .update({ second_variant_unlocked_at: new Date().toISOString() })
      .eq("id", orderId);

    await supabase.from("job_events").insert({
      order_id: orderId,
      event_type: "second_variant_unlocked",
      payload: { paymentIntentId: pi.id, amount: pi.amount },
    });

    return json({ ok: true, variants });
  } catch (e: any) {
    console.error("unlock-second-variant error:", e);
    return json({ error: e.message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
