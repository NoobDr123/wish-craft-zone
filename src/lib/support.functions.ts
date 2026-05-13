// Admin-only: send a reply on a support thread via AgentMail.
// Reuses the AgentMail thread by replying to the most recent inbound
// message_id we have stored, then writes the outbound message into our DB.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const InputSchema = z.object({
  threadId: z.string().uuid(),
  body: z.string().min(1).max(10000),
  closeThread: z.boolean().optional().default(false),
});

export const replySupportMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => InputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // 1. Verify caller is an admin (RLS-friendly RPC).
    const { data: isAdmin, error: roleErr } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (roleErr || !isAdmin) {
      throw new Response("Forbidden", { status: 403 });
    }

    const apiKey = process.env.AGENTMAIL_API_KEY;
    if (!apiKey) {
      throw new Response("AgentMail not configured", { status: 500 });
    }

    // 2. Load the thread + last inbound message id.
    const { data: thread, error: threadErr } = await supabaseAdmin
      .from("support_threads")
      .select("id, agentmail_inbox_id, agentmail_thread_id, sender_email, subject")
      .eq("id", data.threadId)
      .maybeSingle();

    if (threadErr || !thread) {
      throw new Response("Thread not found", { status: 404 });
    }
    if (!thread.agentmail_inbox_id) {
      throw new Response("Thread has no AgentMail inbox", { status: 400 });
    }

    const { data: lastInbound } = await supabaseAdmin
      .from("support_messages")
      .select("agentmail_message_id")
      .eq("thread_id", data.threadId)
      .eq("direction", "inbound")
      .not("agentmail_message_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const inboxId = thread.agentmail_inbox_id;
    let amResponse: Response;

    if (lastInbound?.agentmail_message_id) {
      // Reply on existing AgentMail thread.
      amResponse = await fetch(
        `https://api.agentmail.to/v0/inboxes/${encodeURIComponent(
          inboxId,
        )}/messages/${encodeURIComponent(lastInbound.agentmail_message_id)}/reply`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ text: data.body }),
        },
      );
    } else {
      // No inbound yet — send a fresh message instead.
      amResponse = await fetch(
        `https://api.agentmail.to/v0/inboxes/${encodeURIComponent(
          inboxId,
        )}/messages/send`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            to: [thread.sender_email],
            subject: thread.subject || "Re: your message",
            text: data.body,
          }),
        },
      );
    }

    if (!amResponse.ok) {
      const errBody = await amResponse.text();
      console.error("[reply-support] AgentMail send failed", amResponse.status, errBody);
      throw new Response(`AgentMail send failed: ${amResponse.status}`, {
        status: 502,
      });
    }

    const sent = (await amResponse.json().catch(() => ({}))) as {
      message_id?: string;
    };

    // 3. Persist outbound message + bump thread status.
    await supabaseAdmin.from("support_messages").insert({
      thread_id: data.threadId,
      direction: "outbound",
      body: data.body,
      author_user_id: userId,
      agentmail_message_id: sent.message_id ?? null,
    });

    await supabaseAdmin
      .from("support_threads")
      .update({
        status: data.closeThread ? "closed" : "open",
        last_activity_at: new Date().toISOString(),
      })
      .eq("id", data.threadId);

    return { ok: true, messageId: sent.message_id ?? null };
  });
