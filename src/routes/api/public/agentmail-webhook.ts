// AgentMail inbound email webhook.
// Verifies the Svix signature, then upserts a support_thread + support_message
// for `message.received*` events. Returns 200 quickly; idempotent on retries
// thanks to the unique index on agentmail_message_id.

import { createFileRoute } from "@tanstack/react-router";
import { Webhook } from "svix";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

type Maybe<T> = T | null | undefined;

interface InboundMessage {
  inbox_id: string;
  thread_id: string;
  message_id: string;
  from?: string;
  to?: string[];
  subject?: string;
  preview?: string;
  text?: string;
  html?: string;
  timestamp?: string;
}

interface InboundThread {
  inbox_id: string;
  thread_id: string;
  subject?: string;
}

interface InboundEvent {
  event_type: string;
  event_id?: string;
  message?: InboundMessage;
  thread?: InboundThread;
}

const RECEIVED_EVENTS = new Set([
  "message.received",
  "message.received.spam",
  "message.received.unauthenticated",
]);

function parseFrom(from: Maybe<string>): { name: string; email: string } {
  const raw = (from ?? "").trim();
  if (!raw) return { name: "Unknown", email: "unknown@unknown" };
  const match = raw.match(/^(.*?)\s*<([^>]+)>\s*$/);
  if (match) {
    const name = match[1].replace(/(^"|"$)/g, "").trim() || match[2];
    return { name, email: match[2].toLowerCase() };
  }
  return { name: raw, email: raw.toLowerCase() };
}

function htmlToText(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function extractOrderId(text: string): string | null {
  // Matches a UUID anywhere in the body, or "Order #12345" / "order: xyz".
  const uuid = text.match(
    /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i,
  );
  if (uuid) return uuid[0];
  const tagged = text.match(/order[\s#:]*([A-Za-z0-9_-]{4,})/i);
  return tagged ? tagged[1] : null;
}

export const Route = createFileRoute("/api/public/agentmail-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.AGENTMAIL_WEBHOOK_SECRET;
        if (!secret) {
          console.error("[agentmail-webhook] AGENTMAIL_WEBHOOK_SECRET missing");
          return new Response("Server not configured", { status: 500 });
        }

        const payload = await request.text();
        const headers = {
          "svix-id": request.headers.get("svix-id") ?? "",
          "svix-timestamp": request.headers.get("svix-timestamp") ?? "",
          "svix-signature": request.headers.get("svix-signature") ?? "",
        };

        let event: InboundEvent;
        try {
          const wh = new Webhook(secret);
          event = wh.verify(payload, headers) as InboundEvent;
        } catch (err) {
          console.error("[agentmail-webhook] signature verify failed", err);
          return new Response("Invalid signature", { status: 400 });
        }

        if (!RECEIVED_EVENTS.has(event.event_type)) {
          // Other events (sent/delivered/etc.) — ignore for now.
          return new Response("ok", { status: 200 });
        }

        const msg = event.message;
        if (!msg) return new Response("ok", { status: 200 });

        const { name: senderName, email: senderEmail } = parseFrom(msg.from);
        const subject = (msg.subject ?? "(no subject)").slice(0, 500);
        const bodyText =
          (msg.text && msg.text.trim()) ||
          (msg.html ? htmlToText(msg.html) : "") ||
          msg.preview ||
          "";
        const orderRef = extractOrderId(`${subject}\n${bodyText}`);

        // 1. Find or create the thread by AgentMail thread_id.
        const { data: existing } = await supabaseAdmin
          .from("support_threads")
          .select("id, status")
          .eq("agentmail_thread_id", msg.thread_id)
          .maybeSingle();

        let threadId: string;
        if (existing) {
          threadId = existing.id;
          await supabaseAdmin
            .from("support_threads")
            .update({
              last_activity_at: new Date().toISOString(),
              // re-open closed threads when a new reply arrives
              status: existing.status === "closed" ? "new" : existing.status,
            })
            .eq("id", threadId);
        } else {
          const { data: created, error: createErr } = await supabaseAdmin
            .from("support_threads")
            .insert({
              agentmail_thread_id: msg.thread_id,
              agentmail_inbox_id: msg.inbox_id,
              sender_name: senderName,
              sender_email: senderEmail,
              subject,
              status: "new",
              order_id_text: orderRef,
            })
            .select("id")
            .single();
          if (createErr || !created) {
            console.error("[agentmail-webhook] thread insert failed", createErr);
            return new Response("DB error", { status: 500 });
          }
          threadId = created.id;
        }

        // 2. Insert the inbound message (idempotent via unique index).
        const { error: msgErr } = await supabaseAdmin
          .from("support_messages")
          .insert({
            thread_id: threadId,
            direction: "inbound",
            body: bodyText || "(empty)",
            agentmail_message_id: msg.message_id,
          });

        if (msgErr && !String(msgErr.message).includes("duplicate")) {
          console.error("[agentmail-webhook] message insert failed", msgErr);
          return new Response("DB error", { status: 500 });
        }

        // Fire-and-forget AI classification of new inbound message
        supabaseAdmin.functions
          .invoke("classify-support-message", { body: { threadId } })
          .catch((e) => console.error("[agentmail-webhook] classify failed", e));

        return new Response("ok", { status: 200 });
      },

      // Handle preflight just in case AgentMail probes.
      GET: async () => new Response("agentmail-webhook ok", { status: 200 }),
    },
  },
});
