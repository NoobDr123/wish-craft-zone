// Submit-to-KIE (Suno) edge function.
// Reads a brief-ready order, submits to KIE Suno API, stores task id.
// Callback URL is a webhook that KIE will POST to.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { guardInternal } from "../_shared/auth.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const KIE_API_KEY = Deno.env.get("KIE_API_KEY")!;
const KIE_BASE = "https://api.kie.ai";
const CALLBACK_URL = `${Deno.env.get("SUPABASE_URL")!}/functions/v1/kie-callback`;

const SUNO_CONFIG = {
  model: "V5",
  styleWeight: 0.75,
  weirdnessConstraint: 0.3,
  audioWeight: 0.7,
  customMode: true,
  instrumental: false,
  maxDurationSeconds: 300,
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const unauthorized = await guardInternal(req, corsHeaders);
  if (unauthorized) return unauthorized;

  try {
    const { orderId } = await req.json();
    if (!orderId) return json({ error: "Missing orderId" }, 400);

    const { data: order, error } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (error || !order) return json({ error: "Order not found" }, 404);
    if (!order.brief) return json({ error: "Order has no brief" }, 400);
    if (order.kie_task_id) {
      return json({ ok: true, skipped: "already_submitted", taskId: order.kie_task_id });
    }

    const brief = order.brief as { title: string; style_prompt: string; lyrics: string };

    await supabase
      .from("orders")
      .update({ status: "music_generating" })
      .eq("id", orderId);

    const body = {
      prompt: brief.lyrics,
      style: brief.style_prompt,
      title: brief.title,
      customMode: SUNO_CONFIG.customMode,
      instrumental: SUNO_CONFIG.instrumental,
      model: SUNO_CONFIG.model,
      styleWeight: SUNO_CONFIG.styleWeight,
      weirdnessConstraint: SUNO_CONFIG.weirdnessConstraint,
      audioWeight: SUNO_CONFIG.audioWeight,
      callBackUrl: `${CALLBACK_URL}?orderId=${orderId}`,
    };

    const res = await fetch(`${KIE_BASE}/api/v1/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${KIE_API_KEY}`,
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();

    if (!res.ok || data.code !== 200) {
      await logEvent(orderId, "kie_submit_failed", { status: res.status, data });
      await supabase
        .from("orders")
        .update({
          status: "music_failed",
          flagged_for_review: true,
          flag_reason: `KIE submit failed: ${JSON.stringify(data).slice(0, 300)}`,
        })
        .eq("id", orderId);
      return json({ error: "KIE submission failed", data }, 502);
    }

    const taskId = data?.data?.taskId ?? data?.data?.task_id ?? data?.taskId;
    if (!taskId) {
      return json({ error: "No taskId in KIE response", data }, 502);
    }

    await supabase
      .from("orders")
      .update({
        kie_task_id: taskId,
        kie_submitted_at: new Date().toISOString(),
      })
      .eq("id", orderId);

    await logEvent(orderId, "kie_submitted", { taskId });

    return json({ ok: true, taskId });
  } catch (e: any) {
    console.error("submit-to-kie error", e);
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
