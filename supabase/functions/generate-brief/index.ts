// Generate-brief edge function (PawprintSong / dog-loss tribute songs).
// Pulls an order, calls Claude to write lyrics for a song honoring a beloved dog,
// scores them, retries up to 2x, then persists brief + score and enqueues KIE submission.

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
const PASS_SCORE = 3.8;
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

    if (order.brief && order.status !== "received" && order.status !== "upsells_complete") {
      return json({ ok: true, skipped: "brief_exists" });
    }

    // HARD GATE: refuse to generate without owner-provided context.
    // Without these fields the model invents generic lyrics (often illness/grief
    // tropes) that have nothing to do with the actual dog. Better to fail loud.
    const q = (order.quiz_payload || {}) as Record<string, any>;
    const personality = String(order.dog_personality ?? q.dog_personality ?? "").trim();
    const memory = String(order.dog_memory ?? q.dog_memory ?? "").trim();
    const letter = String(order.letter_to_dog ?? q.letter_to_dog ?? "").trim();
    if (!personality && !memory && !letter) {
      await supabase
        .from("orders")
        .update({
          status: "brief_failed",
          flagged_for_review: true,
          flag_reason:
            "Missing dog_personality, dog_memory, and letter_to_dog. Brief generator refuses to invent content without owner inputs.",
        })
        .eq("id", orderId);
      await logEvent(orderId, "brief_refused_empty_inputs", {
        has_personality: !!personality,
        has_memory: !!memory,
        has_letter: !!letter,
      });
      return json({ error: "missing_owner_inputs", message: "personality, memory, and letter_to_dog are all empty" }, 400);
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

    const { error: enqueueErr } = await supabase.rpc("enqueue_job" as any, {
      queue_name: "submit_to_kie",
      payload: { orderId },
    } as any);

    if (enqueueErr) {
      console.error("enqueue submit_to_kie failed", enqueueErr);
      await logEvent(orderId, "enqueue_failed", {
        queue: "submit_to_kie",
        error: enqueueErr.message,
      });
    }

    return json({ ok: true, attempts, score: bestScore.overall });
  } catch (e: any) {
    console.error("generate-brief error:", e);
    return json({ error: e.message || "Internal error" }, 500);
  }
});

function pronounsFor(gender?: string) {
  if (gender === "he") {
    return { sub: "he", obj: "him", poss: "his", goodWord: "good boy" };
  }
  return { sub: "she", obj: "her", poss: "her", goodWord: "good girl" };
}

function resolveBreed(order: any): string {
  if (order.dog_breed === "Other" && order.dog_breed_other) {
    return String(order.dog_breed_other);
  }
  return order.dog_breed ?? "beloved dog";
}

