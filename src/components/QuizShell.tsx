import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Logo } from "./Logo";
import { ProgressBar } from "./ProgressBar";

interface QuizShellProps {
  current: number; // 1-based question index
  total: number;
  chapter: string; // e.g. "Their fight"
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  onNext: () => void;
  onBack?: () => void;
  isValid: boolean;
  nextLabel?: string;
  optional?: boolean;
}

export function QuizShell({
  current,
  total,
  chapter,
  title,
  subtitle,
  children,
  onNext,
  onBack,
  isValid,
  nextLabel = "Continue",
  optional = false,
}: QuizShellProps) {
  return (
    <div className="min-h-screen bg-background">
      <ProgressBar current={current} total={total} />

      <header className="px-6 pb-2 pt-20">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Logo />
        </div>
      </header>

      <main className="px-6 pb-40 pt-12 md:pb-24">
        <div className="mx-auto max-w-2xl">
          <div className="mb-10">
            <p className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-primary">
              {chapter}
              {optional && (
                <span className="ml-2 rounded-full bg-peach px-2 py-0.5 text-[10px] uppercase tracking-wider text-peach-foreground">
                  Optional
                </span>
              )}
            </p>
            <h1 className="font-display text-4xl font-semibold leading-tight text-foreground text-balance md:text-5xl">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-3 text-lg leading-relaxed text-muted-foreground">
                {subtitle}
              </p>
            )}
          </div>

          <div
            key={current}
            className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500"
          >
            {children}
          </div>

          {/* Desktop action bar */}
          <div className="mt-12 hidden items-center justify-between gap-4 md:flex">
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

            <div className="flex items-center gap-3">
              {optional && (
                <button
                  type="button"
                  onClick={onNext}
                  className="inline-flex items-center justify-center rounded-full border-2 border-primary/40 bg-card px-7 py-3.5 text-base font-semibold text-primary transition-all hover:border-primary hover:bg-primary/10"
                >
                  Skip
                </button>
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
        </div>
      </main>

      {/* Mobile floating action bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-md md:hidden">
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              aria-label="Back"
              className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-border bg-card text-foreground transition-colors active:bg-muted"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          ) : null}
          {optional && (
            <button
              type="button"
              onClick={onNext}
              className="inline-flex h-14 flex-1 items-center justify-center rounded-full border-2 border-primary/40 bg-card text-base font-semibold text-primary transition-all active:bg-primary/10"
            >
              Skip
            </button>
          )}
          <button
            type="button"
            onClick={onNext}
            disabled={!isValid}
            className="inline-flex h-14 flex-[2] items-center justify-center rounded-full bg-primary text-base font-semibold text-primary-foreground shadow-soft transition-all active:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
          >
            {nextLabel} →
          </button>
        </div>
      </div>
    </div>
  );
}
