import { Check, Gift, LogIn } from "lucide-react";

interface CheckoutProgressProps {
  /** Current step: 1 = payment done, 2 = bonus (upsells), 3 = login */
  current: 1 | 2 | 3;
}

/**
 * Slim progress indicator shown at the top of the upsell flow.
 * Steps: Payment → Bonus → Log in. Uses the brand palette (lavender + cream).
 */
export function CheckoutProgress({ current }: CheckoutProgressProps) {
  const steps = [
    { id: 1, label: "Payment", Icon: Check },
    { id: 2, label: "Bonus", Icon: Gift },
    { id: 3, label: "Log in", Icon: LogIn },
  ] as const;

  return (
    <div className="w-full border-b border-border/60 bg-background-card/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-2xl items-center justify-between gap-2 px-6 py-4">
        {steps.map((step, i) => {
          const state =
            step.id < current ? "done" : step.id === current ? "current" : "todo";
          const isLast = i === steps.length - 1;

          return (
            <div key={step.id} className="flex flex-1 items-center">
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={[
                    "flex h-9 w-9 items-center justify-center rounded-full border-2 transition-all",
                    state === "done" &&
                      "border-primary bg-primary text-primary-foreground",
                    state === "current" &&
                      "border-primary bg-primary text-primary-foreground shadow-glow",
                    state === "todo" &&
                      "border-border bg-background text-muted-foreground",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <step.Icon className="h-4 w-4" />
                </div>
                <span
                  className={[
                    "text-[10px] font-semibold uppercase tracking-[0.16em] md:text-xs",
                    state === "todo"
                      ? "text-muted-foreground"
                      : "text-foreground",
                  ].join(" ")}
                >
                  {step.label}
                </span>
              </div>

              {!isLast && (
                <div
                  className={[
                    "mx-2 h-0.5 flex-1 rounded-full transition-all md:mx-3",
                    step.id < current
                      ? "bg-primary"
                      : step.id === current
                        ? "bg-gradient-to-r from-primary to-border"
                        : "bg-border",
                  ].join(" ")}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
