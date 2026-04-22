// Per-session TOTP challenge. Required every 12 hours.

import { useState } from "react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { verifyTotpCode } from "@/lib/totp";

interface Props {
  userId: string;
  onVerified: () => void;
}

export function AdminMfaChallenge({ userId, onVerified }: Props) {
  const [token, setToken] = useState("");
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleVerify = async () => {
    setError(null);
    setBusy(true);
    try {
      const { data: mfa } = await supabase
        .from("user_mfa")
        .select("totp_secret, recovery_codes")
        .eq("user_id", userId)
        .maybeSingle();
      if (!mfa) {
        setError("2FA is not set up.");
        return;
      }

      let ok = false;
      if (recoveryMode) {
        const code = recoveryCode.trim().toUpperCase();
        if ((mfa.recovery_codes ?? []).includes(code)) {
          // burn the code
          const remaining = (mfa.recovery_codes as string[]).filter(
            (c) => c !== code,
          );
          await supabase
            .from("user_mfa")
            .update({ recovery_codes: remaining })
            .eq("user_id", userId);
          ok = true;
        }
      } else {
        ok = verifyTotpCode(mfa.totp_secret, token);
      }

      if (!ok) {
        setError(
          recoveryMode
            ? "That recovery code is not valid."
            : "That code is not valid. Try again.",
        );
        return;
      }

      const { error: vErr } = await supabase
        .from("mfa_verifications")
        .insert({
          user_id: userId,
          user_agent:
            typeof navigator !== "undefined" ? navigator.userAgent : null,
        });
      if (vErr) throw vErr;
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
