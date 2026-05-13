import { useEffect, useState } from "react";
import {
  COUNTRY_CHANGED_EVENT,
  currencyForCountry,
  detectCountry,
  formatProduct,
  getCountryOverride,
  PRICING,
  type SupportedCurrency,
} from "@/lib/currency";

const CACHE_KEY = "pps:buyer_currency";

function readCached(): SupportedCurrency {
  if (typeof window === "undefined") return "USD";
  const override = getCountryOverride();
  if (override) return currencyForCountry(override);
  const raw = window.localStorage.getItem(CACHE_KEY);
  if (raw === "USD" || raw === "GBP" || raw === "CAD" || raw === "AUD" || raw === "NZD") {
    return raw;
  }
  return "USD";
}

/**
 * Returns the buyer's currency (USD/GBP/CAD/AUD/NZD). Resolution order:
 *   1. Manual country override (set via the country picker).
 *   2. Cloudflare edge geolocation, cached in localStorage.
 *   3. USD fallback.
 */
export function useBuyerCurrency(): SupportedCurrency {
  const [currency, setCurrency] = useState<SupportedCurrency>(readCached);

  useEffect(() => {
    let cancelled = false;
    void detectCountry().then((country) => {
      const next = currencyForCountry(country);
      if (cancelled) return;
      setCurrency(next);
      try {
        window.localStorage.setItem(CACHE_KEY, next);
      } catch {
        /* ignore */
      }
    });

    const onChange = (e: Event) => {
      const country = (e as CustomEvent<string>).detail;
      const next = currencyForCountry(country);
      setCurrency(next);
      try {
        window.localStorage.setItem(CACHE_KEY, next);
      } catch {
        /* ignore */
      }
    };
    window.addEventListener(COUNTRY_CHANGED_EVENT, onChange);

    return () => {
      cancelled = true;
      window.removeEventListener(COUNTRY_CHANGED_EVENT, onChange);
    };
  }, []);

  return currency;
}

export type { SupportedCurrency };
export { formatProduct, PRICING };
