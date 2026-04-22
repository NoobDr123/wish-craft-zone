// Hardcoded Suno generation config. Single source of truth.
// Never override these values from anywhere except SUNO_MODEL_OVERRIDE env.

export const SUNO_CONFIG = {
  model: (process.env.SUNO_MODEL_OVERRIDE as "V5" | "V4_5PLUS" | "V4") || "V5",
  styleWeight: 0.75,
  weirdnessConstraint: 0.3, // low = conventional, emotionally legible. Do not raise.
  audioWeight: 0.7,
  customMode: true,
  instrumental: false,
  maxDurationSeconds: 300,
} as const;
