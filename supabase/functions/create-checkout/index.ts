import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, createStripeClient, type StripeEnv } from "../_shared/stripe.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

type CachedPrice = { id: string; amount: number; currency: string };
const priceCache = new Map<StripeEnv, CachedPrice>();

async function getBasePrice(env: StripeEnv) {
  const cached = priceCache.get(env);
  if (cached) return cached;
  const stripe = createStripeClient(env);
  const prices = await stripe.prices.list({ lookup_keys: ["ribbonsong_base"] });
  if (!prices.data.length) throw new Error("Base price not found");
  const p = prices.data[0];
  if (!p.unit_amount) throw new Error("Base price has no unit amount");
  const value: CachedPrice = { id: p.id, amount: p.unit_amount, currency: p.currency };
  priceCache.set(env, value);
  return value;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { orderId, environment, rewardCode } = body;
    if (!orderId || typeof orderId !== "string") {
      return json({ error: "Missing orderId" }, 400);
    }

    // ---- Free song reward path ----
    if (rewardCode && typeof rewardCode === "string") {
      return await handleFreeSongRedemption(orderId, rewardCode.trim(), req);
    }

    const env = (environment || "sandbox") as StripeEnv;
    const stripe = createStripeClient(env);

    const price = await getBasePrice(env);

    const { data: existingOrder } = await supabase
      .from("orders")
      .select("buyer_email, stripe_customer_id")
      .eq("id", orderId)
      .maybeSingle();

    let customerId = existingOrder?.stripe_customer_id ?? null;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email:
          existingOrder?.buyer_email && !existingOrder.buyer_email.startsWith("pending+")
            ? existingOrder.buyer_email
            : undefined,
        metadata: { orderId },
      });
      customerId = customer.id;
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: price.amount,
      currency: price.currency,
      customer: customerId,
      setup_future_usage: "off_session",
      payment_method_types: ["card", "link"],
      metadata: { orderId, kind: "base_order" },
      description: "RibbonSong personalized song",
    });

    supabase
      .from("orders")
      .update({
        stripe_payment_intent_id: paymentIntent.id,
        stripe_customer_id: customerId,
        payment_status: "checkout_started",
      })
      .eq("id", orderId)
      .then(({ error }) => {
        if (error) console.error("orders.update (non-blocking) failed:", error);
      });

    return json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: price.amount,
      currency: price.currency,
    });
  } catch (e: any) {
    console.error("create-checkout error:", e);
    return json({ error: e.message || "Internal error" }, 500);
  }
});

/**
 * Free song redemption: validates the reward code, atomically decrements
 * free_songs_remaining, marks the order paid for $0, and kicks off brief
 * generation immediately. No Stripe involvement.
 */
async function handleFreeSongRedemption(orderId: string, code: string, req: Request) {
  // Auth required
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
  const userEmail = (user.email ?? "").toLowerCase();

  const { data: reward } = await supabase
    .from("reaction_reward_codes")
    .select("*")
    .ilike("code", code)
    .maybeSingle();

  if (!reward) return json({ error: "Code not found" }, 404);
  if (reward.status !== "unlocked") return json({ error: "Code not active" }, 400);

  const ownsByUser = reward.user_id && reward.user_id === user.id;
  const ownsByEmail = reward.buyer_email && reward.buyer_email.toLowerCase() === userEmail;
  if (!ownsByUser && !ownsByEmail) {
    return json({ error: "Code does not belong to you" }, 403);
  }

  // Atomic decrement
  const { data: updated, error: decErr } = await supabase
    .from("reaction_reward_codes")
    .update({
      free_songs_remaining: (reward.free_songs_remaining ?? 0) - 1,
      first_redeemed_at: reward.first_redeemed_at ?? new Date().toISOString(),
      fully_redeemed_at:
        (reward.free_songs_remaining ?? 0) - 1 <= 0 ? new Date().toISOString() : null,
    })
    .eq("id", reward.id)
    .gt("free_songs_remaining", 0)
    .select()
    .maybeSingle();

  if (decErr || !updated) {
    return json({ error: "Code already fully used or race lost" }, 400);
  }

  // Mark order as free + paid + ready for brief gen
  // Schedule delivery for next morning ~9am UTC (simple heuristic)
  const tomorrow = new Date();
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  tomorrow.setUTCHours(9, 0, 0, 0);

  await supabase
    .from("orders")
    .update({
      payment_status: "paid",
      amount_cents: 0,
      amount_paid_cents: 0,
      source_kind: "free_reward",
      source_reward_code_id: reward.id,
      status: "upsells_complete", // skip upsells, go straight to brief
      delivery_tier: "express_48h",
      scheduled_delivery_at: tomorrow.toISOString(),
    })
    .eq("id", orderId);

  await supabase.from("job_events").insert({
    order_id: orderId,
    event_type: "free_reward_redeemed",
    payload: { rewardCode: reward.code, remaining: updated.free_songs_remaining },
  });

  return json({
    ok: true,
    free: true,
    remaining: updated.free_songs_remaining,
  });
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
