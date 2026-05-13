import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { ArrowLeft, Mail, CheckCircle2, Loader2, ShieldCheck, LifeBuoy } from "lucide-react";
import { Logo } from "@/components/Logo";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/login")({
  component: LoginPage,
  // Honor `?redirect=/portal/abc123` so users sent to /login from a
  // protected page land back where they started after sign-in.
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: typeof search.redirect === "string" ? search.redirect : undefined,
  }),
  head: () => ({
    meta: [{ title: "Track your song · PawPrint Song" }],
  }),
});

// Same allowlist semantics as auth.callback — only honor known in-app paths.
const SAFE_REDIRECT_PREFIXES = [
  "/dashboard",
  "/account",
  "/create",
  "/portal/",
  "/listen/",
];
function safeRedirectOrNull(target: string | undefined): string | null {
  if (!target || !target.startsWith("/") || target.startsWith("//")) return null;
  return SAFE_REDIRECT_PREFIXES.some((p) => target === p || target.startsWith(p))
    ? target
    : null;
}

function LoginPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { redirect: redirectParam } = Route.useSearch();
  const safeRedirect = safeRedirectOrNull(redirectParam);
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && user) {
      // Already signed in — bounce straight to the intended target,
      // not always /account.
      navigate({ to: (safeRedirect ?? "/account") as "/account", replace: true });
    }
  }, [user, loading, navigate, safeRedirect]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    setSubmitting(true);
    // Forward the redirect into the magic link so /auth/callback knows
    // where to send the user after Supabase exchanges the token.
    const callbackUrl = new URL(`${window.location.origin}/auth/callback`);
    if (safeRedirect) callbackUrl.searchParams.set("redirect", safeRedirect);
    const { error: err } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        emailRedirectTo: callbackUrl.toString(),
      },
    });
    setSubmitting(false);
    if (err) {
      setError(err.message);
      return;
    }
    setSent(true);
  };

  return (
    <div className="min-h-screen bg-gradient-warm">
      <header className="border-b border-peach/60 bg-background/60 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-5 py-4">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Home
          </Link>
          <Logo />
          <span className="w-12" />
        </div>
      </header>

      <main className="mx-auto flex min-h-[calc(100vh-65px)] max-w-xl flex-col items-center gap-6 px-5 py-12">
        <div className="w-full rounded-3xl border border-peach/70 bg-card p-7 shadow-card md:p-9">
          {sent ? (
            <div className="text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success/15">
                <CheckCircle2 className="h-7 w-7 text-success" />
              </div>
              <h1 className="mt-5 font-display text-3xl font-bold text-foreground">
                Check your inbox
              </h1>
              <p className="mt-3 text-base leading-relaxed text-muted-foreground">
                We just sent a sign-in link to{" "}
                <span className="font-semibold text-foreground">{email}</span>.
                Click it to access your song and order status.
              </p>
              <p className="mt-6 text-xs text-muted-foreground">
                Didn't get it? Check spam, or{" "}
                <button
                  onClick={() => setSent(false)}
                  className="font-semibold text-primary underline-offset-4 hover:underline"
                >
                  try again
                </button>
                .
              </p>
            </div>
          ) : (
            <>
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                <Mail className="h-7 w-7 text-primary" />
              </div>
              <h1 className="mt-5 text-center font-display text-3xl font-bold text-foreground">
                Track your song
              </h1>
              <p className="mt-2 text-center text-sm text-muted-foreground">
                Enter your email to check your song status and delivery date.
              </p>

              <div className="mt-6 rounded-2xl border border-success/30 bg-success/5 p-4">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-success" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      We deliver every order — you're safe!
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      We have a 100% song delivery rate. If you can't find your
                      song, it's usually a typo in your email or a spam filter.
                      Message us through the{" "}
                      <Link
                        to="/contact"
                        className="font-semibold text-primary underline-offset-4 hover:underline"
                      >
                        contact form
                      </Link>{" "}
                      and we'll resend your song. We reply within 1–3 days.
                    </p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <div>
                  <label className="text-sm font-semibold text-foreground">
                    Enter your email address
                  </label>
                  <input
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@email.com"
                    className="mt-1.5 w-full rounded-xl border border-peach bg-background px-4 py-3 text-base text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary"
                  />
                </div>

                {error && (
                  <p className="text-sm font-medium text-destructive">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-4 text-base font-bold text-primary-foreground shadow-glow transition-all hover:brightness-95 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Sending link…
                    </>
                  ) : (
                    <>Track your song</>
                  )}
                </button>
              </form>

              <p className="mt-6 text-center text-xs text-muted-foreground">
                New here?{" "}
                <Link
                  to="/create"
                  className="font-semibold text-primary underline-offset-4 hover:underline"
                >
                  Create your first song
                </Link>
                .
              </p>
            </>
          )}
        </div>

        {!sent && (
          <div className="w-full rounded-3xl border border-peach/70 bg-card/60 p-6 shadow-sm md:p-7">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <LifeBuoy className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <h2 className="font-display text-lg font-bold text-foreground">
                  Need help?
                </h2>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  If you're having trouble finding your order or have any
                  questions, message us through the{" "}
                  <Link
                    to="/contact"
                    className="font-semibold text-primary underline-offset-4 hover:underline"
                  >
                    contact form
                  </Link>
                  . We reply within 1–3 days.
                </p>
                <Link
                  to="/contact"
                  className="mt-4 inline-flex items-center justify-center rounded-xl border border-primary/30 bg-background px-5 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-primary/5"
                >
                  Contact us
                </Link>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
