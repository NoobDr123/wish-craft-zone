// Server-authoritative pricing catalog for big-5 markets. Mirrors
// src/lib/currency.ts — both files MUST stay in sync. We never trust
// client-supplied amounts; the edge functions look up the price here.

export type SupportedCurrency = "USD" | "GBP" | "CAD" | "AUD" | "NZD";

const SUPPORTED = new Set<SupportedCurrency>(["USD", "GBP", "CAD", "AUD", "NZD"]);

export function normalizeCurrency(input: unknown): SupportedCurrency {
  if (typeof input === "string") {
    const up = input.toUpperCase();
    if (SUPPORTED.has(up as SupportedCurrency)) return up as SupportedCurrency;
  }
  return "USD";
}

export function currencyForCountry(country: unknown): SupportedCurrency {
  if (typeof country !== "string") return "USD";
  switch (country.toUpperCase()) {
    case "GB": return "GBP";
    case "CA": return "CAD";
    case "AU": return "AUD";
    case "NZ": return "NZD";
    default: return "USD";
  }
}

type ProductKey =
  | "base"
  | "extra_verse"
  | "rush_delivery"
  | "express_90min"
  | "unlimited_edits";

export const PRICING: Record<SupportedCurrency, Record<ProductKey, number>> = {
  USD: { base: 2999, extra_verse: 1999, rush_delivery: 3999, express_90min: 5999, unlimited_edits: 3299 },
  GBP: { base: 2499, extra_verse: 1699, rush_delivery: 3299, express_90min: 4999, unlimited_edits: 2699 },
  CAD: { base: 3999, extra_verse: 2699, rush_delivery: 5499, express_90min: 7999, unlimited_edits: 4499 },
  AUD: { base: 4499, extra_verse: 2999, rush_delivery: 5999, express_90min: 8999, unlimited_edits: 4999 },
  NZD: { base: 4999, extra_verse: 3299, rush_delivery: 6499, express_90min: 9999, unlimited_edits: 5499 },
};

export function getProductPrice(currency: SupportedCurrency, key: ProductKey): number {
  return PRICING[currency][key];
}

// Test-promo flat amounts roughly equivalent to USD $5/$2/$1 in each currency.
// Used by apply-promo-code for the T3ST family.
export const TEST_PROMO_FLAT: Record<SupportedCurrency, { T3ST: number; T3ST2: number; T3ST1: number }> = {
  USD: { T3ST: 500, T3ST2: 200, T3ST1: 100 },
  GBP: { T3ST: 400, T3ST2: 200, T3ST1: 100 },
  CAD: { T3ST: 700, T3ST2: 300, T3ST1: 150 },
  AUD: { T3ST: 800, T3ST2: 300, T3ST1: 150 },
  NZD: { T3ST: 900, T3ST2: 300, T3ST1: 200 },
};
