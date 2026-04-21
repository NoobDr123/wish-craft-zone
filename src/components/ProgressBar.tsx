interface ProgressBarProps {
  current: number; // 1-based
  total: number;
}

export function ProgressBar({ current, total }: ProgressBarProps) {
  const clamped = Math.max(1, Math.min(total, current));
  const percentage = (clamped / total) * 100;

  return (
    <div className="fixed inset-x-0 top-0 z-50 bg-background/85 backdrop-blur-md">
      {/* Step dots */}
      <div className="mx-auto flex max-w-3xl items-center gap-2 px-6 pt-4">
        {Array.from({ length: total }).map((_, i) => {
          const stepNum = i + 1;
          const state =
            stepNum < clamped ? "done" : stepNum === clamped ? "current" : "todo";
          return (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${
                state === "done"
                  ? "bg-primary"
                  : state === "current"
                    ? "bg-gradient-to-r from-primary to-ribbon"
                    : "bg-peach/60"
              }`}
            />
          );
        })}
      </div>

      {/* Counter */}
      <div className="mx-auto flex max-w-3xl items-center justify-between px-6 pb-3 pt-2">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
          Question {clamped} of {total}
        </p>
        <p className="text-xs font-medium text-primary tabular-nums">
          {Math.round(percentage)}%
        </p>
      </div>
    </div>
  );
}
