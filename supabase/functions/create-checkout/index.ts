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
    const { orderId, email, returnUrl, environment } = await req.json();
    if (!orderId || typeof orderId !== "string") {
      return json({ error: "Missing orderId" }, 400);
    }
    if (!email || typeof email !== "string") {
      return json({ error: "Missing email" }, 400);
    }

    const env = (environment || "sandbox") as StripeEnv;
    const stripe = createStripeClient(env);

    // Resolve the human-readable price ID to a real Stripe price
    const prices = await stripe.prices.list({ lookup_keys: ["ribbonsong_base"] });
    if (!prices.data.length) return json({ error: "Base price not found" }, 404);

    const fallbackOrigin =
      safeOrigin(req.headers.get("origin")) ||
      safeOrigin(req.headers.get("referer")) ||
      "https://ribbonsong.com";

    const safeReturnUrl = safeAbsoluteUrl(returnUrl) || `${fallbackOrigin}/checkout/return?session_id={CHECKOUT_SESSION_ID}`;

    const session = await stripe.checkout.sessions.create({
      line_items: [{ price: prices.data[0].id, quantity: 1 }],
      mode: "payment",
      ui_mode: "embedded",
      customer_email: email,
      // Save card so we can charge silently for upsells
      payment_intent_data: {
        setup_future_usage: "off_session",
        metadata: { orderId },
      },
      metadata: { orderId },
      return_url: safeReturnUrl,
    });

    // Stash the session id on the order so the webhook can find it fast
    await supabase
      .from("orders")
      .update({
        stripe_checkout_session_id: session.id,
        payment_status: "checkout_started",
      })
      .eq("id", orderId);

    return json({ clientSecret: session.client_secret });
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

function safeOrigin(value: string | null) {
  if (!value) return null;

  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function safeAbsoluteUrl(value: unknown) {
  if (typeof value !== "string") return null;

  try {
    return new URL(value).toString();
  } catch {
    return null;
  }
}
