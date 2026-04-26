import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CardCvcElement,
  CardExpiryElement,
  CardNumberElement,
  Elements,
  ExpressCheckoutElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import type {
  StripeCardCvcElementOptions,
  StripeCardExpiryElementOptions,
  StripeCardNumberElementOptions,
} from "@stripe/stripe-js";
import { Loader2, Lock, ShieldCheck } from "lucide-react";
import { getStripe, stripeEnvironment } from "@/lib/stripe";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  orderId: string;
  /** Bumped whenever the order amount changes (promo applied) so we re-fetch a PI. */
  amountVersion: number;
  /** Where Stripe should send the buyer after a redirect-style wallet confirmation. */
  returnUrl: string;
  /** Buyer email — used by Stripe Link + receipts. */
  email: string;
  /** Buyer name — included in billing details. */
  name: string;
  quizPatch?: Record<string, unknown>;
  quizSnapshot?: Record<string, unknown>;
  onError?: (msg: string) => void;
}

interface SessionState {
  clientSecret: string;
  paymentIntentId: string;
  amount: number;
  currency: string;
}

/**
 * Fully custom on-page checkout:
 *   • ExpressCheckoutElement at the top → Apple Pay / Google Pay / Link only.
 *   • Hand-coded card form below using individual Stripe Elements primitives
 *     (CardNumber / CardExpiry / CardCvc) so we control every label, wrapper,
 *     and country dropdown ourselves. PCI scope stays SAQ A.
 */
