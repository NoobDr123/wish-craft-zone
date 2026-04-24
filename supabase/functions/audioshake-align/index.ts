// AudioShake forced-alignment for the hero featured_samples row.
//
// Flow:
//  1. Read sample (audio_url + lyrics).
//  2. Strip section markers like [Verse 1] from lyrics → singable lines.
//  3. Upload lyrics text as an AudioShake asset (so we can reference it as transcriptAssetId).
//  4. Submit a Task with the audio URL + alignment target referencing the transcript asset.
//  5. Poll the task until it completes.
//  6. Download the JSON output, group word-level timestamps back into lines,
//     and write them to featured_samples.synced_lyrics.
//
// Auth: INTERNAL_TRIGGER_SECRET header OR service-role JWT.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-internal-secret",
};

const AUDIOSHAKE_BASE = "https://api.audioshake.ai";
const POLL_INTERVAL_MS = 4000;
const MAX_POLL_ATTEMPTS = 60; // ~4 minutes

interface SyncedLine {
  start: number;
  end: number;
  text: string;
}

interface AlignedWord {
  text?: string;
  word?: string;
  start?: number;
  end?: number;
  start_time?: number;
  end_time?: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    // --- Auth ---
    const internalSecret = Deno.env.get("INTERNAL_TRIGGER_SECRET");
    const provided = req.headers.get("x-internal-secret");
    let authorized = !!internalSecret && provided === internalSecret;

    if (!authorized) {
      const auth = req.headers.get("Authorization") ?? "";
      const token = auth.replace(/^Bearer\s+/i, "");
      if (token) {
        try {
          const parts = token.split(".");
          if (parts.length === 3) {
            const payload = JSON.parse(
              atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")),
            );
            if (payload?.role === "service_role") authorized = true;
          }
        } catch {
          /* not a JWT */
        }
      }
    }
    if (!authorized) return json({ error: "Unauthorized" }, 401);

    const apiKey = Deno.env.get("AUDIOSHAKE_API_KEY");
    if (!apiKey) return json({ error: "AUDIOSHAKE_API_KEY not configured" }, 500);

    const { sampleId, taskId: existingTaskId } = await req.json();
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

    let taskId = existingTaskId as string | undefined;

    if (!taskId) {
      // --- 1. Submit job ---
      console.log(
        `[audioshake-align] submitting sample=${sampleId} lines=${cleanLines.length}`,
      );
      const lyricsText = cleanLines.join("\n");
      const transcriptAssetId = await uploadLyricsAsset(apiKey, lyricsText);
      console.log(`[audioshake-align] transcript asset uploaded: ${transcriptAssetId}`);

      taskId = await submitAlignmentTask(
        apiKey,
        sample.audio_url,
        transcriptAssetId,
      );
      console.log(`[audioshake-align] task submitted: ${taskId}`);

      const completed = await waitForCompletedTask(apiKey, taskId);
      if (!completed.downloadLink) {
        throw new Error("Alignment task completed without a download link");
      }

      const alignRes = await fetch(completed.downloadLink);
      if (!alignRes.ok) {
        throw new Error(`Failed to download alignment: ${alignRes.status}`);
      }
      const alignJson = await alignRes.json();
      const lines = mapAlignmentToLines(alignJson, cleanLines);
      if (lines.length === 0) {
        throw new Error("Alignment produced no lines");
      }

      const { error: updateErr } = await supabase
        .from("featured_samples")
        .update({ synced_lyrics: lines })
        .eq("id", sampleId);
      if (updateErr) throw new Error(`Update failed: ${updateErr.message}`);

      return json({
        ok: true,
        status: "completed",
        sampleId,
        lineCount: lines.length,
        taskId,
        provider: "audioshake",
      });
    }

    // --- 2. Check status of existing task ---
    const { status, downloadLink } = await checkTaskStatus(apiKey, taskId);
    console.log(`[audioshake-align] task=${taskId} status=${status}`);

    if (status === "pending") {
      return json({ ok: true, status: "pending", taskId, sampleId });
    }
    if (status === "failed") {
      return json({ ok: false, status: "failed", taskId, sampleId }, 500);
    }
    if (!downloadLink) {
      throw new Error("Completed but no download link");
    }

    // --- 3. Download alignment JSON ---
    const alignRes = await fetch(downloadLink);
    if (!alignRes.ok) {
      throw new Error(`Failed to download alignment: ${alignRes.status}`);
    }
    const alignJson = await alignRes.json();

    // --- 4. Convert word-level timings into our line-based structure ---
    const lines = mapAlignmentToLines(alignJson, cleanLines);
    if (lines.length === 0) {
      throw new Error("Alignment produced no lines");
    }

    // --- 5. Save back to DB ---
    const { error: updateErr } = await supabase
      .from("featured_samples")
      .update({ synced_lyrics: lines })
      .eq("id", sampleId);
    if (updateErr) throw new Error(`Update failed: ${updateErr.message}`);

