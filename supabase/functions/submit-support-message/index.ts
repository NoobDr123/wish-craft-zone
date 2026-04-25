// Public endpoint — receives a contact-form submission, creates a support
// thread + first message, sends an acknowledgment to the customer and a
// notification to the support inbox. JWT verification is OFF (anon visitors).

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const SUPPORT_INBOX = "hello@ribbonsong.com";
const ADMIN_INBOX_URL = "https://ribbonsong.com/admin";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const name = String(body.name ?? "").trim().slice(0, 100);
    const email = String(body.email ?? "").trim().toLowerCase().slice(0, 255);
    const orderId = body.orderId ? String(body.orderId).trim().slice(0, 100) : null;
    const message = String(body.message ?? "").trim().slice(0, 5000);
    const subjectInput = body.subject ? String(body.subject).trim().slice(0, 200) : null;

    if (!name || !email || !message) {
      return json({ error: "name, email and message required" }, 400);
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json({ error: "invalid email" }, 400);
    }

    // Derive a short subject if none provided
    const subject =
      subjectInput ||
      message.split("\n")[0].slice(0, 80) ||
      "Support message";

    // Create thread
    const { data: thread, error: threadErr } = await supabase
      .from("support_threads")
      .insert({
        sender_name: name,
        sender_email: email,
        order_id_text: orderId,
        subject,
        status: "new",
      })
      .select("id")
      .single();

    if (threadErr || !thread) {
      console.error("create thread failed", threadErr);
      return json({ error: "could not create thread" }, 500);
    }

    // Insert first inbound message
    const { error: msgErr } = await supabase.from("support_messages").insert({
      thread_id: thread.id,
      direction: "inbound",
      body: message,
    });
    if (msgErr) {
      console.error("create message failed", msgErr);
    }

    // Fire-and-forget emails (don't block the response on them)
    const sendEmail = async (template: string, to: string, data: Record<string, any>) => {
      try {
        await supabase.functions.invoke("send-app-email", {
          body: { template, to, data, idempotencyKey: `${template}:${thread.id}` },
        });
      } catch (e) {
        console.error(`email ${template} failed`, e);
      }
    };

    await Promise.allSettled([
      sendEmail("support-acknowledgment", email, {
        sender_name: name,
      }),
      sendEmail("support-notification", SUPPORT_INBOX, {
        sender_name: name,
        sender_email: email,
        subject,
        body: message,
        order_id_text: orderId,
        inbox_url: ADMIN_INBOX_URL,
      }),
    ]);

    return json({ ok: true, threadId: thread.id });
  } catch (e: any) {
    console.error("submit-support-message error", e);
    return json({ error: e.message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
