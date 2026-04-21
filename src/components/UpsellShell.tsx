import { Logo } from "./Logo";

interface UpsellShellProps {
  step: 1 | 2 | 3;
  badge: string;
  headline: string;
  description: React.ReactNode;
  acceptLabel: string;
  declineLabel: string;
  onAccept: () => void;
  onDecline: () => void;
  processing?: boolean;
  countdown?: string;
  highlights?: string[];
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
}: UpsellShellProps) {
  return (
    <div className="min-h-screen bg-background">
      <header className="px-6 pt-8">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Logo />
          <p className="text-sm text-muted-foreground">
            Special offer {step} of 3
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-12">
        <div className="rounded-[2rem] border border-border bg-card p-8 shadow-card md:p-12">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-2 rounded-full bg-peach px-4 py-1.5 text-xs font-medium uppercase tracking-wider text-foreground">
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
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  <span>{h}</span>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-10 space-y-3">
            <button
              onClick={onAccept}
              disabled={processing}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-primary px-8 py-4 text-base font-medium text-primary-foreground shadow-glow transition-all hover:bg-primary-hover disabled:opacity-60"
            >
              {processing ? "Adding to your order…" : acceptLabel}
            </button>
            <button
              onClick={onDecline}
              disabled={processing}
              className="w-full rounded-full px-6 py-3 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {declineLabel}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
