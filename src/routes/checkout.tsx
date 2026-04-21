import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Logo } from "@/components/Logo";
import { useQuizStore } from "@/stores/quizStore";
import { Lock, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/checkout")({
  component: CheckoutPage,
  head: () => ({
    meta: [{ title: "Checkout · RibbonSong" }],
  }),
});

function CheckoutPage() {
  const navigate = useNavigate();
  const q = useQuizStore();
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!q.recipient_name) {
      navigate({ to: "/create" });
    }
  }, [q.recipient_name, navigate]);

  const handlePay = () => {
    setProcessing(true);
    // Simulated checkout. Real Stripe flow comes in a follow-up step.
    setTimeout(() => {
      q.set("orderId", crypto.randomUUID());
      navigate({ to: "/upsell-1" });
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="px-6 pt-8">
        <div className="mx-auto max-w-4xl">
          <Logo />
        </div>
      </header>

      <main className="mx-auto grid max-w-4xl gap-10 px-6 py-16 md:grid-cols-[1.1fr_1fr]">
        <section>
          <h1 className="font-display text-4xl font-semibold leading-tight text-foreground md:text-5xl">
            One last step.
          </h1>
          <p className="mt-3 text-lg text-muted-foreground">
            Secure checkout. Your song begins the moment we receive your order.
          </p>

          <div className="mt-8 space-y-4">
            <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Lock className="h-4 w-4" />
                Card details
              </div>
              <div className="mt-3 grid gap-3">
                <div className="rounded-xl border border-dashed border-peach bg-background px-4 py-3 text-sm text-muted-foreground">
                  4242 4242 4242 4242
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-dashed border-peach bg-background px-4 py-3 text-sm text-muted-foreground">
                    MM / YY
                  </div>
                  <div className="rounded-xl border border-dashed border-peach bg-background px-4 py-3 text-sm text-muted-foreground">
                    CVC
                  </div>
                </div>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Demo checkout. Stripe wiring is added in a follow-up step.
              </p>
            </div>

            <button
              onClick={handlePay}
              disabled={processing}
              className="w-full rounded-full bg-primary px-8 py-4 text-base font-medium text-primary-foreground shadow-glow transition-all hover:bg-primary-hover disabled:opacity-60"
            >
              {processing ? "Processing…" : "Pay $39 and start my song"}
            </button>

            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="h-4 w-4 text-success" />
              256-bit SSL encryption · 30-day satisfaction guarantee
            </div>
          </div>
        </section>

        <aside className="rounded-3xl border border-border bg-card p-8 shadow-soft">
          <p className="text-sm font-medium uppercase tracking-wider text-primary">
            Order summary
          </p>
          <div className="mt-4 space-y-3">
            <div className="flex justify-between">
              <span className="text-foreground">Personalized song</span>
              <span className="text-foreground">$39.00</span>
            </div>
            {q.recipient_name && (
              <p className="text-sm text-muted-foreground">
                For <span className="text-foreground">{q.recipient_name}</span>
                {q.relationship && ` · ${q.relationship}`}
              </p>
            )}
            {q.genre && (
              <p className="text-sm text-muted-foreground">
                {q.genre} · {q.tempo} · {q.voice}
              </p>
            )}
          </div>
          <div className="my-6 border-t border-dashed border-peach" />
          <div className="flex items-baseline justify-between">
            <span className="font-display text-lg text-foreground">Total</span>
            <span className="font-display text-3xl font-semibold text-foreground">
              $39
            </span>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            One-time payment. No subscription.
          </p>
        </aside>
      </main>
    </div>
  );
}
