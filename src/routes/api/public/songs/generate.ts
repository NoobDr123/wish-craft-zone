// Public API route for triggering a custom song generation from external systems
// (e.g. Manus). Auth: Authorization: Bearer ${MANUS_API_KEY}
//
// POST /api/public/songs/generate
//   body: see SongRequestSchema below
// returns: { ok, orderId, status }

import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
} as const;

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });

const SongRequestSchema = z.object({
  buyerEmail: z.string().email().max(255),
  buyerName: z.string().max(120).optional(),
  dogName: z.string().min(1).max(80),
  dogGender: z.enum(["she", "he", "they"]).default("she"),
  dogBreed: z.string().max(120).optional(),
  personality: z.string().min(1).max(4000),
  memory: z.string().min(1).max(4000),
  message: z.string().min(1).max(4000),
  genre: z
    .enum(["acoustic", "country", "folk", "lullaby", "cinematic", "instrumental"])
    .default("acoustic"),
  voice: z.enum(["female", "male"]).default("female"),
  hasExtraVerse: z.boolean().default(false),
  isRush: z.boolean().default(false),
  hasUnlimitedEdits: z.boolean().default(false),
  photoUrl: z.string().url().max(1000).optional(),
  songTitleIdea: z.string().max(120).optional(),
  externalRef: z.string().max(120).optional(), // Manus's own id, stored in quiz_payload
});

export const Route = createFileRoute("/api/public/songs/generate")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),

      POST: async ({ request }) => {
        // ---- Auth ----
        const expected = process.env.MANUS_API_KEY;
        if (!expected) {
          return json(500, { error: "MANUS_API_KEY not configured on server" });
        }
        const auth = request.headers.get("authorization") ?? "";
        const token = auth.replace(/^Bearer\s+/i, "").trim();
        if (!token || token !== expected) {
          return json(401, { error: "unauthorized" });
        }

        // ---- Validate body ----
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return json(400, { error: "invalid_json" });
        }

        const parsed = SongRequestSchema.safeParse(body);
        if (!parsed.success) {
          return json(400, {
            error: "invalid_payload",
            issues: parsed.error.issues,
          });
        }
        const p = parsed.data;

        // ---- Build the quiz_payload (mirror of inputs for traceability) ----
        const quizPayload = {
          source: "manus_api",
          external_ref: p.externalRef ?? null,
          dog_name: p.dogName,
          dog_gender: p.dogGender,
          dog_breed: p.dogBreed ?? null,
          dog_photo_url: p.photoUrl ?? null,
          dog_personality: p.personality,
          dog_memory: p.memory,
          letter_to_dog: p.message,
          genre: p.genre,
          voice: p.voice,
          song_title_idea: p.songTitleIdea ?? null,
        };

        // ---- Insert order (server-side, bypasses RLS via admin client) ----
        // CRITICAL: write personality/memory/letter to TOP-LEVEL columns — the
        // brief generator reads those first and falls back to quiz_payload only
        // for legacy/web-quiz orders.
        const { data: order, error: insErr } = await supabaseAdmin
          .from("orders")
          .insert({
            buyer_email: p.buyerEmail,
            buyer_name: p.buyerName ?? null,
            dog_name: p.dogName,
            dog_gender: p.dogGender,
            dog_breed: p.dogBreed ?? null,
            dog_photo_url: p.photoUrl ?? null,
            dog_personality: p.personality,
            dog_memory: p.memory,
            letter_to_dog: p.message,
            genre: p.genre,
            voice: p.voice,
            song_title_idea: p.songTitleIdea ?? null,
            has_3rd_verse: p.hasExtraVerse,
            is_rush: p.isRush,
            has_unlimited_edits: p.hasUnlimitedEdits,
            // Mark as paid so the pipeline runs end-to-end. External integrations
            // are responsible for their own billing.
            status: "upsells_complete",
            payment_status: "paid",
            amount_cents: 0,
            amount_paid_cents: 0,
            quiz_payload: quizPayload,
            product_config: {
              extra_verse: p.hasExtraVerse,
              rush_delivery: p.isRush,
              unlimited_edits: p.hasUnlimitedEdits,
            },
            delivery_tier: p.isRush ? "rush" : "standard",
            priority: p.isRush ? "rush" : "standard",
          })
          .select("id, status")
          .single();

        if (insErr || !order) {
          return json(500, {
            error: "order_insert_failed",
            message: insErr?.message ?? "unknown",
          });
        }

        // ---- Kick off generation pipeline ----
        // The DB trigger `enqueue_brief_on_upsells_complete` already enqueues the
        // brief job, but we also call generate-brief directly so the API caller
        // gets immediate feedback if anything is misconfigured.
        const internalSecret = process.env.INTERNAL_TRIGGER_SECRET;
        const supaUrl = process.env.SUPABASE_URL;
        if (internalSecret && supaUrl) {
          // Fire-and-forget: don't block the response on generation completion.
          fetch(`${supaUrl}/functions/v1/generate-brief`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-internal-secret": internalSecret,
            },
            body: JSON.stringify({ orderId: order.id }),
          }).catch((e) => {
            console.error("[manus-api] failed to invoke generate-brief", e);
          });
        }

        return json(200, {
          ok: true,
          orderId: order.id,
          status: order.status,
          statusUrl: `/api/public/songs/status?orderId=${order.id}`,
        });
      },
    },
  },
});
