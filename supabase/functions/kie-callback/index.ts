// KIE webhook receiver. KIE POSTs here when a Suno task completes.
// We store the raw callback in kie_callbacks and enqueue process-kie-callback
// for async handling. Returns 200 immediately.

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
    const url = new URL(req.url);
    const orderIdFromQuery = url.searchParams.get("orderId");
    const sampleIdFromQuery = url.searchParams.get("sampleId");
    const payload = await req.json().catch(() => ({}));

    const taskId =
      payload?.data?.task_id ??
      payload?.data?.taskId ??
      payload?.taskId ??
      payload?.task_id ??
      "unknown";

    const stage = payload?.data?.callbackType ?? payload?.callbackType ?? "complete";

    // ---- Sample callback path (homepage demo songs) ----
    if (sampleIdFromQuery) {
      const audioUrl =
        payload?.data?.data?.[0]?.audio_url ??
        payload?.data?.audio_url ??
        payload?.audio_url ??
        null;
      const variants = payload?.data?.data ?? null;

      const update: Record<string, unknown> = {
        kie_callback_received_at: new Date().toISOString(),
      };
      if (audioUrl) {
        update.audio_url = audioUrl;
        update.status = "ready";
      }
      if (variants) update.audio_variants = variants;

      await supabase
        .from("featured_samples")
        .update(update)
        .eq("id", sampleIdFromQuery);

      // If audio just landed AND this sample is the current hero (published + sort_order 0),
      // kick AudioShake forced-alignment so the karaoke overlay gets word-level timings.
      // Other featured samples are synced manually from the admin UI to avoid burning credits.
      if (audioUrl) {
        const { data: heroCheck } = await supabase
          .from("featured_samples")
          .select("id")
          .eq("id", sampleIdFromQuery)
          .eq("published", true)
          .eq("sort_order", 0)
          .maybeSingle();

        if (heroCheck) {
          const internalSecret = Deno.env.get("INTERNAL_TRIGGER_SECRET");
          if (internalSecret) {
            fetch(
              `${Deno.env.get("SUPABASE_URL")}/functions/v1/audioshake-align`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "x-internal-secret": internalSecret,
                },
                body: JSON.stringify({ sampleId: sampleIdFromQuery }),
              },
            ).catch((e) => console.warn("audioshake-align kickoff failed:", e));
          } else {
            console.warn("INTERNAL_TRIGGER_SECRET not set; skipping AudioShake");
          }
        } else {
          console.log(
            `[kie-callback] sample ${sampleIdFromQuery} is not hero — skipping auto karaoke sync`,
          );
        }
      }

      return json({ ok: true, sampleId: sampleIdFromQuery });
    }

    // ---- Order callback path (existing customer pipeline) ----
    let orderId = orderIdFromQuery;
    if (!orderId) {
      const { data: o } = await supabase
        .from("orders")
        .select("id")
        .eq("kie_task_id", taskId)
        .maybeSingle();
      orderId = o?.id ?? null;
    }

    // Insert callback row — trigger enqueue_kie_callback_processing fires
    await supabase.from("kie_callbacks").insert({
      task_id: taskId,
      order_id: orderId,
      stage,
      payload,
    });

    if (orderId) {
      await supabase
        .from("orders")
        .update({ kie_callback_received_at: new Date().toISOString() })
        .eq("id", orderId);
    }

    return json({ ok: true });
  } catch (e: any) {
    console.error("kie-callback error", e);
    // Still return 200 so KIE doesn't keep retrying — we have the row
    return json({ ok: true, warning: e.message });
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