    return json({
      ok: true,
      status: "completed",
      sampleId,
      lineCount: lines.length,
      taskId,
      provider: "audioshake",
    });
  } catch (e) {
    console.error("[audioshake-align] error:", e);
    return json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      500,
    );
  }
});

// =========================================================================
// AudioShake API helpers
// =========================================================================

async function uploadLyricsAsset(apiKey: string, lyrics: string): Promise<string> {
  const form = new FormData();
  const blob = new Blob([lyrics], { type: "text/plain" });
  form.append("file", blob, "lyrics.txt");

  const res = await fetch(`${AUDIOSHAKE_BASE}/assets`, {
    method: "POST",
    headers: { "x-api-key": apiKey, accept: "application/json" },
    body: form,
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Upload lyrics asset failed ${res.status}: ${t.slice(0, 300)}`);
  }
  const data = await res.json();
  // AudioShake returns an asset object; id is at .id or .asset.id depending on version.
  const id = data?.id ?? data?.asset?.id ?? data?.assetId;
  if (!id) throw new Error(`No asset id in upload response: ${JSON.stringify(data).slice(0, 300)}`);
  return id as string;
}

async function submitAlignmentTask(
  apiKey: string,
  audioUrl: string,
  transcriptAssetId: string,
): Promise<string> {
  const body = {
    url: audioUrl,
    targets: [
      {
        model: "alignment",
        formats: ["json"],
        transcriptAssetId,
      },
    ],
  };

  const res = await fetch(`${AUDIOSHAKE_BASE}/tasks`, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "Content-Type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Submit task failed ${res.status}: ${t.slice(0, 400)}`);
  }
  const data = await res.json();
  const taskId = data?.id ?? data?.task?.id ?? data?.taskId;
  if (!taskId) throw new Error(`No taskId in submit response: ${JSON.stringify(data).slice(0, 300)}`);
  return taskId as string;
}

async function checkTaskStatus(
  apiKey: string,
  taskId: string,
): Promise<{ status: "pending" | "completed" | "failed"; downloadLink?: string }> {
  const res = await fetch(`${AUDIOSHAKE_BASE}/tasks/${taskId}`, {
    headers: { "x-api-key": apiKey, accept: "application/json" },
  });
  if (!res.ok) {
    const t = await res.text();
    console.warn(`[audioshake-align] status ${res.status}: ${t.slice(0, 200)}`);
    return { status: "pending" };
  }
  const data = await res.json();
  const targets = data?.targets ?? data?.task?.targets ?? [];
  const alignmentTarget = targets.find(
    (t: any) => t?.model === "alignment" || t?.name === "alignment",
  );
  const outputs = alignmentTarget?.output ?? alignmentTarget?.outputs ?? [];

  for (const out of outputs) {
    const status = out?.status ?? out?.state;
    const link = out?.link ?? out?.url ?? out?.downloadUrl;
    const isJson =
      out?.format === "json" ||
      (typeof link === "string" && link.toLowerCase().includes(".json"));
    if (status === "completed" && isJson && link) {
      return { status: "completed", downloadLink: link };
    }
    if (status === "failed" || status === "error") {
      console.error(`[audioshake-align] target failed: ${JSON.stringify(out).slice(0, 300)}`);
      return { status: "failed" };
    }
  }

  const topStatus = data?.status ?? data?.task?.status;
  if (topStatus === "failed" || topStatus === "error") {
    return { status: "failed" };
  }
  return { status: "pending" };
}

async function waitForCompletedTask(apiKey: string, taskId: string) {
  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
    const result = await checkTaskStatus(apiKey, taskId);
    console.log(
      `[audioshake-align] poll ${attempt + 1}/${MAX_POLL_ATTEMPTS} task=${taskId} status=${result.status}`,
    );

    if (result.status === "completed") return result;
    if (result.status === "failed") {
      throw new Error(`Alignment task failed for ${taskId}`);
    }

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }

  throw new Error(`Alignment task timed out after ${MAX_POLL_ATTEMPTS} attempts`);
}

// =========================================================================
// Lyric prep + alignment mapping
// =========================================================================

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

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

/**
 * AudioShake alignment JSON typically returns either:
 *   { lines: [{ text, start, end, words: [...] }] }
 *   { words: [{ text, start, end }] }
 *   { segments: [{ text, start, end }] }
 *
 * We try line-level first; if only words are available, we group words back
 * onto our original `cleanLines` by walking through them in order.
 */
