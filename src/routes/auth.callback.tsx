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
    meta: [{ title: "Signing you in… · PawPrint Song" }],
  }),
});

// Whitelist of safe in-app redirect *prefixes*. We don't want an attacker
// to craft a magic-link URL with `?redirect=//evil.com` and bounce users
// off-site, so only known route paths are honored. Prefixes let dynamic
// routes like `/portal/abc123` and `/listen/xyz` resolve correctly.
const SAFE_REDIRECT_PREFIXES = [
  "/dashboard",
  "/account",
  "/create",
  "/admin",
  "/portal/",
  "/listen/",
  "/",
];

function isSafeRedirect(target: string | undefined): target is string {
  if (!target || !target.startsWith("/") || target.startsWith("//")) return false;
  return SAFE_REDIRECT_PREFIXES.some(
    (p) => target === p || target.startsWith(p),
  );
}

function AuthCallback() {
  const navigate = useNavigate();
  const { redirect } = Route.useSearch();

  useEffect(() => {
    const target = isSafeRedirect(redirect) ? redirect : "/account";
    let navigated = false;

    const goTo = (to: string) => {
      if (navigated) return;
      navigated = true;
      // `to: "any"` cast: target is a runtime-validated string, not a literal
      // route id, so we step around the type-safe router check here.
      navigate({ to: to as string as "/account", replace: true });
    };

    // Supabase auto-handles the magic link hash on the client.
    // Once the session is set, redirect to the requested page (or /account).
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        goTo(target);
      } else if (event === "SIGNED_OUT") {
        goTo("/login");
      }
    });

    // Fallback: if session is already there, navigate immediately
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) goTo(target);
    });

    // Safety net: ONLY fires if no session has arrived. Without the guard,
    // a slow network would bounce already-signed-in users back to /login.
    const timeout = setTimeout(() => {
      if (!navigated) goTo("/login");
    }, 8000);

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
