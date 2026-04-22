// Generate-brief edge function.
// Pulls an order, calls Claude Opus to write lyrics, calls Claude again to
// score the lyrics, retries up to 2x if score is below threshold, then
// persists brief + score to the order and enqueues submit_to_kie.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  callClaude,
  corsHeaders,
  type BriefScore,
  type SongBrief,
} from "../_shared/claude.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const WRITER_MODEL = "claude-opus-4-5";
const SCORER_MODEL = "claude-opus-4-5";
const PASS_SCORE = 3.8; // out of 5
const MAX_RETRIES = 2;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { orderId } = await req.json();
    if (!orderId) return json({ error: "Missing orderId" }, 400);

    const { data: order, error: oErr } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (oErr || !order) return json({ error: "Order not found" }, 404);

    // Idempotency — if we've already shipped a brief, no-op.
    if (order.brief && order.status !== "received" && order.status !== "upsells_complete") {
      return json({ ok: true, skipped: "brief_exists" });
    }

    await supabase.from("orders").update({ status: "brief_generating" }).eq("id", orderId);
    await logEvent(orderId, "brief_generation_started", {});

    let bestBrief: SongBrief | null = null;
    let bestScore: BriefScore | null = null;
    let attempts = 0;
    let lastError: string | null = null;

    while (attempts <= MAX_RETRIES) {
      attempts++;
      try {
        const brief = await writeBrief(order, attempts > 1 ? bestScore?.notes : undefined);
        const score = await scoreBrief(order, brief);

        if (!bestScore || score.overall > bestScore.overall) {
          bestBrief = brief;
          bestScore = score;
        }

        await logEvent(orderId, "brief_attempt", {
          attempt: attempts,
          score_overall: score.overall,
          notes: score.notes.slice(0, 400),
        });

        if (score.overall >= PASS_SCORE) break;
      } catch (e) {
        lastError = e instanceof Error ? e.message : String(e);
        await logEvent(orderId, "brief_attempt_error", { attempt: attempts, error: lastError });
      }
    }

    if (!bestBrief || !bestScore) {
      // Fully failed all attempts — flag for review.
      await supabase
        .from("orders")
        .update({
          status: "brief_failed",
          flagged_for_review: true,
          flag_reason: lastError ?? "Brief generation failed after retries",
        })
        .eq("id", orderId);
      return json({ error: "Brief generation failed", lastError }, 500);
    }

    // Persist best brief regardless of pass/fail of score (per user spec — no human gate).
    await supabase
      .from("orders")
      .update({
        brief: bestBrief,
        brief_score: { ...bestScore, attempts },
        status: "brief_ready",
      })
      .eq("id", orderId);

    await logEvent(orderId, "brief_ready", {
      attempts,
      final_score: bestScore.overall,
    });

    // Enqueue Suno submission.
    const { error: enqueueErr } = await supabase.rpc("pgmq_send", {
      queue_name: "submit_to_kie",
      msg: { orderId },
    } as any);

    // Fallback: most pgmq deployments expose pgmq.send; try that if pgmq_send isn't a wrapper.
    if (enqueueErr) {
      await supabase
        .schema("pgmq" as any)
        .rpc("send", { queue_name: "submit_to_kie", msg: { orderId } } as any);
    }

    return json({ ok: true, attempts, score: bestScore.overall });
  } catch (e: any) {
    console.error("generate-brief error:", e);
    return json({ error: e.message || "Internal error" }, 500);
  }
});

