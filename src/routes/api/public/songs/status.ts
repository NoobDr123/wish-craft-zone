// Public API: GET /api/public/songs/status?orderId=...
// Auth: Authorization: Bearer ${MANUS_API_KEY}

import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
} as const;

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });

// Roughly map internal pipeline status to a 0-100 progress value
const PROGRESS: Record<string, number> = {
  received: 5,
  pending_payment: 5,
  upsells_complete: 15,
  brief_generating: 30,
  brief_ready: 45,
  music_generating: 65,
  music_ready: 85,
  ready_to_deliver: 95,
  delivered: 100,
  failed: 0,
};

export const Route = createFileRoute("/api/public/songs/status")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),

      GET: async ({ request }) => {
        const expected = process.env.MANUS_API_KEY;
        if (!expected) return json(500, { error: "MANUS_API_KEY not configured" });
        const auth = request.headers.get("authorization") ?? "";
        const token = auth.replace(/^Bearer\s+/i, "").trim();
        if (!token || token !== expected) return json(401, { error: "unauthorized" });

        const url = new URL(request.url);
        const orderId = url.searchParams.get("orderId");
        if (!orderId) return json(400, { error: "missing_orderId" });

        const { data: order, error } = await supabaseAdmin
          .from("orders")
          .select(
            "id, status, dog_name, brief, audio_variants, selected_variant_id, share_page_slug, delivered_at, scheduled_delivery_at, kie_task_id, flagged_for_review, flag_reason"
          )
          .eq("id", orderId)
          .maybeSingle();

        if (error) return json(500, { error: "db_error", message: error.message });
        if (!order) return json(404, { error: "order_not_found" });

        const variants = (order.audio_variants as any[] | null) ?? [];
        const selected =
          variants.find((v) => v?.id === order.selected_variant_id) ?? variants[0] ?? null;

        const shareSlug = order.share_page_slug;
        const songPageUrl = shareSlug
          ? `https://ribbonsong.com/listen/${shareSlug}`
          : null;

        return json(200, {
          orderId: order.id,
          status: order.status,
          progress: PROGRESS[order.status as string] ?? 0,
          dogName: order.dog_name,
          songUrl: selected?.audio_url ?? null,
          songPageUrl,
          coverImageUrl: selected?.image_url ?? null,
          lyrics: (order.brief as any)?.lyrics ?? null,
          title: (order.brief as any)?.title ?? null,
          shareSlug,
          deliveredAt: order.delivered_at,
          estimatedDelivery: order.scheduled_delivery_at,
          kieTaskId: order.kie_task_id,
          flagged: order.flagged_for_review,
          flagReason: order.flag_reason,
        });
      },
    },
  },
});
