// Dedicated staff login. Lives at /admin/login so customers and staff
// never share the same login surface — different copy, no "Create your
// first song" CTA, and the post-auth redirect always points back to /admin.

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { ArrowLeft, Lock, CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/Logo";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/admin/login")({
  component: AdminLoginPage,
  head: () => ({
    meta: [
      { title: "Staff sign-in · RibbonSong" },
      // Staff login should never be indexed.
      { name: "robots", content: "noindex,nofollow,noarchive,nosnippet" },
      { name: "referrer", content: "no-referrer" },
    ],
  }),
});

function AdminLoginPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If already logged in, jump straight to the admin console — the admin
  // page itself will handle role + MFA gating.
  useEffect(() => {
    if (!loading && user) {
      navigate({ to: "/admin" });
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
        // Send admins straight back to /admin after auth, NOT the customer
        // dashboard. Role + MFA checks happen on /admin itself.
        emailRedirectTo: `${window.location.origin}/auth/callback?redirect=/admin`,
        // Don't auto-create users from this page — only existing staff
        // accounts should be able to sign in here.
        shouldCreateUser: false,
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
          <a
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Home
          </a>
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
                A staff sign-in link was sent to{" "}
                <span className="font-semibold text-foreground">{email}</span>.
                Open it on this device — you'll be asked for your 2FA code on
                the next step.
              </p>
              <p className="mt-6 text-xs text-muted-foreground">
                Didn't get it?{" "}
                <button
                  onClick={() => setSent(false)}
                  className="font-semibold text-primary underline-offset-4 hover:underline"
                >
                  try a different email
                </button>
                .
              </p>
            </div>
          ) : (
            <>
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                <Lock className="h-7 w-7 text-primary" />
              </div>
              <h1 className="mt-5 text-center font-display text-3xl font-bold text-foreground">
                Staff sign-in
              </h1>
              <p className="mt-2 text-center text-sm text-muted-foreground">
                Restricted access. For RibbonSong team members only.
              </p>

              <div className="mt-6 rounded-2xl border border-primary/20 bg-primary/5 p-4">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    This is the staff console. Customers should use the
                    sign-in link from their order confirmation email instead.
                  </p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <div>
                  <label className="text-sm font-semibold text-foreground">
                    Staff email address
                  </label>
                  <input
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@ribbonsong.com"
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
                    <>Send staff sign-in link</>
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
