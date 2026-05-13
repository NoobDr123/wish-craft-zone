// AI-powered classifier for inbound support messages.
// - Detects spam (cold outreach, SEO/marketing pitches, scams)
// - Generates a 1-line summary
// - Drafts a suggested reply for legit messages
// - Categorizes (thanks, praise, simple_question, complaint, refund, etc.)
// - Auto-sends replies for low-risk categories (thanks/praise) when the
//   `support_auto_reply_enabled` setting is 'true' and we haven't already
//   replied to this thread.
// Uses Lovable AI Gateway (no API key required - LOVABLE_API_KEY auto-provided).

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

// Categories the AI must pick from. Only "thanks" and "praise" are
// considered safe to auto-reply (no action required, low risk of saying
// the wrong thing). Everything else needs a human.
const SAFE_AUTO_REPLY_CATEGORIES = new Set(["thanks", "praise"]);

const SYSTEM_PROMPT = `You are a support inbox triage agent for RibbonSong / PawPrintSong — a service that creates custom songs about people's pets.

Classify each inbound message as ONE of:
- "spam": cold outreach, SEO/marketing/web-dev pitches, crypto scams, unsolicited sales, AI agent demos, link farms, anything not from a real customer or potential customer asking about songs/pets
- "legit": real customer inquiry — questions about orders, songs, refunds, gifts, technical issues, complaints, praise, pre-sales questions
- "unsure": genuinely ambiguous

Consider strong spam signals: generic "hello," opener, mentions of SEO/Google ranking/traffic/leads/conversions/web design, "I noticed your website...", phone-call pitches, "boost your business", lookalike domains, vague compliments, no mention of pets/songs/orders.

Also pick a category from this list:
- "thanks": a thank-you note, no question, no action needed
- "praise": positive feedback / loved the song, no question, no action needed
- "simple_question": general info question (turnaround, how it works, pricing) — needs human
- "order_status": asking where their song is — needs human
- "refund": refund or cancellation request — needs human
- "complaint": dissatisfied / angry — needs human
- "technical_issue": can't play / download / login — needs human
- "gift": question about gifting — needs human
- "other": anything else legit — needs human
- "spam": only when classification is spam

For LEGIT messages, also draft a warm, brief reply (2-4 sentences) that addresses their specific question. Sign off as "RibbonSong team". Do NOT make up policies — if you don't know, say you'll look into it. If they mention an order ID, acknowledge it.

For SPAM, suggested_reply should be empty string.

Respond ONLY with valid JSON matching this exact shape:
{"classification":"spam|legit|unsure","category":"thanks|praise|simple_question|order_status|refund|complaint|technical_issue|gift|other|spam","score":0.0-1.0,"reason":"one short sentence","summary":"5-10 word summary of what they want","suggested_reply":"draft reply or empty string"}`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { threadId } = await req.json();
    if (!threadId) return json({ error: "threadId required" }, 400);

    const { data: thread } = await supabase
      .from("support_threads")
      .select("id, sender_name, sender_email, subject, order_id_text, agentmail_inbox_id, auto_replied_at")
      .eq("id", threadId)
      .maybeSingle();
    if (!thread) return json({ error: "thread not found" }, 404);

    const { data: firstMsg } = await supabase
      .from("support_messages")
      .select("body")
      .eq("thread_id", threadId)
      .eq("direction", "inbound")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    const messageBody = firstMsg?.body ?? "";

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) return json({ error: "LOVABLE_API_KEY missing" }, 500);

    const userPrompt = `From: ${thread.sender_name} <${thread.sender_email}>
Subject: ${thread.subject}
Order ID: ${thread.order_id_text || "(none)"}

Message:
${messageBody}`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiRes.ok) {
      const txt = await aiRes.text();
      console.error("AI gateway error", aiRes.status, txt);
      return json({ error: "AI failed", status: aiRes.status }, 500);
    }

    const aiData = await aiRes.json();
    const content = aiData?.choices?.[0]?.message?.content ?? "{}";
    let parsed: any = {};
    try {
      parsed = JSON.parse(content);
    } catch {
      console.error("AI returned non-JSON", content);
      return json({ error: "bad AI response" }, 500);
    }

    const classification = ["spam", "legit", "unsure"].includes(parsed.classification)
      ? parsed.classification
      : "unsure";
    const category = String(parsed.category ?? "other").slice(0, 40);
    const score = typeof parsed.score === "number" ? parsed.score : null;
    const reason = String(parsed.reason ?? "").slice(0, 500);
    const summary = String(parsed.summary ?? "").slice(0, 300);
    const suggestedReply = String(parsed.suggested_reply ?? "").slice(0, 4000);

    const autoReplySafe =
      classification === "legit" &&
      SAFE_AUTO_REPLY_CATEGORIES.has(category) &&
      suggestedReply.length > 0;

    const updates: Record<string, any> = {
      spam_classification: classification,
      spam_score: score,
      spam_reason: reason,
      ai_summary: summary,
      ai_suggested_reply: suggestedReply,
      ai_category: category,
      ai_auto_reply_safe: autoReplySafe,
      ai_classified_at: new Date().toISOString(),
    };
    if (classification === "spam") {
      updates.status = "spam";
    }

    await supabase.from("support_threads").update(updates).eq("id", threadId);

    // ---- Auto-reply path ----
    // Only fire when:
    //   - the global setting is enabled
    //   - the message is safe (legit + thanks/praise)
    //   - we haven't already auto-replied or sent any outbound message
    //   - we have an inbox + last inbound agentmail_message_id to reply to
    let autoReplied = false;
    if (autoReplySafe && !thread.auto_replied_at) {
      const { data: setting } = await supabase
        .from("internal_settings")
        .select("value")
        .eq("key", "support_auto_reply_enabled")
        .maybeSingle();

      if (setting?.value === "true") {
        // Make sure no outbound exists yet (paranoia — admin may have replied
        // before classification finished).
        const { count: outboundCount } = await supabase
          .from("support_messages")
          .select("id", { count: "exact", head: true })
          .eq("thread_id", threadId)
          .eq("direction", "outbound");

        if ((outboundCount ?? 0) === 0 && thread.agentmail_inbox_id) {
          autoReplied = await sendAutoReply({
            threadId,
            inboxId: thread.agentmail_inbox_id,
            senderEmail: thread.sender_email,
            subject: thread.subject,
            body: suggestedReply,
          });
        }
      }
    }

    return json({ ok: true, classification, category, score, summary, autoReplied });
  } catch (e: any) {
    console.error("classify-support-message error", e);
    return json({ error: e.message }, 500);
  }
});

