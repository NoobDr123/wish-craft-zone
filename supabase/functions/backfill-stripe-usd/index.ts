// Admin-only backfill: walks orders that have a stripe_payment_intent_id but
// no amount_paid_usd_cents yet, retrieves the PaymentIntent's
// balance_transaction, and stores the actual settled USD account-currency
// cents. Idempotent — safe to run repeatedly.
//
// POST { limit?: number }  — defaults to 200 per call.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, createStripeClient, getSettledUsdCents, type StripeEnv } from "../_shared/stripe.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  // Admin auth
  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace("Bearer ", "");
  if (!token) return json({ error: "Unauthorized" }, 401);
  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) return json({ error: "Unauthorized" }, 401);
  const { data: roles } = await supabase
    .from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
  if (!roles) return json({ error: "Forbidden" }, 403);

  let body: { limit?: number } = {};
  try { body = await req.json(); } catch { /* ignore */ }
  const limit = Math.min(Math.max(body.limit ?? 200, 1), 500);

  const { data: orders, error } = await supabase
    .from("orders")
    .select("id, stripe_payment_intent_id, stripe_env, amount_paid_cents")
    .eq("payment_status", "paid")
    .is("amount_paid_usd_cents", null)
    .not("stripe_payment_intent_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return json({ error: error.message }, 500);
  if (!orders || orders.length === 0) return json({ ok: true, processed: 0, remaining: 0 });

  const sandbox = createStripeClient("sandbox" as StripeEnv);
  const live = createStripeClient("live" as StripeEnv);

  let updated = 0;
  let missing = 0;
  for (const o of orders) {
    const env: StripeEnv = (o.stripe_env === "live" ? "live" : "sandbox");
    const stripe = env === "live" ? live : sandbox;
    const usd = await getSettledUsdCents(stripe, o.stripe_payment_intent_id!);
    if (usd == null) { missing++; continue; }
    await supabase.from("orders")
      .update({ amount_paid_usd_cents: usd })
      .eq("id", o.id);
    updated++;
  }

  // How many still need processing
  const { count } = await supabase
    .from("orders")
    .select("*", { count: "exact", head: true })
    .eq("payment_status", "paid")
    .is("amount_paid_usd_cents", null)
    .not("stripe_payment_intent_id", "is", null);

  return json({ ok: true, processed: orders.length, updated, missing, remaining: count ?? 0 });
});
