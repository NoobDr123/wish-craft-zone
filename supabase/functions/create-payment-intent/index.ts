// Creates (or refreshes) a PaymentIntent for an order so the buyer can pay
// inline on /checkout using Stripe Elements + Express Checkout (Apple Pay,
// Google Pay, Link). Returns { clientSecret, paymentIntentId, amount }.
//
// Idempotent: if the order already has a non-terminal PI, we update its
// amount (in case a promo was just applied) and return its existing
// client_secret. Stripe lets us mutate amount on a PI in `requires_payment_method`
// or `requires_confirmation` — once it's been confirmed we create a fresh one.
//
// If the order row doesn't exist yet we create it from the quiz snapshot the
// client sends (server-authoritative, same approach as create-checkout).

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, createStripeClient, type StripeEnv } from "../_shared/stripe.ts";
import {
  currencyForCountry,
  getProductPrice,
  normalizeCurrency,
  type SupportedCurrency,
} from "../_shared/pricing.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const checkoutQuizPatchFields = new Set([
  "buyer_email",
  "buyer_name",
  "dog_name",
  "dog_breed",
  "dog_breed_other",
  "dog_gender",
  "dog_photo_url",
  "dog_personality",
  "dog_memory",
  "letter_to_dog",
  "genre",
  "tempo",
  "voice",
  "song_title_idea",
  "is_gift",
  "recipient_email",
  "delivery_date",
  "personal_note",
  "priority",
  "quiz_payload",
]);