async function writeBrief(order: any, refineNotes?: string): Promise<SongBrief> {
  const q = (order.quiz_payload || {}) as Record<string, any>;
  const has3rdVerse = order.has_3rd_verse === true;
  const verseCount = has3rdVerse ? 3 : 2;
  const p = pronounsFor(order.dog_gender);
  const breed = resolveBreed(order);
  const dogName = order.dog_name ?? "your dog";

  const refine = refineNotes
    ? `\n\nThe previous attempt scored low. Critique to address: ${refineNotes}`
    : "";

  const system = `You are PawprintSong's senior songwriter. You write tender, deeply personal tribute songs for people who have lost a beloved dog. Your job is to turn the owner's specific memories — the dog's name, breed, quirks, the small daily rituals, the inside jokes — into singable lyrics that feel like a love letter to a best friend who happened to walk on four paws. Never generic. Never saccharine. Never cliché. The song honors a real animal whose absence is shaped like a paw print on the floor. Write in PAST tense for who the dog was, but PRESENT tense is appropriate for the lasting love and the way the dog still shows up in the owner's life. The song must work as audio for Suno V5.`;

  const userPrompt = `Write a personalized tribute song for a beloved dog who has passed.

THE DOG
- Name: ${dogName}
- Pronunciation note: ${order.quiz_payload?.pronunciation ?? ""}
- Breed: ${breed}
- Gender / pronouns: ${p.sub}/${p.obj}/${p.poss}  (e.g. "${p.sub} loved", "I miss ${p.obj}", "${p.poss} favorite spot")
- Affectionate term: "${p.goodWord}"

WHO ${dogName.toUpperCase()} WAS — personality, quirks, the way ${p.sub} moved through the world
${order.dog_personality ?? q.dog_personality ?? ""}

ONE SHARED MEMORY the owner can never forget
${order.dog_memory ?? q.dog_memory ?? ""}

THE OWNER'S LETTER TO ${dogName.toUpperCase()} (this is the emotional core — mine it for specific phrases, images, small details)
${order.letter_to_dog ?? q.letter_to_dog ?? ""}

SOUND DIRECTION
- Genre: ${order.genre ?? q.genre ?? "Acoustic Folk"}
- Voice: ${order.voice ?? q.voice ?? "Female Voice"}
- Title idea (optional, treat as suggestion not mandate): ${order.song_title_idea ?? q.song_title_idea ?? ""}

REQUIREMENTS
- Structure: [Verse 1], [Chorus], ${verseCount === 3 ? "[Verse 2], [Chorus], [Verse 3], [Bridge], [Chorus], [Outro]" : "[Verse 2], [Bridge], [Chorus], [Outro]"}
- Total length: ${verseCount === 3 ? "3:30–4:30" : "2:30–3:30"} of singable lyrics
- Use ${dogName} BY NAME at least twice (chorus and outro work well)
- Weave in 2-3 specific images from the personality / memory / letter (NOT generic dog things — the actual details the owner gave you)
- Use PAST tense for who ${p.sub} was; PRESENT tense for enduring love and how the absence still shows up
- Avoid "rainbow bridge" unless the owner used those words; avoid generic pet-loss clichés ("crossed over", "running free in heaven") unless the owner's letter signals they want them
- Pet-specific imagery encouraged: collar, leash, the door, paws on the floor, the bowl, the favorite spot, the way ${p.sub} greeted them, the quiet shape of ${p.poss} absence
- The "${p.goodWord}" phrase is welcome in the chorus or outro if it fits naturally
- Output as JSON only, no prose around it
${refine}

Return JSON with shape:
{
  "title": "Song Title",
  "style_prompt": "short Suno style prompt, e.g. 'warm acoustic folk, fingerpicked guitar, soft female vocal, intimate, mid-tempo, tender'",
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

async function scoreBrief(order: any, brief: SongBrief): Promise<BriefScore> {
  const q = (order.quiz_payload || {}) as Record<string, any>;
  const dogName = order.dog_name ?? "the dog";
  const p = pronounsFor(order.dog_gender);

  const system = `You are PawprintSong's lyric reviewer. You score tribute songs for beloved dogs strictly on a 0-5 scale. The hard gates are: (1) the song must use the dog's actual name, (2) the song must reference at least one SPECIFIC detail from the owner's letter / memory / personality (not generic dog imagery), and (3) the song must use the correct pronouns. You return JSON only.`;

  const userPrompt = `Score this tribute song against the brief.

DOG: ${dogName}  (pronouns: ${p.sub}/${p.obj}/${p.poss})

OWNER'S SOURCE MATERIAL — the song should mine these for specifics, not invent
- Personality: ${order.dog_personality ?? q.dog_personality ?? ""}
- Memory: ${order.dog_memory ?? q.dog_memory ?? ""}
- Letter: ${order.letter_to_dog ?? q.letter_to_dog ?? ""}

SOUND DIRECTION
- Genre: ${order.genre ?? q.genre}
- Voice: ${order.voice ?? q.voice}

SONG
Title: ${brief.title}
Style: ${brief.style_prompt}
Lyrics:
${brief.lyrics}

Score each 0-5:
- emotional_resonance: does it feel true and tender, like a real person's grief and love?
- specificity: does it use the OWNER'S actual details (not generic "good boy" / "best friend" filler)?
- flow_and_singability: does it scan, rhyme, breathe?
- tonal_match: does it match the requested genre/voice?
- coherence: does the song hold together as one piece?
- name_and_pronouns: HARD GATE — uses ${dogName} by name at least twice AND uses ${p.sub}/${p.obj}/${p.poss} consistently? 5 = perfect. 0-1 = name missing or wrong pronouns.

Return JSON:
{
  "emotional_resonance": 0-5,
  "specificity": 0-5,
  "flow_and_singability": 0-5,
  "tonal_match": 0-5,
  "coherence": 0-5,
  "tense_correctness": 0-5,
  "overall": weighted_average,
  "notes": "1-3 sentences of critique highlighting the weakest dimension. If name_and_pronouns < 3, quote the offending line(s)."
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
  // Map name_and_pronouns gate onto the existing tense_correctness slot so the
  // BriefScore type stays compatible with the rest of the pipeline.
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
