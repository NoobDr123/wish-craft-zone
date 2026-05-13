// Pricing in cents. Read only at checkout backend — never displayed on lander directly.

export const PRICING = {
  base: 2999, // $29.99
  upsells: {
    extraVerse: 1999, // $19.99
    rushDelivery: 3999, // $39.99 — 24h downsell
    priority90min: 5999, // $59.99 — top-priority upsell
    unlimitedEdits: 3299, // $32.99
  },
  currency: "usd",
} as const;
