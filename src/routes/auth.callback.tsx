import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth/callback")({
  component: AuthCallback,
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: typeof search.redirect === "string" ? search.redirect : undefined,
  }),
  head: () => ({
    meta: [{ title: "Signing you in… · RibbonSong" }],
  }),
});

// Whitelist of safe in-app redirect targets. We don't want an attacker to
// craft a magic-link URL with `?redirect=//evil.com` and bounce users
// off-site, so only known route paths are honored.
const SAFE_REDIRECTS = new Set(["/dashboard", "/account", "/create", "/"]);

function AuthCallback() {
  const navigate = useNavigate();
  const { redirect } = Route.useSearch();

  useEffect(() => {
    const target =
      redirect && SAFE_REDIRECTS.has(redirect)
        ? (redirect as "/dashboard" | "/account" | "/create" | "/")
        : "/account";

    // Supabase auto-handles the magic link hash on the client.
    // Once the session is set, redirect to the requested page (or /account).
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        navigate({ to: target, replace: true });
      } else if (event === "SIGNED_OUT") {
        navigate({ to: "/login", replace: true });
      }
    });

    // Fallback: if session is already there, navigate immediately
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate({ to: target, replace: true });
    });

    // Safety net
    const timeout = setTimeout(() => {
      navigate({ to: "/login", replace: true });
    }, 5000);

    return () => {
      sub.subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [navigate, redirect]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-warm px-6">
      <div className="text-center">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
        <p className="mt-4 font-display text-lg text-foreground">
          Signing you in…
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          One moment while we open your account.
        </p>
      </div>
    </div>
  );
}
