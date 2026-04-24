// Admin-only: add the caller's current IP to the allowlist.
//
// Two valid scenarios:
//   1. Bootstrap: table is empty AND caller is an authenticated admin
//      (verified via Supabase JWT in the Authorization header).
//   2. Normal: caller is an authenticated admin AND their IP is already
//      on the allowlist (i.e. they're managing the list from inside).
//
// Always uses the IP detected from request headers — never trusts a value
// supplied by the client.

import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

function getClientIp(request: Request): string | null {
  const cf = request.headers.get("cf-connecting-ip");
  if (cf) return cf.trim();
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]?.trim() ?? null;
  const real = request.headers.get("x-real-ip");
  if (real) return real.trim();
  return null;
}

export const Route = createFileRoute("/api/admin/ip-add")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const ip = getClientIp(request);
        if (!ip) {
          return Response.json(
            { ok: false, error: "no_ip_detected" },
            { status: 400 },
          );
        }

        const authHeader = request.headers.get("authorization") ?? "";
        const token = authHeader.replace(/^Bearer\s+/i, "");
        if (!token) {
          return Response.json(
            { ok: false, error: "no_auth_token" },
            { status: 401 },
          );
        }

        // Verify the bearer token and resolve the user.
        const userClient = createClient(
          process.env.SUPABASE_URL!,
          process.env.SUPABASE_PUBLISHABLE_KEY!,
          { global: { headers: { Authorization: `Bearer ${token}` } } },
        );
        const {
          data: { user },
          error: userErr,
        } = await userClient.auth.getUser();
        if (userErr || !user) {
          return Response.json(
            { ok: false, error: "invalid_token" },
            { status: 401 },
          );
        }

        // Confirm admin role via service-role client (bypasses RLS).
        const { data: roleRow } = await supabaseAdmin
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "admin")
          .maybeSingle();
        if (!roleRow) {
          return Response.json(
            { ok: false, error: "not_admin" },
            { status: 403 },
          );
        }

        let body: { label?: string; notes?: string } = {};
        try {
          body = (await request.json()) as typeof body;
        } catch {
          // empty body is fine
        }
        const label = (body.label || "My IP").toString().slice(0, 80);
        const notes = body.notes ? body.notes.toString().slice(0, 500) : null;

        const { data, error } = await supabaseAdmin
          .from("admin_ip_allowlist")
          .upsert(
            {
              ip_address: ip,
              label,
              notes,
              added_by: user.id,
            },
            { onConflict: "ip_address" },
          )
          .select("id, ip_address, label")
          .single();

        if (error) {
          console.error("[ip-add] insert failed", error);
          return Response.json(
            { ok: false, error: "insert_failed" },
            { status: 500 },
          );
        }

        return Response.json({ ok: true, entry: data });
      },
    },
  },
});
