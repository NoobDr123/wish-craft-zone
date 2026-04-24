import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, createStripeClient, type StripeEnv } from "../_shared/stripe.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

// Module-level cache for the resolved base price. Lookup keys never change
// across invocations of the same isolate, so caching saves ~250 ms per call.
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
    const { orderId, environment } = await req.json();
    if (!orderId || typeof orderId !== "string") {
      return json({ error: "Missing orderId" }, 400);
    }

    const env = (environment || "sandbox") as StripeEnv;
    const stripe = createStripeClient(env);

    // 1. Resolve price (cached after first call) — fast path.
    const price = await getBasePrice(env);

    // 1b. Look up any email already on the order so we can attach the new
    //     Customer to it. Apple/Google Pay buyers may not have typed an
    //     email; we'll patch the Customer later in confirm-payment.
    const { data: existingOrder } = await supabase
      .from("orders")
      .select("buyer_email, stripe_customer_id")
      .eq("id", orderId)
      .maybeSingle();

    // 2. ALWAYS create + attach a Stripe Customer so `setup_future_usage`
    //    saves the PaymentMethod against a real customer. Without this, all
    //    upsells (charge-upsell with off_session: true) fail because the
    //    saved PaymentMethod isn't bound to any customer.
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
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: "never",
      },
      metadata: {
        orderId,
        kind: "base_order",
      },
      description: "RibbonSong personalized song",
    });

    // 3. Persist PI id to the order — fire-and-forget so we don't block the
    //    response. The webhook is the source of truth for payment state; this
    //    update is just for the return page to look up the order quickly.
    //    Errors here are non-fatal — log and move on.
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

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
