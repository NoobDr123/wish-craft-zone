// Generate-sample edge function.
// Admin-only. Takes a featured_samples row (or creates one from inputs),
// runs the same Claude lyric pipeline as generate-brief, and submits to KIE.
// KIE callback writes the audio_url back into featured_samples via process-kie-callback.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  callClaude,
  corsHeaders,
  type BriefScore,
  type SongBrief,
} from "../_shared/claude.ts";
import { isInternalRequest, requireUser } from "../_shared/auth.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const KIE_API_KEY = Deno.env.get("KIE_API_KEY")!;
const KIE_BASE = "https://api.kie.ai";
const CALLBACK_URL = `${Deno.env.get("SUPABASE_URL")!}/functions/v1/kie-callback`;

const WRITER_MODEL = "claude-opus-4-5";
const SCORER_MODEL = "claude-opus-4-5";
const PASS_SCORE = 3.8;
const MAX_RETRIES = 2;

const SUNO_CONFIG = {
  model: "V5",
  styleWeight: 0.75,
  weirdnessConstraint: 0.3,
  audioWeight: 0.7,
  customMode: true,
  instrumental: false,
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Two ways to authorize:
    //   1. Internal trigger (INTERNAL_TRIGGER_SECRET header) OR verified
    //      service-role JWT — handled by isInternalRequest (signature-checked).
    //   2. Logged-in admin user.
    let authorized = await isInternalRequest(req);

    if (!authorized) {
      const user = await requireUser(req);
      if (!user) return json({ error: "Unauthorized" }, 401);

      const { data: isAdmin } = await supabase.rpc("has_role", {
        _user_id: user.id,
        _role: "admin",
      });
      if (!isAdmin) return json({ error: "Forbidden" }, 403);
      authorized = true;
    }

    const { sampleId } = await req.json();
    if (!sampleId) return json({ error: "Missing sampleId" }, 400);

    const { data: sample, error } = await supabase
      .from("featured_samples")
      .select("*")
      .eq("id", sampleId)
      .single();
    if (error || !sample) return json({ error: "Sample not found" }, 404);

    if (sample.kie_task_id) {
      return json({ ok: true, skipped: "already_submitted", taskId: sample.kie_task_id });
    }

    await supabase
      .from("featured_samples")
      .update({ status: "brief_generating" })
      .eq("id", sampleId);

    // ---- Brief generation w/ scoring + retries ----
    let bestBrief: SongBrief | null = null;
    let bestScore: BriefScore | null = null;
    let attempts = 0;
    let lastError: string | null = null;

    while (attempts <= MAX_RETRIES) {
      attempts++;
      try {
        const brief = await writeBrief(sample, attempts > 1 ? bestScore?.notes : undefined);
        const score = await scoreBrief(sample, brief);
        if (!bestScore || score.overall > bestScore.overall) {
          bestBrief = brief;
          bestScore = score;
        }
        if (score.overall >= PASS_SCORE) break;
      } catch (e) {
        lastError = e instanceof Error ? e.message : String(e);
      }
    }

    if (!bestBrief || !bestScore) {
      await supabase
        .from("featured_samples")
        .update({
          status: "brief_failed",
          flag_reason: lastError ?? "Brief generation failed",
        })
        .eq("id", sampleId);
      return json({ error: "Brief generation failed", lastError }, 500);
    }

    await supabase
      .from("featured_samples")
      .update({
        brief: bestBrief,
        brief_score: { ...bestScore, attempts },
        lyrics: bestBrief.lyrics,
        status: "music_generating",
      })
      .eq("id", sampleId);

    // ---- KIE submission ----
    const body = {
      prompt: bestBrief.lyrics,
      style: bestBrief.style_prompt,
      title: bestBrief.title,
      customMode: SUNO_CONFIG.customMode,
      instrumental: SUNO_CONFIG.instrumental,
      model: SUNO_CONFIG.model,
      styleWeight: SUNO_CONFIG.styleWeight,
      weirdnessConstraint: SUNO_CONFIG.weirdnessConstraint,
      audioWeight: SUNO_CONFIG.audioWeight,
      callBackUrl: `${CALLBACK_URL}?sampleId=${sampleId}`,
    };

    const res = await fetch(`${KIE_BASE}/api/v1/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${KIE_API_KEY}`,
      },
      body: JSON.stringify(body),
    });
    const data = await res.json();

    if (!res.ok || data.code !== 200) {
      await supabase
        .from("featured_samples")
        .update({
          status: "music_failed",
          flag_reason: `KIE submit failed: ${JSON.stringify(data).slice(0, 300)}`,
        })
        .eq("id", sampleId);
      return json({ error: "KIE submission failed", data }, 502);
    }

    const taskId = data?.data?.taskId ?? data?.data?.task_id ?? data?.taskId;
    if (!taskId) return json({ error: "No taskId in KIE response", data }, 502);

    await supabase
      .from("featured_samples")
      .update({
        kie_task_id: taskId,
        kie_submitted_at: new Date().toISOString(),
      })
      .eq("id", sampleId);

    return json({ ok: true, taskId, score: bestScore.overall });
  } catch (e: any) {
    console.error("generate-sample error", e);
    return json({ error: e?.message ?? "Internal error" }, 500);
  }
});

