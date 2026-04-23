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
    const { orderId, email, environment } = await req.json();
    if (!orderId || typeof orderId !== "string") {
      return json({ error: "Missing orderId" }, 400);
    }
    const emailStr = typeof email === "string" && email.trim() ? email.trim() : null;

    const env = (environment || "sandbox") as StripeEnv;
    const stripe = createStripeClient(env);

    // Resolve the human-readable price ID to the real Stripe price (for amount + currency)
    const prices = await stripe.prices.list({ lookup_keys: ["ribbonsong_base"] });
    if (!prices.data.length) return json({ error: "Base price not found" }, 404);
    const price = prices.data[0];
    const amount = price.unit_amount;
    const currency = price.currency;
    if (!amount) return json({ error: "Base price has no unit amount" }, 500);

    // Create (or reuse) a Customer so we can save the payment method for upsells.
    // Email is optional at this point — the customer is updated when the user fills it in
    // (the PaymentElement collects billing details and Stripe attaches them on confirm).
    let customerId: string | undefined;
    if (emailStr) {
      const existing = await stripe.customers.list({ email: emailStr, limit: 1 });
      const customer =
        existing.data[0] ??
        (await stripe.customers.create({
          email: emailStr,
          metadata: { orderId },
        }));
      customerId = customer.id;
    } else {
      const customer = await stripe.customers.create({ metadata: { orderId } });
      customerId = customer.id;
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      customer: customerId,
      ...(emailStr ? { receipt_email: emailStr } : {}),
      // Save card so we can charge silently for upsells
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

    // Stash on the order so the return page + webhook can find it
    await supabase
      .from("orders")
      .update({
        stripe_payment_intent_id: paymentIntent.id,
        stripe_customer_id: customer.id,
        payment_status: "checkout_started",
      })
      .eq("id", orderId);

    return json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount,
      currency,
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