async function writeBrief(order: any, refineNotes?: string): Promise<SongBrief> {
  const q = (order.quiz_payload || {}) as Record<string, any>;
  const has3rdVerse = order.has_3rd_verse === true;
  const verseCount = has3rdVerse ? 3 : 2;

  const system = `You are RibbonSong's senior songwriter. You write deeply personal songs for people facing cancer — for fighters, survivors, those in hospice, and those who've passed. Your job is to turn raw emotional details into singable lyrics that feel like a love letter, never clinical, never generic. Use specific details from the brief (names, memories, phrases) as anchors. The song must work as audio for Suno V5.`;

  const refine = refineNotes
    ? `\n\nThe previous attempt scored low. Critique to address: ${refineNotes}`
    : "";

  const userPrompt = `Write a personalized song.

RECIPIENT
- Name: ${order.recipient_name}
- Relationship to writer: ${order.relationship ?? q.relationship ?? "Loved one"}
- Stage: ${q.stage ?? "Unknown"}
- Cancer type: ${q.cancer_type ?? "Unspecified"}
- Age range: ${q.age_range ?? "Adult"}

THEIR FIGHT (use these as concrete imagery)
- Fighting for: ${q.fighting_for ?? ""}
- Signature strength: ${q.signature_strength ?? ""}
- Hardest moment: ${q.hardest_moment ?? ""}
- What brings comfort: ${q.what_helps_most ?? ""}

WHO THEY ARE
- Qualities: ${q.qualities ?? ""}
- Inside joke / shared phrase: ${q.inside_joke ?? ""}
- Shared memory: ${q.shared_memory ?? ""}
- Little things (laugh, smell, gesture): ${q.little_things ?? ""}
- Faith / beliefs: ${q.faith_or_beliefs ?? ""}

THE MESSAGE
- Core message: ${q.message ?? ""}
- Personal words from sender: ${q.personal_words ?? ""}
- Hope for them: ${q.hope_for_them ?? ""}

SOUND DIRECTION
- Genre: ${order.genre ?? q.genre ?? "Acoustic Folk"}
- Tempo: ${order.tempo ?? q.tempo ?? "Mid-tempo"}
- Voice: ${order.voice ?? q.voice ?? "No Preference"}
- Title idea (optional): ${order.song_title_idea ?? q.song_title_idea ?? ""}

REQUIREMENTS
- Structure: [Verse 1], [Chorus], ${verseCount === 3 ? "[Verse 2], [Chorus], [Verse 3], [Bridge], [Chorus], [Outro]" : "[Verse 2], [Bridge], [Chorus], [Outro]"}
- Total length: 2:30–3:30 of singable lyrics
- Use the recipient's name at least twice
- Weave in 2-3 specific details from above (memories, qualities, phrases) — never invent details
- Avoid clichés (warrior, battle, brave) unless the user used those words themselves
- Tone: hopeful and tender, never pitying
- Output as JSON only, no prose around it
${refine}

Return JSON with shape:
{
  "title": "Song Title",
  "style_prompt": "short Suno style prompt, e.g. 'warm acoustic folk, fingerpicked guitar, female vocal, intimate, mid-tempo, hopeful'",
  "lyrics": "[Verse 1]\\n...\\n\\n[Chorus]\\n...",
  "language": "en",
  "emotional_tone": "tender/hopeful/etc."
}`;

  const raw = await callClaude({
    model: WRITER_MODEL,
    maxTokens: 4000,
    temperature: 0.7,
    system,
    messages: [{ role: "user", content: userPrompt }],
  });

  return parseJsonFromClaude(raw) as SongBrief;
}

async function scoreBrief(order: any, brief: SongBrief): Promise<BriefScore> {
  const q = (order.quiz_payload || {}) as Record<string, any>;

  const system = `You are RibbonSong's lyric reviewer. You score songs strictly and honestly on a 0-5 scale across multiple dimensions. You return JSON only.`;

  const userPrompt = `Score this song against the brief.

BRIEF DETAILS
- Recipient: ${order.recipient_name}
- Relationship: ${order.relationship ?? q.relationship}
- Stage: ${q.stage}
- Core message: ${q.message}
- Specifics that should appear: ${[q.fighting_for, q.signature_strength, q.shared_memory, q.little_things, q.inside_joke].filter(Boolean).join(" | ")}
- Genre/tempo: ${order.genre} / ${order.tempo}

SONG
Title: ${brief.title}
Style: ${brief.style_prompt}
Lyrics:
${brief.lyrics}

Score each 0-5:
- emotional_resonance: does it feel true and tender?
- specificity: does it use the brief's actual details (not generic)?
- flow_and_singability: does it scan, rhyme, breathe?
- tonal_match: does it match the requested tone/genre?
- coherence: does the song hold together as one piece?

Return JSON:
{
  "emotional_resonance": 0-5,
  "specificity": 0-5,
  "flow_and_singability": 0-5,
  "tonal_match": 0-5,
  "coherence": 0-5,
  "overall": average,
  "notes": "1-3 sentences of critique highlighting weakest dimension"
}`;

  const raw = await callClaude({
    model: SCORER_MODEL,
    maxTokens: 800,
    temperature: 0.2,
    system,
    messages: [{ role: "user", content: userPrompt }],
  });

  const parsed = parseJsonFromClaude(raw);
  // Defensive: compute overall ourselves to avoid Claude math errors.
  const dims = [
    parsed.emotional_resonance,
    parsed.specificity,
    parsed.flow_and_singability,
    parsed.tonal_match,
    parsed.coherence,
  ].map((n: any) => Number(n) || 0);
  const overall = dims.reduce((a, b) => a + b, 0) / dims.length;
  return { ...parsed, overall: Math.round(overall * 100) / 100 } as BriefScore;
}

function parseJsonFromClaude(raw: string): any {
  // Claude sometimes wraps JSON in ```json fences. Strip them.
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  // Fall back to extracting first {...} block.
  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Claude returned non-JSON: " + raw.slice(0, 200));
    return JSON.parse(match[0]);
  }
}

async function logEvent(orderId: string, eventType: string, payload: any) {
  await supabase.from("job_events").insert({
    order_id: orderId,
    event_type: eventType,
    payload,
  });
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
