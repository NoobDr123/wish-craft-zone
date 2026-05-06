// Admin-only: approve a reaction video.
// 1. Mark reaction approved.
// 2. Issue (or fetch existing) reaction_reward_codes row.
// 3. Refund the original PaymentIntent in full via Stripe gateway.
// 4. Insert a refund_requests row marked approved/refunded.
// 5. Send transactional reaction-approved email.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, createStripeClient, type StripeEnv } from "../_shared/stripe.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // ---- Auth: must be an admin user ----
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) return json({ error: "Missing auth" }, 401);

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: `Bearer ${token}` } } },
    );
    const { data: userResp } = await userClient.auth.getUser();
    const user = userResp?.user;
    if (!user) return json({ error: "Unauthenticated" }, 401);

    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });
    if (!isAdmin) return json({ error: "Forbidden" }, 403);

    const { reactionVideoId } = await req.json();
    if (!reactionVideoId) return json({ error: "Missing reactionVideoId" }, 400);

    // ---- Load reaction + order ----
    const { data: reaction, error: rxErr } = await supabase
      .from("reaction_videos")
      .select("*")
      .eq("id", reactionVideoId)
      .single();
    if (rxErr || !reaction) return json({ error: "Reaction not found" }, 404);

    const { data: order, error: oErr } = await supabase
      .from("orders")
      .select("*")
      .eq("id", reaction.order_id)
      .single();
    if (oErr || !order) return json({ error: "Order not found" }, 404);

    // ---- Mark approved (idempotent) ----
    if (reaction.status !== "approved") {
      await supabase
        .from("reaction_videos")
        .update({ status: "approved" })
        .eq("id", reactionVideoId);
    }

    // ---- Issue reward code (idempotent — function checks existing) ----
    const { data: rewardRow, error: rewardErr } = await supabase.rpc(
      "issue_reward_code_for_order",
      { _order_id: order.id },
    );
    if (rewardErr) {
      console.error("issue_reward_code_for_order failed:", rewardErr);
      return json({ error: "Reward issue failed" }, 500);
    }
    const reward = Array.isArray(rewardRow) ? rewardRow[0] : rewardRow;

    // Update reward to unlocked
    await supabase
      .from("reaction_reward_codes")
      .update({
        status: "unlocked",
        unlocked_at: new Date().toISOString(),
        approved_at: new Date().toISOString(),
        approved_by: user.id,
        reaction_video_id: reactionVideoId,
      })
      .eq("id", reward.id);

    // ---- Refund original PI (skip if already refunded) ----
    let refundResult: { id: string; amount: number } | null = null;
    if (
      order.stripe_payment_intent_id &&
      order.stripe_env &&
      order.amount_paid_cents > 0 &&
      !reward.refund_stripe_id
    ) {
      try {
        const stripe = createStripeClient(order.stripe_env as StripeEnv);
        const refund = await stripe.refunds.create({
          payment_intent: order.stripe_payment_intent_id,
          reason: "requested_by_customer",
          metadata: {
            orderId: order.id,
            reason: "reaction_video_approved",
          },
        });
        refundResult = { id: refund.id, amount: refund.amount };
      } catch (e: any) {
        console.error("Stripe refund failed:", e);
        // Don't fail the whole request — admin can retry refund manually
      }
    }

    if (refundResult) {
      await supabase
        .from("reaction_reward_codes")
        .update({
          refund_stripe_id: refundResult.id,
          refund_amount_cents: refundResult.amount,
          refund_synced_at: new Date().toISOString(),
        })
        .eq("id", reward.id);

      // Insert refund_requests row marking it approved/refunded
      await supabase.from("refund_requests").insert({
        order_id: order.id,
        user_id: order.user_id,
        buyer_email: order.buyer_email,
        request_type: "refund",
        reason: "Reaction video approved by admin",
        reaction_video_id: reactionVideoId,
        amount_cents: refundResult.amount,
        status: "approved",
        resolved_at: new Date().toISOString(),
        resolved_by: user.id,
      });
    }

    await supabase.from("job_events").insert({
      order_id: order.id,
      event_type: "reaction_approved",
      payload: {
        reactionVideoId,
        rewardCode: reward.code,
        refundId: refundResult?.id,
        refundAmount: refundResult?.amount,
      },
    });

    // ---- Send approval email ----
    fireEmail(order.buyer_email, "reaction-approved", {
      buyer_name: order.buyer_name,
      recipient_name: order.dog_name,
      reward_code: reward.code,
      free_songs: reward.free_songs_remaining ?? 2,
      refund_amount_cents: refundResult?.amount ?? 0,
      portal_url: `https://getpawprintsong.com/portal/${order.id}`,
      create_url: `https://getpawprintsong.com/create?reward=${reward.code}`,
    }).catch((e) => console.error("email send failed:", e));

    return json({
      ok: true,
      rewardCode: reward.code,
      refund: refundResult,
    });
  } catch (e: any) {
    console.error("approve-reaction error:", e);
    return json({ error: e.message }, 500);
  }
});

async function fireEmail(to: string, template: string, data: any) {
  await fetch(`${Deno.env.get("SUPABASE_URL")!}/functions/v1/send-app-email`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!}`,
    },
    body: JSON.stringify({ template, to, data }),
  });
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
