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
      .select("id, sender_name, sender_email, subject, status, agentmail_inbox_id")
      .eq("id", threadId)
      .maybeSingle();
    if (threadErr || !thread) return json({ error: "Thread not found" }, 404);

    const apiKey = Deno.env.get("AGENTMAIL_API_KEY");
    if (!apiKey) return json({ error: "AgentMail not configured" }, 500);

    const inboxId = thread.agentmail_inbox_id || "hello@getpawprintsong.com";
    const { data: lastInbound } = await supabase
      .from("support_messages")
      .select("agentmail_message_id")
      .eq("thread_id", thread.id)
      .eq("direction", "inbound")
      .not("agentmail_message_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const endpoint = lastInbound?.agentmail_message_id
      ? `https://api.agentmail.to/v0/inboxes/${encodeURIComponent(inboxId)}/messages/${encodeURIComponent(lastInbound.agentmail_message_id)}/reply`
      : `https://api.agentmail.to/v0/inboxes/${encodeURIComponent(inboxId)}/messages/send`;
    const payload = lastInbound?.agentmail_message_id
      ? { text }
      : { to: [thread.sender_email], subject: thread.subject?.startsWith("Re:") ? thread.subject : `Re: ${thread.subject || "your message"}`, text };

    const amRes = await fetch(endpoint, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!amRes.ok) {
      const errBody = await amRes.text().catch(() => "");
      console.error("AgentMail reply failed", amRes.status, errBody);
      return json({ error: `AgentMail reply failed: ${amRes.status}` }, 502);
    }

    const sent = await amRes.json().catch(() => ({}));
    const { error: msgErr } = await supabase.from("support_messages").insert({
      thread_id: thread.id,
      direction: "outbound",
      author_user_id: user.id,
      body: text,
      agentmail_message_id: sent?.message_id ?? null,
    });
    if (msgErr) {
      console.error("insert outbound failed", msgErr);
      return json({ error: msgErr.message }, 500);
    }

    await supabase
      .from("support_threads")
      .update({ status: closeThread ? "closed" : "open", last_activity_at: new Date().toISOString(), agentmail_inbox_id: inboxId })
      .eq("id", thread.id);

    return json({ ok: true, messageId: sent?.message_id ?? null, from: inboxId });
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
