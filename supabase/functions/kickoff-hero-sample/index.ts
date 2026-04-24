// One-shot helper: triggers either hero song generation or karaoke sync
// using the INTERNAL_TRIGGER_SECRET available in env. Safe to delete after use.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { sampleId, taskId, mode = "generate" } = await req.json();
    if (!sampleId) {
      return new Response(JSON.stringify({ error: "Missing sampleId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const secret = Deno.env.get("INTERNAL_TRIGGER_SECRET");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    if (!secret || !supabaseUrl) {
      return new Response(JSON.stringify({ error: "Server not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const targetPath = mode === "karaoke"
      ? "audioshake-align"
      : "generate-sample";

    const res = await fetch(`${supabaseUrl}/functions/v1/${targetPath}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-secret": secret,
      },
      body: JSON.stringify({ sampleId, taskId }),
    });

    const body = await res.text();
    return new Response(body, {
      status: res.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
