import { useCallback, useEffect, useRef } from "react";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { getStripe, stripeEnvironment } from "@/lib/stripe";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  orderId: string;
  /** Bumped whenever the order amount changes (promo applied) so we re-mount with a new session. */
  amountVersion: number;
  returnUrl: string;
  quizPatch?: Record<string, unknown>;
  onError?: (msg: string) => void;
}

export function StripeEmbeddedCheckout({ orderId, amountVersion, returnUrl, quizPatch, onError }: Props) {
  const latestQuizPatchRef = useRef(quizPatch);

  useEffect(() => {
    latestQuizPatchRef.current = quizPatch;
  }, [quizPatch]);

  const fetchClientSecret = useCallback(async (): Promise<string> => {
    console.log("[checkout] requesting embedded session", { orderId, amountVersion });
    const { data, error } = await supabase.functions.invoke("create-checkout", {
      body: {
        orderId,
        environment: stripeEnvironment,
        returnUrl,
        quizPatch: latestQuizPatchRef.current,
      },
    });
    if (error) {
      console.error("[checkout] create-checkout invoke error:", error);
      const msg = error.message || "Could not start checkout. Please try again.";
      onError?.(msg);
      throw new Error(msg);
    }
    if (!data?.clientSecret) {
      console.error("[checkout] create-checkout returned no clientSecret:", data);
      const msg = (data as any)?.error || "Checkout could not be initialized.";
      onError?.(msg);
      throw new Error(msg);
    }
    return data.clientSecret as string;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId, amountVersion, returnUrl]);

  return (
    <div className="p-4 md:p-6">
      <EmbeddedCheckoutProvider
        // Re-key whenever amountVersion changes so a new session is fetched
        // (Stripe forbids changing client secret after creation).
        key={`${orderId}:${amountVersion}`}
        stripe={getStripe()}
        options={{ fetchClientSecret }}
      >
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  );
}
