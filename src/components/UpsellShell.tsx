import { Gift, ShieldCheck, Sparkles, AlertTriangle } from "lucide-react";
import { Logo } from "./Logo";
import { CheckoutProgress } from "./CheckoutProgress";

interface UpsellShellProps {
  step: 1 | 2;
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
  const ctaText = acceptLabel || "Yes, add this to my song";

  return (
    <div className="min-h-screen bg-background">
      {/* Payment-in-progress warning bar — purple background, red text (not sticky) */}
      <div className="w-full border-b border-primary/40 bg-primary/15">
        <div className="mx-auto flex max-w-2xl items-center justify-center gap-2 px-4 py-2.5 text-center">
          <AlertTriangle className="h-4 w-4 shrink-0 text-red-600" />
          <p className="text-xs font-semibold text-red-600 md:text-sm">
            We are completing your payment. Don't close or refresh this page.
            It can cause double charges.
          </p>
        </div>
      </div>

      {/* Themed progress: Payment ✓ → Bonus (current) → Log in */}
      <CheckoutProgress current={2} />

      <header className="px-4 pt-4 sm:px-6 sm:pt-6">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-2">
          <Logo />
          <p className="text-[11px] text-muted-foreground sm:text-sm">
            Add-on {step} of 2
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-10">
        {/* Gift framing card */}
        <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-success/30 bg-success/5 px-3.5 py-2.5 sm:mb-5 sm:items-center sm:gap-3 sm:rounded-2xl sm:px-4 sm:py-3">
          <Gift className="mt-0.5 h-4 w-4 shrink-0 text-success sm:mt-0 sm:h-5 sm:w-5" />
          <p className="text-[13px] font-medium leading-snug text-foreground sm:text-sm">
            Make their song even more theirs. Available right now, only on this
            page.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-card sm:rounded-[2rem] sm:p-8 md:p-12">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-peach px-3 py-1 text-[10px] font-medium uppercase tracking-wider text-foreground sm:gap-2 sm:px-4 sm:py-1.5 sm:text-xs">
              <Sparkles className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              {badge}
            </span>
            {countdown && (
              <span className="rounded-full border border-primary/30 bg-primary/5 px-2.5 py-0.5 font-mono text-[10px] text-primary sm:px-3 sm:py-1 sm:text-xs">
                {countdown}
              </span>
            )}
          </div>

          <h1 className="mt-4 font-display text-[26px] font-semibold leading-[1.15] text-foreground sm:mt-6 sm:text-4xl md:text-5xl">
            {headline}
          </h1>

          <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-muted-foreground sm:mt-5 sm:space-y-4 sm:text-lg">
            {description}
          </div>

          {highlights && (
            <ul className="mt-4 space-y-2.5 sm:mt-6 sm:space-y-3">
              {highlights.map((h) => (
                <li
                  key={h}
                  className="flex items-start gap-2.5 text-[14px] text-foreground sm:gap-3 sm:text-base"
                >
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-success sm:mt-2" />
                  <span>{h}</span>
                </li>
              ))}
            </ul>
          )}

          {/* Price line — sits cleanly above the CTA, not crammed inside it */}
          {priceLabel && (
            <div className="mt-5 flex items-baseline justify-between border-t border-border/60 pt-4 sm:mt-8 sm:pt-5">
              <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground sm:text-sm">
                One-time add-on
              </span>
              <span className="font-display text-2xl font-semibold text-foreground sm:text-3xl">
                {priceLabel}
              </span>
            </div>
          )}

          <div className="mt-5 space-y-2.5 sm:mt-6 sm:space-y-3">
            <button
              onClick={onAccept}
              disabled={processing}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-success px-5 py-4 text-[15px] font-bold text-success-foreground shadow-glow transition-all hover:brightness-95 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 sm:gap-2.5 sm:rounded-2xl sm:px-8 sm:py-5 sm:text-base md:text-lg"
            >
              {processing ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-success-foreground/30 border-t-success-foreground sm:h-5 sm:w-5" />
                  Adding to your order…
                </>
              ) : (
                <>
                  <Gift className="h-4 w-4 sm:h-5 sm:w-5" />
                  {ctaText}
                </>
              )}
            </button>

            <p className="flex items-center justify-center gap-1.5 text-center text-[11px] text-muted-foreground sm:text-xs">
              <ShieldCheck className="h-3 w-3 text-success sm:h-3.5 sm:w-3.5" />
              No new card needed. Billed to the card you just used.
            </p>

            <button
              onClick={onDecline}
              disabled={processing}
              className="w-full rounded-full px-5 py-2.5 text-[13px] text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline sm:px-6 sm:py-3 sm:text-sm"
            >
              {declineLabel}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
