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
import { guardInternal } from "../_shared/auth.ts";

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

  const unauthorized = await guardInternal(req, corsHeaders);
  if (unauthorized) return unauthorized;

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

type JourneyStage = "active" | "hospice" | "memory";
type Tense = "present" | "present_fading" | "past";

function journeyStageFromOrder(order: any): JourneyStage {
  const q = (order.quiz_payload || {}) as Record<string, any>;
  const explicit = q.q3_journey_stage || q.journey_stage;
  if (explicit === "memory" || explicit === "hospice" || explicit === "active") {
    return explicit;
  }
  const stage = q.q3_journey || q.stage || "";
  if (stage === "In loving memory") return "memory";
  if (stage === "In hospice / final chapter") return "hospice";
  return "active";
}

function tenseFromStage(j: JourneyStage): Tense {
  if (j === "memory") return "past";
  if (j === "hospice") return "present_fading";
  return "present";
}

function tenseRulesFor(j: JourneyStage): string {
  if (j === "memory") {
    return `TENSE — CRITICAL HARD RULE (memory / passed):
- The recipient has DIED. Write entirely in PAST tense for who they were ("you were", "you loved", "you held").
- Use PRESENT tense ONLY for the writer's enduring love, memory, and the recipient's lasting impact ("I still hear you", "your light lives on").
- NEVER use language that implies the person is still physically here ("you are fighting", "you will beat this", "we'll see you tomorrow"). This is a hard fail.
- Tone: honoring, tender remembrance — not pitying, not falsely upbeat.`;
  }
  if (j === "hospice") {
    return `TENSE — CRITICAL HARD RULE (hospice / final chapter):
- The recipient is alive but in their final chapter. Write in PRESENT tense ("you are", "you hold", "I am here").
- Acknowledge the moment honestly. It is okay to express rest, peace, letting go, gratitude.
- DO NOT promise future recovery or victory ("you'll beat this", "next year we'll…"). Avoid battle/fight clichés unless the user used them.
- DO NOT speak of them in past tense — they are still here. This is a hard fail.
- Tone: tender, peaceful, present — gratitude and presence over fear.`;
  }
  return `TENSE — HARD RULE (active fight / survivor):
- The recipient is alive and in active treatment, between treatments, or in remission. Write in PRESENT and FUTURE tense ("you are strong", "you will get through this", "we are with you").
- DO NOT speak of them in past tense as if they had died. This is a hard fail.
- Hope and forward motion are appropriate. Avoid overused warrior/battle clichés unless the user used those words themselves.`;
}

