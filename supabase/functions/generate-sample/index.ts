// Generate-sample edge function (PawprintSong public showcase songs).
// Admin-only. Takes a featured_samples row, runs the dog-tribute Claude pipeline,
// and submits to KIE. KIE callback writes audio_url back via process-kie-callback.

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

function pronounsFor(gender?: string) {
  if (gender === "he") {
    return { sub: "he", obj: "him", poss: "his", goodWord: "good boy" };
  }
  return { sub: "she", obj: "her", poss: "her", goodWord: "good girl" };
}

function resolveBreed(s: any): string {
  if (s.dog_breed === "Other" && s.dog_breed_other) return String(s.dog_breed_other);
  return s.dog_breed ?? "beloved dog";
}

async function writeBrief(sample: any, refineNotes?: string): Promise<SongBrief> {
  const p = pronounsFor(sample.dog_gender);
  const breed = resolveBreed(sample);
  const dogName = sample.dog_name ?? "your dog";

  const system = `You are PawprintSong's senior songwriter. You write tender tribute songs for beloved dogs. This is a public showcase song that real grieving families will hear first — it must move them. Use the specific details given (name, personality, memory, the owner's letter) as anchors. Past tense for who the dog was, present tense for the lasting love.`;

  const refine = refineNotes
    ? `\n\nThe previous attempt scored low. Critique to address: ${refineNotes}`
    : "";

  const userPrompt = `Write a personalized tribute song for our public "Listen" showcase.

THE DOG
- Name: ${dogName}
- Breed: ${breed}
- Pronouns: ${p.sub}/${p.obj}/${p.poss}
- Affectionate term: "${p.goodWord}"

WHO ${dogName.toUpperCase()} WAS — personality
${sample.dog_personality ?? ""}

ONE SHARED MEMORY
${sample.dog_memory ?? ""}

OWNER'S LETTER (mine for specific phrases)
${sample.letter_to_dog ?? ""}

OPEN STORY PROMPT (use if the structured fields above are sparse)
${sample.story_prompt ?? ""}

SOUND DIRECTION
- Genre: ${sample.genre}
- Voice: ${sample.voice}
- Title hint: ${sample.title}

REQUIREMENTS
- Structure: [Verse 1], [Chorus], [Verse 2], [Bridge], [Chorus], [Outro]
- Length: 2:30–3:30 of singable lyrics
- Use ${dogName} by name at least twice
- Weave in 2-3 SPECIFIC images from the owner's source material — not generic dog tropes
- Past tense for who ${p.sub} was; present tense for enduring love
- Avoid "rainbow bridge", "crossed over", "running free in heaven" unless the source material uses them
- Output JSON only
${refine}

Return JSON:
{
  "title": "Song Title",
  "style_prompt": "short Suno style prompt",
  "lyrics": "[Verse 1]\\n...\\n\\n[Chorus]\\n...",
  "language": "en",
  "emotional_tone": "tender/honoring/etc."
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
  const dogName = sample.dog_name ?? "the dog";
  const p = pronounsFor(sample.dog_gender);

  const system = `You are PawprintSong's lyric reviewer. Hard gates: (1) dog's actual name appears at least twice, (2) at least one specific detail from owner's source material appears, (3) pronouns are consistent. Return JSON only.`;

  const userPrompt = `Score this tribute song.

DOG: ${dogName}  (pronouns: ${p.sub}/${p.obj}/${p.poss})

OWNER SOURCE
- Personality: ${sample.dog_personality ?? ""}
- Memory: ${sample.dog_memory ?? ""}
- Letter: ${sample.letter_to_dog ?? ""}
- Open story: ${sample.story_prompt ?? ""}

SOUND
- Genre: ${sample.genre} / Voice: ${sample.voice}

SONG
Title: ${brief.title}
Style: ${brief.style_prompt}
Lyrics:
${brief.lyrics}

Score each 0-5: emotional_resonance, specificity, flow_and_singability, tonal_match, coherence, name_and_pronouns (HARD GATE).

Return JSON:
{
  "emotional_resonance": 0-5,
  "specificity": 0-5,
  "flow_and_singability": 0-5,
  "tonal_match": 0-5,
  "coherence": 0-5,
  "tense_correctness": 0-5,
  "overall": weighted_average,
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
  const num = (v: any) => Number(v) || 0;
  const nameGate = num(parsed.name_and_pronouns ?? parsed.tense_correctness);
  const dims = {
    emotional_resonance: num(parsed.emotional_resonance),
    specificity: num(parsed.specificity),
    flow_and_singability: num(parsed.flow_and_singability),
    tonal_match: num(parsed.tonal_match),
    coherence: num(parsed.coherence),
    tense_correctness: nameGate,
  };
  const otherAvg =
    (dims.emotional_resonance +
      dims.specificity +
      dims.flow_and_singability +
      dims.tonal_match +
      dims.coherence) /
    5;
  let overall = (otherAvg * 5 + dims.tense_correctness * 2) / 7;
  if (dims.tense_correctness < 3) overall = Math.min(overall, dims.tense_correctness);
  return {
    ...parsed,
    ...dims,
    overall: Math.round(overall * 100) / 100,
    notes: parsed.notes ?? "",
  } as BriefScore;
}

function parseJsonFromClaude(raw: string): any {
  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
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
