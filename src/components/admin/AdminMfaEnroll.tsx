// First-time TOTP enrollment for admins. The TOTP secret is generated
// server-side by the admin-mfa edge function — only the QR/otpauth URL and
// the one-time recovery code list are returned to the browser.

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  email: string;
  userId: string;
  onEnrolled: () => void;
}

async function callMfa(action: string, payload: Record<string, unknown> = {}) {
  const { data, error } = await supabase.functions.invoke("admin-mfa", {
    body: { action, ...payload },
  });
  if (error) {
    const msg =
      (data && (data as any).error) || error.message || "Request failed.";
    throw new Error(msg);
  }
  if (data && (data as any).error) {
    throw new Error((data as any).error);
  }
  return data as any;
}

export function AdminMfaEnroll({ email: _email, userId: _userId, onEnrolled }: Props) {
  const [secret, setSecret] = useState<string>("");
  const [otpauth, setOtpauth] = useState<string>("");
  const [codes, setCodes] = useState<string[]>([]);
  const [qrSvg, setQrSvg] = useState<string>("");
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await callMfa("enroll-start");
        if (cancelled) return;
        setSecret(data.secret);
        setOtpauth(data.otpauth);
        setCodes(data.recoveryCodes ?? []);
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Could not start enrollment.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!otpauth) return;
    QRCode.toString(otpauth, { type: "svg", margin: 1, width: 220 }).then(
      setQrSvg,
    );
  }, [otpauth]);

  const handleEnable = async () => {
    setError(null);
    if (!acknowledged) {
      setError("Please confirm you've stored your recovery codes.");
      return;
    }
    setBusy(true);
    try {
      await callMfa("enroll-confirm", { token });
      onEnrolled();
    } catch (e: any) {
      setError(e?.message ?? "Could not enable 2FA. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-xl rounded-3xl border border-border bg-card p-8 shadow-soft">
        <Logo />
        <h1 className="mt-6 font-display text-3xl font-semibold">
          Set up two-factor authentication
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Admin access requires 2FA. Scan the QR code below with{" "}
          <strong>Google Authenticator</strong>, 1Password, or Authy.
        </p>

        {loading ? (
          <p className="mt-6 text-sm text-muted-foreground">Loading…</p>
        ) : (
          <>
            <div className="mt-6 flex flex-col items-center gap-4 rounded-2xl bg-peach/30 p-6">
              <div
                className="rounded-lg bg-white p-4"
                dangerouslySetInnerHTML={{ __html: qrSvg }}
              />
              <div className="text-center">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  Or enter this key manually
                </p>
                <p className="mt-1 font-mono text-sm tracking-widest">{secret}</p>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-destructive/30 bg-destructive/5 p-4">
              <p className="text-sm font-semibold text-destructive">
                Save these recovery codes somewhere safe
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Each code works once if you lose your authenticator. They will
                not be shown again.
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2 font-mono text-xs">
                {codes.map((c: string) => (
                  <div key={c} className="rounded bg-background px-2 py-1.5">
                    {c}
                  </div>
                ))}
              </div>
            </div>

            <label className="mt-6 flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={acknowledged}
                onChange={(e) => setAcknowledged(e.target.checked)}
                className="mt-1"
              />
              <span>I've saved my recovery codes in a password manager.</span>
            </label>

            <div className="mt-4">
              <label className="text-sm font-medium">
                Enter the 6-digit code from your authenticator
              </label>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={token}
                onChange={(e) => setToken(e.target.value.replace(/\D/g, ""))}
                className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-center font-mono text-xl tracking-widest"
                placeholder="000000"
              />
            </div>
          </>
        )}

        {error && <p className="mt-3 text-sm text-destructive">{error}</p>}

        <Button
          className="mt-6 w-full"
          size="lg"
          disabled={busy || loading || token.length !== 6}
          onClick={handleEnable}
        >
          {busy ? "Enabling…" : "Enable 2FA"}
        </Button>
      </div>
    </div>
  );
}
