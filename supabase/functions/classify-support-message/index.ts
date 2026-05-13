// AI-powered classifier for inbound support messages.
// - Detects spam (cold outreach, SEO/marketing pitches, scams)
// - Generates a 1-line summary
// - Drafts a suggested reply for legit messages
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

const SYSTEM_PROMPT = `You are a support inbox triage agent for RibbonSong / PawPrintSong — a service that creates custom songs about people's pets.

Classify each inbound message as ONE of:
- "spam": cold outreach, SEO/marketing/web-dev pitches, crypto scams, unsolicited sales, AI agent demos, link farms, anything not from a real customer or potential customer asking about songs/pets
- "legit": real customer inquiry — questions about orders, songs, refunds, gifts, technical issues, complaints, praise, pre-sales questions
- "unsure": genuinely ambiguous

Consider strong spam signals: generic "hello," opener, mentions of SEO/Google ranking/traffic/leads/conversions/web design, "I noticed your website...", phone-call pitches, "boost your business", lookalike domains, vague compliments, no mention of pets/songs/orders.

For LEGIT messages, also draft a warm, brief reply (2-4 sentences) that addresses their specific question. Sign off as "RibbonSong team". Do NOT make up policies — if you don't know, say you'll look into it. If they mention an order ID, acknowledge it.

For SPAM, suggested_reply should be empty string.

Respond ONLY with valid JSON matching this exact shape:
{"classification":"spam|legit|unsure","score":0.0-1.0,"reason":"one short sentence","summary":"5-10 word summary of what they want","suggested_reply":"draft reply or empty string"}`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { threadId } = await req.json();
    if (!threadId) return json({ error: "threadId required" }, 400);

    const { data: thread } = await supabase
      .from("support_threads")
      .select("id, sender_name, sender_email, subject, order_id_text")
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
    const score = typeof parsed.score === "number" ? parsed.score : null;
    const reason = String(parsed.reason ?? "").slice(0, 500);
    const summary = String(parsed.summary ?? "").slice(0, 300);
    const suggestedReply = String(parsed.suggested_reply ?? "").slice(0, 4000);

    // Auto-mark spam threads as "spam" status (kept out of "all" by default)
    const updates: Record<string, any> = {
      spam_classification: classification,
      spam_score: score,
      spam_reason: reason,
      ai_summary: summary,
      ai_suggested_reply: suggestedReply,
      ai_classified_at: new Date().toISOString(),
    };
    if (classification === "spam") {
      updates.status = "spam";
    }

    await supabase.from("support_threads").update(updates).eq("id", threadId);

    return json({ ok: true, classification, score, summary });
  } catch (e: any) {
    console.error("classify-support-message error", e);
    return json({ error: e.message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
