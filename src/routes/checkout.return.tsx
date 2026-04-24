import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Logo } from "@/components/Logo";
import { supabase } from "@/integrations/supabase/client";
import { useQuizStore } from "@/stores/quizStore";
import { stripeEnvironment } from "@/lib/stripe";

export const Route = createFileRoute("/checkout/return")({
  component: CheckoutReturnPage,
  validateSearch: (search: Record<string, unknown>) => ({
    payment_intent_id:
      typeof search.payment_intent_id === "string" ? search.payment_intent_id : undefined,
    payment_intent:
      typeof search.payment_intent === "string" ? search.payment_intent : undefined,
    // Legacy: keep accepting session_id so any in-flight redirect from the
    // old embedded-checkout flow still resolves correctly.
    session_id: typeof search.session_id === "string" ? search.session_id : undefined,
  }),
  head: () => ({ meta: [{ title: "Payment confirmed · RibbonSong" }] }),
});

function CheckoutReturnPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const q = useQuizStore();
  const [status, setStatus] = useState<"checking" | "ready" | "error">("checking");

  // Prefer payment_intent_id (we set it explicitly), fall back to Stripe's
  // standard payment_intent param, then to legacy session_id.
  const paymentIntentId = search.payment_intent_id || search.payment_intent;
  const sessionId = search.session_id;

  useEffect(() => {
    if (!paymentIntentId && !sessionId) {
      setStatus("error");
      return;
    }

    let cancelled = false;
    let attempts = 0;

    const poll = async () => {
      attempts += 1;

      const query = supabase
        .from("orders")
        .select("id, payment_status, status, amount_paid_cents, amount_cents, currency, stripe_payment_intent_id");

      const { data: order } = paymentIntentId
        ? await query.eq("stripe_payment_intent_id", paymentIntentId).maybeSingle()
        : await query.eq("stripe_checkout_session_id", sessionId!).maybeSingle();

      if (cancelled) return;

      if (order?.payment_status === "paid") {
        q.set("orderId", order.id);
        if (paymentIntentId) q.set("checkoutSessionId", paymentIntentId);
        else if (sessionId) q.set("checkoutSessionId", sessionId);

        // Fire Meta Pixel Purchase event ONCE
        try {
          const fbq = (window as any).fbq;
          if (typeof fbq === "function" && !localStorage.getItem("rs_px_fired")) {
            const cents = order.amount_paid_cents || order.amount_cents || 0;
            fbq("track", "Purchase", {
              value: Number((cents / 100).toFixed(2)),
              currency: (order.currency || "USD").toUpperCase(),
              content_type: "product",
              content_name: "RibbonSong Personalized Song",
            });
            localStorage.setItem("rs_px_fired", "true");
          }
        } catch {
          // Pixel failures must never block the funnel.
        }

        // Auto-provision the buyer's account in the background so that by
        // the time they finish the upsell flow and land on /processing,
        // they're already signed in. Fire-and-forget — failure here MUST
        // NOT block the funnel; they can always sign in later via email.
        if (paymentIntentId) {
          autoLogin(paymentIntentId).catch((e) =>
            console.error("autoLogin failed (non-fatal):", e),
          );
        }

        setStatus("ready");
        setTimeout(() => navigate({ to: "/upsell-1" }), 800);
        return;
      }

      if (attempts > 15) {
        if (order?.id) {
          q.set("orderId", order.id);
          if (paymentIntentId) q.set("checkoutSessionId", paymentIntentId);
        }
        setStatus("ready");
        setTimeout(() => navigate({ to: "/upsell-1" }), 600);
        return;
      }

      setTimeout(poll, 1000);
    };

    poll();
    return () => {
      cancelled = true;
    };
  }, [paymentIntentId, sessionId, navigate, q]);

  return (
    <div className="min-h-screen bg-gradient-warm">
      <header className="px-6 pt-8">
        <div className="mx-auto max-w-2xl">
          <Logo />
        </div>
      </header>

      <main className="mx-auto max-w-md px-6 py-24 text-center">
        {status === "error" ? (
          <>
            <h1 className="font-display text-3xl font-bold text-foreground">
              Something went wrong
            </h1>
            <p className="mt-3 text-muted-foreground">
              We couldn't confirm your payment. Please contact support.
            </p>
          </>
        ) : (
          <>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
              <CheckCircle2 className="h-9 w-9 text-success" />
            </div>
            <h1 className="mt-6 font-display text-3xl font-bold text-foreground">
              {status === "ready" ? "Payment confirmed!" : "Confirming payment…"}
            </h1>
            <p className="mt-3 text-muted-foreground">
              {status === "ready"
                ? "Taking you to your song setup…"
                : "Just a moment — finalizing your order."}
            </p>
          </>
        )}
      </main>
    </div>
  );
}
