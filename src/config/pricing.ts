// Pricing in cents. Read only at checkout backend — never displayed on lander directly.

export const PRICING = {
  base: 4999, // $49.99
  upsells: {
    extraVerse: 1999, // $19.99
    rushDelivery: 5900, // $59.00
    unlimitedEdits: 3299, // $32.99
  },
  currency: "usd",
} as const;
