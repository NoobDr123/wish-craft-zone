import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Logo } from "./Logo";
import { ProgressBar } from "./ProgressBar";

interface QuizShellProps {
  step: 1 | 2 | 3 | 4;
  title: string;
  subtitle: string;
  children: React.ReactNode;
  onNext: () => void;
  onBack?: () => void;
  isValid: boolean;
  nextLabel?: string;
}

const STEP_PERCENTAGES = { 1: 25, 2: 50, 3: 75, 4: 100 } as const;

export function QuizShell({
  step,
  title,
  subtitle,
  children,
  onNext,
  onBack,
  isValid,
  nextLabel = "Continue",
}: QuizShellProps) {
  return (
    <div className="min-h-screen bg-background">
      <ProgressBar percentage={STEP_PERCENTAGES[step]} />

      <header className="px-6 pb-2 pt-8">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Logo />
          <p className="text-sm text-muted-foreground">Step {step} of 4</p>
        </div>
      </header>

      <main className="px-6 pb-24 pt-12">
        <div className="mx-auto max-w-2xl">
          <div className="mb-10">
            <h1 className="font-display text-4xl font-semibold leading-tight text-foreground text-balance md:text-5xl">
              {title}
            </h1>
            <p className="mt-3 text-lg text-muted-foreground">{subtitle}</p>
          </div>

          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-500">
            {children}
          </div>

          <div className="mt-12 flex items-center justify-between gap-4">
            {onBack ? (
              <button
                type="button"
                onClick={onBack}
                className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
            ) : (
              <Link
                to="/"
                className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4" />
                Home
              </Link>
            )}

            <button
              type="button"
              onClick={onNext}
              disabled={!isValid}
              className="inline-flex items-center justify-center rounded-full bg-primary px-8 py-3.5 text-sm font-medium text-primary-foreground shadow-soft transition-all hover:bg-primary-hover hover:shadow-glow disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
            >
              {nextLabel}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
