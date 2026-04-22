import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Logo } from "@/components/Logo";
import { supabase } from "@/integrations/supabase/client";
import { useQuizStore } from "@/stores/quizStore";

export const Route = createFileRoute("/checkout/return")({
  component: CheckoutReturnPage,
  validateSearch: (search: Record<string, unknown>) => ({
    session_id: typeof search.session_id === "string" ? search.session_id : undefined,
  }),
  head: () => ({ meta: [{ title: "Payment confirmed · RibbonSong" }] }),
});

function CheckoutReturnPage() {
  const navigate = useNavigate();
  const { session_id } = Route.useSearch();
  const q = useQuizStore();
  const [status, setStatus] = useState<"checking" | "ready" | "error">("checking");

  useEffect(() => {
    if (!session_id) {
      setStatus("error");
      return;
    }

    let cancelled = false;
    let attempts = 0;

    // Poll the order until the webhook flips it to payment_status='paid'.
    // Webhook usually arrives within 1–3s, but we'll wait up to ~15s.
    const poll = async () => {
      attempts += 1;
      const { data: order } = await supabase
        .from("orders")
        .select("id, payment_status, status")
        .eq("stripe_checkout_session_id", session_id)
        .maybeSingle();

      if (cancelled) return;

      if (order?.payment_status === "paid") {
        q.set("orderId", order.id);
        setStatus("ready");
        // Tiny pause so the user sees the success state, then to the first upsell.
        setTimeout(() => navigate({ to: "/upsell-1" }), 800);
        return;
      }

      if (attempts > 15) {
        // Webhook took too long — still send them to upsell-1 anyway. Worst case
        // upsell charges fail silently and they just see the standard pipeline.
        if (order?.id) q.set("orderId", order.id);
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
  }, [session_id, navigate, q]);

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
