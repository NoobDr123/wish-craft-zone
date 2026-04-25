// Processes a queued KIE callback: extracts audio URL, marks order ready,
// computes scheduled_delivery_at, and enqueues delivery.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

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
    if (validVariants.length === 0) {
      await logEvent(finalOrderId, "kie_callback_no_audio", { payload: cb.payload });
      await supabase
        .from("orders")
        .update({
          flagged_for_review: true,
          flag_reason: "KIE returned no audio URL",
        })
        .eq("id", finalOrderId);
      await supabase.from("kie_callbacks").update({ processed: true }).eq("id", cb.id);
      return json({ error: "no audio in callback" }, 400);
    }

    // 1 variant (per spec). Pick first with audio.
    const chosen = validVariants[0];

    // Compute scheduled delivery based on tier (under-promise / over-deliver):
    //   standard    => 24h after song is ready (promised 5 days on landing)
    //   express_48h => 12h (promised 48h)
    //   rush_24h    => 7h  (promised 24h)
    // (Gift delivery_date branching removed for now — will revisit later.)
    const now = new Date();
    const tierDelayHours: Record<string, number> = {
      standard: 24,
      express_48h: 12,
      rush_24h: 7,
    };
    const tier = (order.delivery_tier as string) || (order.is_rush ? "rush_24h" : "standard");
    const delayHours = tierDelayHours[tier] ?? 24;
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
      })
      .eq("id", finalOrderId);

    await supabase.from("kie_callbacks").update({ processed: true }).eq("id", cb.id);

    await logEvent(finalOrderId, "ready_to_deliver", {
      scheduled_delivery_at: scheduled.toISOString(),
      variant_id: chosen.id,
      delivery_tier: tier,
      delay_hours: delayHours,
    });

    // If scheduled is now or past, enqueue immediately
    if (scheduled <= now) {
      await supabase.schema("pgmq" as any).rpc("send", {
        queue_name: "deliver_song",
        msg: { orderId: finalOrderId },
      } as any);
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
