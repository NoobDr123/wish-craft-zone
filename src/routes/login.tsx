import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { ArrowLeft, Mail, CheckCircle2, Loader2 } from "lucide-react";
import { Logo } from "@/components/Logo";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/login")({
  component: LoginPage,
  head: () => ({
    meta: [{ title: "Sign in · RibbonSong" }],
  }),
});

function LoginPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && user) {
      navigate({ to: "/account" });
    }
  }, [user, loading, navigate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    setSubmitting(true);
    const { error: err } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
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

      <main className="mx-auto flex min-h-[calc(100vh-65px)] max-w-md items-center px-5 py-12">
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
                We just sent a magic sign-in link to{" "}
                <span className="font-semibold text-foreground">{email}</span>.
                Click it to access your songs and orders.
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
                Sign in to your account
              </h1>
              <p className="mt-2 text-center text-sm text-muted-foreground">
                Enter the email you used at checkout. We'll send you a one-tap
                sign-in link — no password needed.
              </p>

              <form onSubmit={handleSubmit} className="mt-7 space-y-4">
                <div>
                  <label className="text-sm font-semibold text-foreground">
                    Email address
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
                    <>Send magic link</>
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
      </main>
    </div>
  );
}
