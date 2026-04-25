import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, AlertCircle, Mail } from "lucide-react";
import { Link } from "@tanstack/react-router";

type Status =
  | { kind: "loading" }
  | { kind: "valid" }
  | { kind: "already" }
  | { kind: "invalid"; message?: string }
  | { kind: "submitting" }
  | { kind: "done" }
  | { kind: "error"; message: string };

export const Route = createFileRoute("/email/unsubscribe")({
  component: UnsubscribePage,
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search.token === "string" ? search.token : undefined,
  }),
  head: () => ({
    meta: [{ title: "Unsubscribe · RibbonSong" }],
  }),
});

function UnsubscribePage() {
  const { token } = Route.useSearch();
  const [status, setStatus] = useState<Status>({ kind: "loading" });

  useEffect(() => {
    if (!token) {
      setStatus({ kind: "invalid", message: "This unsubscribe link is missing its token." });
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/email/unsubscribe?token=${encodeURIComponent(token)}`);
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok) {
          setStatus({ kind: "invalid", message: data?.error ?? "This link is invalid or has expired." });
          return;
        }
        if (data?.valid === false && data?.reason === "already_unsubscribed") {
          setStatus({ kind: "already" });
        } else if (data?.valid) {
          setStatus({ kind: "valid" });
        } else {
          setStatus({ kind: "invalid", message: "This link is invalid or has expired." });
        }
      } catch {
        if (!cancelled) {
          setStatus({ kind: "error", message: "We couldn't reach the server. Please try again." });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleConfirm = async () => {
    if (!token) return;
    setStatus({ kind: "submitting" });
    try {
      const res = await fetch("/api/email/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus({
          kind: "error",
          message: data?.error ?? "We couldn't unsubscribe you. Please try again.",
        });
        return;
      }
      if (data?.success) {
        setStatus({ kind: "done" });
      } else if (data?.reason === "already_unsubscribed") {
        setStatus({ kind: "already" });
      } else {
        setStatus({ kind: "error", message: "Something went wrong. Please try again." });
      }
    } catch {
      setStatus({ kind: "error", message: "We couldn't reach the server. Please try again." });
    }
  };

  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <div className="bg-card rounded-3xl shadow-card border border-border/60 p-8 sm:p-10 text-center">
          <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-accent">
            <Mail className="h-7 w-7 text-primary" aria-hidden="true" />
          </div>

          {status.kind === "loading" && (
            <>
              <h1 className="font-display text-2xl text-foreground">Checking your link…</h1>
              <div className="mt-6 flex justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden="true" />
              </div>
            </>
          )}

          {status.kind === "valid" && (
            <>
              <h1 className="font-display text-2xl text-foreground">Unsubscribe from RibbonSong emails?</h1>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                You won't receive any more transactional emails from us — including order updates and song delivery
                notifications. You can still place new orders any time.
              </p>
              <Button onClick={handleConfirm} className="mt-7 w-full" size="lg">
                Confirm unsubscribe
              </Button>
              <Link
                to="/"
                className="mt-4 inline-block text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Never mind — take me home
              </Link>
            </>
          )}

          {status.kind === "submitting" && (
            <>
              <h1 className="font-display text-2xl text-foreground">Unsubscribing…</h1>
              <div className="mt-6 flex justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden="true" />
              </div>
            </>
          )}

          {status.kind === "done" && (
            <>
              <div className="mx-auto -mt-2 mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-success/10">
                <CheckCircle2 className="h-7 w-7 text-success" aria-hidden="true" />
              </div>
              <h1 className="font-display text-2xl text-foreground">You're unsubscribed.</h1>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                We've removed your email from our list. Thanks for being part of the RibbonSong story — we'd love to
                make a song for you again any time.
              </p>
              <Link
                to="/"
                className="mt-7 inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
              >
                Back to RibbonSong
              </Link>
            </>
          )}

          {status.kind === "already" && (
            <>
              <div className="mx-auto -mt-2 mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-success/10">
                <CheckCircle2 className="h-7 w-7 text-success" aria-hidden="true" />
              </div>
              <h1 className="font-display text-2xl text-foreground">You're already unsubscribed.</h1>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                Nothing more to do — your email is no longer on our list.
              </p>
              <Link
                to="/"
                className="mt-7 inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
              >
                Back to RibbonSong
              </Link>
            </>
          )}

          {(status.kind === "invalid" || status.kind === "error") && (
            <>
              <div className="mx-auto -mt-2 mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                <AlertCircle className="h-7 w-7 text-destructive" aria-hidden="true" />
              </div>
              <h1 className="font-display text-2xl text-foreground">
                {status.kind === "invalid" ? "This link isn't valid" : "Something went wrong"}
              </h1>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{status.message}</p>
              <p className="mt-4 text-sm text-muted-foreground">
                If you keep getting unwanted emails, just reply to one of them and we'll remove you manually.
              </p>
              <Link
                to="/"
                className="mt-7 inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
              >
                Back to RibbonSong
              </Link>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
