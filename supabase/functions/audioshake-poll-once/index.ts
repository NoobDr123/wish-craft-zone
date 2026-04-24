// One-shot poller: calls audioshake-align with the existing task ID using the
// internal secret, so we can resume polling without re-submitting the job.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  const secret = Deno.env.get("INTERNAL_TRIGGER_SECRET")!;
  const url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/audioshake-align`;

  const sampleId = "d14f8ca3-ec11-45c7-b52d-a2671284357c";
  const taskId = "cmocbt8fo015ncca1ul7e3vcx";

  const maxAttempts = 40;
  const intervalMs = 4000;
  let last: any = null;

  for (let i = 0; i < maxAttempts; i++) {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-secret": secret,
      },
      body: JSON.stringify({ sampleId, taskId }),
    });
    last = await res.json().catch(() => ({ status: res.status }));
    console.log(`[poll-once] attempt=${i + 1} body=${JSON.stringify(last)}`);
    if (last?.status === "completed" || last?.status === "failed") break;
    if (i < maxAttempts - 1) await new Promise((r) => setTimeout(r, intervalMs));
  }

  return new Response(JSON.stringify({ ok: true, last }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
