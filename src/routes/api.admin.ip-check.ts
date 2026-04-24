// IP allowlist check for the admin panel.
// Returns whether the caller's IP is on the admin_ip_allowlist table.
// Also returns the detected IP so the bootstrap UI can show "Add this IP".
//
// The table being EMPTY means bootstrap mode — the UI then lets the
// authenticated admin self-add their first IP. As soon as one row exists,
// hard-block kicks in and only listed IPs see the admin pages.

import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

function getClientIp(request: Request): string | null {
  // Cloudflare Workers populates CF-Connecting-IP for us. Fall back to
  // standard proxy headers if running elsewhere.
  const cf = request.headers.get("cf-connecting-ip");
  if (cf) return cf.trim();
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]?.trim() ?? null;
  const real = request.headers.get("x-real-ip");
  if (real) return real.trim();
  return null;
}

export const Route = createFileRoute("/api/admin/ip-check")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const ip = getClientIp(request);

        const { count, error: countErr } = await supabaseAdmin
          .from("admin_ip_allowlist")
          .select("*", { count: "exact", head: true });

        if (countErr) {
          console.error("[ip-check] count failed", countErr);
          return Response.json(
            { allowed: false, ip, bootstrap: false, error: "lookup_failed" },
            { status: 500 },
          );
        }

        // Empty table = bootstrap mode. The admin panel shows a setup screen
        // so the first admin can add their IP. We do NOT auto-allow during
        // bootstrap — the page itself stays gated so casual visitors still
        // see "Not found".
        if ((count ?? 0) === 0) {
          return Response.json({ allowed: false, ip, bootstrap: true });
        }

        if (!ip) {
          return Response.json({ allowed: false, ip: null, bootstrap: false });
        }

        const { data: match } = await supabaseAdmin
          .from("admin_ip_allowlist")
          .select("id")
          .eq("ip_address", ip)
          .maybeSingle();

        return Response.json({
          allowed: Boolean(match),
          ip,
          bootstrap: false,
        });
      },
    },
  },
});