// ---------- Helpers ----------

async function writeBrief(sample: any, refineNotes?: string): Promise<SongBrief> {
  const system = `You are RibbonSong's senior songwriter. You write deeply personal songs for people facing cancer — for fighters, survivors, those in hospice, and those who've passed. Your job is to turn raw emotional details into singable lyrics that feel like a love letter, never clinical, never generic. Use specific details from the brief (names, memories, phrases) as anchors. The song must work as audio for Suno V5.`;

  const refine = refineNotes
    ? `\n\nThe previous attempt scored low. Critique to address: ${refineNotes}`
    : "";

  const userPrompt = `Write a personalized song for our public "Listen" showcase. This is a demo song that real grieving and fighting families will hear first — it must move them.

RECIPIENT
- Name: ${sample.recipient_name}
- Relationship to writer: ${sample.relationship ?? "Loved one"}
- Stage / situation: ${sample.stage ?? "Unspecified"}

THE STORY (sender's own words)
${sample.story_prompt}

SOUND DIRECTION
- Genre: ${sample.genre}
- Tempo: ${sample.tempo}
- Voice: ${sample.voice}
- Title hint: ${sample.title}

REQUIREMENTS
- Structure: [Verse 1], [Chorus], [Verse 2], [Bridge], [Chorus], [Outro]
- Total length: 2:30–3:30 of singable lyrics
- Use the recipient's name at least twice
- Weave in 2-3 specific details from the story above — never invent details
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

async function scoreBrief(sample: any, brief: SongBrief): Promise<BriefScore> {
  const system = `You are RibbonSong's lyric reviewer. You score songs strictly and honestly on a 0-5 scale across multiple dimensions. You return JSON only.`;

  const userPrompt = `Score this song against the brief.

BRIEF
- Recipient: ${sample.recipient_name}
- Relationship: ${sample.relationship}
- Stage: ${sample.stage}
- Story: ${sample.story_prompt}
- Genre/tempo: ${sample.genre} / ${sample.tempo}

SONG
Title: ${brief.title}
Style: ${brief.style_prompt}
Lyrics:
${brief.lyrics}

Score each 0-5: emotional_resonance, specificity, flow_and_singability, tonal_match, coherence.

Return JSON:
{
  "emotional_resonance": 0-5,
  "specificity": 0-5,
  "flow_and_singability": 0-5,
  "tonal_match": 0-5,
  "coherence": 0-5,
  "overall": average,
  "notes": "1-3 sentences of critique"
}`;

  const raw = await callClaude({
    model: SCORER_MODEL,
    maxTokens: 800,
    temperature: 0.2,
    system,
    messages: [{ role: "user", content: userPrompt }],
  });
  const parsed = parseJsonFromClaude(raw);
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
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Claude returned non-JSON: " + raw.slice(0, 200));
    return JSON.parse(match[0]);
  }
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