function sanitizePatch(input: unknown) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (!checkoutQuizPatchFields.has(key)) continue;
    if (key === "buyer_email") {
      const email = typeof value === "string" ? value.trim().toLowerCase() : "";
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) out.buyer_email = email;
      continue;
    }
    if (key === "buyer_name") {
      out.buyer_name = typeof value === "string" && value.trim() ? value.trim() : null;
      continue;
    }
    out[key] = value;
  }
  return Object.keys(out).length ? out : null;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  const { orderId, environment, quizPatch, quizSnapshot, userId, country, currency: bodyCurrency } = body;
  if (!orderId || typeof orderId !== "string") {
    return json({ error: "missing_order_id" }, 400);
  }

  const env = (environment === "live" ? "live" : "sandbox") as StripeEnv;
  // Buyer currency: prefer explicit currency, otherwise derive from detected country.
  const requestedCurrency: SupportedCurrency = bodyCurrency
    ? normalizeCurrency(bodyCurrency)
    : currencyForCountry(country);
  console.log(`[create-payment-intent] start order=${orderId} env=${env} currency=${requestedCurrency} country=${country ?? "?"}`);

  try {
    const stripe = createStripeClient(env);

    // Look up the order
    let { data: order, error: orderErr } = await supabase
      .from("orders")
      .select(
        "id, buyer_email, buyer_name, dog_name, amount_cents, currency, stripe_customer_id, stripe_env, stripe_payment_intent_id, payment_status",
      )
      .eq("id", orderId)
      .maybeSingle();

    if (orderErr) {
      console.error("[create-payment-intent] order lookup failed:", orderErr);
      return json({ error: "order_lookup_failed", detail: orderErr.message }, 500);
    }

    // Create order from snapshot if missing
    if (!order) {
      const snap = sanitizePatch(quizSnapshot) || sanitizePatch(quizPatch);
      if (!snap || !snap.dog_name) {
        return json({ error: "order_not_found", detail: "no_snapshot" }, 404);
      }
      const buyerEmail = (snap.buyer_email as string | undefined) || `pending+${orderId}@getpawprintsong.com`;
      const insertRow: Record<string, unknown> = {
        id: orderId,
        user_id: typeof userId === "string" ? userId : null,
        ...snap,
        buyer_email: buyerEmail,
        amount_cents: 2999,
        currency: "USD",
        status: "pending_payment",
        payment_status: "pending",
      };
      const { data: inserted, error: insErr } = await supabase
        .from("orders")
        .insert(insertRow)
        .select(
          "id, buyer_email, buyer_name, dog_name, amount_cents, currency, stripe_customer_id, stripe_env, stripe_payment_intent_id, payment_status",
        )
        .maybeSingle();
      if (insErr || !inserted) {
        console.error("[create-payment-intent] insert failed:", insErr);
        return json({ error: "order_create_failed", detail: insErr?.message }, 500);
      }
      order = inserted;
      console.log(`[create-payment-intent] created new order=${orderId}`);
    } else {
      // Sync any quiz/contact updates
      const patch = sanitizePatch(quizPatch) || sanitizePatch(quizSnapshot);
      if (patch) {
        if (
          order.buyer_email &&
          !order.buyer_email.startsWith("pending+") &&
          typeof patch.buyer_email === "string" &&
          (patch.buyer_email as string).startsWith("pending+")
        ) {
          delete patch.buyer_email;
        }
        const { error: syncErr } = await supabase
          .from("orders")
          .update(patch)
          .eq("id", orderId)
          .neq("payment_status", "paid");
        if (!syncErr) {
          const { data: refreshed } = await supabase
            .from("orders")
            .select(
              "id, buyer_email, buyer_name, dog_name, amount_cents, currency, stripe_customer_id, stripe_env, stripe_payment_intent_id, payment_status",
            )
            .eq("id", orderId)
            .maybeSingle();
          if (refreshed) order = refreshed;
        }
      }
    }

    if (order.payment_status === "paid") {
      console.log(`[create-payment-intent] already paid order=${orderId}`);
      return json({
        ok: true,
        alreadyPaid: true,
        orderId,
        paymentIntentId: order.stripe_payment_intent_id,
      });
    }

    const amountCents = order.amount_cents ?? 2999;
    const currency = (order.currency || "USD").toLowerCase();

    // Resolve / create customer
    let customerId =
      order.stripe_env === env ? order.stripe_customer_id ?? null : null;
    if (customerId) {
      try {
        const c = await stripe.customers.retrieve(customerId);
        if ((c as any).deleted) customerId = null;
      } catch (err: any) {
        if (err?.code === "resource_missing") customerId = null;
        else throw err;
      }
    }
    if (!customerId) {
      const realEmail =
        order.buyer_email && !order.buyer_email.startsWith("pending+")
          ? order.buyer_email
          : undefined;
      const customer = await stripe.customers.create({
        email: realEmail,
        name: order.buyer_name || undefined,
        metadata: { orderId },
      });
      customerId = customer.id;
    }

    // Try to reuse existing PI if it's still mutable
    let pi: any = null;
    if (order.stripe_payment_intent_id) {
      try {
        const existing = await stripe.paymentIntents.retrieve(order.stripe_payment_intent_id);
        if (
          existing.status === "requires_payment_method" ||
          existing.status === "requires_confirmation" ||
          existing.status === "requires_action"
        ) {
          // Update amount in case promo changed it
          if (existing.amount !== amountCents || existing.customer !== customerId) {
            pi = await stripe.paymentIntents.update(existing.id, {
              amount: amountCents,
              customer: customerId,
            });
          } else {
            pi = existing;
          }
        }
      } catch (e: any) {
        console.warn("[create-payment-intent] could not reuse PI:", e?.message);
      }
    }

    // Create a fresh PI if we don't have a usable one. We use
    // automatic_payment_methods (no redirects) so the same PI can be confirmed
    // by the inline card form *or* the ExpressCheckoutElement (Apple Pay /
    // Google Pay / Link). Both surfaces will see the latest `amount` — which
    // is critical for promo codes (otherwise wallets show the pre-discount
    // total).
    if (!pi) {
      pi = await stripe.paymentIntents.create({
        amount: amountCents,
        currency,
        customer: customerId,
        automatic_payment_methods: { enabled: true, allow_redirects: "never" },
        setup_future_usage: "off_session",
        description: order.dog_name
          ? `PawPrint Song personalized song for ${order.dog_name}`
          : "PawPrint Song personalized song",
        metadata: { orderId, kind: "base_order" },
      });
    }

    // Persist PI references on the order
    const { error: updErr } = await supabase
      .from("orders")
      .update({
        stripe_payment_intent_id: pi.id,
        stripe_customer_id: customerId,
        stripe_env: env,
        payment_status: "checkout_started",
      })
      .eq("id", orderId);

    if (updErr) {
      console.error("[create-payment-intent] order update failed:", updErr);
      return json({ error: "order_update_failed", detail: updErr.message }, 500);
    }

    console.log(
      `[create-payment-intent] ok order=${orderId} pi=${pi.id} amount=${amountCents} ${currency}`,
    );

    return json({
      ok: true,
      clientSecret: pi.client_secret,
      paymentIntentId: pi.id,
      amount: amountCents,
      currency,
    });
  } catch (e: any) {
    console.error("[create-payment-intent] error:", e?.message || e, e?.raw || "");
    return json({ error: "stripe_error", message: e?.message || "Internal error" }, 500);
  }
});
