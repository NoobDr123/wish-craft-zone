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
  onError?: (msg: string) => void;
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

function InnerForm({ returnUrl, email, amountLabel, onError }: CustomPaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [walletReady, setWalletReady] = useState(false);

  const handleConfirm = async () => {
    if (!stripe || !elements) return;
    setSubmitting(true);
    setErrorMsg(null);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: returnUrl,
        receipt_email: email,
      },
    });

    // If we reach here, there was an immediate error (otherwise Stripe redirects)
    if (error) {
      const msg = error.message || "Payment failed. Please try another card.";
      setErrorMsg(msg);
      onError?.(msg);
      setSubmitting(false);
    }
  };

  const handleExpressConfirm = async () => {
    if (!stripe || !elements) return;
    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: returnUrl,
        receipt_email: email,
      },
    });
    if (error) {
      const msg = error.message || "Payment failed.";
      setErrorMsg(msg);
      onError?.(msg);
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
        disabled={!stripe || !elements || submitting}
        className="flex w-full items-center justify-center gap-2.5 rounded-2xl bg-primary px-6 py-5 text-base font-bold text-primary-foreground shadow-glow transition-all hover:brightness-95 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none md:text-lg"
      >
        {submitting ? (
          <>
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
            Processing payment…
          </>
        ) : (
          <>
            <Gift className="h-5 w-5" /> Pay {amountLabel}
          </>
        )}
      </button>

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
