// TOTP helpers used by the admin 2FA enrollment + verification flow.
// Uses `otpauth` (RFC 6238) — works with Google Authenticator, 1Password, Authy, etc.

import { TOTP, Secret } from "otpauth";

export const TOTP_ISSUER = "RibbonSong Admin";

export function generateSecret(): string {
  return new Secret({ size: 20 }).base32;
}

export function buildOtpAuthUrl(secret: string, accountName: string): string {
  const totp = new TOTP({
    issuer: TOTP_ISSUER,
    label: accountName,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: Secret.fromBase32(secret),
  });
  return totp.toString();
}

export function verifyTotpCode(secret: string, token: string): boolean {
  if (!/^\d{6}$/.test(token.trim())) return false;
  const totp = new TOTP({
    issuer: TOTP_ISSUER,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: Secret.fromBase32(secret),
  });
  // window: ±1 step (~30s on each side) to allow for clock drift
  const delta = totp.validate({ token: token.trim(), window: 1 });
  return delta !== null;
}

// Recovery codes: 10 single-use codes shown once after enrollment.
export function generateRecoveryCodes(count = 10): string[] {
  const out: string[] = [];
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous chars
  for (let i = 0; i < count; i++) {
    let code = "";
    for (let j = 0; j < 10; j++) {
      code += chars[Math.floor(Math.random() * chars.length)];
      if (j === 4) code += "-";
    }
    out.push(code);
  }
  return out;
}
