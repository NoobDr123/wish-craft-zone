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
    const payload = await req.json().catch(() => ({}));

    const taskId =
      payload?.data?.task_id ??
      payload?.data?.taskId ??
      payload?.taskId ??
      payload?.task_id ??
      "unknown";

    const stage = payload?.data?.callbackType ?? payload?.callbackType ?? "complete";

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
