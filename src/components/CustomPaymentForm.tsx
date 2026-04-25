import { useEffect, useState } from "react";
import {
  Elements,
  PaymentElement,
  ExpressCheckoutElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import type { StripeElementsOptions } from "@stripe/stripe-js";
import { getStripe } from "@/lib/stripe";
import { CheckCircle2, Gift, ShieldCheck } from "lucide-react";

interface CustomPaymentFormProps {
  clientSecret: string;
  returnUrl: string;
  email: string;
  amountLabel: string;
  /** Current amount in cents — used to keep Apple/Google Pay sheet in sync after promo edits. */
  amountCents: number;
  /** Bumped every time the server-side PI amount changes (e.g. after a promo applies). */
  promoVersion?: number;
  onError?: (msg: string) => void;
  disabled?: boolean;
  disabledReason?: string;
}

/**
 * Custom on-page Stripe payment form using PaymentElement.
 *
 * - PaymentElement automatically renders Apple Pay, Google Pay, Link, cards,
 *   and any other payment methods enabled in the Stripe dashboard.
 * - ExpressCheckoutElement renders the one-tap wallet buttons (Apple Pay /
 *   Google Pay / Link) at the very top.
 */
export function CustomPaymentForm(props: CustomPaymentFormProps) {
  const options: StripeElementsOptions = {
    clientSecret: props.clientSecret,
    appearance: {
      theme: "stripe",
      variables: {
        colorPrimary: "#d97706",
        colorBackground: "#ffffff",
        colorText: "#1f2937",
        colorDanger: "#dc2626",
        fontFamily: "system-ui, -apple-system, sans-serif",
        borderRadius: "12px",
        spacingUnit: "4px",
      },
    },
  };

  return (
    <Elements stripe={getStripe()} options={options}>
      <InnerForm {...props} />
    </Elements>
  );
}

function InnerForm({ returnUrl, email, amountLabel, amountCents, promoVersion, onError, disabled, disabledReason }: CustomPaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [walletReady, setWalletReady] = useState(false);

  // Fire Meta Pixel InitiateCheckout exactly once when the payment form
  // mounts. This is the standard funnel signal Meta uses to optimize ad
  // delivery — without it, ads spend less efficiently.
  useEffect(() => {
    try {
      const fbq = (window as any).fbq;
      if (typeof fbq !== "function") return;
      if (sessionStorage.getItem("rs_px_initcheckout_fired")) return;
      fbq("track", "InitiateCheckout", {
        value: Number((amountCents / 100).toFixed(2)),
        currency: "USD",
        content_type: "product",
        content_name: "RibbonSong Personalized Song",
      });
      sessionStorage.setItem("rs_px_initcheckout_fired", "true");
    } catch {
      /* never block checkout on pixel failures */
    }
    // Only fire once per session — amountCents change after promo doesn't re-fire.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When the server-side PaymentIntent amount changes (promo applied),
  // pull the updated amount into Elements so the Apple/Google Pay sheet
  // and PaymentElement reflect the new total.
  useEffect(() => {
    if (!elements || promoVersion === undefined || promoVersion === 0) return;
    elements.fetchUpdates().catch((e) => {
      console.error("[CustomPaymentForm] fetchUpdates failed:", e);
    });
  }, [elements, promoVersion]);

  const handleConfirm = async () => {
    if (!stripe || !elements) return;
    if (disabled) {
      const msg = disabledReason || "Please complete the form above first.";
      setErrorMsg(msg);
      onError?.(msg);
      return;
    }
    setSubmitting(true);
    setErrorMsg(null);

    // We use `allow_redirects: "never"` on the PaymentIntent so confirmPayment
    // resolves in-place rather than redirecting. That means we MUST handle
    // navigation ourselves on success — Stripe will not navigate to return_url.
    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: returnUrl,
        receipt_email: email,
      },
      redirect: "if_required",
    });

    if (error) {
      const msg = error.message || "Payment failed. Please try another card.";
      setErrorMsg(msg);
      onError?.(msg);
      setSubmitting(false);
      void import("@/lib/tracking").then(({ track }) =>
        track({ type: "payment_failed", buyerEmail: email, payload: { message: msg } })
      );
      return;
    }

    // Payment succeeded (or requires async processing) — navigate to the
    // return page, which polls for the order to be marked paid and then
    // forwards to the upsell flow.
    if (paymentIntent && (paymentIntent.status === "succeeded" || paymentIntent.status === "processing" || paymentIntent.status === "requires_capture")) {
      void import("@/lib/tracking").then(({ track }) =>
        track({ type: "payment_success", buyerEmail: email, payload: { status: paymentIntent.status } })
      );
      window.location.assign(returnUrl);
      return;
    }

    // Unexpected state — surface a generic error so the user isn't stuck.
    const msg = "Payment is taking longer than expected. Please refresh.";
    setErrorMsg(msg);
    onError?.(msg);
    setSubmitting(false);
  };

  const handleExpressConfirm = async (event: { resolve: () => void; reject: () => void } | any) => {
    if (!stripe || !elements) return;
    if (disabled) {
      const msg = disabledReason || "Please enter your email and name above first.";
      setErrorMsg(msg);
      onError?.(msg);
      event?.reject?.();
      return;
    }
    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: returnUrl,
        receipt_email: email,
      },
      redirect: "if_required",
    });
    if (error) {
      const msg = error.message || "Payment failed.";
      setErrorMsg(msg);
      onError?.(msg);
      return;
    }
    if (paymentIntent && (paymentIntent.status === "succeeded" || paymentIntent.status === "processing" || paymentIntent.status === "requires_capture")) {
      window.location.assign(returnUrl);
    }
  };

  return (
    <div className="space-y-5 p-4 md:p-6">
      {/* Apple Pay / Google Pay / Link — one-tap row */}
      <div className={walletReady ? "" : "hidden"}>
        <ExpressCheckoutElement
          onReady={({ availablePaymentMethods }) => {
            if (availablePaymentMethods) setWalletReady(true);
          }}
          onConfirm={handleExpressConfirm}
          options={{
            buttonHeight: 48,
            buttonTheme: { applePay: "black", googlePay: "black" },
            paymentMethods: { applePay: "always", googlePay: "always", link: "auto" },
            layout: {
              maxColumns: 1,
              maxRows: 0,
              overflow: "never",
            },
          }}
        />
        <div className="my-4 flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Or pay with card
          </span>
          <div className="h-px flex-1 bg-border" />
        </div>
      </div>

      {/* Card form — Link signup panel hidden, Link still available via Express row above */}
      <PaymentElement
        options={{
          layout: { type: "tabs", defaultCollapsed: false },
          defaultValues: { billingDetails: { email } },
          wallets: { applePay: "never", googlePay: "never", link: "never" } as any,
        }}
      />

      {errorMsg && (
        <p className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {errorMsg}
        </p>
      )}

      <button
        type="button"
        onClick={handleConfirm}
        disabled={!stripe || !elements || submitting || disabled}
        className="flex w-full items-center justify-center gap-2.5 rounded-2xl bg-success px-6 py-5 text-base font-bold text-success-foreground shadow-glow transition-all hover:brightness-95 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none md:text-lg"
      >
        {submitting ? (
          <>
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-success-foreground/30 border-t-success-foreground" />
            Processing payment…
          </>
        ) : (
          <>
            <Gift className="h-5 w-5" /> Complete My Order
          </>
        )}
      </button>

      {disabled && disabledReason && (
        <p className="text-center text-xs font-medium text-muted-foreground">
          {disabledReason}
        </p>
      )}

      <div className="flex flex-col items-center gap-1.5 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5" /> Secure payment via Stripe
        </span>
        <span className="inline-flex items-center gap-1.5 font-semibold text-success">
          <CheckCircle2 className="h-3.5 w-3.5" /> 30-Day Money Back Guarantee
        </span>
      </div>
    </div>
  );
}
