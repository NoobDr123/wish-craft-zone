// Pipeline tuning knobs. All thresholds, retry caps, and delays live here.

export const PIPELINE_CONFIG = {
  // Retry caps
  maxClaudeRetries: 2,
  maxKieRetries: 2,

  // Scoring thresholds
  lyricScorePassThreshold: 3.8, // out of 5
  audioScoreShipThreshold: 0.75, // out of 1
  audioScoreRegenerateBelow: 0.6,

  // Timeouts
  kieCallbackTimeoutMs: 15 * 60 * 1000, // 15 min
  kieTaskStaleAfterMs: 3 * 60 * 1000, // poll after 3 min
  briefGenerationTimeoutMs: 90 * 1000, // 90s for Claude
  autoQcTimeoutMs: 120 * 1000, // 2 min

  // Delivery delays (artificial — feels handcrafted, under-promise / over-deliver)
  // Promised on landing: 5 days standard / 48h express / 24h rush.
  // Actual delivery is a fraction of that so customers are pleasantly surprised.
  standardDeliveryDelayHours: 24, // promised 5 days, actually 24h
  express48hDeliveryDelayHours: 12, // promised 48h, actually 12h
  rush24hDeliveryDelayHours: 7, // promised 24h, actually 7h
  hospiceDeliveryDelayMinutes: 20, // 20 min

  // Stale state alerts
  orderStaleAlertHours: 4,
  orderEscalationHours: 12,
} as const;
