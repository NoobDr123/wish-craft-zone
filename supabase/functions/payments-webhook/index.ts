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
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded":
        await handleCheckoutSessionCompleted(event.data.object, env);
        break;
      case "payment_intent.succeeded":
        // Fallback: still handle PI succeeded so legacy/upsell PIs work.
        await handlePaymentSucceeded(event.data.object, env);
        break;
      case "payment_intent.payment_failed":
        console.log(
          "Payment failed:",
          event.data.object.id,
          event.data.object.last_payment_error?.message,
        );
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

/**
 * Handle Stripe Checkout Session completion (the new base-order flow).
 * Idempotent: if the order is already paid, this is a no-op.
 */
async function handleCheckoutSessionCompleted(session: any, env: StripeEnv) {
  const orderId = session.metadata?.orderId;
  if (!orderId) {
    console.log("checkout.session.completed with no orderId metadata:", session.id);
    return;
  }
  if (session.payment_status && session.payment_status !== "paid") {
    console.log(
      `checkout.session.completed but payment_status=${session.payment_status}, skipping:`,
      session.id,
    );
    return;
  }

  const { data: existingOrder } = await supabase
    .from("orders")
    .select("id, payment_status, promo_code_id")
    .eq("id", orderId)
    .maybeSingle();

  if (!existingOrder) {
    console.warn(`checkout.session.completed: order ${orderId} not found`);
    return;
  }
  if (existingOrder.payment_status === "paid") {
    console.log(`checkout.session.completed: order ${orderId} already paid, skipping`);
    return;
  }

  let isT3st = false;
  if (existingOrder.promo_code_id) {
    const { data: promo } = await supabase
      .from("promo_codes")
      .select("code")
      .eq("id", existingOrder.promo_code_id)
      .maybeSingle();
    isT3st = (promo?.code || "").toUpperCase() === "T3ST";
  }

  await supabase
    .from("orders")
    .update({
      stripe_customer_id: session.customer ?? undefined,
      stripe_payment_intent_id:
        typeof session.payment_intent === "string" ? session.payment_intent : undefined,
      stripe_checkout_session_id: session.id,
      stripe_env: env,
      payment_status: "paid",
      amount_paid_cents: session.amount_total ?? 0,
      status: isT3st ? "upsells_complete" : "awaiting_upsells",
    })
    .eq("id", orderId);

  await supabase.from("job_events").insert({
    order_id: orderId,
    event_type: "base_payment_succeeded",
    payload: {
      sessionId: session.id,
      paymentIntentId: session.payment_intent,
      amount: session.amount_total,
      t3st: isT3st,
      source: "checkout.session.completed",
    },
  });

  // Only send the confirmation email NOW if T3ST (skips upsells). Otherwise
  // mark-upsells-complete sends it after add-ons are settled.
  if (isT3st) {
    sendOrderConfirmation(orderId).catch((e) =>
      console.error("sendOrderConfirmation failed:", e),
    );
  }

  supabase
    .rpc("issue_reward_code_for_order", { _order_id: orderId })
    .then(({ error }) => {
      if (error) console.error("issue_reward_code_for_order failed:", error);
    });
}

async function handlePaymentSucceeded(pi: any, env: StripeEnv) {
  const orderId = pi.metadata?.orderId;
  const kind = pi.metadata?.kind; // "base_order" | undefined (upsells use upsellType)
  const upsellType = pi.metadata?.upsellType;

  if (!orderId) {
    console.log("payment_intent.succeeded with no orderId metadata:", pi.id);
    return;
  }

  // ---- Base order ----
  if (kind === "base_order" || (!upsellType && !kind)) {
    // Detect T3ST end-to-end test orders so we can fast-track straight to
    // upsells_complete (upsells are pre-added by apply-promo-code).
    const { data: existingOrder } = await supabase
      .from("orders")
      .select("promo_code_id")
      .eq("id", orderId)
      .maybeSingle();

    let isT3st = false;
    if (existingOrder?.promo_code_id) {
      const { data: promo } = await supabase
        .from("promo_codes")
        .select("code")
        .eq("id", existingOrder.promo_code_id)
        .maybeSingle();
      isT3st = (promo?.code || "").toUpperCase() === "T3ST";
    }

    await supabase
      .from("orders")
      .update({
        stripe_customer_id: pi.customer,
        stripe_payment_intent_id: pi.id,
        stripe_payment_method_id: pi.payment_method,
        stripe_env: env,
        payment_status: "paid",
        amount_paid_cents: pi.amount_received ?? pi.amount ?? 0,
        // T3ST: skip upsell pages — fires the brief-generation trigger immediately.
        status: isT3st ? "upsells_complete" : "awaiting_upsells",
      })
      .eq("id", orderId);

    await supabase.from("job_events").insert({
      order_id: orderId,
      event_type: "base_payment_succeeded",
      payload: {
        paymentIntentId: pi.id,
        amount: pi.amount_received ?? pi.amount,
        t3st: isT3st,
      },
    });

    // Only send the confirmation email NOW if T3ST (skips upsells). Otherwise
    // mark-upsells-complete sends it after add-ons are settled.
    if (isT3st) {
      sendOrderConfirmation(orderId).catch((e) =>
        console.error("sendOrderConfirmation failed:", e),
      );
    }

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
      express_90min: "is_rush",
    };
    const tierMap: Record<string, "rush_24h" | "priority_90min" | undefined> = {
      rush_delivery: "rush_24h",
      express_90min: "priority_90min",
    };
    const tierRank: Record<string, number> = { standard: 0, rush_24h: 1, priority_90min: 2 };
    const flagColumn = flagMap[upsellType];
    if (!flagColumn) {
      console.warn("Unknown upsellType:", upsellType);
      return;
    }

    const { data: order } = await supabase
      .from("orders")
      .select("product_config, amount_paid_cents, delivery_tier")
      .eq("id", orderId)
      .single();

    const productConfig = (order?.product_config as Record<string, boolean>) || {};

    // Idempotency: charge-upsell already optimistically applied this upsell
    // (flag + product_config + amount_paid_cents). Don't double-apply.
    if (productConfig[upsellType]) {
      await supabase.from("job_events").insert({
        order_id: orderId,
        event_type: "upsell_webhook_skipped_already_applied",
        payload: { upsellType, paymentIntentId: pi.id },
      });
      return;
    }

    productConfig[upsellType] = true;

    const updates: Record<string, unknown> = {
      [flagColumn]: true,
      product_config: productConfig,
      amount_paid_cents:
        (order?.amount_paid_cents ?? 0) + (pi.amount_received ?? pi.amount ?? 0),
    };

    const newTier = tierMap[upsellType];
    if (newTier) {
      const currentRank = tierRank[(order?.delivery_tier as string) ?? "standard"] ?? 0;
      const newRank = tierRank[newTier] ?? 0;
      if (newRank > currentRank) updates.delivery_tier = newTier;
    }

    await supabase.from("orders").update(updates).eq("id", orderId);

    await supabase.from("job_events").insert({
      order_id: orderId,
      event_type: "upsell_charged",
      payload: { upsellType, paymentIntentId: pi.id, amount: pi.amount_received, source: "webhook" },
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
      "id, buyer_email, buyer_name, dog_name, dog_breed, genre, tempo, voice, song_title_idea, amount_cents, amount_paid_cents, currency, has_3rd_verse, is_rush, has_unlimited_edits, delivery_date, is_gift, recipient_email, created_at, product_config, confirmation_email_sent_at",
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
        recipient_name: order.dog_name,
        relationship: order.dog_breed,
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
        dashboard_url: "https://getpawprintsong.com/login?redirect=/dashboard",
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
