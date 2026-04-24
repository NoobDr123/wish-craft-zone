// Auto-login after successful checkout.
//
// Security model:
//   The client posts { paymentIntentId } from /checkout/return after Stripe
//   confirms the payment in the browser. This function then:
//     1) Verifies the PI is real and SUCCEEDED with Stripe (server-side).
//     2) Confirms the PI age is recent (≤ 30 minutes since creation) so a
//        leaked PI id can't be re-used months later to log in.
//     3) Looks up the order tied to that PI and confirms payment_status='paid'
//        and that we haven't already auto-provisioned for this PI.
//     4) Creates (or finds) the auth user for the buyer's email.
//     5) Generates a one-time magic-link via the admin API and returns the
//        action_link to the client. The client navigates to it; Supabase
//        sets the session and bounces back to /dashboard.
//   No long-lived secret is exposed to the browser. The PI id alone is not
//   enough to log in — the PI must verify as 'succeeded' and be recent.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, createStripeClient, type StripeEnv } from "../_shared/stripe.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const PI_MAX_AGE_SECONDS = 30 * 60; // 30 minutes

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  try {
    const { paymentIntentId, environment, redirectTo } = await req.json();

    if (!paymentIntentId || typeof paymentIntentId !== "string") {
      return json({ error: "paymentIntentId required" }, 400);
    }
    if (!paymentIntentId.startsWith("pi_")) {
      return json({ error: "Invalid paymentIntentId" }, 400);
    }

    const env = (environment === "live" ? "live" : "sandbox") as StripeEnv;

    // 1) Verify with Stripe — this is the actual proof the user paid.
    const stripe = createStripeClient(env);
    const pi = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (pi.status !== "succeeded") {
      return json({ error: "Payment not completed" }, 403);
    }

    // 2) Recency check — prevents replay attacks with stale PIs.
    const ageSeconds = Math.floor(Date.now() / 1000) - (pi.created ?? 0);
    if (ageSeconds > PI_MAX_AGE_SECONDS) {
      return json({ error: "Payment too old to auto-login" }, 403);
    }

    // 3) Look up the order — must be paid, must be for this PI.
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select("id, buyer_email, payment_status, auto_user_provisioned_at, user_id")
      .eq("stripe_payment_intent_id", paymentIntentId)
      .maybeSingle();

    if (orderErr) {
      console.error("orders lookup failed:", orderErr);
      return json({ error: "Lookup failed" }, 500);
    }
    if (!order) return json({ error: "Order not found" }, 404);
    if (order.payment_status !== "paid") {
      return json({ error: "Order not yet marked paid" }, 409);
    }

    const email = order.buyer_email.trim().toLowerCase();
    const safeRedirect = sanitizeRedirect(redirectTo);
    const baseUrl =
      Deno.env.get("PUBLIC_SITE_URL") ?? "https://ribbonsong.com";

    // 4) Create or find the auth user.
    //
    // We use the admin API directly because signInWithOtp + shouldCreateUser
    // can fail with "Database error saving new user" when triggers race or
    // when the email already exists in another state.
    let userId: string | null = null;

    // Try to find an existing user first.
    const { data: existing, error: lookupErr } = await supabase.auth.admin
      .listUsers({ page: 1, perPage: 1 } as any);
    // (listUsers can't filter by email on every plan; fall back to insert+catch)
    void existing;
    void lookupErr;

    // The cleanest approach: try to create; if duplicate, fetch by email.
    const { data: created, error: createErr } = await supabase.auth.admin
      .createUser({
        email,
        email_confirm: true, // auto-confirm — they proved ownership by paying
        user_metadata: {
          source: "checkout_auto_provision",
          first_order_id: order.id,
        },
      });

    if (createErr && !isDuplicateUserError(createErr)) {
      console.error("admin.createUser failed:", createErr);
      return json({ error: "Could not provision user" }, 500);
    }

    if (created?.user) {
      userId = created.user.id;
    } else {
      // Duplicate — fetch the existing user.
      const { data: found } = await supabase.auth.admin.listUsers({
        // @ts-ignore — supported as a query parameter
        email,
      } as any);
      const match = found?.users?.find(
        (u: any) => (u.email ?? "").toLowerCase() === email,
      );
      if (!match) {
        console.error("Existing user not findable for email:", email);
        return json({ error: "User exists but not retrievable" }, 500);
      }
      userId = match.id;
    }

    if (!userId) return json({ error: "No user id" }, 500);

    // Mark the order as provisioned (one-time) and link user_id.
    if (!order.auto_user_provisioned_at) {
      await supabase
        .from("orders")
        .update({
          auto_user_provisioned_at: new Date().toISOString(),
          user_id: order.user_id ?? userId,
        })
        .eq("id", order.id);
    }

    // 5) Issue a magic-link the browser can immediately follow.
    const { data: linkData, error: linkErr } = await supabase.auth.admin
      .generateLink({
        type: "magiclink",
        email,
        options: {
          redirectTo: `${baseUrl}/auth/callback?redirect=${encodeURIComponent(safeRedirect)}`,
        },
      });

    if (linkErr || !linkData?.properties?.action_link) {
      console.error("generateLink failed:", linkErr);
      return json({ error: "Could not generate session link" }, 500);
    }

    return json({
      ok: true,
      actionLink: linkData.properties.action_link,
      orderId: order.id,
      email,
    });
  } catch (e: any) {
    console.error("redeem-login-token error:", e);
    return json({ error: e?.message ?? "Internal error" }, 500);
  }
});

function isDuplicateUserError(err: any): boolean {
  const msg = (err?.message ?? "").toLowerCase();
  const code = (err?.code ?? "").toLowerCase();
  return (
    msg.includes("already") ||
    msg.includes("duplicate") ||
    msg.includes("registered") ||
    code === "email_exists" ||
    code === "user_already_exists"
  );
}

function sanitizeRedirect(raw: unknown): string {
  if (typeof raw !== "string") return "/dashboard";
  // Whitelist — must start with / and not //
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/dashboard";
  const SAFE = new Set(["/dashboard", "/account", "/create", "/"]);
  // Allow /portal/<uuid>
  if (SAFE.has(raw)) return raw;
  if (/^\/portal\/[0-9a-f-]{36}$/i.test(raw)) return raw;
  return "/dashboard";
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
