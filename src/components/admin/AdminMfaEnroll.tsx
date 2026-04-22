// First-time TOTP enrollment for admins. Shows a QR code + secret + recovery codes.

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  buildOtpAuthUrl,
  generateRecoveryCodes,
  generateSecret,
  verifyTotpCode,
} from "@/lib/totp";

interface Props {
  email: string;
  userId: string;
  onEnrolled: () => void;
}

export function AdminMfaEnroll({ email, userId, onEnrolled }: Props) {
  const [secret] = useState(() => generateSecret());
  const [codes] = useState(() => generateRecoveryCodes());
  const [qrSvg, setQrSvg] = useState<string>("");
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);

  useEffect(() => {
    const url = buildOtpAuthUrl(secret, email);
    QRCode.toString(url, { type: "svg", margin: 1, width: 220 }).then(setQrSvg);
  }, [secret, email]);

  const handleEnable = async () => {
    setError(null);
    if (!verifyTotpCode(secret, token)) {
      setError("That code didn't work. Make sure your authenticator clock is in sync.");
      return;
    }
    if (!acknowledged) {
      setError("Please confirm you've stored your recovery codes.");
      return;
    }
    setBusy(true);
    try {
      const { error: upErr } = await supabase
        .from("user_mfa")
        .upsert({
          user_id: userId,
          totp_secret: secret,
          enrolled: true,
          recovery_codes: codes,
        });
      if (upErr) throw upErr;
      const { error: vErr } = await supabase
        .from("mfa_verifications")
        .insert({
          user_id: userId,
          user_agent:
            typeof navigator !== "undefined" ? navigator.userAgent : null,
        });
      if (vErr) throw vErr;
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
            Each code works once if you lose your authenticator. They will not
            be shown again.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2 font-mono text-xs">
            {codes.map((c) => (
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

        {error && (
          <p className="mt-3 text-sm text-destructive">{error}</p>
        )}

        <Button
          className="mt-6 w-full"
          size="lg"
          disabled={busy || token.length !== 6}
          onClick={handleEnable}
        >
          {busy ? "Enabling…" : "Enable 2FA"}
        </Button>
      </div>
    </div>
  );
}
