import { loadStripe, type Stripe } from "@stripe/stripe-js";

const clientToken = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN;

export const stripeEnvironment: "sandbox" | "live" =
  clientToken?.startsWith("pk_test_") ? "sandbox" : "live";

let stripePromise: Promise<Stripe | null> | null = null;

/**
 * Begin loading Stripe.js. Safe to call multiple times — the promise is
 * memoized. Call this from any page that's likely to lead to checkout
 * (e.g. /almost-there, /scratch) to warm the CDN connection.
 */
export function preloadStripe(): Promise<Stripe | null> {
  if (!stripePromise) {
    if (!clientToken) {
      throw new Error("VITE_PAYMENTS_CLIENT_TOKEN is not set");
    }
    stripePromise = loadStripe(clientToken);
  }
  return stripePromise;
}

export function getStripe(): Promise<Stripe | null> {
  return preloadStripe();
}
