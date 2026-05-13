import { useEffect, useState } from "react";
import {
  currencyForCountry,
  detectCountry,
  formatProduct,
  PRICING,
  type SupportedCurrency,
} from "@/lib/currency";

const CACHE_KEY = "pps:buyer_currency";

function readCached(): SupportedCurrency {
  if (typeof window === "undefined") return "USD";
  const raw = window.localStorage.getItem(CACHE_KEY);
  if (raw === "USD" || raw === "GBP" || raw === "CAD" || raw === "AUD" || raw === "NZD") {
    return raw;
  }
  return "USD";
}

/**
 * Returns the buyer's currency (USD/GBP/CAD/AUD/NZD) inferred from
 * Cloudflare's edge geolocation. Defaults to USD on first paint, then
 * upgrades after detection so the page never shows "loading…" prices.
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
    return () => {
      cancelled = true;
    };
  }, []);

  return currency;
}

export type { SupportedCurrency };
export { formatProduct, PRICING };
