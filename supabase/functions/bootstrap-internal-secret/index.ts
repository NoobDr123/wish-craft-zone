// One-shot bootstrap: copies INTERNAL_TRIGGER_SECRET env var into the
// internal_settings table so pg_cron jobs can read it and send it as
// x-internal-secret when calling drain-queue.
//
// Auth: requires the service role key as Bearer. Safe to leave deployed —
// idempotent upsert, no side effects beyond writing the secret row.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SECRET = Deno.env.get("INTERNAL_TRIGGER_SECRET");

  // Only the service role key may invoke this.
  const auth = req.headers.get("Authorization") ?? "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  if (token !== SERVICE_KEY) {
    return json({ error: "Unauthorized" }, 401);
  }

  if (!SECRET) {
    return json({ error: "INTERNAL_TRIGGER_SECRET env var is not set" }, 500);
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  const { error } = await supabase
    .from("internal_settings")
    .upsert(
      { key: "internal_trigger_secret", value: SECRET, updated_at: new Date().toISOString() },
      { onConflict: "key" },
    );

  if (error) return json({ error: error.message }, 500);
  return json({ ok: true, key: "internal_trigger_secret", length: SECRET.length });
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
