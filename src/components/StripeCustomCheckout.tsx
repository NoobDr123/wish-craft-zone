import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Elements,
  ExpressCheckoutElement,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import type { StripePaymentElementOptions } from "@stripe/stripe-js";
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

function formatPrice(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
      minimumFractionDigits: 2,
    }).format(amount / 100);
  } catch {
    return `$${(amount / 100).toFixed(2)}`;
  }
}

/**
 * Custom on-page checkout: Apple Pay / Google Pay / Link buttons up top
 * (Express Checkout Element), then a card form (Payment Element), then a
 * branded "Pay $X" button. PCI scope stays SAQ A — Stripe iframes the inputs.
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
    try {
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData.user?.id ?? null;
      console.log("[checkout] requesting payment intent", { orderId, amountVersion });
      const { data, error } = await supabase.functions.invoke("create-payment-intent", {
        body: {
          orderId,
          environment: stripeEnvironment,
          quizPatch,
          quizSnapshot,
          userId,
        },
      });
      if (myToken !== fetchTokenRef.current) return; // stale
      if (error) {
        console.error("[checkout] create-payment-intent invoke error:", error);
        const msg = error.message || "Could not start checkout. Please try again.";
        setFetchError(msg);
        onError?.(msg);
        return;
      }
      if (!data?.clientSecret) {
        const msg = (data as any)?.error || "Checkout could not be initialized.";
        console.error("[checkout] no clientSecret:", data);
        setFetchError(msg);
        onError?.(msg);
        return;
      }
      console.log("[checkout] PI ready", { paymentIntentId: data.paymentIntentId });
      setSession({
        clientSecret: data.clientSecret as string,
        paymentIntentId: data.paymentIntentId as string,
        amount: data.amount as number,
        currency: data.currency as string,
      });
    } catch (e: any) {
      const msg = e?.message || "Network error preparing checkout.";
      console.error("[checkout] fetch threw:", e);
      setFetchError(msg);
      onError?.(msg);
    } finally {
      if (myToken === fetchTokenRef.current) setLoading(false);
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
        <div className="flex gap-2">
          <div className="h-12 flex-1 animate-pulse rounded-2xl bg-foreground/10" />
          <div className="h-12 flex-1 animate-pulse rounded-2xl bg-foreground/10" />
        </div>
        <div className="my-2 flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground/60">
            Or pay with card
          </span>
          <div className="h-px flex-1 bg-border" />
        </div>
        <div className="h-32 animate-pulse rounded-xl bg-foreground/5" />
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
        // Re-key whenever the PI changes so Stripe Elements re-mounts cleanly.
        key={session.paymentIntentId}
        stripe={getStripe()}
        options={{
          clientSecret: session.clientSecret,
          appearance: {
            theme: "stripe",
            labels: "above",
            variables: {
              colorPrimary: "#8D6FAF",
              colorBackground: "#FBF6EC",
              colorText: "#1F1B16",
              colorTextPlaceholder: "#8A8175",
              colorTextSecondary: "#5A5148",
              colorDanger: "#B23A3A",
              fontFamily: '"Instrument Sans", system-ui, -apple-system, sans-serif',
              fontSizeBase: "16px",
              spacingUnit: "5px",
              borderRadius: "14px",
            },
            rules: {
              ".Label": {
                fontSize: "15px",
                fontWeight: "500",
                color: "#1F1B16",
                marginBottom: "8px",
              },
              ".Input": {
                backgroundColor: "#FBF6EC",
                border: "1px solid #E5D9C8",
                boxShadow: "none",
                padding: "14px 16px",
              },
              ".Input:focus": {
                border: "1px solid #8D6FAF",
                boxShadow: "0 0 0 3px rgba(141, 111, 175, 0.15)",
              },
              ".Tab, .Block": {
                backgroundColor: "#FBF6EC",
                border: "1px solid #E5D9C8",
              },
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

function PaymentForm({ amount, currency, email, name, returnUrl, paymentIntentId }: FormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const billingDetails = useMemo(
    () => ({
      name: name?.trim() || undefined,
      email: email?.trim() || undefined,
    }),
    [name, email],
  );

  const paymentElementOptions: StripePaymentElementOptions = useMemo(
    () => ({
      // Accordion (radio) layout with all methods expanded — matches the
      // reference design where card fields (number / expiry / CVC / country)
      // sit on individual labeled rows with no extra wrapper.
      layout: {
        type: "accordion",
        defaultCollapsed: false,
        radios: "never",
        spacedAccordionItems: false,
      },
      defaultValues: { billingDetails },
      // We collect email/name above the Stripe iframe ourselves.
      fields: { billingDetails: { email: "never", name: "never" } },
      wallets: { applePay: "never", googlePay: "never", link: "never" },
    }),
    [billingDetails],
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
      clientSecret: undefined as unknown as string, // not needed when elements is present
      confirmParams: {
        return_url: returnUrlWithPi,
        payment_method_data: { billing_details: billingDetails },
      },
    });
    if (confirmError) {
      setSubmitting(false);
      setError(confirmError.message || "Payment was not completed.");
    }
    // On success Stripe redirects to return_url.
  }

  async function handleCardSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setError(null);
    setSubmitting(true);
    const { error: submitError } = await elements.submit();
    if (submitError) {
      setSubmitting(false);
      setError(submitError.message || "Please check your card details.");
      return;
    }
    const { error: confirmError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: returnUrlWithPi,
        payment_method_data: { billing_details: billingDetails },
        receipt_email: billingDetails.email,
      },
    });
    if (confirmError) {
      setSubmitting(false);
      setError(confirmError.message || "Payment was declined. Please try a different card.");
    }
    // Success → Stripe redirects.
  }

  return (
    <form onSubmit={handleCardSubmit} className="space-y-6">
      {/* Wallets — Apple Pay / Google Pay / Link only.
          Explicitly disable Amazon Pay, PayPal, Klarna, etc. so the merchant
          account's default wallet set doesn't leak through. */}
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

      {/* Card form — labels render above each field via Elements appearance config */}
      <div>
        <PaymentElement options={paymentElementOptions} />
      </div>

      {error && (
        <p className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
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
