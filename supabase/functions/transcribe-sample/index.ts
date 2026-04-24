// Auto-aligns lyrics to a featured_samples row's audio using Lovable AI.
// Called by a DB trigger (no auth) whenever audio_url changes.
// Uses INTERNAL_TRIGGER_SECRET for authorization.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-internal-secret",
};

interface SyncedLine { start: number; end: number; text: string }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const internalSecret = Deno.env.get("INTERNAL_TRIGGER_SECRET");
    const provided = req.headers.get("x-internal-secret");
    if (!internalSecret || provided !== internalSecret) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { sampleId } = await req.json();
    if (!sampleId) {
      return new Response(JSON.stringify({ error: "sampleId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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

    // Download audio and convert to base64 for Gemini
    const audioRes = await fetch(sample.audio_url);
    if (!audioRes.ok) throw new Error(`Failed to fetch audio: ${audioRes.status}`);
    const audioBuf = new Uint8Array(await audioRes.arrayBuffer());
    let binary = "";
    for (let i = 0; i < audioBuf.length; i++) binary += String.fromCharCode(audioBuf[i]);
    const audioB64 = btoa(binary);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          {
            role: "system",
            content: "You are an expert at aligning song lyrics to audio. Given an audio file and the full lyrics, return precise start/end timestamps (in seconds) for each singable line.",
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Align these lyrics to the audio. Return one entry per singable line, in order, with start and end times in seconds (decimals OK).\n\nLyrics:\n${sample.lyrics}`,
              },
              {
                type: "input_audio",
                input_audio: { data: audioB64, format: "mp3" },
              },
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "save_synced_lyrics",
              description: "Save the time-aligned lyric lines.",
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
                    },
                  },
                },
                required: ["lines"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "save_synced_lyrics" } },
      }),
    });

    if (!aiRes.ok) {
      const t = await aiRes.text();
      throw new Error(`AI gateway ${aiRes.status}: ${t}`);
    }

    const aiJson = await aiRes.json();
    const toolCall = aiJson.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("AI did not return tool call");
    const args = JSON.parse(toolCall.function.arguments);
    const lines: SyncedLine[] = args.lines || [];
    if (lines.length === 0) throw new Error("AI returned no lines");

    const { error: updateErr } = await supabase
      .from("featured_samples")
      .update({ synced_lyrics: lines })
      .eq("id", sampleId);

    if (updateErr) throw new Error(`Update failed: ${updateErr.message}`);

    return new Response(
      JSON.stringify({ ok: true, sampleId, lineCount: lines.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("transcribe-sample error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
