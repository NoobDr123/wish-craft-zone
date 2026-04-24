import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { type StripeEnv, verifyWebhook } from "../_shared/stripe.ts";

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
    return ok();
  }

  try {
    switch (event.type) {
      case "payment_intent.succeeded":
        await handlePaymentSucceeded(event.data.object);
        break;
      case "payment_intent.payment_failed":
        console.log(
          "Payment failed:",
          event.data.object.id,
          event.data.object.last_payment_error?.message,
        );
        break;
      // checkout.session.completed kept for backwards compatibility with any
      // in-flight orders created with the old flow. Safe to ignore otherwise.
      case "checkout.session.completed":
        console.log("Legacy checkout.session.completed ignored:", event.data.object.id);
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

async function handlePaymentSucceeded(pi: any) {
  const orderId = pi.metadata?.orderId;
  const kind = pi.metadata?.kind; // "base_order" | undefined (upsells use upsellType)
  const upsellType = pi.metadata?.upsellType;

  if (!orderId) {
    console.log("payment_intent.succeeded with no orderId metadata:", pi.id);
    return;
  }

  // ---- Base order ----
  if (kind === "base_order" || (!upsellType && !kind)) {
    await supabase
      .from("orders")
      .update({
        stripe_customer_id: pi.customer,
        stripe_payment_intent_id: pi.id,
        stripe_payment_method_id: pi.payment_method,
        payment_status: "paid",
        amount_paid_cents: pi.amount_received ?? pi.amount ?? 0,
        status: "awaiting_upsells",
      })
      .eq("id", orderId);

    await supabase.from("job_events").insert({
      order_id: orderId,
      event_type: "base_payment_succeeded",
      payload: {
        paymentIntentId: pi.id,
        amount: pi.amount_received ?? pi.amount,
      },
    });

    // Fire-and-forget: send the order confirmation email with all details.
    // Done here (vs. on the client) so it sends even if the buyer closes the
    // tab right after payment.
    sendOrderConfirmation(orderId).catch((e) =>
      console.error("sendOrderConfirmation failed:", e),
    );

    // Issue the unique reaction-reward promo code (locked until they upload
    // a reaction video). Idempotent — safe to call on retries.
    supabase
      .rpc("issue_reward_code_for_order", { _order_id: orderId })
      .then(({ error }) => {
        if (error) console.error("issue_reward_code_for_order failed:", error);
      });

    return;
  }

  // ---- Upsell ----
  if (upsellType) {
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
        amount_paid_cents:
          (order?.amount_paid_cents ?? 0) + (pi.amount_received ?? pi.amount ?? 0),
      })
      .eq("id", orderId);

    await supabase.from("job_events").insert({
      order_id: orderId,
      event_type: "upsell_charged",
      payload: { upsellType, paymentIntentId: pi.id, amount: pi.amount_received },
    });
  }
}

function ok() {
  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * Loads the full order and asks send-app-email to dispatch the
 * "order_confirmation" template. Idempotent — guarded by
 * confirmation_email_sent_at so we never double-send.
 */
async function sendOrderConfirmation(orderId: string) {
  const { data: order } = await supabase
    .from("orders")
    .select(
      "id, buyer_email, buyer_name, recipient_name, relationship, genre, tempo, voice, song_title_idea, amount_cents, amount_paid_cents, currency, has_3rd_verse, is_rush, has_unlimited_edits, delivery_date, is_gift, recipient_email, created_at, product_config, confirmation_email_sent_at",
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
        recipient_name: order.recipient_name,
        relationship: order.relationship,
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
