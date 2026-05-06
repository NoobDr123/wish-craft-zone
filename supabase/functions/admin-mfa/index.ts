// Server-side admin 2FA: enrollment + verification.
// Uses the service role to read TOTP secrets and write mfa_verifications,
// so client code never sees the secret and cannot bypass verification.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { TOTP, Secret } from "npm:otpauth@9";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const TOTP_ISSUER = "PawPrint Song Admin";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function verifyTotp(secret: string, token: string): boolean {
  if (!/^\d{6}$/.test(token.trim())) return false;
  const totp = new TOTP({
    issuer: TOTP_ISSUER,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: Secret.fromBase32(secret),
  });
  return totp.validate({ token: token.trim(), window: 1 }) !== null;
}

function generateRecoveryCodes(count = 10): string[] {
  const out: string[] = [];
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const max = chars.length;
  const limit = Math.floor(0xffffffff / max) * max;
  const buf = new Uint32Array(1);
  const pick = () => {
    while (true) {
      crypto.getRandomValues(buf);
      if (buf[0] < limit) return chars[buf[0] % max];
    }
  };
  for (let i = 0; i < count; i++) {
    let code = "";
    for (let j = 0; j < 10; j++) {
      code += pick();
      if (j === 4) code += "-";
    }
    out.push(code);
  }
  return out;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    // Validate the user via anon client + JWT
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return json({ error: "Unauthorized" }, 401);
    }
    const user = userData.user;

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Confirm the user is an allow-listed admin email
    const ADMIN_EMAILS = ["sylwester@flowscommerce.com"];
    const userEmail = (user.email ?? "").toLowerCase();
    if (!ADMIN_EMAILS.includes(userEmail)) {
      return json({ error: "Forbidden" }, 403);
    }

    const body = await req.json().catch(() => ({}));
    const action = body?.action as string | undefined;

    // ----- ENROLL: server creates secret, returns it once for QR display -----
    if (action === "enroll-start") {
      // If already enrolled, do not regenerate (would invalidate old TOTP)
      const { data: existing } = await admin
        .from("user_mfa")
        .select("enrolled")
        .eq("user_id", user.id)
        .maybeSingle();
      if (existing?.enrolled) {
        return json({ error: "Already enrolled" }, 400);
      }
      const secret = new Secret({ size: 20 }).base32;
      const recovery = generateRecoveryCodes();
      // Store provisional (enrolled=false) so we can verify before activating.
      const { error } = await admin.from("user_mfa").upsert({
        user_id: user.id,
        totp_secret: secret,
        recovery_codes: recovery,
        enrolled: false,
      });
      if (error) return json({ error: error.message }, 500);

      const otpauth = new TOTP({
        issuer: TOTP_ISSUER,
        label: user.email ?? user.id,
        algorithm: "SHA1",
        digits: 6,
        period: 30,
        secret: Secret.fromBase32(secret),
      }).toString();

      return json({ secret, otpauth, recoveryCodes: recovery });
    }

    // ----- ENROLL: confirm with first TOTP code, then activate -----
    if (action === "enroll-confirm") {
      const token = String(body?.token ?? "");
      const { data: mfa } = await admin
        .from("user_mfa")
        .select("totp_secret, enrolled")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!mfa) return json({ error: "Start enrollment first" }, 400);
      if (mfa.enrolled) return json({ error: "Already enrolled" }, 400);
      if (!verifyTotp(mfa.totp_secret, token)) {
        return json({ error: "Invalid code" }, 400);
      }
      const { error: upErr } = await admin
        .from("user_mfa")
        .update({ enrolled: true })
        .eq("user_id", user.id);
      if (upErr) return json({ error: upErr.message }, 500);

      const { error: vErr } = await admin.from("mfa_verifications").insert({
        user_id: user.id,
        user_agent: req.headers.get("user-agent"),
      });
      if (vErr) return json({ error: vErr.message }, 500);
      return json({ ok: true });
    }

    // ----- VERIFY: TOTP code -----
    if (action === "verify-totp") {
      const token = String(body?.token ?? "");
      const { data: mfa } = await admin
        .from("user_mfa")
        .select("totp_secret, enrolled")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!mfa?.enrolled) return json({ error: "2FA is not set up" }, 400);
      if (!verifyTotp(mfa.totp_secret, token)) {
        return json({ error: "Invalid code" }, 400);
      }
      const { error: vErr } = await admin.from("mfa_verifications").insert({
        user_id: user.id,
        user_agent: req.headers.get("user-agent"),
      });
      if (vErr) return json({ error: vErr.message }, 500);
      return json({ ok: true });
    }

    // ----- VERIFY: recovery code -----
    if (action === "verify-recovery") {
      const code = String(body?.code ?? "").trim().toUpperCase();
      if (!code) return json({ error: "Missing recovery code" }, 400);
      const { data: mfa } = await admin
        .from("user_mfa")
        .select("recovery_codes, enrolled")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!mfa?.enrolled) return json({ error: "2FA is not set up" }, 400);
      const codes = (mfa.recovery_codes as string[] | null) ?? [];
      if (!codes.includes(code)) {
        return json({ error: "Invalid recovery code" }, 400);
      }
      const remaining = codes.filter((c) => c !== code);
      const { error: rErr } = await admin
        .from("user_mfa")
        .update({ recovery_codes: remaining })
        .eq("user_id", user.id);
      if (rErr) return json({ error: rErr.message }, 500);

      const { error: vErr } = await admin.from("mfa_verifications").insert({
        user_id: user.id,
        user_agent: req.headers.get("user-agent"),
      });
      if (vErr) return json({ error: vErr.message }, 500);
      return json({ ok: true });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e: any) {
    console.error("admin-mfa error", e);
    return json({ error: e?.message ?? "Internal error" }, 500);
  }
});
