// Delivery: marks order as delivered, sends transactional email to recipient
// (or buyer if not a gift) with link to /listen/:slug. Idempotent.
//
// Also pushes fulfillment metadata to Stripe (PaymentIntent.metadata +
// description) so chargebacks can be defended automatically.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { createStripeClient, type StripeEnv } from "../_shared/stripe.ts";
import { guardInternal } from "../_shared/auth.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const SITE_URL = "https://getpawprintsong.com";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const unauthorized = await guardInternal(req, corsHeaders);
  if (unauthorized) return unauthorized;

  try {
    const { orderId, force } = await req.json();
    if (!orderId) return json({ error: "Missing orderId" }, 400);

    const { data: order } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (!order) return json({ error: "Order not found" }, 404);
    if (order.delivered_at) return json({ ok: true, skipped: "already_delivered" });
    if (order.status !== "ready_to_deliver") {
      return json({ error: `Order not ready (status=${order.status})` }, 400);
    }

    // Honor scheduled_delivery_at — if still in future, requeue silently.
    // Admin can bypass by passing force: true.
    if (
      !force &&
      order.scheduled_delivery_at &&
      new Date(order.scheduled_delivery_at) > new Date()
    ) {
      return json({ ok: true, skipped: "not_yet_due" });
    }

    const slug = order.share_page_slug ?? order.id;
    const listenUrl = `${SITE_URL}/listen/${slug}`;
    const portalUrl = "";

    // Auto-issue a 10%-off returning-customer promo (idempotent: skip if a
    // returning code already exists for this order).
    let returningPromoCode: string | null = null;
    try {
      const { data: existing } = await supabase
        .from("promo_codes")
        .select("code")
        .eq("issued_for_order_id", order.id)
        .eq("kind", "returning_10pct")
        .maybeSingle();
      if (existing?.code) {
        returningPromoCode = existing.code;
      } else if (order.source_kind === "paid") {
        // Only issue for paid orders, not free reward orders.
        const { data: newPromo } = await supabase.rpc("issue_personal_promo_code", {
          _kind: "returning_10pct",
          _discount_pct: 10,
          _owner_user_id: order.user_id,
          _owner_email: order.buyer_email,
          _issued_for_order_id: order.id,
          _issued_for_reward_code_id: null,
          _expires_in_days: 180,
        });
        const promoRow = Array.isArray(newPromo) ? newPromo[0] : newPromo;
        returningPromoCode = promoRow?.code ?? null;
      }
    } catch (e) {
      console.error("Failed to issue returning promo:", e);
    }

    // Determine recipient. For gifts, send to recipient_email if provided,
    // otherwise notify buyer. Always notify buyer too on first delivery.
    const targets: { email: string; role: "buyer" | "recipient" }[] = [];
    if (order.is_gift && order.recipient_email) {
      targets.push({ email: order.recipient_email, role: "recipient" });
    }
    targets.push({ email: order.buyer_email, role: "buyer" });

    for (const t of targets) {
      try {
        await fetch(`${Deno.env.get("SUPABASE_URL")!}/functions/v1/send-app-email`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!}`,
          },
          body: JSON.stringify({
            template: "song-delivered",
            to: t.email,
            data: {
              recipient_name: order.dog_name,
              dog_name: order.dog_name,
              dog_breed: order.dog_breed,
              dog_gender: order.dog_gender,
              buyer_name: order.buyer_name ?? "Someone who loved them",
              listen_url: listenUrl,
              portal_url: portalUrl,
              personal_note: order.personal_note ?? null,
              role: t.role,
              delivery_tier: order.delivery_tier ?? "standard",
              // Only buyer gets the returning promo code, not recipient
              returning_promo_code: t.role === "buyer" ? returningPromoCode : null,
            },
          }),
        });
      } catch (e) {
        console.error(`Failed sending to ${t.email}`, e);
      }
    }

    const deliveredAt = new Date().toISOString();

    await supabase
      .from("orders")
      .update({
        status: "delivered",
        delivered_at: deliveredAt,
      })
      .eq("id", orderId);

    await supabase.from("job_events").insert({
      order_id: orderId,
      event_type: "delivered",
      payload: { listen_url: listenUrl, sent_to: targets.map((t) => t.email) },
    });

    // ---- Stripe chargeback defense: push fulfillment metadata ----
    // Best-effort. Don't fail delivery if Stripe is unreachable.
    syncFulfillmentToStripe(orderId, order, listenUrl, deliveredAt).catch((e) =>
      console.error("syncFulfillmentToStripe failed:", e),
    );

    return json({ ok: true, listenUrl });
  } catch (e: any) {
    console.error("deliver-song error", e);
    return json({ error: e.message }, 500);
  }
});

async function syncFulfillmentToStripe(
  orderId: string,
  order: any,
  listenUrl: string,
  deliveredAt: string,
) {
  if (!order.stripe_payment_intent_id) {
    console.log(`Order ${orderId} has no PI — skipping Stripe fulfillment sync`);
    return;
  }
  if (!order.stripe_env || (order.stripe_env !== "live" && order.stripe_env !== "sandbox")) {
    console.log(`Order ${orderId} has no stripe_env — skipping Stripe fulfillment sync`);
    return;
  }
  if (order.stripe_fulfillment_synced_at) {
    console.log(`Order ${orderId} fulfillment already synced — skipping`);
    return;
  }

  const env: StripeEnv = order.stripe_env;
  const stripe = createStripeClient(env);

  // Truncate description to Stripe's 350-char limit. Customer-facing string
  // shows on the receipt and bank statement context — helps reduce
  // "I don't recognize this charge" disputes.
  const recipientName = String(order.dog_name ?? "your dog").slice(0, 80);
  const description = `PawprintSong tribute song delivered for ${recipientName} on ${deliveredAt.slice(0, 10)}`.slice(0, 350);

  await stripe.paymentIntents.update(order.stripe_payment_intent_id, {
    description,
    metadata: {
      // Stripe metadata values must be strings, max 500 chars, max 50 keys
      fulfilled: "true",
      delivered_at: deliveredAt,
      delivery_method: "email",
      listen_url: listenUrl.slice(0, 500),
      recipient_name: recipientName,
      order_id: orderId,
    },
  });

  await supabase
    .from("orders")
    .update({ stripe_fulfillment_synced_at: new Date().toISOString() })
    .eq("id", orderId);

  await supabase.from("job_events").insert({
    order_id: orderId,
    event_type: "stripe_fulfillment_synced",
    payload: { stripe_env: env, payment_intent_id: order.stripe_payment_intent_id },
  });
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
