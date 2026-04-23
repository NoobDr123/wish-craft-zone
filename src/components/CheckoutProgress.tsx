import { Check, Gift, ClipboardCheck } from "lucide-react";

interface CheckoutProgressProps {
  /** Current step: 1 = payment done, 2 = bonus (upsells), 3 = final confirmation */
  current: 1 | 2 | 3;
}

/**
 * Slim progress indicator shown at the top of the checkout flow.
 * Steps: Payment, Bonus, Final confirmation. Uses the brand palette.
 */
export function CheckoutProgress({ current }: CheckoutProgressProps) {
  const steps = [
    { id: 1, label: "Payment", shortLabel: "Payment", Icon: Check },
    { id: 2, label: "Bonus", shortLabel: "Bonus", Icon: Gift },
    {
      id: 3,
      label: "Final confirmation",
      shortLabel: "Confirm",
      Icon: ClipboardCheck,
    },
  ] as const;

  return (
    <div className="w-full border-b border-border/60 bg-background-card/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-2xl items-center justify-between gap-1.5 px-3 py-3 sm:gap-2 sm:px-6 sm:py-4">
        {steps.map((step, i) => {
          const state =
            step.id < current ? "done" : step.id === current ? "current" : "todo";
          const isLast = i === steps.length - 1;

          return (
            <div key={step.id} className="flex flex-1 items-center">
              <div className="flex min-w-0 flex-col items-center gap-1 sm:gap-1.5">
                <div
                  className={[
                    "flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all sm:h-9 sm:w-9",
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
                  <step.Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </div>
                {/* Short label on mobile, full label on >=sm */}
                <span
                  className={[
                    "max-w-full truncate text-center text-[9px] font-semibold uppercase tracking-[0.12em] sm:hidden",
                    state === "todo"
                      ? "text-muted-foreground"
                      : "text-foreground",
                  ].join(" ")}
                >
                  {step.shortLabel}
                </span>
                <span
                  className={[
                    "hidden text-[10px] font-semibold uppercase tracking-[0.16em] sm:block md:text-xs",
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
                    "mx-1.5 h-0.5 flex-1 rounded-full transition-all sm:mx-3",
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
