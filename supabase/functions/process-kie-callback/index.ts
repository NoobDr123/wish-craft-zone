// Processes a queued KIE callback: extracts audio URL, marks order ready,
// computes scheduled_delivery_at, and enqueues delivery.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { guardInternal } from "../_shared/auth.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const unauthorized = await guardInternal(req, corsHeaders);
  if (unauthorized) return unauthorized;

  try {
    const { orderId, callbackId, taskId } = await req.json();
    if (!orderId && !taskId) return json({ error: "orderId or taskId required" }, 400);

    let cb;
    if (callbackId) {
      const { data } = await supabase
        .from("kie_callbacks")
        .select("*")
        .eq("id", callbackId)
        .maybeSingle();
      cb = data;
    }
    if (!cb && taskId) {
      const { data } = await supabase
        .from("kie_callbacks")
        .select("*")
        .eq("task_id", taskId)
        .order("received_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      cb = data;
    }

    if (!cb) return json({ error: "Callback not found" }, 404);
    if (cb.processed) return json({ ok: true, skipped: "already_processed" });

    const finalOrderId = orderId ?? cb.order_id;
    if (!finalOrderId) {
      await supabase.from("kie_callbacks").update({ processed: true }).eq("id", cb.id);
      return json({ error: "No order linked to callback" }, 400);
    }

    const { data: order } = await supabase
      .from("orders")
      .select("*")
      .eq("id", finalOrderId)
      .single();

    if (!order) return json({ error: "Order not found" }, 404);

    // Extract audio data — KIE returns array of variants
    const data = cb.payload?.data ?? cb.payload;
    const items = data?.data ?? data?.tracks ?? data?.items ?? [];
    const variants = (Array.isArray(items) ? items : [items]).filter(Boolean).map((it: any) => ({
      id: it.id ?? it.audio_id ?? crypto.randomUUID(),
      audio_url: it.audio_url ?? it.audioUrl ?? it.stream_audio_url ?? it.source_audio_url,
      image_url: it.image_url ?? it.imageUrl,
      title: it.title,
      duration: it.duration,
      tags: it.tags,
    }));

    const validVariants = variants.filter((v) => !!v.audio_url);

    // Kie sends multiple callbacks per task: first a "text" callback (lyrics
    // only, no audio), then a "complete"/"first"/audio callback with the
    // actual track. Only the audio callback should advance the order — the
    // text-only callback is informational and must NOT flag the order.
    const stage = (cb.stage ?? "").toString().toLowerCase();
    const callbackType = (cb.payload?.data?.callbackType ?? cb.payload?.callbackType ?? "")
      .toString()
      .toLowerCase();
    const isTextOnlyCallback =
      callbackType === "text" || stage === "text" || stage === "lyrics";

    if (validVariants.length === 0) {
      // Mark this specific callback processed so we don't loop on it, but
      // leave the order untouched — the audio callback will arrive next.
      await supabase.from("kie_callbacks").update({ processed: true }).eq("id", cb.id);
      if (isTextOnlyCallback) {
        await logEvent(finalOrderId, "kie_callback_text_only", {
          callbackType,
          stage,
        });
        return json({ ok: true, skipped: "text_only_callback" });
      }
      // Genuinely no audio after a non-text callback — flag for review.
      await logEvent(finalOrderId, "kie_callback_no_audio", { payload: cb.payload });
      await supabase
        .from("orders")
        .update({
          flagged_for_review: true,
          flag_reason: "KIE returned no audio URL",
        })
        .eq("id", finalOrderId);
      return json({ error: "no audio in callback" }, 400);
    }

    // 1 variant (per spec). Pick first with audio.
    const chosen = validVariants[0];

    // Compute scheduled delivery based on tier (under-promise / over-deliver):
    //   standard       promised 5 days   → actually delivered ~3 days  (72h)
    //   rush_24h       promised 24 hours → actually delivered ~12 hours (12h)
    //   priority_90min promised 90 min   → actually delivered ~60 min  (1h)
    // (Gift delivery_date branching removed for now — will revisit later.)
    const now = new Date();
    const tierDelayHours: Record<string, number> = {
      standard: 72,
      rush_24h: 12,
      priority_90min: 1,
    };
    const tier = (order.delivery_tier as string) || (order.is_rush ? "rush_24h" : "standard");
    const delayHours = tierDelayHours[tier] ?? 72;
    const scheduled = new Date(now.getTime() + delayHours * 60 * 60 * 1000);

    const slug = order.share_page_slug ?? finalOrderId;

    await supabase
      .from("orders")
      .update({
        audio_variants: validVariants,
        selected_variant_id: chosen.id,
        share_page_slug: slug,
        status: "ready_to_deliver",
        scheduled_delivery_at: scheduled.toISOString(),
        // Clear any stale "no audio URL" flag set by an earlier text-only callback.
        flagged_for_review: false,
        flag_reason: null,
      })
      .eq("id", finalOrderId);

    await supabase.from("kie_callbacks").update({ processed: true }).eq("id", cb.id);

    await logEvent(finalOrderId, "ready_to_deliver", {
      scheduled_delivery_at: scheduled.toISOString(),
      variant_id: chosen.id,
      delivery_tier: tier,
      delay_hours: delayHours,
    });

    // If scheduled is now or past, enqueue immediately via the public RPC
    // (pgmq schema is not reachable through PostgREST directly).
    if (scheduled <= now) {
      const { error: enqueueErr } = await supabase.rpc("enqueue_job" as any, {
        queue_name: "deliver_song",
        payload: { orderId: finalOrderId },
      } as any);
      if (enqueueErr) {
        console.error("enqueue deliver_song failed", enqueueErr);
        await logEvent(finalOrderId, "enqueue_failed", {
          queue: "deliver_song",
          error: enqueueErr.message,
        });
      }
    }

    return json({ ok: true, scheduled: scheduled.toISOString() });
  } catch (e: any) {
    console.error("process-kie-callback error", e);
    return json({ error: e.message }, 500);
  }
});

async function logEvent(orderId: string, type: string, payload: any) {
  await supabase.from("job_events").insert({ order_id: orderId, event_type: type, payload });
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
