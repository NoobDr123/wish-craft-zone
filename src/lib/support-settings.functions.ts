// Admin-only helpers for the support inbox:
// - getSupportAutoReplyEnabled / setSupportAutoReplyEnabled: read/write the
//   `support_auto_reply_enabled` row in internal_settings (admin reads via RLS,
//   writes need service role).

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function assertAdmin(supabase: any, userId: string) {
  const { data: isAdmin, error } = await supabase.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (error || !isAdmin) throw new Response("Forbidden", { status: 403 });
}

export const getSupportAutoReplyEnabled = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data } = await supabaseAdmin
      .from("internal_settings")
      .select("value")
      .eq("key", "support_auto_reply_enabled")
      .maybeSingle();
    return { enabled: data?.value === "true" };
  });

const SetInput = z.object({ enabled: z.boolean() });

export const setSupportAutoReplyEnabled = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => SetInput.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    await supabaseAdmin
      .from("internal_settings")
      .upsert(
        {
          key: "support_auto_reply_enabled",
          value: data.enabled ? "true" : "false",
        },
        { onConflict: "key" },
      );
    return { ok: true, enabled: data.enabled };
  });