export function StripeCustomCheckout(props: Props) {
  const { orderId, amountVersion, email, name, quizPatch, quizSnapshot, onError } = props;
  const [session, setSession] = useState<SessionState | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const fetchTokenRef = useRef(0);

  const fetchSession = useCallback(async () => {
    const myToken = ++fetchTokenRef.current;
    setLoading(true);
    setFetchError(null);

    const { data: authData } = await supabase.auth.getUser();
    const userId = authData.user?.id ?? null;

    // Retry with exponential backoff on transient errors (503 / network blips).
    // Edge Runtime occasionally returns SUPABASE_EDGE_RUNTIME_ERROR on cold
    // boots — the next call almost always succeeds.
    const MAX_ATTEMPTS = 4;
    const BACKOFFS_MS = [400, 900, 1800];
    let lastErrorMsg = "Could not start checkout. Please try again.";

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      if (myToken !== fetchTokenRef.current) return; // superseded
      try {
        console.log("[checkout] requesting payment intent", {
          orderId,
          amountVersion,
          attempt: attempt + 1,
        });
        const { data, error } = await supabase.functions.invoke("create-payment-intent", {
          body: { orderId, environment: stripeEnvironment, quizPatch, quizSnapshot, userId },
        });
        if (myToken !== fetchTokenRef.current) return;

        if (error) {
          const status = (error as { context?: { status?: number } })?.context?.status;
          const msg = error.message || "Could not start checkout.";
          lastErrorMsg = msg;
          // 503 / 504 / network = transient — retry. 4xx = real error, fail fast.
          const transient = !status || status === 503 || status === 504 || status === 408 || status === 502 || /service is temporarily unavailable|runtime_error|failed to fetch|network/i.test(msg);
          if (transient && attempt < MAX_ATTEMPTS - 1) {
            console.warn(`[checkout] transient error (status=${status}), retrying in ${BACKOFFS_MS[attempt]}ms`);
            await new Promise((r) => setTimeout(r, BACKOFFS_MS[attempt]));
            continue;
          }
          console.error("[checkout] create-payment-intent invoke error:", error);
          setFetchError(msg);
          onError?.(msg);
          setLoading(false);
          return;
        }

        if (!data?.clientSecret) {
          const msg = (data as { error?: string })?.error || "Checkout could not be initialized.";
          console.error("[checkout] no clientSecret:", data);
          setFetchError(msg);
          onError?.(msg);
          setLoading(false);
          return;
        }

        console.log("[checkout] PI ready", { paymentIntentId: data.paymentIntentId });
        setSession({
          clientSecret: data.clientSecret as string,
          paymentIntentId: data.paymentIntentId as string,
          amount: data.amount as number,
          currency: data.currency as string,
        });
        setLoading(false);
        return;
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Network error preparing checkout.";
        lastErrorMsg = msg;
        if (attempt < MAX_ATTEMPTS - 1) {
          console.warn(`[checkout] threw "${msg}", retrying in ${BACKOFFS_MS[attempt]}ms`);
          await new Promise((r) => setTimeout(r, BACKOFFS_MS[attempt]));
          continue;
        }
        console.error("[checkout] fetch threw after retries:", e);
        setFetchError(msg);
        onError?.(msg);
        setLoading(false);
        return;
      }
    }

    // Defensive: fell through the loop without resolving.
    if (myToken === fetchTokenRef.current) {
      setFetchError(lastErrorMsg);
      onError?.(lastErrorMsg);
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId, amountVersion]);

  useEffect(() => {
    void fetchSession();
  }, [fetchSession]);

  if (loading && !session) {
    return (
      <div className="space-y-4 p-4 md:p-6">
        <div className="h-12 animate-pulse rounded-2xl bg-foreground/10" />
        <div className="my-2 flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground/60">
            Or pay with card
          </span>
          <div className="h-px flex-1 bg-border" />
        </div>
        <div className="h-16 animate-pulse rounded-2xl bg-foreground/5" />
        <div className="h-16 animate-pulse rounded-2xl bg-foreground/5" />
        <div className="h-16 animate-pulse rounded-2xl bg-foreground/5" />
        <div className="h-14 animate-pulse rounded-2xl bg-primary/30" />
      </div>
    );
  }

  if (fetchError && !session) {
    return (
      <div className="p-4 md:p-6">
        <p className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {fetchError}
        </p>
        <button
          type="button"
          onClick={() => void fetchSession()}
          className="mt-3 rounded-xl border border-border px-4 py-2 text-sm font-medium hover:bg-foreground/5"
        >
          Try again
        </button>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="p-4 md:p-6">
      <Elements
        // Re-key whenever the PI *or amount* changes so Stripe Elements
        // (incl. the Apple Pay / Google Pay sheet) re-mounts cleanly with the
        // new total — otherwise wallets keep showing the pre-promo amount.
        key={`${session.paymentIntentId}-${session.amount}`}
        stripe={getStripe()}
        options={{
          clientSecret: session.clientSecret,
          appearance: {
            theme: "stripe",
            variables: {
              colorPrimary: "#8D6FAF",
              colorBackground: "#FBF6EC",
              colorText: "#1F1B16",
              colorTextPlaceholder: "#A89E8F",
              colorDanger: "#B23A3A",
              fontFamily: '"Instrument Sans", system-ui, -apple-system, sans-serif',
              fontSizeBase: "16px",
              spacingUnit: "5px",
              borderRadius: "14px",
            },
          },
        }}
      >
        <PaymentForm
          orderId={orderId}
          amount={session.amount}
          currency={session.currency}
          email={email}
          name={name}
          returnUrl={props.returnUrl}
          paymentIntentId={session.paymentIntentId}
        />
      </Elements>
    </div>
  );
}

interface FormProps {
  orderId: string;
  amount: number;
  currency: string;
  email: string;
  name: string;
  returnUrl: string;
  paymentIntentId: string;
}

// Country list — short, common-first. Full ISO codes accepted by Stripe.
const COUNTRIES: Array<{ code: string; label: string }> = [
  { code: "US", label: "United States" },
  { code: "PL", label: "Poland" },
  { code: "GB", label: "United Kingdom" },
  { code: "CA", label: "Canada" },
  { code: "AU", label: "Australia" },
  { code: "DE", label: "Germany" },
  { code: "FR", label: "France" },
  { code: "IT", label: "Italy" },
  { code: "ES", label: "Spain" },
  { code: "NL", label: "Netherlands" },
  { code: "IE", label: "Ireland" },
  { code: "SE", label: "Sweden" },
  { code: "NO", label: "Norway" },
  { code: "DK", label: "Denmark" },
  { code: "FI", label: "Finland" },
  { code: "BE", label: "Belgium" },
  { code: "AT", label: "Austria" },
  { code: "CH", label: "Switzerland" },
  { code: "PT", label: "Portugal" },
  { code: "CZ", label: "Czechia" },
  { code: "MX", label: "Mexico" },
  { code: "BR", label: "Brazil" },
  { code: "JP", label: "Japan" },
  { code: "NZ", label: "New Zealand" },
];

const ELEMENT_BASE_STYLE = {
  base: {
    fontFamily: '"Instrument Sans", system-ui, -apple-system, sans-serif',
    fontSize: "16px",
    color: "#1F1B16",
    fontSmoothing: "antialiased",
    "::placeholder": { color: "#A89E8F" },
    iconColor: "#5A5148",
  },
  invalid: {
    color: "#B23A3A",
    iconColor: "#B23A3A",
  },
} as const;

function PaymentForm({ amount, currency, email, name, returnUrl, paymentIntentId }: FormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // US is the primary market — always default to US regardless of browser locale.
  const [country, setCountry] = useState<string>("US");
  const [postalCode, setPostalCode] = useState<string>("");

  // Countries where Stripe / card networks expect a postal code with the billing address.
  const postalRequired = useMemo(
    () => ["US", "CA", "GB", "AU", "DE", "FR", "IT", "ES", "NL", "IE", "PL", "PT", "CZ", "MX", "BR", "JP", "NZ", "BE", "AT", "CH", "SE", "NO", "DK", "FI"].includes(country),
    [country],
  );

  const postalLabel = country === "US" ? "ZIP code" : "Postal code";
  const postalPlaceholder = country === "US" ? "90210" : "Postal code";

  const billingDetails = useMemo(
    () => ({
      name: name?.trim() || undefined,
      email: email?.trim() || undefined,
      address: {
        country,
        postal_code: postalCode.trim() || undefined,
      },
    }),
    [name, email, country, postalCode],
  );

  const cardNumberOptions: StripeCardNumberElementOptions = useMemo(
    () => ({
      style: ELEMENT_BASE_STYLE,
      placeholder: "1234 1234 1234 1234",
      showIcon: true,
    }),
    [],
  );
  const cardExpiryOptions: StripeCardExpiryElementOptions = useMemo(
    () => ({ style: ELEMENT_BASE_STYLE, placeholder: "MM / YY" }),
    [],
  );
  const cardCvcOptions: StripeCardCvcElementOptions = useMemo(
    () => ({ style: ELEMENT_BASE_STYLE, placeholder: "CVC" }),
    [],
  );

  // Build the return_url with our PI id appended so the return page can
  // confirm it server-side without depending on Stripe's auto-appended params.
  const returnUrlWithPi = useMemo(() => {
    try {
      const u = new URL(returnUrl);
      u.searchParams.set("payment_intent_id", paymentIntentId);
      return u.toString();
    } catch {
      return returnUrl;
    }
  }, [returnUrl, paymentIntentId]);

  async function handleExpressConfirm() {
    if (!stripe || !elements) return;
    setError(null);
    setSubmitting(true);
    const { error: submitError } = await elements.submit();
    if (submitError) {
      setSubmitting(false);
      setError(submitError.message || "Could not start payment.");
      return;
    }
    const { error: confirmError } = await stripe.confirmPayment({
      elements,
      clientSecret: undefined as unknown as string,
      confirmParams: {
        return_url: returnUrlWithPi,
        payment_method_data: { billing_details: billingDetails },
      },
    });
    if (confirmError) {
      setSubmitting(false);
      setError(confirmError.message || "Payment was not completed.");
    }
  }

  async function handleCardSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setError(null);
    setSubmitting(true);

    if (postalRequired && !postalCode.trim()) {
      setSubmitting(false);
      setError(`Please enter your ${postalLabel.toLowerCase()}.`);
      return;
    }
    // Basic US ZIP validation (5 digits or ZIP+4).
    if (country === "US" && !/^\d{5}(-\d{4})?$/.test(postalCode.trim())) {
      setSubmitting(false);
      setError("Please enter a valid US ZIP code (e.g. 90210).");
      return;
    }

    const cardNumber = elements.getElement(CardNumberElement);
    if (!cardNumber) {
      setSubmitting(false);
      setError("Card form not ready. Please refresh and try again.");
      return;
    }

    // We confirm directly with the individual card element — no PaymentElement
    // submit step needed. Stripe collects number/exp/cvc from the mounted
    // Elements via the cardNumber reference.
    const { error: confirmError } = await stripe.confirmCardPayment(
      // The PI client secret is held by Elements; we pass it via the parent
      // <Elements clientSecret> option, but confirmCardPayment still needs it
      // explicitly. We grab it off elements' internal state via the parent.
      // The wrapping <Elements> received the clientSecret as an option, so we
      // re-read it from the data attribute on the form's hidden input below.
      (document.getElementById("rs-pi-secret") as HTMLInputElement)?.value || "",
      {
        payment_method: {
          card: cardNumber,
          billing_details: billingDetails,
        },
        receipt_email: billingDetails.email,
        return_url: returnUrlWithPi,
      },
    );

    if (confirmError) {
      setSubmitting(false);
      setError(confirmError.message || "Payment was declined. Please try a different card.");
      return;
    }

    // Success → navigate to the return URL ourselves (no automatic redirect
    // when using confirmCardPayment without next_action).
    window.location.assign(returnUrlWithPi);
  }

  return (
    <form onSubmit={handleCardSubmit} className="space-y-5">
      {/* Hidden input carries the PI client secret so confirmCardPayment can
          read it without prop-drilling — we already have it on the parent. */}
      <input
        type="hidden"
        id="rs-pi-secret"
        value={(elements as unknown as { _commonOptions?: { clientSecret?: string } } | null)
          ?._commonOptions?.clientSecret || ""}
      />

      {/* Wallets — Apple Pay / Google Pay / Link only. */}
      <div>
        <ExpressCheckoutElement
          onConfirm={() => void handleExpressConfirm()}
          options={{
            buttonHeight: 52,
            buttonTheme: { applePay: "black", googlePay: "black" },
            layout: { maxColumns: 1, maxRows: 0 },
            paymentMethods: {
              applePay: "always",
              googlePay: "always",
              link: "auto",
              amazonPay: "never",
              paypal: "never",
              klarna: "never",
            },
            paymentMethodOrder: ["apple_pay", "google_pay", "link"],
          }}
        />
      </div>

      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-foreground/15" />
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/60">
          Or pay with card
        </span>
        <div className="h-px flex-1 bg-foreground/15" />
      </div>

      {/* Card number */}
      <div className="space-y-2">
        <label className="block text-[15px] font-semibold text-foreground">Card number</label>
        <div className="rounded-2xl border border-[#E5D9C8] bg-[#FBF6EC] px-4 py-[14px] transition-colors focus-within:border-primary focus-within:ring-[3px] focus-within:ring-primary/15">
          <CardNumberElement options={cardNumberOptions} />
        </div>
      </div>

      {/* Expiry */}
      <div className="space-y-2">
        <label className="block text-[15px] font-semibold text-foreground">Expiration date</label>
        <div className="rounded-2xl border border-[#E5D9C8] bg-[#FBF6EC] px-4 py-[14px] transition-colors focus-within:border-primary focus-within:ring-[3px] focus-within:ring-primary/15">
          <CardExpiryElement options={cardExpiryOptions} />
        </div>
      </div>

      {/* CVC */}
      <div className="space-y-2">
        <label className="block text-[15px] font-semibold text-foreground">Security code</label>
        <div className="rounded-2xl border border-[#E5D9C8] bg-[#FBF6EC] px-4 py-[14px] transition-colors focus-within:border-primary focus-within:ring-[3px] focus-within:ring-primary/15">
          <CardCvcElement options={cardCvcOptions} />
        </div>
      </div>

      {/* Country */}
      <div className="space-y-2">
        <label className="block text-[15px] font-semibold text-foreground">Country</label>
        <div className="relative">
          <select
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="w-full appearance-none rounded-2xl border border-[#E5D9C8] bg-[#FBF6EC] px-4 py-[14px] pr-10 text-[16px] text-foreground transition-colors focus:border-primary focus:outline-none focus:ring-[3px] focus:ring-primary/15"
          >
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.label}
              </option>
            ))}
          </select>
          <svg
            aria-hidden="true"
            className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/60"
            viewBox="0 0 20 20"
            fill="none"
          >
            <path
              d="M5 7.5l5 5 5-5"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>

      {/* Postal / ZIP code */}
      {postalRequired && (
        <div className="space-y-2">
          <label className="block text-[15px] font-semibold text-foreground">{postalLabel}</label>
          <input
            type="text"
            inputMode={country === "US" ? "numeric" : "text"}
            autoComplete="postal-code"
            value={postalCode}
            onChange={(e) => setPostalCode(e.target.value)}
            placeholder={postalPlaceholder}
            maxLength={country === "US" ? 10 : 12}
            className="w-full rounded-2xl border border-[#E5D9C8] bg-[#FBF6EC] px-4 py-[14px] text-[16px] text-foreground placeholder:text-[#A89E8F] transition-colors focus:border-primary focus:outline-none focus:ring-[3px] focus:ring-primary/15"
          />
        </div>
      )}

      <p className="text-[12.5px] leading-snug text-muted-foreground">
        By providing your card information, you authorize RibbonSong to charge your card for this
        order in accordance with our terms.
      </p>

      {error && (
        <p className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>
      )}

      <button
        type="submit"
        disabled={!stripe || !elements || submitting}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#3F6B4A] px-6 py-5 text-base font-bold text-white shadow-soft transition-all hover:brightness-95 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            Processing payment…
          </>
        ) : (
          <>
            <Lock className="h-4 w-4" />
            Complete My Order
          </>
        )}
      </button>

      <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
        <ShieldCheck className="h-3.5 w-3.5 text-success" />
        Encrypted &amp; processed by Stripe. We never see your card details.
      </p>
    </form>
  );
}