async function writeBrief(order: any, refineNotes?: string): Promise<SongBrief> {
  const q = (order.quiz_payload || {}) as Record<string, any>;
  const has3rdVerse = order.has_3rd_verse === true;
  const verseCount = has3rdVerse ? 3 : 2;
  const journey = journeyStageFromOrder(order);
  const tense = tenseFromStage(journey);
  const tenseRules = tenseRulesFor(journey);

  const system = `You are RibbonSong's senior songwriter. You write deeply personal songs for people facing cancer — for fighters, survivors, those in hospice, and those who have passed. Your job is to turn raw emotional details into singable lyrics that feel like a love letter, never clinical, never generic. Use specific details from the brief (names, memories, phrases) as anchors. The song must work as audio for Suno V5. You ALWAYS respect the requested grammatical tense — getting tense wrong (e.g. speaking of a deceased person as still alive, or telling someone in hospice they will recover) is the most painful failure possible and is unacceptable.`;

  const refine = refineNotes
    ? `\n\nThe previous attempt scored low. Critique to address: ${refineNotes}`
    : "";

  const fightingFor = q.q4_fighting_for ?? q.fighting_for ?? "";
  const qualities = q.q5_qualities ?? q.qualities ?? "";
  const sharedMemory = q.q6_shared_memory ?? q.shared_memory ?? "";
  const theme = q.q7_theme ?? q.message ?? "";
  const letter = q.q8_letter ?? q.personal_words ?? "";

  const userPrompt = `Write a personalized song.

JOURNEY STAGE: ${journey.toUpperCase()}  (tense: ${tense})

${tenseRules}

RECIPIENT
- Name: ${order.recipient_name}
- Relationship to writer: ${order.relationship ?? q.q1_relationship ?? q.relationship ?? "Loved one"}
- Stage: ${q.q3_journey ?? q.stage ?? "Unknown"}
- Cancer type: ${q.cancer_type ?? "Unspecified"}
- Age range: ${q.q1_age_range ?? q.age_range ?? "Adult"}
- Pronunciation note: ${q.q1_pronunciation ?? q.pronunciation ?? ""}

THEIR STORY (use these as concrete imagery — never invent details)
- ${journey === "memory" ? "What they lived for / held onto" : "Fighting for / holding onto"}: ${fightingFor}
- Qualities ${journey === "memory" ? "you loved about them" : "you love about them"}: ${qualities}
- One shared memory: ${sharedMemory}
- Faith / beliefs (optional): ${q.faith_or_beliefs ?? ""}
- Inside joke / shared phrase (optional): ${q.inside_joke ?? ""}
- Little things — laugh, smell, gesture (optional): ${q.little_things ?? ""}

THE MESSAGE
- Core theme: ${theme}
- Personal words / mini-letter from sender: ${letter}
- Hope for them (optional): ${q.hope_for_them ?? ""}

SOUND DIRECTION
- Genre: ${order.genre ?? q.q9_genre ?? q.genre ?? "Acoustic Folk"}
- Tempo: ${order.tempo ?? q.q9_tempo ?? q.tempo ?? "Mid-tempo"}
- Voice: ${order.voice ?? q.q9_voice ?? q.voice ?? "No Preference"}
- Title idea (optional): ${order.song_title_idea ?? q.q9_song_title_idea ?? q.song_title_idea ?? ""}

REQUIREMENTS
- Structure: [Verse 1], [Chorus], ${verseCount === 3 ? "[Verse 2], [Chorus], [Verse 3], [Bridge], [Chorus], [Outro]" : "[Verse 2], [Bridge], [Chorus], [Outro]"}
- Total length: 2:30–3:30 of singable lyrics
- Use the recipient's name at least twice
- Weave in 2-3 specific details from the story above
- Respect the tense rules above EXACTLY
- Avoid clichés (warrior, battle, brave) unless the user used those words themselves
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
  const journey = journeyStageFromOrder(order);
  const tense = tenseFromStage(journey);

  const tenseGate =
    journey === "memory"
      ? `For MEMORY songs: lyrics MUST be in past tense for who they were. Present tense is allowed only for the writer's enduring love / their lasting impact. Any line that implies the person is still physically alive (e.g. "you are fighting", "we'll see you", "you will beat") = tense_correctness 0-1.`
      : journey === "hospice"
        ? `For HOSPICE songs: lyrics MUST be in present tense. They are alive in their final chapter. Lines promising future recovery ("you'll beat this", "next year we'll…") OR speaking of them in past tense as if they had died = tense_correctness 0-1.`
        : `For ACTIVE songs: lyrics should be in present/future tense — they are alive and fighting. Speaking of them in past tense as if they had died = tense_correctness 0-1.`;

  const system = `You are RibbonSong's lyric reviewer. You score songs strictly and honestly on a 0-5 scale across multiple dimensions. tense_correctness is a HARD GATE — get it wrong and the song cannot ship. You return JSON only.`;

  const userPrompt = `Score this song against the brief.

JOURNEY STAGE: ${journey.toUpperCase()}  (required tense: ${tense})

TENSE GATE RULE
${tenseGate}

BRIEF DETAILS
- Recipient: ${order.recipient_name}
- Relationship: ${order.relationship ?? q.q1_relationship ?? q.relationship}
- Stage: ${q.q3_journey ?? q.stage}
- Core theme: ${q.q7_theme ?? q.message}
- Specifics that should appear: ${[q.q4_fighting_for ?? q.fighting_for, q.q5_qualities ?? q.qualities, q.q6_shared_memory ?? q.shared_memory, q.little_things, q.inside_joke].filter(Boolean).join(" | ")}
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
- tense_correctness: HARD GATE — does it follow the tense rule above? 5 = perfectly consistent. 0-1 = any line breaks the rule.

Return JSON:
{
  "emotional_resonance": 0-5,
  "specificity": 0-5,
  "flow_and_singability": 0-5,
  "tonal_match": 0-5,
  "coherence": 0-5,
  "tense_correctness": 0-5,
  "overall": weighted_average,
  "notes": "1-3 sentences of critique highlighting weakest dimension. If tense_correctness < 3, quote the offending line(s)."
}`;

  const raw = await callClaude({
    model: SCORER_MODEL,
    maxTokens: 800,
    temperature: 0.2,
    system,
    messages: [{ role: "user", content: userPrompt }],
  });

  const parsed = parseJsonFromClaude(raw);
  const num = (v: any) => Number(v) || 0;
  const dims = {
    emotional_resonance: num(parsed.emotional_resonance),
    specificity: num(parsed.specificity),
    flow_and_singability: num(parsed.flow_and_singability),
    tonal_match: num(parsed.tonal_match),
    coherence: num(parsed.coherence),
    tense_correctness: num(parsed.tense_correctness),
  };
  // Weighted overall: tense_correctness acts as a hard gate.
  // If tense_correctness < 3, cap overall at min(other_avg, tense_correctness).
  const otherAvg =
    (dims.emotional_resonance +
      dims.specificity +
      dims.flow_and_singability +
      dims.tonal_match +
      dims.coherence) /
    5;
  let overall = (otherAvg * 5 + dims.tense_correctness * 2) / 7; // tense weighted ~2x
  if (dims.tense_correctness < 3) {
    overall = Math.min(overall, dims.tense_correctness);
  }
  return {
    ...parsed,
    ...dims,
    overall: Math.round(overall * 100) / 100,
    notes: parsed.notes ?? "",
  } as BriefScore;
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
