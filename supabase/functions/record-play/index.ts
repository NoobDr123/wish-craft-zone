// Records a "play" event whenever someone listens to a delivered song.
//
// This is chargeback-defense evidence: if a customer disputes their charge,
// we can show Stripe a log of every time they (or the gift recipient) listened
// to the song. After each play we also push an updated `play_count` to the
// PaymentIntent metadata so Stripe sees the activity directly.
//
// Public endpoint — no auth required (the listen page is shareable). RLS on
// `play_events` validates that the order_id actually exists.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { createStripeClient, type StripeEnv } from "../_shared/stripe.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Cap the number of Stripe metadata updates per order to avoid hammering the
// Stripe API on a song that gets played 500 times. We update at counts of
// 1, 3, 5, 10, 25, 50, 100. Beyond that, we keep logging plays in the DB but
// stop syncing each one to Stripe (the metadata already says "100+").
const STRIPE_SYNC_THRESHOLDS = new Set([1, 3, 5, 10, 25, 50, 100]);

async function hashIp(ip: string | null): Promise<string | null> {
  if (!ip) return null;
  const enc = new TextEncoder().encode(ip);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf))
    .slice(0, 8)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const body = await req.json().catch(() => ({}));
    const orderId = typeof body.orderId === "string" ? body.orderId : null;
    const variantId = typeof body.variantId === "string" ? body.variantId : null;
    const durationMs = typeof body.durationMs === "number" ? body.durationMs : null;
    const source = typeof body.source === "string" ? body.source.slice(0, 50) : "listen_page";
    const kind = body.kind === "view" || body.kind === "share" ? body.kind : "play";

    if (!orderId || !/^[0-9a-f-]{36}$/i.test(orderId)) {
      return json({ error: "Invalid orderId" }, 400);
    }

    const userAgent = req.headers.get("user-agent")?.slice(0, 500) ?? null;
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      ?? req.headers.get("cf-connecting-ip")
      ?? null;
    const ipHash = await hashIp(ip);

    // "view" / "share" events go to job_events (cheap, lightweight) and bump
    // a counter on the Stripe PI at threshold milestones. "play" events
    // additionally insert into play_events as chargeback evidence.
    if (kind === "view" || kind === "share") {
      await supabase.from("job_events").insert({
        order_id: orderId,
        event_type: kind === "view" ? "share_page_viewed" : "share_link_shared",
        payload: { source, ip_hash: ipHash, user_agent: userAgent?.slice(0, 200) },
      });

      const { count } = await supabase
        .from("job_events")
        .select("*", { count: "exact", head: true })
        .eq("order_id", orderId)
        .eq("event_type", kind === "view" ? "share_page_viewed" : "share_link_shared");

      const total = count ?? 1;
      if (STRIPE_SYNC_THRESHOLDS.has(total)) {
        syncShareEventToStripe(orderId, kind, total).catch((e) =>
          console.error("syncShareEventToStripe failed:", e),
        );
      }
      return json({ ok: true, count: total, kind });
    }

    // Insert the play event
    const { error: insertErr } = await supabase
      .from("play_events")
      .insert({
        order_id: orderId,
        variant_id: variantId,
        duration_ms: durationMs,
        user_agent: userAgent,
        ip_hash: ipHash,
        source,
      });

    if (insertErr) {
      console.error("play_events insert failed:", insertErr);
      return json({ error: "Failed to record play" }, 500);
    }

    // Count total plays for this order
    const { count } = await supabase
      .from("play_events")
      .select("*", { count: "exact", head: true })
      .eq("order_id", orderId);

    const playCount = count ?? 1;

    // Sync to Stripe at threshold milestones (best-effort)
    if (STRIPE_SYNC_THRESHOLDS.has(playCount)) {
      syncPlayCountToStripe(orderId, playCount).catch((e) =>
        console.error("syncPlayCountToStripe failed:", e),
      );
    }

    return json({ ok: true, playCount });
  } catch (e: any) {
    console.error("record-play error:", e);
    return json({ error: e.message ?? "Internal error" }, 500);
  }
});

async function syncPlayCountToStripe(orderId: string, playCount: number) {
  const { data: order } = await supabase
    .from("orders")
    .select("stripe_payment_intent_id, stripe_env")
    .eq("id", orderId)
    .maybeSingle();

  if (!order?.stripe_payment_intent_id) return;
  if (order.stripe_env !== "live" && order.stripe_env !== "sandbox") return;

  const env: StripeEnv = order.stripe_env;
  const stripe = createStripeClient(env);

  await stripe.paymentIntents.update(order.stripe_payment_intent_id, {
    metadata: {
      play_count: String(playCount),
      last_played_at: new Date().toISOString(),
    },
  });
}

async function syncShareEventToStripe(orderId: string, kind: "view" | "share", count: number) {
  const { data: order } = await supabase
    .from("orders")
    .select("stripe_payment_intent_id, stripe_env")
    .eq("id", orderId)
    .maybeSingle();

  if (!order?.stripe_payment_intent_id) return;
  if (order.stripe_env !== "live" && order.stripe_env !== "sandbox") return;

  const env: StripeEnv = order.stripe_env;
  const stripe = createStripeClient(env);

  const now = new Date().toISOString();
  await stripe.paymentIntents.update(order.stripe_payment_intent_id, {
    metadata: kind === "view"
      ? { share_view_count: String(count), last_share_view_at: now }
      : { share_link_shared_count: String(count), last_share_link_shared_at: now },
  });
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
