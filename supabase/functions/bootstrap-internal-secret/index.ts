// One-shot bootstrap: copies INTERNAL_TRIGGER_SECRET env var into the
// internal_settings table so pg_cron jobs can read it and send it as
// x-internal-secret when calling drain-queue.
//
// Auth: open (verify_jwt = false, no internal check). Safe because:
//   - It only WRITES from env to DB; it never returns the secret value.
//   - Once written, it refuses to overwrite (idempotent).
//   - The secret in env was already provisioned by the project owner.
//
// After successful bootstrap + cron rewrite, this function should be
// deleted via supabase--delete_edge_functions.

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

  if (!SECRET) {
    return json({ error: "INTERNAL_TRIGGER_SECRET env var is not set" }, 500);
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  // Refuse to overwrite if already set — prevents tampering after bootstrap.
  const { data: existing } = await supabase
    .from("internal_settings")
    .select("key, value")
    .eq("key", "internal_trigger_secret")
    .maybeSingle();

  if (existing?.value) {
    // Compare without revealing the value.
    const matches = existing.value === SECRET;
    return json({
      ok: true,
      already_set: true,
      matches_env: matches,
      length: existing.value.length,
    });
  }

  const { error } = await supabase
    .from("internal_settings")
    .insert({
      key: "internal_trigger_secret",
      value: SECRET,
      updated_at: new Date().toISOString(),
    });

  if (error) return json({ error: error.message }, 500);
  return json({ ok: true, already_set: false, length: SECRET.length });
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
