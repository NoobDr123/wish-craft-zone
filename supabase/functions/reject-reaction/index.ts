// Admin-only: reject a reaction video with a reason; sends rejection email.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/stripe.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
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

    const { reactionVideoId, reason } = await req.json();
    if (!reactionVideoId || !reason) {
      return json({ error: "Missing reactionVideoId or reason" }, 400);
    }

    const { data: reaction } = await supabase
      .from("reaction_videos")
      .select("*")
      .eq("id", reactionVideoId)
      .single();
    if (!reaction) return json({ error: "Reaction not found" }, 404);

    await supabase
      .from("reaction_videos")
      .update({ status: "rejected" })
      .eq("id", reactionVideoId);

    // Also reject any pending reward row tied to the order
    await supabase
      .from("reaction_reward_codes")
      .update({
        status: "rejected",
        rejected_at: new Date().toISOString(),
        rejection_reason: reason,
      })
      .eq("order_id", reaction.order_id)
      .eq("status", "locked");

    const { data: order } = await supabase
      .from("orders")
      .select("buyer_email, buyer_name, dog_name")
      .eq("id", reaction.order_id)
      .single();

    await supabase.from("job_events").insert({
      order_id: reaction.order_id,
      event_type: "reaction_rejected",
      payload: { reactionVideoId, reason },
    });

    if (order?.buyer_email) {
      fireEmail(order.buyer_email, "reaction-rejected", {
        buyer_name: order.buyer_name,
        recipient_name: order.dog_name,
        reason,
        portal_url: `https://ribbonsong.com/portal/${reaction.order_id}`,
      }).catch((e) => console.error("email send failed:", e));
    }

    return json({ ok: true });
  } catch (e: any) {
    console.error("reject-reaction error:", e);
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
