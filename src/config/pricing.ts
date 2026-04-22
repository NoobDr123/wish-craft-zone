// Pricing in cents. Read only at checkout backend — never displayed on lander directly.

export const PRICING = {
  base: 3900, // $39.00
  upsells: {
    extraVerse: 1999, // $19.99
    rushDelivery: 5900, // $59.00
    unlimitedEdits: 3299, // $32.99
  },
  currency: "usd",
} as const;
