// Multi-currency for the big-5 markets we run ads to.
// Charges happen natively in the buyer's currency through Stripe — the same
// catalog is mirrored server-side in supabase/functions/_shared/pricing.ts.
// If you change a number here, change it there too.

export type SupportedCurrency = "USD" | "GBP" | "CAD" | "AUD" | "NZD";
/** ISO-3166-1 alpha-2 country code where we charge in the local currency. */
export type SupportedCountry = "US" | "GB" | "CA" | "AU" | "NZ";
/** Any 2-letter ISO country code. Non-supported codes fall back to USD pricing. */
export type BillingCountry = string;

const SUPPORTED_COUNTRY_SET = new Set<SupportedCountry>(["US", "GB", "CA", "AU", "NZ"]);
export function isSupportedCountry(code: string | null | undefined): code is SupportedCountry {
  return !!code && SUPPORTED_COUNTRY_SET.has(code.toUpperCase() as SupportedCountry);
}

export const COUNTRY_TO_CURRENCY: Record<SupportedCountry, SupportedCurrency> = {
  US: "USD",
  GB: "GBP",
  CA: "CAD",
  AU: "AUD",
  NZ: "NZD",
};

// Hand-tuned to land on .99 endings (psychological pricing) while being
// close to spot FX + a small FX cushion. Numbers are in the smallest unit
// (cents / pence) of the target currency.
type ProductKey =
  | "base"
  | "compare_at"
  | "extra_verse"
  | "rush_delivery"
  | "express_90min"
  | "unlimited_edits";

export const PRICING: Record<SupportedCurrency, Record<ProductKey, number>> = {
  USD: { base: 2999, compare_at: 5999, extra_verse: 1999, rush_delivery: 3999, express_90min: 5999, unlimited_edits: 3299 },
  GBP: { base: 2499, compare_at: 4999, extra_verse: 1699, rush_delivery: 3299, express_90min: 4999, unlimited_edits: 2699 },
  CAD: { base: 3999, compare_at: 7999, extra_verse: 2699, rush_delivery: 5499, express_90min: 7999, unlimited_edits: 4499 },
  AUD: { base: 4499, compare_at: 8999, extra_verse: 2999, rush_delivery: 5999, express_90min: 8999, unlimited_edits: 4999 },
  NZD: { base: 4999, compare_at: 9999, extra_verse: 3299, rush_delivery: 6499, express_90min: 9999, unlimited_edits: 5499 },
};

const SUPPORTED_CURRENCIES = new Set<SupportedCurrency>(["USD", "GBP", "CAD", "AUD", "NZD"]);

export function normalizeCurrency(input: unknown): SupportedCurrency {
  if (typeof input === "string") {
    const up = input.toUpperCase();
    if (SUPPORTED_CURRENCIES.has(up as SupportedCurrency)) return up as SupportedCurrency;
  }
  return "USD";
}

export function currencyForCountry(country: string | null | undefined): SupportedCurrency {
  if (!country) return "USD";
  const cc = country.toUpperCase() as SupportedCountry;
  return COUNTRY_TO_CURRENCY[cc] ?? "USD";
}

export function getProductPrice(currency: SupportedCurrency, key: ProductKey): number {
  return PRICING[currency][key];
}

// Display: $29.99 / £24.99 / CA$39.99 / A$44.99 / NZ$49.99
const FORMATTERS: Record<SupportedCurrency, Intl.NumberFormat> = {
  USD: new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", currencyDisplay: "narrowSymbol" }),
  GBP: new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", currencyDisplay: "narrowSymbol" }),
  CAD: new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", currencyDisplay: "symbol" }),
  AUD: new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", currencyDisplay: "symbol" }),
  NZD: new Intl.NumberFormat("en-NZ", { style: "currency", currency: "NZD", currencyDisplay: "symbol" }),
};

export function formatMoney(cents: number, currency: SupportedCurrency): string {
  return FORMATTERS[currency].format(cents / 100);
}

export function formatProduct(currency: SupportedCurrency, key: ProductKey): string {
  return formatMoney(getProductPrice(currency, key), currency);
}

// Country detection via Cloudflare's edge — works from any origin and is
// cached in localStorage so we don't hit it on every page.
const STORAGE_KEY = "pps:buyer_country";
const OVERRIDE_KEY = "pps:buyer_country_override";
export const COUNTRY_CHANGED_EVENT = "pps:country-changed";
const STORAGE_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7d

type Cached = { country: string; ts: number };

export const SUPPORTED_COUNTRIES: { code: SupportedCountry; label: string; flag: string }[] = [
  { code: "US", label: "United States", flag: "🇺🇸" },
  { code: "GB", label: "United Kingdom", flag: "🇬🇧" },
  { code: "CA", label: "Canada", flag: "🇨🇦" },
  { code: "AU", label: "Australia", flag: "🇦🇺" },
  { code: "NZ", label: "New Zealand", flag: "🇳🇿" },
];

/** User-selected country wins over edge detection. */
export function setCountryOverride(country: SupportedCountry): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(OVERRIDE_KEY, country);
    window.dispatchEvent(new CustomEvent(COUNTRY_CHANGED_EVENT, { detail: country }));
  } catch {
    /* ignore */
  }
}

export function getCountryOverride(): SupportedCountry | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(OVERRIDE_KEY);
    if (raw && (raw === "US" || raw === "GB" || raw === "CA" || raw === "AU" || raw === "NZ")) {
      return raw;
    }
  } catch {
    /* ignore */
  }
  return null;
}

export async function detectCountry(): Promise<string> {
  if (typeof window === "undefined") return "US";
  const override = getCountryOverride();
  if (override) return override;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Cached;
      if (parsed?.country && Date.now() - parsed.ts < STORAGE_TTL_MS) {
        return parsed.country;
      }
    }
  } catch {
    /* ignore */
  }
  try {
    const res = await fetch("https://www.cloudflare.com/cdn-cgi/trace", { cache: "no-store" });
    const text = await res.text();
    const match = text.match(/loc=([A-Z]{2})/);
    const country = match?.[1] || "US";
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ country, ts: Date.now() } satisfies Cached));
    } catch {
      /* ignore */
    }
    return country;
  } catch {
    return "US";
  }
}
