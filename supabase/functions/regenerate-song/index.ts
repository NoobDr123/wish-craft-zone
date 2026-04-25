// Regenerate a delivered song with new context. Calls Claude to rewrite brief
// using original quiz_payload + user's change notes, then resubmits to Suno.
// One-time only per order (regeneration_used_at gate).

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { callClaude, corsHeaders } from "../_shared/claude.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) return json({ error: "Login required" }, 401);

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: `Bearer ${token}` } } },
    );
    const { data: userResp } = await userClient.auth.getUser();
    const user = userResp?.user;
    if (!user) return json({ error: "Login required" }, 401);

    const { orderId, changeNotes } = await req.json();
    if (!orderId || !changeNotes || changeNotes.trim().length < 10) {
      return json({ error: "Missing orderId or changeNotes (min 10 chars)" }, 400);
    }

    const { data: order } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();
    if (!order) return json({ error: "Order not found" }, 404);

    const userEmail = (user.email ?? "").toLowerCase();
    const owns =
      (order.user_id && order.user_id === user.id) ||
      (order.buyer_email && order.buyer_email.toLowerCase() === userEmail);
    if (!owns) return json({ error: "Forbidden" }, 403);

    if (order.regeneration_used_at) {
      return json({ error: "Already used your free regeneration" }, 400);
    }

    if (!order.brief) {
      return json({ error: "Order has no brief to regenerate" }, 400);
    }

    // Build a refined brief via Claude, reusing the same writer model.
    const newBrief = await rewriteBrief(order, changeNotes.trim());

    await supabase
      .from("orders")
      .update({
        brief: newBrief,
        kie_task_id: null,
        kie_submitted_at: null,
        kie_callback_received_at: null,
        audio_variants: null,
        selected_variant_id: null,
        status: "brief_ready",
        regeneration_used_at: new Date().toISOString(),
      })
      .eq("id", orderId);

    await supabase.from("job_events").insert({
      order_id: orderId,
      event_type: "regeneration_started",
      payload: { changeNotes: changeNotes.slice(0, 500) },
    });

    // Kick off Suno submission immediately
    fetch(`${Deno.env.get("SUPABASE_URL")!}/functions/v1/submit-to-kie`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!}`,
      },
      body: JSON.stringify({ orderId }),
    }).catch((e) => console.error("submit-to-kie kickoff failed:", e));

    return json({ ok: true });
  } catch (e: any) {
    console.error("regenerate-song error:", e);
    return json({ error: e.message }, 500);
  }
});

async function rewriteBrief(order: any, changeNotes: string) {
  const oldBrief = order.brief;
  const q = order.quiz_payload || {};

  const system = `You are RibbonSong's senior songwriter. The customer received a song and wants changes. Your job is to rewrite the lyrics + style based on their feedback while keeping everything that made the original good. Return JSON only.`;

  const userPrompt = `The customer received this song and wants it regenerated with the following changes.

ORIGINAL BRIEF (their answers)
- Recipient: ${order.recipient_name}
- Relationship: ${order.relationship ?? q.q1_relationship ?? "Loved one"}
- Genre: ${order.genre}
- Tempo: ${order.tempo}
- Voice: ${order.voice}
- Stage: ${q.q3_journey ?? q.stage ?? ""}
- Their story: ${q.q4_fighting_for ?? q.fighting_for ?? ""} | ${q.q5_qualities ?? q.qualities ?? ""} | ${q.q6_shared_memory ?? q.shared_memory ?? ""}
- Theme: ${q.q7_theme ?? q.message ?? ""}

PREVIOUS LYRICS (what they got)
Title: ${oldBrief.title}
Style: ${oldBrief.style_prompt}
Lyrics:
${oldBrief.lyrics}

CUSTOMER'S CHANGE REQUEST
${changeNotes}

Rewrite the song to honor their feedback. Keep specific personal details. Output JSON:
{
  "title": "...",
  "style_prompt": "...",
  "lyrics": "[Verse 1]\\n...",
  "language": "en",
  "emotional_tone": "..."
}`;

  const raw = await callClaude({
    model: "claude-opus-4-5",
    maxTokens: 4000,
    temperature: 0.7,
    system,
    messages: [{ role: "user", content: userPrompt }],
  });

  // Strip ```json fences if present
  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const m = cleaned.match(/\{[\s\S]*\}/);
    if (!m) throw new Error("Claude returned non-JSON");
    return JSON.parse(m[0]);
  }
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
