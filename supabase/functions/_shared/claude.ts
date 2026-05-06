// Shared Anthropic client + brief schema for PawPrint Song pipeline.

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

export interface ClaudeMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ClaudeCallOpts {
  model: string;
  maxTokens: number;
  temperature: number;
  system?: string;
  messages: ClaudeMessage[];
}

export async function callClaude(opts: ClaudeCallOpts): Promise<string> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");

  const res = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: opts.model,
      max_tokens: opts.maxTokens,
      temperature: opts.temperature,
      system: opts.system,
      messages: opts.messages,
    }),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Claude error ${res.status}: ${txt}`);
  }

  const data = await res.json();
  const text = data?.content?.[0]?.text;
  if (!text) throw new Error("Claude returned empty content");
  return text;
}

export interface BriefScore {
  emotional_resonance: number; // 0-5
  specificity: number; // 0-5
  flow_and_singability: number; // 0-5
  tonal_match: number; // 0-5
  coherence: number; // 0-5
  tense_correctness: number; // 0-5 — HARD GATE for hospice/memory
  overall: number; // weighted average, 0-5
  notes: string;
}

export interface SongBrief {
  title: string;
  style_prompt: string; // for Suno style field
  lyrics: string; // structured w/ [Verse 1], [Chorus], etc.
  language: string;
  emotional_tone: string;
}

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};
