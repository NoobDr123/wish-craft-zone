// Aligns the source lyrics for a featured_samples row to its actual audio.
// Words come from the `lyrics` column (source of truth — never re-transcribed).
//
// Primary strategy: send the audio + lyrics to Gemini 2.5 Pro via the Lovable AI
//   Gateway and ask it to return real per-line timestamps by listening.
// Fallback strategy: estimate timing by syllable weight + duration probe (used
//   only if the audio-based pass fails).
//
// Triggered by the DB trigger `trigger_transcribe_sample` whenever audio_url changes.
// Auth: INTERNAL_TRIGGER_SECRET header OR service-role JWT.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { isInternalRequest } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-internal-secret",
};

interface SyncedLine {
  start: number;
  end: number;
  text: string;
}

const LOVABLE_AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const ALIGN_MODEL = "google/gemini-2.5-pro";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    // Two auth paths:
    //  1. INTERNAL_TRIGGER_SECRET via x-internal-secret header (DB trigger)
    //  2. Verified service-role JWT in Authorization (manual / batch jobs)
    // CRITICAL: do NOT trust unverified JWT payload — see _shared/auth.ts.
    if (!(await isInternalRequest(req))) {
      return json({ error: "Unauthorized" }, 401);
    }

    const { sampleId } = await req.json();
    if (!sampleId) return json({ error: "sampleId required" }, 400);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: sample, error: fetchErr } = await supabase
      .from("featured_samples")
      .select("id,title,audio_url,lyrics")
      .eq("id", sampleId)
      .single();

    if (fetchErr || !sample) throw new Error(`Sample not found: ${fetchErr?.message}`);
    if (!sample.audio_url) throw new Error("Sample has no audio_url");
    if (!sample.lyrics) throw new Error("Sample has no lyrics");

    const cleanLines = extractSingableLines(sample.lyrics);
    if (cleanLines.length === 0) throw new Error("No singable lines in lyrics");

    // Get audio duration up-front (used by both strategies)
    const duration = await getAudioDuration(sample.audio_url);
    console.log(`[transcribe-sample] sample=${sampleId} duration=${duration}s lines=${cleanLines.length}`);

    let lines: SyncedLine[] | null = null;
    let source = "audio-align";

    // Primary: align by listening to the audio
    try {
      lines = await alignWithAudio(sample.audio_url, cleanLines, duration);
      console.log(`[transcribe-sample] audio-align produced ${lines?.length ?? 0} lines`);
    } catch (e) {
      console.warn("[transcribe-sample] audio-align failed, falling back:", e);
    }

    // Fallback: syllable-weighted distribution
    if (!lines || lines.length === 0) {
      lines = syllableFallback(cleanLines, duration);
      source = "syllable-fallback";
    }

    const { error: updateErr } = await supabase
      .from("featured_samples")
      .update({ synced_lyrics: lines })
      .eq("id", sampleId);
    if (updateErr) throw new Error(`Update failed: ${updateErr.message}`);

    return json({
      ok: true,
      sampleId,
      duration,
      lineCount: lines.length,
      source,
    });
  } catch (e) {
    console.error("transcribe-sample error:", e);
    return json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      500,
    );
  }
});

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// --------- Lyric prep ---------
function extractSingableLines(raw: string): string[] {
  return raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(
      (l) =>
        l.length > 0 &&
        !/^\[.*\]$/.test(l) && // [Verse 1], [Chorus]
        !/^\(.*\)$/.test(l), // (instrumental)
    );
}

// --------- Audio duration ---------
async function getAudioDuration(url: string): Promise<number> {
  try {
    const head = await fetch(url, { method: "HEAD" });
    const cd = head.headers.get("x-amz-meta-duration") || head.headers.get("content-duration");
    if (cd) {
      const n = parseFloat(cd);
      if (Number.isFinite(n) && n > 5) return n;
    }
    const len = parseInt(head.headers.get("content-length") || "0", 10);
    const ct = (head.headers.get("content-type") || "").toLowerCase();
    if (len > 0 && (ct.includes("mpeg") || ct.includes("mp3"))) {
      // Suno songs are ~192kbps CBR
      const bitsPerSecond = 192_000;
      const seconds = (len * 8) / bitsPerSecond;
      if (seconds > 30 && seconds < 600) return Math.round(seconds);
    }
  } catch (e) {
    console.warn("[transcribe-sample] HEAD failed", e);
  }
  return 180;
}

