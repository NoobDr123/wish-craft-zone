// Transcribe a featured_sample's audio with line-level timestamps using
// Lovable AI (Gemini multimodal). Stores the result in featured_samples.synced_lyrics.
//
// Strategy:
//   1) Admin auth check (must be a user with role=admin)
//   2) Load the sample (audio_url + lyrics)
//   3) Fetch the audio, base64 it, send to Gemini with the existing lyrics text
//      and ask it to return line-level [start,end,text] JSON via tool calling
//   4) Persist to synced_lyrics

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface Line {
  start: number;
  end: number;
  text: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return json({ error: "LOVABLE_API_KEY not configured" }, 500);
    }

    // ---- Auth: must be admin ----
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return json({ error: "unauthenticated" }, 401);
    }
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) {
      return json({ error: "forbidden" }, 403);
    }

    const { sampleId } = await req.json();
    if (!sampleId) return json({ error: "sampleId required" }, 400);

    const { data: sample, error: sErr } = await admin
      .from("featured_samples")
      .select("id, audio_url, lyrics, title")
      .eq("id", sampleId)
      .maybeSingle();
    if (sErr || !sample) return json({ error: "sample not found" }, 404);
    if (!sample.audio_url) {
      return json({ error: "sample has no audio_url" }, 400);
    }

    // ---- Fetch audio and base64-encode ----
    const audioResp = await fetch(sample.audio_url);
    if (!audioResp.ok) {
      return json(
        { error: `failed to fetch audio (${audioResp.status})` },
        502,
      );
    }
    const audioBuf = new Uint8Array(await audioResp.arrayBuffer());
    const audioB64 = bytesToBase64(audioBuf);
    const mime = audioResp.headers.get("content-type") || "audio/mpeg";

    const lyricsHint = (sample.lyrics ?? "").trim();

    // ---- Ask Gemini to transcribe with line-level timestamps ----
    const systemPrompt = `You are a precise music lyric aligner.
You will be given an audio recording of a song and (optionally) the known lyrics text.
Your job is to return the lyrics broken into short singable lines, with the start
and end time (in seconds, with one decimal) of when each line is sung in the audio.

Rules:
- Return between 8 and 60 lines, depending on the song.
- Each line should be 2-10 words — what a karaoke screen would show at once.
- Times must be monotonically non-decreasing and within the audio duration.
- Do not include section labels like [Verse] or [Chorus].
- Skip purely instrumental gaps (do not output empty-text lines).
- If lyrics text is provided, use those exact words wherever possible — only
  re-segment them into karaoke lines and align them to the audio.
- If you cannot hear lyrics in a section, skip it.`;

    const userParts: Array<Record<string, unknown>> = [
      {
        type: "text",
        text:
          (lyricsHint
            ? `Known lyrics for this song (use these words; just re-segment and align):\n\n${lyricsHint}\n\n`
            : "No lyrics provided — transcribe what you hear.\n\n") +
          `Title: ${sample.title}\n\nReturn the aligned lines via the provided tool.`,
      },
      {
        type: "input_audio",
        input_audio: { data: audioB64, format: mimeToFormat(mime) },
      },
    ];

    const aiResp = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-pro",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userParts },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "return_synced_lyrics",
                description:
                  "Return the lyric lines aligned to the audio.",
                parameters: {
                  type: "object",
                  properties: {
                    lines: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          start: { type: "number" },
                          end: { type: "number" },
                          text: { type: "string" },
                        },
                        required: ["start", "end", "text"],
                        additionalProperties: false,
                      },
                    },
                  },
                  required: ["lines"],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: {
            type: "function",
            function: { name: "return_synced_lyrics" },
          },
        }),
      },
    );

    if (aiResp.status === 429) {
      return json({ error: "AI rate limit — try again in a minute." }, 429);
    }
    if (aiResp.status === 402) {
      return json({ error: "AI credits exhausted. Add credits to continue." }, 402);
    }
    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error("AI error", aiResp.status, t);
      return json({ error: `AI error ${aiResp.status}` }, 502);
    }
    const aiJson = await aiResp.json();
    const toolCall =
      aiJson?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!toolCall) {
      console.error("No tool call in response", JSON.stringify(aiJson));
      return json({ error: "AI did not return synced lyrics" }, 502);
    }
    let parsed: { lines: Line[] };
    try {
      parsed = JSON.parse(toolCall);
    } catch (_e) {
      return json({ error: "AI returned invalid JSON" }, 502);
    }
    const lines = sanitize(parsed.lines ?? []);
    if (lines.length === 0) {
      return json({ error: "No usable lyric lines were aligned" }, 502);
    }

    const { error: upErr } = await admin
      .from("featured_samples")
      .update({ synced_lyrics: lines })
      .eq("id", sampleId);
    if (upErr) {
      return json({ error: upErr.message }, 500);
    }

    return json({ ok: true, lineCount: lines.length, lines });
  } catch (e) {
    console.error("transcribe-sample error", e);
    return json({ error: e instanceof Error ? e.message : "unknown" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function sanitize(lines: Line[]): Line[] {
  const out: Line[] = [];
  let lastEnd = 0;
  for (const l of lines) {
    if (
      typeof l?.start !== "number" ||
      typeof l?.end !== "number" ||
      typeof l?.text !== "string"
    )
      continue;
    const text = l.text.trim();
    if (!text) continue;
    const start = Math.max(0, Number(l.start));
    let end = Math.max(start + 0.5, Number(l.end));
    if (start < lastEnd - 0.5) continue; // skip badly out-of-order
    lastEnd = end;
    out.push({ start: round1(start), end: round1(end), text });
  }
  return out;
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

function mimeToFormat(mime: string): string {
  const m = mime.toLowerCase();
  if (m.includes("mpeg") || m.includes("mp3")) return "mp3";
  if (m.includes("wav")) return "wav";
  if (m.includes("ogg")) return "ogg";
  if (m.includes("flac")) return "flac";
  if (m.includes("webm")) return "webm";
  if (m.includes("m4a") || m.includes("mp4") || m.includes("aac")) return "m4a";
  return "mp3";
}

function bytesToBase64(bytes: Uint8Array): string {
  // Chunked to avoid stack overflow on large audio
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(
      ...bytes.subarray(i, Math.min(i + chunk, bytes.length)),
    );
  }
  return btoa(binary);
}