function mapAlignmentToLines(alignment: any, cleanLines: string[]): SyncedLine[] {
  // Strategy 1: explicit lines / segments
  const candidateLines =
    alignment?.lines ??
    alignment?.segments ??
    alignment?.alignedLines ??
    null;

  if (Array.isArray(candidateLines) && candidateLines.length > 0) {
    const textMapped = mapSegmentsToCleanLines(candidateLines, cleanLines);
    if (textMapped.length > 0) return enforceMonotonic(textMapped);

    const out: SyncedLine[] = [];
    for (let i = 0; i < candidateLines.length && i < cleanLines.length; i++) {
      const seg = candidateLines[i];
      const start = numOrNull(seg?.start ?? seg?.start_time);
      const end = numOrNull(seg?.end ?? seg?.end_time);
      if (start === null) continue;
      out.push({
        start: round2(start),
        end: round2(Math.max(end ?? start + 2, start + 0.3)),
        text: cleanLines[i],
      });
    }
    if (out.length > 0) return enforceMonotonic(out);
  }

  // Strategy 2: word-level → group onto our lines
  const words: AlignedWord[] =
    alignment?.words ??
    alignment?.wordTimings ??
    alignment?.tokens ??
    [];

  if (!Array.isArray(words) || words.length === 0) return [];

  const out: SyncedLine[] = [];
  let cursor = 0;

  for (const lineText of cleanLines) {
    const tokens = lineText.split(/\s+/).filter(Boolean);
    const tokenCount = tokens.length;
    if (tokenCount === 0) continue;

    const slice = words.slice(cursor, cursor + tokenCount);
    if (slice.length === 0) break;

    const firstStart = numOrNull(slice[0]?.start ?? slice[0]?.start_time);
    const lastEnd = numOrNull(
      slice[slice.length - 1]?.end ?? slice[slice.length - 1]?.end_time,
    );

    if (firstStart !== null) {
      out.push({
        start: round2(firstStart),
        end: round2(Math.max(lastEnd ?? firstStart + 2, firstStart + 0.3)),
        text: lineText,
      });
    }
    cursor += tokenCount;
  }

  return enforceMonotonic(out);
}

function numOrNull(v: unknown): number | null {
  const n = typeof v === "string" ? parseFloat(v) : (v as number);
  return Number.isFinite(n) ? n : null;
}

function mapSegmentsToCleanLines(candidateLines: any[], cleanLines: string[]): SyncedLine[] {
  const usable = candidateLines
    .map((seg) => ({
      text: typeof seg?.text === "string" ? seg.text.trim() : "",
      start: numOrNull(seg?.start ?? seg?.start_time),
      end: numOrNull(seg?.end ?? seg?.end_time),
    }))
    .filter((seg) => seg.text && seg.start !== null);

  if (usable.length === 0) return [];

  const out: SyncedLine[] = [];
  let cursor = 0;

  for (const cleanLine of cleanLines) {
    const target = normalizeLyric(cleanLine);
    if (!target) continue;

    let best:
      | { startIdx: number; endIdx: number; score: number }
      | null = null;

    for (let startIdx = cursor; startIdx < Math.min(usable.length, cursor + 4); startIdx++) {
      let combined = "";

      for (let endIdx = startIdx; endIdx < Math.min(usable.length, startIdx + 4); endIdx++) {
        combined = `${combined} ${usable[endIdx].text}`.trim();
        const score = lyricMatchScore(target, normalizeLyric(combined));

        if (!best || score > best.score) {
          best = { startIdx, endIdx, score };
        }

        if (score >= 0.98) break;
      }

      if (best?.score && best.score >= 0.98) break;
    }

    if (!best || best.score < 0.58) {
      continue;
    }

    const first = usable[best.startIdx];
    const last = usable[best.endIdx];
    const start = first.start!;
    const end = last.end ?? start + 2;

    out.push({
      start: round2(start),
      end: round2(Math.max(end, start + 0.3)),
      text: cleanLine,
    });

    cursor = best.endIdx + 1;
  }

  return out;
}

function normalizeLyric(input: string): string {
  return input
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function lyricMatchScore(target: string, candidate: string): number {
  if (!target || !candidate) return 0;
  if (target === candidate) return 1;
  if (target.includes(candidate) || candidate.includes(target)) {
    return Math.min(target.length, candidate.length) / Math.max(target.length, candidate.length);
  }

  const targetTokens = new Set(target.split(" ").filter(Boolean));
  const candidateTokens = new Set(candidate.split(" ").filter(Boolean));
  if (targetTokens.size === 0 || candidateTokens.size === 0) return 0;

  let overlap = 0;
  for (const token of targetTokens) {
    if (candidateTokens.has(token)) overlap += 1;
  }

  const precision = overlap / candidateTokens.size;
  const recall = overlap / targetTokens.size;
  if (precision + recall === 0) return 0;
  return (2 * precision * recall) / (precision + recall);
}

function enforceMonotonic(lines: SyncedLine[]): SyncedLine[] {
  let last = 0;
  for (const l of lines) {
    if (l.start < last) l.start = round2(last + 0.1);
    if (l.end <= l.start) l.end = round2(l.start + 0.5);
    last = l.start;
  }
  // Make end of each line meet the start of the next so the overlay looks tight
  for (let i = 0; i < lines.length - 1; i++) {
    const next = lines[i + 1];
    if (lines[i].end > next.start) lines[i].end = round2(next.start);
    if (lines[i].end <= lines[i].start) lines[i].end = round2(lines[i].start + 0.3);
  }
  return lines;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
