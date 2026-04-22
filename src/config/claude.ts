// Claude Opus 4.5 config — same model for writer and scorer, different temperatures.

export const CLAUDE_CONFIG = {
  writer: {
    model: "claude-opus-4-5",
    maxTokens: 4000,
    temperature: 0.7,
  },
  scorer: {
    model: "claude-opus-4-5",
    maxTokens: 800,
    temperature: 0.2, // deterministic for scoring
  },
} as const;
