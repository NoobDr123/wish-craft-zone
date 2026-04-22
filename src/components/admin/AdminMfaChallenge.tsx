// Per-session TOTP challenge. Required every 12 hours.
// All TOTP/recovery verification happens server-side via the admin-mfa edge function.

import { useState } from "react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  userId: string;
  onVerified: () => void;
}

async function callMfa(action: string, payload: Record<string, unknown> = {}) {
  const { data, error } = await supabase.functions.invoke("admin-mfa", {
    body: { action, ...payload },
  });
  if (error) {
    // supabase.functions.invoke surfaces a generic message; try to read the body.
    const msg =
      (data && (data as any).error) || error.message || "Verification failed.";
    throw new Error(msg);
  }
  if (data && (data as any).error) {
    throw new Error((data as any).error);
  }
  return data;
}

export function AdminMfaChallenge({ userId: _userId, onVerified }: Props) {
  const [token, setToken] = useState("");
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleVerify = async () => {
    setError(null);
    setBusy(true);
    try {
      if (recoveryMode) {
        await callMfa("verify-recovery", { code: recoveryCode });
      } else {
        await callMfa("verify-totp", { token });
      }
      onVerified();
    } catch (e: any) {
      setError(e?.message ?? "Verification failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-8 shadow-soft">
        <Logo />
        <h1 className="mt-6 font-display text-3xl font-semibold">
          Two-factor required
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {recoveryMode
            ? "Enter one of your recovery codes."
            : "Enter the 6-digit code from your authenticator app."}
        </p>

        {!recoveryMode ? (
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            maxLength={6}
            value={token}
            onChange={(e) => setToken(e.target.value.replace(/\D/g, ""))}
            onKeyDown={(e) => {
              if (e.key === "Enter" && token.length === 6) handleVerify();
            }}
            className="mt-6 w-full rounded-xl border border-border bg-background px-4 py-4 text-center font-mono text-2xl tracking-widest"
            placeholder="000000"
          />
        ) : (
          <input
            type="text"
            autoFocus
            value={recoveryCode}
            onChange={(e) => setRecoveryCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleVerify();
            }}
            className="mt-6 w-full rounded-xl border border-border bg-background px-4 py-4 text-center font-mono text-lg tracking-widest"
            placeholder="XXXXX-XXXXX"
          />
        )}

        {error && <p className="mt-3 text-sm text-destructive">{error}</p>}

        <Button
          className="mt-6 w-full"
          size="lg"
          disabled={
            busy ||
            (recoveryMode ? recoveryCode.length < 10 : token.length !== 6)
          }
          onClick={handleVerify}
        >
          {busy ? "Verifying…" : "Verify"}
        </Button>

        <button
          className="mt-4 w-full text-xs text-muted-foreground hover:text-foreground"
          onClick={() => {
            setRecoveryMode((v) => !v);
            setError(null);
          }}
        >
          {recoveryMode
            ? "Use authenticator code instead"
            : "I lost my device — use a recovery code"}
        </button>
      </div>
    </div>
  );
}
