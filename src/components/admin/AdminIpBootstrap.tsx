// Bootstrap screen for the IP allowlist.
//
// Shown ONLY when the admin_ip_allowlist table is empty. Requires the user
// to be logged in as an admin (the server route enforces this). After they
// add their IP, the gate re-checks and the normal admin UI renders.

import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ShieldCheck, Loader2, Lock } from "lucide-react";
import { Logo } from "@/components/Logo";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface AdminIpBootstrapProps {
  ip: string | null;
  onAdded: () => void;
}

export function AdminIpBootstrap({ ip, onAdded }: AdminIpBootstrapProps) {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [label, setLabel] = useState("My main IP");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      // Bounce to staff login first; we'll come back here automatically.
      navigate({ to: "/admin/login" });
    }
  }, [authLoading, user, navigate]);

  const handleAdd = async () => {
    setError(null);
    setSubmitting(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        setError("Your session expired. Please sign in again.");
        setSubmitting(false);
        return;
      }
      const res = await fetch("/api/admin/ip-add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ label }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(
          data.error === "not_admin"
            ? "Your account is not an admin."
            : data.error === "no_ip_detected"
              ? "We couldn't detect your IP. Try a different network."
              : "Something went wrong. Please try again.",
        );
        setSubmitting(false);
        return;
      }
      onAdded();
    } catch (e) {
      console.error("[AdminIpBootstrap] add failed", e);
      setError("Network error. Please try again.");
      setSubmitting(false);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground text-sm">
        Loading…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-warm">
      <header className="border-b border-peach/60 bg-background/60 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-5 py-4">
          <Link
            to="/"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Home
          </Link>
          <Logo />
          <span className="w-12" />
        </div>
      </header>

      <main className="mx-auto flex min-h-[calc(100vh-65px)] max-w-xl flex-col items-center gap-6 px-5 py-12">
        <div className="w-full rounded-3xl border border-peach/70 bg-card p-7 shadow-card md:p-9">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <ShieldCheck className="h-7 w-7 text-primary" />
          </div>
          <h1 className="mt-5 text-center font-display text-3xl font-bold text-foreground">
            Lock down the admin panel
          </h1>
          <p className="mt-2 text-center text-sm leading-relaxed text-muted-foreground">
            One-time setup. Add your current IP address as the first entry —
            after this, only IPs you approve will ever see the admin pages.
          </p>

          <div className="mt-6 rounded-2xl border border-peach/60 bg-background/60 p-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              Detected IP address
            </p>
            <p className="mt-1 font-mono text-lg font-semibold text-foreground">
              {ip ?? "Unknown"}
            </p>
          </div>

          <div className="mt-4">
            <label className="text-sm font-semibold text-foreground">
              Label
            </label>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Home office"
              className="mt-1.5 w-full rounded-xl border border-peach bg-background px-4 py-3 text-base outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary"
            />
          </div>

          {error && (
            <p className="mt-3 text-sm font-medium text-destructive">{error}</p>
          )}

          <button
            onClick={handleAdd}
            disabled={submitting || !ip}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-4 text-base font-bold text-primary-foreground shadow-glow transition-all hover:brightness-95 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Adding…
              </>
            ) : (
              <>
                <Lock className="h-4 w-4" /> Add this IP & lock the admin panel
              </>
            )}
          </button>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            Once added, anyone visiting <code>/admin</code> from a different
            network will see "Not found". You can manage allowed IPs from the
            admin dashboard later.
          </p>
        </div>
      </main>
    </div>
  );
}
