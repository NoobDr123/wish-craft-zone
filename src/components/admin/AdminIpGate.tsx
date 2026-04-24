// IP allowlist gate for the admin area.
//
// On mount, calls /api/admin/ip-check. Only renders children if the caller's
// IP is on the allowlist. Otherwise:
//   - bootstrap mode (table empty): renders <onBootstrap /> so the first
//     authenticated admin can self-add their IP
//   - blocked: renders the same fake "Not found" the not_admin path uses,
//     so attackers can't fingerprint the existence of /admin
//
// Loading state is intentionally minimal — no admin branding visible.

import { useEffect, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Logo } from "@/components/Logo";

type CheckState =
  | { status: "loading" }
  | { status: "allowed"; ip: string | null }
  | { status: "blocked"; ip: string | null }
  | { status: "bootstrap"; ip: string | null };

interface AdminIpGateProps {
  children: ReactNode;
  /** Rendered when the table is empty and a first IP needs to be added. */
  bootstrap: (props: { ip: string | null; onAdded: () => void }) => ReactNode;
}

export function AdminIpGate({ children, bootstrap }: AdminIpGateProps) {
  const [state, setState] = useState<CheckState>({ status: "loading" });
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setState({ status: "loading" });
      try {
        const res = await fetch("/api/admin/ip-check", {
          method: "GET",
          credentials: "include",
        });
        const data = await res.json();
        if (cancelled) return;
        if (data.allowed) {
          setState({ status: "allowed", ip: data.ip ?? null });
        } else if (data.bootstrap) {
          setState({ status: "bootstrap", ip: data.ip ?? null });
        } else {
          setState({ status: "blocked", ip: data.ip ?? null });
        }
      } catch (e) {
        console.error("[AdminIpGate] check failed", e);
        if (!cancelled) setState({ status: "blocked", ip: null });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  if (state.status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground text-sm">
        Loading…
      </div>
    );
  }

  if (state.status === "blocked") {
    // Identical to the not_admin "fake 404" — give nothing away.
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <Logo />
          <h1 className="mt-6 font-display text-3xl font-semibold">
            Not found
          </h1>
          <p className="mt-2 text-muted-foreground">
            This page doesn't exist.
          </p>
          <Link to="/" className="mt-6 inline-block text-primary underline">
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  if (state.status === "bootstrap") {
    return (
      <>
        {bootstrap({
          ip: state.ip,
          onAdded: () => setReloadKey((k) => k + 1),
        })}
      </>
    );
  }

  return <>{children}</>;
}
