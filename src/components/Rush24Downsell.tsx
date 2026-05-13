import { Gift, ShieldCheck, X, Clock } from "lucide-react";
import { useEffect } from "react";

interface Rush24DownsellProps {
  open: boolean;
  processing?: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

/**
 * Slim "last chance" downsell shown when a user declines the 90-minute
 * priority delivery upsell. Offers the 24-hour rush at $39.99 — slower than
 * priority but still much faster than the 5-day standard turnaround.
 */
export function Rush24Downsell({
  open,
  processing,
  onAccept,
  onDecline,
}: Rush24DownsellProps) {
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
      aria-labelledby="rush-24-title"
      className="fixed inset-0 z-[60] flex items-end justify-center px-3 pb-3 sm:items-center sm:px-4 sm:pb-0"
    >
      <div
        className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
        onClick={processing ? undefined : onDecline}
      />

      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card shadow-lg">
        <button
          onClick={onDecline}
          disabled={processing}
          aria-label="Close"
          className="absolute right-2.5 top-2.5 rounded-full p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-50"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-2 border-b border-primary/20 bg-primary/10 px-4 py-2.5 sm:px-5">
          <Clock className="h-3.5 w-3.5 text-primary" />
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary sm:text-[11px]">
            Wait, softer middle option
          </p>
        </div>

        <div className="px-5 pb-5 pt-4 sm:px-6 sm:pb-6 sm:pt-5">
          <h2
            id="rush-24-title"
            className="font-display text-xl font-semibold leading-tight text-foreground sm:text-2xl"
          >
            Get the song in 24 hours for{" "}
            <span className="text-primary">$29.99</span>
          </h2>

          <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
            Not in a 90-minute hurry, but five days feels like forever? Skip
            the line and get the finished song in your inbox in the next{" "}
            <span className="font-semibold text-foreground">24 hours</span>.
          </p>

          <ul className="mt-3.5 space-y-2 text-sm text-foreground">
            <li className="flex items-start gap-2.5">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-success" />
              <span>Front of the queue, we start producing within the hour</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-success" />
              <span>Hand-checked by a real human before it lands</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-success" />
              <span>Emailed the moment it's ready, day or night</span>
            </li>
          </ul>

          <div className="mt-4 flex items-baseline justify-between border-t border-border/60 pt-3.5">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              24-hour delivery
            </span>
            <span className="font-display text-2xl font-semibold text-foreground">
              $29.99
            </span>
          </div>

          <button
            onClick={onAccept}
            disabled={processing}
            className="mt-3.5 flex w-full items-center justify-center gap-2 rounded-xl bg-success px-5 py-3.5 text-sm font-bold text-success-foreground shadow-glow transition-all hover:brightness-95 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 sm:py-4 sm:text-base"
          >
            {processing ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-success-foreground/30 border-t-success-foreground" />
                Adding to your order…
              </>
            ) : (
              <>
                <Gift className="h-4 w-4" />
                Yes, deliver in 24 hours
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
            No thanks, I can wait 5 days
          </button>
        </div>
      </div>
    </div>
  );
}
