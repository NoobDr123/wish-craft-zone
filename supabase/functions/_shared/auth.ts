// Shared auth helpers for edge functions.
//
// The two main patterns:
//
//  - requireInternalSecret(req): used for "internal" pipeline functions that
//    are only ever called by other edge functions or pg_cron. The caller MUST
//    send `x-internal-secret: <INTERNAL_TRIGGER_SECRET>` OR a service-role
//    JWT (signature-verified) in `Authorization: Bearer ...`.
//
//  - requireUser(req): for functions called from the browser. Verifies the
//    JWT signature via Supabase Auth (getUser) and returns the user record.
//    Returns null on failure (caller decides 401 response).
//
// **CRITICAL:** Never trust an unverified JWT payload. Past code base64-decoded
// the JWT and read `payload.role === 'service_role'` without verifying the
// signature, which is trivially forgeable (an attacker can submit
// `eyJhbGciOiJub25lIn0...` and gain full access).

import { createClient } from "npm:@supabase/supabase-js@2";

/**
 * Returns true if the request is authorized as an internal call.
 * Two valid paths:
 *   1. `x-internal-secret` header matches INTERNAL_TRIGGER_SECRET.
 *   2. `Authorization: Bearer <jwt>` where the JWT is a valid service-role
 *      token (signature verified via Supabase Auth's getUser).
 */
export async function isInternalRequest(req: Request): Promise<boolean> {
  const internalSecret = Deno.env.get("INTERNAL_TRIGGER_SECRET");
  const provided = req.headers.get("x-internal-secret");
  if (internalSecret && provided && provided === internalSecret) {
    return true;
  }

  const auth = req.headers.get("Authorization") ?? "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  if (!token) return false;

  // Direct service-role-key match (the cron/edge-to-edge fetches send the
  // raw service role key as the bearer token, not a user JWT).
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (serviceRoleKey && token === serviceRoleKey) return true;

  // Otherwise: verify via Supabase Auth — getUser validates the signature
  // against the project JWKS. If the token is a forged unsigned JWT,
  // getUser returns no user.
  try {
    const client = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
    );
    const { data, error } = await client.auth.getUser(token);
    if (error || !data?.user) return false;
    // A real signed user JWT is NOT enough — only service-role.
    // (User-facing endpoints should use requireUser() instead.)
    const role = (data.user.app_metadata as any)?.role
      ?? (data.user.user_metadata as any)?.role;
    return role === "service_role";
  } catch {
    return false;
  }
}

/**
 * Verifies the request's Authorization Bearer token belongs to a real
 * authenticated user. Returns the user object on success, null on failure.
 *
 * Use this for functions called from the browser by logged-in users.
 */
export async function requireUser(req: Request): Promise<{ id: string; email: string | null } | null> {
  const auth = req.headers.get("Authorization") ?? "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;

  try {
    const client = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: `Bearer ${token}` } } },
    );
    const { data, error } = await client.auth.getUser();
    if (error || !data?.user) return null;
    return { id: data.user.id, email: data.user.email ?? null };
  } catch {
    return null;
  }
}

/**
 * Returns true if the request is from an authenticated user with the `admin`
 * role in `public.user_roles`. Lets the admin panel call internal pipeline
 * functions (generate-brief, submit-to-kie, deliver-song, ...) directly from
 * the browser using the admin's session JWT.
 */
export async function isAdminRequest(req: Request): Promise<boolean> {
  const user = await requireUser(req);
  if (!user) return false;
  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data, error } = await admin.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });
    if (error) return false;
    return data === true;
  } catch {
    return false;
  }
}

/**
 * Convenience: if the request is NOT internal (and NOT an authenticated admin),
 * returns a 401 Response. Returns null if authorized (caller proceeds normally).
 */
export async function guardInternal(req: Request, corsHeaders: Record<string, string>): Promise<Response | null> {
  if (await isInternalRequest(req)) return null;
  if (await isAdminRequest(req)) return null;
  return new Response(JSON.stringify({ error: "Unauthorized" }), {
    status: 401,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
