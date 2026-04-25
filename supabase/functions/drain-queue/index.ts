// Generic queue drainer. Reads N messages from a pgmq queue, calls the
// target edge function for each, and deletes the message on 2xx.
// Invoked by pg_cron every minute.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { guardInternal } from "../_shared/auth.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const INTERNAL_SECRET = Deno.env.get("INTERNAL_TRIGGER_SECRET")!;

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Auth: accept the internal secret OR the service role key.
  // pg_cron sends the internal secret via x-internal-secret (cleanest path).
  // Edge-to-edge fetches send the service role key as the Bearer.
  const auth = req.headers.get("Authorization") ?? "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  const providedSecret = req.headers.get("x-internal-secret") ?? "";

  const isAuthorized =
    (providedSecret && providedSecret === INTERNAL_SECRET) ||
    (token && token === SERVICE_KEY);

  if (!isAuthorized) {
    const unauthorized = await guardInternal(req, corsHeaders);
    if (unauthorized) return unauthorized;
  }

  try {
    const { queue, target, batch = 5, vt = 60 } = await req.json();
    if (!queue || !target) return json({ error: "queue and target required" }, 400);

    const { data: msgs, error: readErr } = await supabase.rpc("read_queue", {
      queue_name: queue,
      batch_size: batch,
      vt,
    } as any);

    if (readErr) {
      console.error("read_queue error", readErr);
      return json({ error: readErr.message }, 500);
    }

    const messages = (msgs as any[]) ?? [];
    if (messages.length === 0) return json({ ok: true, drained: 0 });

    const results: any[] = [];
    for (const m of messages) {
      try {
        const payload = m.message ?? m.payload ?? {};
        const res = await fetch(`${SUPABASE_URL}/functions/v1/${target}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${SERVICE_KEY}`,
            "x-internal-secret": INTERNAL_SECRET,
          },
          body: JSON.stringify(payload),
        });

        const ok = res.ok;
        const body = await res.text().catch(() => "");

        if (ok) {
          await supabase.rpc("delete_queue_message", {
            queue_name: queue,
            message_id: m.msg_id,
          } as any);
          results.push({ msg_id: m.msg_id, status: "delivered" });
        } else {
          // After many retries, send to DLQ
          if ((m.read_ct ?? 0) >= 5) {
            await supabase.rpc("move_to_dlq", {
              source_queue: queue,
              dlq_name: `${queue}_dlq`,
              message_id: m.msg_id,
              payload: payload,
            } as any);
            results.push({ msg_id: m.msg_id, status: "dlq", error: body.slice(0, 200) });
          } else {
            results.push({ msg_id: m.msg_id, status: "retry", code: res.status });
          }
        }
      } catch (e: any) {
        results.push({ msg_id: m.msg_id, status: "error", error: e.message });
      }
    }

    return json({ ok: true, drained: messages.length, results });
  } catch (e: any) {
    console.error("drain-queue error", e);
    return json({ error: e.message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
