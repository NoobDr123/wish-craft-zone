import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { createStripeClient, type StripeEnv, verifyWebhook } from "../_shared/stripe.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const url = new URL(req.url);
  const env = (url.searchParams.get("env") || "sandbox") as StripeEnv;

  let event: { id: string; type: string; data: { object: any } };
  try {
    event = await verifyWebhook(req, env);
  } catch (e) {
    console.error("Webhook verification failed:", e);
    return new Response("Bad signature", { status: 400 });
  }

  // Idempotency
  const { error: idempotencyError } = await supabase
    .from("stripe_events")
    .insert({ event_id: event.id, event_type: event.type, payload: event as any });
  if (idempotencyError && idempotencyError.code === "23505") {
    // Duplicate — already handled
    return ok();
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object, env);
        break;
      case "payment_intent.succeeded":
        await handlePaymentSucceeded(event.data.object);
        break;
      case "payment_intent.payment_failed":
        console.log("Payment failed:", event.data.object.id, event.data.object.last_payment_error?.message);
        break;
      default:
        console.log("Unhandled event:", event.type);
    }
    await supabase.from("stripe_events").update({ processed: true }).eq("event_id", event.id);
  } catch (e) {
    console.error("Webhook handler error:", e);
    return new Response("Handler error", { status: 500 });
  }

  return ok();
});

async function handleCheckoutCompleted(session: any, env: StripeEnv) {
  const orderId = session.metadata?.orderId;
  if (!orderId) {
    console.error("No orderId in checkout session metadata", session.id);
    return;
  }

  // Pull the payment intent so we can get the saved payment method
  const stripe = createStripeClient(env);
  const paymentIntentId = session.payment_intent as string;
  const pi = await stripe.paymentIntents.retrieve(paymentIntentId);

  await supabase
    .from("orders")
    .update({
      stripe_customer_id: session.customer,
      stripe_payment_intent_id: paymentIntentId,
      stripe_payment_method_id: pi.payment_method as string,
      payment_status: "paid",
      amount_paid_cents: session.amount_total ?? 0,
      status: "awaiting_upsells",
    })
    .eq("id", orderId);

  await supabase.from("job_events").insert({
    order_id: orderId,
    event_type: "base_payment_succeeded",
    payload: { sessionId: session.id, paymentIntentId, amount: session.amount_total },
  });
}

async function handlePaymentSucceeded(pi: any) {
  // Upsell PaymentIntents carry { orderId, upsellType } in metadata.
  // The base PI also goes through here but we already handled it via checkout.session.completed.
  const orderId = pi.metadata?.orderId;
  const upsellType = pi.metadata?.upsellType;
  if (!orderId || !upsellType) return;

  const flagMap: Record<string, string> = {
    extra_verse: "has_3rd_verse",
    rush_delivery: "is_rush",
    unlimited_edits: "has_unlimited_edits",
  };
  const flagColumn = flagMap[upsellType];
  if (!flagColumn) {
    console.warn("Unknown upsellType:", upsellType);
    return;
  }

  // Read current product_config + amount_paid_cents
  const { data: order } = await supabase
    .from("orders")
    .select("product_config, amount_paid_cents")
    .eq("id", orderId)
    .single();

  const productConfig = (order?.product_config as Record<string, boolean>) || {};
  productConfig[upsellType] = true;

  await supabase
    .from("orders")
    .update({
      [flagColumn]: true,
      product_config: productConfig,
      amount_paid_cents: (order?.amount_paid_cents ?? 0) + (pi.amount_received ?? pi.amount ?? 0),
    })
    .eq("id", orderId);

  await supabase.from("job_events").insert({
    order_id: orderId,
    event_type: "upsell_charged",
    payload: { upsellType, paymentIntentId: pi.id, amount: pi.amount_received },
  });
}

function ok() {
  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
