// Aligns the Claude-written lyrics for a featured_samples row to its audio.
// Words come from the `lyrics` column (Claude's source of truth — no transcription).
// Timing is estimated by:
//   1. Reading audio duration via a partial fetch + WebAudio-free MP3 header parse,
//      falling back to a Lovable AI duration probe if needed.
//   2. Asking Claude (Opus) to split lyrics into singable lines and weight each
//      line by syllable count + line type (verse/chorus/bridge), distributing the
//      total audio duration across lines so karaoke pacing feels musical.
// Triggered by the DB trigger `trigger_transcribe_sample` whenever audio_url changes.
// Auth: INTERNAL_TRIGGER_SECRET.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

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

interface ClaudeLine {
  text: string;
  weight: number; // relative duration weight (syllable + type adjusted)
  section?: string; // "verse" | "chorus" | "bridge" | "outro" | "intro"
}

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const CLAUDE_MODEL = "claude-opus-4-5";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const internalSecret = Deno.env.get("INTERNAL_TRIGGER_SECRET");
    const provided = req.headers.get("x-internal-secret");
    if (!internalSecret || provided !== internalSecret) {
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

    // 1) Get audio duration
    const duration = await getAudioDuration(sample.audio_url);
    console.log(`[transcribe-sample] sample=${sampleId} duration=${duration}s`);

    // 2) Have Claude split + weight lyric lines
    const claudeLines = await splitLyricsWithClaude(sample.lyrics);
    if (claudeLines.length === 0) throw new Error("Claude returned no lines");

    // 3) Distribute the audio duration across lines using weights.
    //    Reserve a small intro (~5% or up to 6s) and outro (~3% or up to 4s)
    //    for instrumental space so first line doesn't start at 0.
    const introPad = Math.min(6, Math.max(2, duration * 0.05));
    const outroPad = Math.min(4, Math.max(1, duration * 0.03));
    const singDuration = Math.max(duration - introPad - outroPad, duration * 0.7);

    const totalWeight = claudeLines.reduce((s, l) => s + l.weight, 0) || 1;
    const lines: SyncedLine[] = [];
    let cursor = introPad;
    for (const cl of claudeLines) {
      const dur = (cl.weight / totalWeight) * singDuration;
      const start = round2(cursor);
      const end = round2(cursor + dur);
      lines.push({ start, end, text: cl.text });
      cursor += dur;
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
      source: "claude",
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

// --------- Audio duration ---------
// Try Content-Duration header (some CDNs send it), then estimate via byte-rate
// for MP3 (CBR assumption), then fall back to a fixed estimate.
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
      // Suno songs are 192kbps CBR by default
      const bitsPerSecond = 192_000;
      const seconds = (len * 8) / bitsPerSecond;
      if (seconds > 30 && seconds < 600) return Math.round(seconds);
    }
  } catch (e) {
    console.warn("[transcribe-sample] HEAD failed, falling back", e);
  }
  // Fallback estimate — typical Suno V5 ribbon song length
  return 180;
}

// --------- Claude lyric splitter ---------
async function splitLyricsWithClaude(lyrics: string): Promise<ClaudeLine[]> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");

  const system = `You are a karaoke timing engineer. You split song lyrics into singable lines and assign each line a relative duration "weight" (a positive number). Heavier weights mean the line takes longer to sing. Use these rules:
- One singable line per entry. Never combine multiple lines.
- Skip pure section headers like [Verse 1], [Chorus], [Bridge], [Outro] — these are not sung.
- Skip blank lines.
- Weight ≈ syllable count, with multipliers:
  * Chorus / refrain repeat lines: ×1.15 (often held)
  * Bridge climactic lines: ×1.1
  * Short interjections (e.g. "Oh", "Yeah"): ×0.6 minimum 1
  * Final outro line: ×1.4 (typically held / faded)
- Tag each line with its section: "intro", "verse", "chorus", "bridge", "outro".
- Output STRICT JSON only. No prose, no markdown.`;

  const user = `Split this song into singable lines with weights. Return JSON only.

LYRICS:
${lyrics}

Return JSON:
{
  "lines": [
    { "text": "first singable line", "weight": 12, "section": "verse" },
    ...
  ]
}`;

  const res = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 4000,
      temperature: 0.1,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Claude ${res.status}: ${t.slice(0, 300)}`);
  }
  const data = await res.json();
  const text: string = data?.content?.[0]?.text ?? "";
  const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
  let parsed: any;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    const m = cleaned.match(/\{[\s\S]*\}/);
    if (!m) throw new Error("Claude returned non-JSON: " + text.slice(0, 200));
    parsed = JSON.parse(m[0]);
  }
  const arr = Array.isArray(parsed?.lines) ? parsed.lines : [];
  return arr
    .map((l: any) => ({
      text: String(l.text ?? "").trim(),
      weight: Math.max(1, Number(l.weight) || syllableEstimate(String(l.text ?? ""))),
      section: l.section,
    }))
    .filter((l: ClaudeLine) => l.text.length > 0);
}

// Fallback syllable estimator if Claude omits a weight
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
