import { Gift, ShieldCheck, X, Sparkles } from "lucide-react";
import { useEffect } from "react";

interface RibbonClubDownsellProps {
  open: boolean;
  processing?: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

/**
 * Slim "last chance" downsell modal shown after a user declines a higher-priced
 * upsell. Pitches the RibbonSong Club at a one-time, trust-based price.
 */
export function RibbonClubDownsell({
  open,
  processing,
  onAccept,
  onDecline,
}: RibbonClubDownsellProps) {
  // Lock body scroll while open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="club-downsell-title"
      className="fixed inset-0 z-[60] flex items-center justify-center px-4"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
        onClick={processing ? undefined : onDecline}
      />

      {/* Slim popup */}
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card shadow-lg">
        {/* Close */}
        <button
          onClick={onDecline}
          disabled={processing}
          aria-label="Close"
          className="absolute right-3 top-3 rounded-full p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-50"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Slim header band */}
        <div className="flex items-center gap-2 border-b border-primary/20 bg-primary/10 px-5 py-2.5">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
            One spot just opened
          </p>
        </div>

        <div className="px-6 pb-6 pt-5">
          <h2
            id="club-downsell-title"
            className="font-display text-2xl font-semibold leading-tight text-foreground"
          >
            Wait — join the RibbonSong Club for just{" "}
            <span className="text-primary">$48</span>
          </h2>

          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Because you trusted us today, we'd love to keep you close. We have{" "}
            <span className="font-semibold text-foreground">one spot ready</span>{" "}
            in the Club at a one-time price — normally $120/year.
          </p>

          <ul className="mt-4 space-y-2 text-sm text-foreground">
            <li className="flex items-start gap-2.5">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-success" />
              <span>One new song every month — for any moment that matters</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-success" />
              <span>Priority production — always front of the queue</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-success" />
              <span>Cancel anytime, keep every song you've made</span>
            </li>
          </ul>

          <div className="mt-5 flex items-baseline justify-between border-t border-border/60 pt-4">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Today only
            </span>
            <span className="font-display text-2xl font-semibold text-foreground">
              $48.00
            </span>
          </div>

          <button
            onClick={onAccept}
            disabled={processing}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-success px-6 py-4 text-sm font-bold text-success-foreground shadow-glow transition-all hover:brightness-95 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 md:text-base"
          >
            {processing ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-success-foreground/30 border-t-success-foreground" />
                Reserving your spot…
              </>
            ) : (
              <>
                <Gift className="h-4 w-4" />
                Yes, claim my spot
              </>
            )}
          </button>

          <p className="mt-2 flex items-center justify-center gap-1.5 text-center text-[11px] text-muted-foreground">
            <ShieldCheck className="h-3 w-3 text-success" />
            Billed once to the card you just used.
          </p>

          <button
            onClick={onDecline}
            disabled={processing}
            className="mt-1 w-full px-4 py-2 text-xs text-muted-foreground underline-offset-4 transition hover:text-foreground hover:underline"
          >
            No thanks, skip this offer
          </button>
        </div>
      </div>
    </div>
  );
}