async function sendAutoReply(opts: {
  threadId: string;
  inboxId: string;
  senderEmail: string;
  subject: string;
  body: string;
}): Promise<boolean> {
  const apiKey = Deno.env.get("AGENTMAIL_API_KEY");
  if (!apiKey) {
    console.error("[auto-reply] AGENTMAIL_API_KEY missing");
    return false;
  }

  // Find the last inbound agentmail message id to reply on the same thread.
  const { data: lastInbound } = await supabase
    .from("support_messages")
    .select("agentmail_message_id")
    .eq("thread_id", opts.threadId)
    .eq("direction", "inbound")
    .not("agentmail_message_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let res: Response;
  if (lastInbound?.agentmail_message_id) {
    res = await fetch(
      `https://api.agentmail.to/v0/inboxes/${encodeURIComponent(
        opts.inboxId,
      )}/messages/${encodeURIComponent(lastInbound.agentmail_message_id)}/reply`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ text: opts.body }),
      },
    );
  } else {
    res = await fetch(
      `https://api.agentmail.to/v0/inboxes/${encodeURIComponent(opts.inboxId)}/messages/send`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          to: [opts.senderEmail],
          subject: opts.subject || "Re: your message",
          text: opts.body,
        }),
      },
    );
  }

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    console.error("[auto-reply] AgentMail failed", res.status, txt);
    return false;
  }

  const sent = (await res.json().catch(() => ({}))) as { message_id?: string };

  await supabase.from("support_messages").insert({
    thread_id: opts.threadId,
    direction: "outbound",
    body: opts.body,
    agentmail_message_id: sent.message_id ?? null,
    // author_user_id stays null = system / AI
  });

  await supabase
    .from("support_threads")
    .update({
      status: "closed",
      auto_replied_at: new Date().toISOString(),
      last_activity_at: new Date().toISOString(),
    })
    .eq("id", opts.threadId);

  return true;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
