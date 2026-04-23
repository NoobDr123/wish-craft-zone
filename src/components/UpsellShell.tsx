import { Gift, ShieldCheck, Sparkles, AlertTriangle } from "lucide-react";
import { Logo } from "./Logo";

interface UpsellShellProps {
  step: 1 | 2 | 3;
  badge: string;
  headline: string;
  description: React.ReactNode;
  acceptLabel?: string; // optional override; defaults to standard CTA
  declineLabel: string;
  onAccept: () => void;
  onDecline: () => void;
  processing?: boolean;
  countdown?: string;
  highlights?: string[];
  priceLabel?: string; // e.g. "$19.99" — shown under the green CTA
}

export function UpsellShell({
  step,
  badge,
  headline,
  description,
  acceptLabel,
  declineLabel,
  onAccept,
  onDecline,
  processing,
  countdown,
  highlights,
  priceLabel,
}: UpsellShellProps) {
  const ctaText = acceptLabel || "Yes, Add this to my order";

  return (
    <div className="min-h-screen bg-background">
      {/* Payment-in-progress warning bar — sticky at the very top */}
      <div className="sticky top-0 z-50 w-full border-b border-red-300 bg-red-50">
        <div className="mx-auto flex max-w-3xl items-center justify-center gap-2 px-4 py-2.5 text-center">
          <AlertTriangle className="h-4 w-4 shrink-0 text-red-600" />
          <p className="text-xs font-semibold text-red-700 md:text-sm">
            We are completing your payment. Don't close or refresh this page —
            it can cause double charges.
          </p>
        </div>
      </div>

      <header className="px-6 pt-6">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Logo />
          <p className="text-sm text-muted-foreground">
            Special gift offer {step} of 3
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-10">
        {/* Gift framing card */}
        <div className="mb-5 flex items-center gap-3 rounded-2xl border border-success/30 bg-success/5 px-4 py-3">
          <Gift className="h-5 w-5 shrink-0 text-success" />
          <p className="text-sm font-medium text-foreground">
            Make their gift even more meaningful — one-time offer, only available right now.
          </p>
        </div>

        <div className="rounded-[2rem] border border-border bg-card p-8 shadow-card md:p-12">
          <div className="flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2 rounded-full bg-peach px-4 py-1.5 text-xs font-medium uppercase tracking-wider text-foreground">
              <Sparkles className="h-3.5 w-3.5" />
              {badge}
            </span>
            {countdown && (
              <span className="rounded-full border border-primary/30 bg-primary/5 px-3 py-1 font-mono text-xs text-primary">
                {countdown}
              </span>
            )}
          </div>

          <h1 className="mt-6 font-display text-4xl font-semibold leading-tight text-foreground md:text-5xl">
            {headline}
          </h1>

          <div className="mt-5 space-y-4 text-lg leading-relaxed text-muted-foreground">
            {description}
          </div>

          {highlights && (
            <ul className="mt-6 space-y-3">
              {highlights.map((h) => (
                <li key={h} className="flex items-start gap-3 text-foreground">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-success" />
                  <span>{h}</span>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-10 space-y-3">
            <button
              onClick={onAccept}
              disabled={processing}
              className="flex w-full items-center justify-center gap-2.5 rounded-2xl bg-success px-8 py-5 text-base font-bold text-success-foreground shadow-glow transition-all hover:brightness-95 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 md:text-lg"
            >
              {processing ? (
                <>
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-success-foreground/30 border-t-success-foreground" />
                  Adding to your order…
                </>
              ) : (
                <>
                  <Gift className="h-5 w-5" />
                  {ctaText}
                  {priceLabel && <span className="font-bold">— {priceLabel}</span>}
                </>
              )}
            </button>

            <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-success" />
              No new card needed — billed to the card you just used.
            </p>

            <button
              onClick={onDecline}
              disabled={processing}
              className="w-full rounded-full px-6 py-3 text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
            >
              {declineLabel}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
