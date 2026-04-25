// Admin-only — append an outbound reply to a support thread and email the
// customer. Requires admin role.

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
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) return json({ error: "Missing auth" }, 401);

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: `Bearer ${token}` } } },
    );
    const { data: userResp } = await userClient.auth.getUser();
    const user = userResp?.user;
    if (!user) return json({ error: "Unauthenticated" }, 401);

    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });
    if (!isAdmin) return json({ error: "Forbidden" }, 403);

    const { threadId, body, closeThread } = await req.json();
    if (!threadId || !body || typeof body !== "string" || !body.trim()) {
      return json({ error: "threadId and body required" }, 400);
    }
    const text = String(body).trim().slice(0, 10000);

    // Load thread
    const { data: thread, error: threadErr } = await supabase
      .from("support_threads")
      .select("id, sender_name, sender_email, subject, status")
      .eq("id", threadId)
      .maybeSingle();
    if (threadErr || !thread) return json({ error: "Thread not found" }, 404);

    // Insert outbound message (trigger will bump activity + flip status to open)
    const { error: msgErr } = await supabase.from("support_messages").insert({
      thread_id: thread.id,
      direction: "outbound",
      author_user_id: user.id,
      body: text,
    });
    if (msgErr) {
      console.error("insert outbound failed", msgErr);
      return json({ error: msgErr.message }, 500);
    }

    // Optional: close after reply
    if (closeThread) {
      await supabase
        .from("support_threads")
        .update({ status: "closed" })
        .eq("id", thread.id);
    }

    // Send reply email to customer
    try {
      await supabase.functions.invoke("send-app-email", {
        body: {
          template: "support-reply",
          to: thread.sender_email,
          data: {
            sender_name: thread.sender_name,
            original_subject: thread.subject,
            body: text,
          },
          idempotencyKey: `support-reply:${thread.id}:${Date.now()}`,
        },
      });
    } catch (e) {
      console.error("reply email failed", e);
    }

    return json({ ok: true });
  } catch (e: any) {
    console.error("reply-support-message error", e);
    return json({ error: e.message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
