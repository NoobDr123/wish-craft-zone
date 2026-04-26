import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, createStripeClient, type StripeEnv } from "../_shared/stripe.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const checkoutQuizPatchFields = new Set([
  "buyer_email",
  "buyer_name",
  "recipient_name",
  "relationship",
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

function sanitizeCheckoutQuizPatch(input: unknown) {
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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  let parsedBody: any = {};
  try {
    parsedBody = await req.json();
  } catch (_) {
    return json({ error: "invalid_json" }, 400);
  }

  const { orderId, environment, rewardCode, returnUrl, quizPatch, quizSnapshot, userId } = parsedBody;
  if (!orderId || typeof orderId !== "string") {
    return json({ error: "missing_order_id" }, 400);
  }

  // ---- Free song reward path ----
  if (rewardCode && typeof rewardCode === "string") {
    return await handleFreeSongRedemption(orderId, rewardCode.trim(), req);
  }

  const env = (environment === "live" ? "live" : "sandbox") as StripeEnv;

  console.log(`[create-checkout] start order=${orderId} env=${env}`);

  try {
    const stripe = createStripeClient(env);

    // Look up existing order first
    let { data: existingOrder, error: orderErr } = await supabase
      .from("orders")
      .select(
        "id, buyer_email, buyer_name, recipient_name, amount_cents, currency, stripe_customer_id, stripe_env, stripe_checkout_session_id, payment_status",
      )
      .eq("id", orderId)
      .maybeSingle();

    if (orderErr) {
      console.error("[create-checkout] order lookup failed:", orderErr);
      return json({ error: "order_lookup_failed", detail: orderErr.message }, 500);
    }

    // If the order does NOT exist, create it from the snapshot the client sent.
    // This makes the backend authoritative — no more relying on browser-side
    // inserts that can silently fail due to RLS or hydration races.
    if (!existingOrder) {
      const snapshot = sanitizeCheckoutQuizPatch(quizSnapshot) || sanitizeCheckoutQuizPatch(quizPatch);
      if (!snapshot || !snapshot.recipient_name) {
        console.error("[create-checkout] no order and insufficient snapshot to create one");
        return json({ error: "order_not_found", detail: "no_snapshot" }, 404);
      }
      const buyerEmail = (snapshot.buyer_email as string | undefined) || `pending+${orderId}@ribbonsong.com`;
      const insertRow: Record<string, unknown> = {
        id: orderId,
        user_id: typeof userId === "string" ? userId : null,
        ...snapshot,
        buyer_email: buyerEmail,
        amount_cents: 4999,
        currency: "USD",
        status: "pending_payment",
        payment_status: "pending",
      };
      const { data: inserted, error: insErr } = await supabase
        .from("orders")
        .insert(insertRow)
        .select(
          "id, buyer_email, buyer_name, recipient_name, amount_cents, currency, stripe_customer_id, stripe_env, stripe_checkout_session_id, payment_status",
        )
        .maybeSingle();
      if (insErr || !inserted) {
        console.error("[create-checkout] order insert failed:", insErr);
        return json({ error: "order_create_failed", detail: insErr?.message }, 500);
      }
      existingOrder = inserted;
      console.log(`[create-checkout] created new order=${orderId}`);
    } else {
      // Order exists — sync any updated quiz/contact details (sanitized).
      const sanitizedPatch = sanitizeCheckoutQuizPatch(quizPatch) || sanitizeCheckoutQuizPatch(quizSnapshot);
      if (sanitizedPatch) {
        // Don't overwrite a real buyer_email with a placeholder.
        if (
          existingOrder.buyer_email &&
          !existingOrder.buyer_email.startsWith("pending+") &&
          typeof sanitizedPatch.buyer_email === "string" &&
          (sanitizedPatch.buyer_email as string).startsWith("pending+")
        ) {
          delete sanitizedPatch.buyer_email;
        }
        const { error: syncErr } = await supabase
          .from("orders")
          .update(sanitizedPatch)
          .eq("id", orderId)
          .neq("payment_status", "paid");
        if (syncErr) {
          console.error("[create-checkout] quiz patch sync failed:", syncErr);
          // Non-fatal — keep going. The session can still be created.
        } else {
          // Refresh local view of the order so the customer/email below is current.
          const { data: refreshed } = await supabase
            .from("orders")
            .select(
              "id, buyer_email, buyer_name, recipient_name, amount_cents, currency, stripe_customer_id, stripe_env, stripe_checkout_session_id, payment_status",
            )
            .eq("id", orderId)
            .maybeSingle();
          if (refreshed) existingOrder = refreshed;
        }
      }
    }

    if (existingOrder.payment_status === "paid") {
      return json({ error: "order_already_paid" }, 400);
    }

    const amountCents = existingOrder.amount_cents ?? 4999;
    const currency = (existingOrder.currency || "USD").toLowerCase();

    // Validate / refresh customer
    let customerId =
      existingOrder.stripe_env === env ? existingOrder.stripe_customer_id ?? null : null;
    if (customerId) {
      try {
        const existing = await stripe.customers.retrieve(customerId);
        if ((existing as any).deleted) customerId = null;
      } catch (err: any) {
        if (err?.code === "resource_missing") {
          console.warn(`[create-checkout] stale customer ${customerId}, recreating`);
          customerId = null;
        } else {
          console.error("[create-checkout] customer retrieve failed:", err?.message || err);
          throw err;
        }
      }
    }
    if (!customerId) {
      const realEmail =
        existingOrder.buyer_email && !existingOrder.buyer_email.startsWith("pending+")
          ? existingOrder.buyer_email
          : undefined;
      const customer = await stripe.customers.create({
        email: realEmail,
        name: existingOrder.buyer_name || undefined,
        metadata: { orderId },
      });
      customerId = customer.id;
      console.log(`[create-checkout] created new customer ${customerId} for order ${orderId}`);
    }

    // Build the embedded Checkout Session.
    // We use price_data so any promo-applied amount (stored on the order) is
    // honored without needing to re-create or sync Stripe Price objects.
    const productName = existingOrder.recipient_name
      ? `RibbonSong personalized song for ${existingOrder.recipient_name}`
      : "RibbonSong personalized song";

    const finalReturnUrl =
      typeof returnUrl === "string" && returnUrl.length > 0
        ? returnUrl
        : "https://ribbonsong.com/checkout/return?session_id={CHECKOUT_SESSION_ID}";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      ui_mode: "embedded",
      customer: customerId,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency,
            unit_amount: amountCents,
            product_data: {
              name: productName,
              description: "Personalized custom song delivered to your inbox.",
            },
          },
        },
      ],
      payment_intent_data: {
        setup_future_usage: "off_session",
        description: "RibbonSong personalized song",
        metadata: { orderId, kind: "base_order" },
      },
      metadata: { orderId, kind: "base_order" },
      return_url: finalReturnUrl,
    });

    const { error: updateError } = await supabase
      .from("orders")
      .update({
        stripe_checkout_session_id: session.id,
        stripe_payment_intent_id:
          typeof session.payment_intent === "string" ? session.payment_intent : null,
        stripe_customer_id: customerId,
        stripe_env: env,
        payment_status: "checkout_started",
      })
      .eq("id", orderId);

    if (updateError) {
      console.error("[create-checkout] orders.update failed:", updateError);
      return json({ error: "order_update_failed", detail: updateError.message }, 500);
    }

    console.log(
      `[create-checkout] ok order=${orderId} session=${session.id} amount=${amountCents} ${currency}`,
    );

    return json({
      ok: true,
      clientSecret: session.client_secret,
      sessionId: session.id,
      amount: amountCents,
      currency,
    });
  } catch (e: any) {
    console.error("[create-checkout] error:", e?.message || e, e?.raw || "");
    return json(
      { error: "stripe_error", message: e?.message || "Internal error" },
      500,
    );
  }
});

/**
 * Free song redemption: validates the reward code, atomically decrements
 * free_songs_remaining, marks the order paid for $0, and kicks off brief
 * generation immediately. No Stripe involvement.
 */
async function handleFreeSongRedemption(orderId: string, code: string, req: Request) {
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
      status: "upsells_complete",
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