// --------- Primary: audio-aligned via Gemini ---------
async function alignWithAudio(
  audioUrl: string,
  lines: string[],
  duration: number,
): Promise<SyncedLine[]> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

  // Fetch audio + base64 encode for inline part
  const audioRes = await fetch(audioUrl);
  if (!audioRes.ok) throw new Error(`audio fetch ${audioRes.status}`);
  const audioBuf = new Uint8Array(await audioRes.arrayBuffer());
  const audioB64 = uint8ToBase64(audioBuf);
  const ct = audioRes.headers.get("content-type") || "audio/mpeg";

  const numbered = lines.map((t, i) => `${i + 1}. ${t}`).join("\n");

  const system =
    "You are a karaoke alignment engineer. You receive a song's audio and the exact lyrics, line by line. " +
    "Listen to the audio and return the START time (in seconds, decimals OK) at which each line begins being sung. " +
    "Do NOT change the lyrics text. Do NOT skip lines. Return one entry per input line, in order. " +
    "Use tool calling to return the result.";

  const user =
    `Audio duration: ${duration.toFixed(1)}s. Total lines to align: ${lines.length}.\n\n` +
    `Lyrics (one per line, numbered):\n${numbered}\n\n` +
    `Listen to the audio and return start_seconds for each line. End time will be inferred from the next line's start.`;

  const body = {
    model: ALIGN_MODEL,
    messages: [
      { role: "system", content: system },
      {
        role: "user",
        content: [
          { type: "text", text: user },
          {
            type: "input_audio",
            input_audio: { data: audioB64, format: ct.includes("wav") ? "wav" : "mp3" },
          },
        ],
      },
    ],
    tools: [
      {
        type: "function",
        function: {
          name: "submit_alignment",
          description: "Submit the per-line start times in seconds.",
          parameters: {
            type: "object",
            properties: {
              alignments: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    line_number: { type: "integer" },
                    start_seconds: { type: "number" },
                  },
                  required: ["line_number", "start_seconds"],
                  additionalProperties: false,
                },
              },
            },
            required: ["alignments"],
            additionalProperties: false,
          },
        },
      },
    ],
    tool_choice: { type: "function", function: { name: "submit_alignment" } },
  };

  const res = await fetch(LOVABLE_AI_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Lovable AI ${res.status}: ${t.slice(0, 300)}`);
  }
  const data = await res.json();
  const toolCall = data?.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall?.function?.arguments) throw new Error("No tool call returned");
  const args = JSON.parse(toolCall.function.arguments);
  const alignments: { line_number: number; start_seconds: number }[] =
    Array.isArray(args?.alignments) ? args.alignments : [];
  if (alignments.length === 0) throw new Error("Empty alignments");

  // Build a lookup keyed by 1-based line number
  const byNum = new Map<number, number>();
  for (const a of alignments) {
    if (Number.isFinite(a.start_seconds) && a.line_number >= 1) {
      byNum.set(a.line_number, Math.max(0, a.start_seconds));
    }
  }

  // Construct synced lines, filling gaps and clamping monotonically
  const result: SyncedLine[] = [];
  let lastStart = 0;
  for (let i = 0; i < lines.length; i++) {
    let start = byNum.get(i + 1);
    if (start === undefined) {
      // estimate based on neighbors
      start = lastStart + 3;
    }
    if (start < lastStart) start = lastStart + 0.2; // enforce monotonic
    result.push({ start: round2(start), end: 0, text: lines[i] });
    lastStart = start;
  }
  // Compute end as next line's start (or duration for the last)
  for (let i = 0; i < result.length; i++) {
    const next = result[i + 1];
    const end = next ? next.start : Math.min(duration, result[i].start + 5);
    result[i].end = round2(Math.max(end, result[i].start + 0.3));
  }

  // Sanity check: at least 60% of lines should have non-default starts
  const filled = Array.from(byNum.values()).length;
  if (filled < Math.max(3, Math.floor(lines.length * 0.6))) {
    throw new Error(`Only ${filled}/${lines.length} aligned, rejecting`);
  }
  return result;
}

// --------- Fallback: syllable-weighted distribution ---------
function syllableFallback(lines: string[], duration: number): SyncedLine[] {
  const introPad = Math.min(6, Math.max(2, duration * 0.05));
  const outroPad = Math.min(4, Math.max(1, duration * 0.03));
  const singDuration = Math.max(duration - introPad - outroPad, duration * 0.7);

  const weights = lines.map((l) => syllableEstimate(l));
  const totalWeight = weights.reduce((s, w) => s + w, 0) || 1;

  const out: SyncedLine[] = [];
  let cursor = introPad;
  for (let i = 0; i < lines.length; i++) {
    const dur = (weights[i] / totalWeight) * singDuration;
    const start = round2(cursor);
    const end = round2(cursor + dur);
    out.push({ start, end, text: lines[i] });
    cursor += dur;
  }
  return out;
}

function syllableEstimate(text: string): number {
  const cleaned = text.toLowerCase().replace(/[^a-z\s']/g, " ");
  const words = cleaned.split(/\s+/).filter(Boolean);
  let count = 0;
  for (const w of words) {
    const groups = w.match(/[aeiouy]+/g);
    count += Math.max(1, groups ? groups.length : 1);
  }
  return Math.max(1, count);
}

// --------- helpers ---------
function uint8ToBase64(bytes: Uint8Array): string {
  // chunk to avoid call-stack issues for large audio
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}
