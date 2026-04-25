// Validate a reaction reward code for the logged-in user. Does NOT decrement —
// decrement happens atomically when the order is created via create-checkout.

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
    if (!token) return json({ ok: false, error: "Login required" }, 401);

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: `Bearer ${token}` } } },
    );
    const { data: userResp } = await userClient.auth.getUser();
    const user = userResp?.user;
    if (!user) return json({ ok: false, error: "Login required" }, 401);

    const { code } = await req.json();
    if (!code || typeof code !== "string") {
      return json({ ok: false, error: "Missing code" }, 400);
    }

    const { data: reward } = await supabase
      .from("reaction_reward_codes")
      .select("*")
      .ilike("code", code.trim())
      .maybeSingle();

    if (!reward) return json({ ok: false, error: "Code not found" }, 404);
    if (reward.status !== "unlocked") {
      return json({ ok: false, error: "Code not active" }, 400);
    }
    if ((reward.free_songs_remaining ?? 0) <= 0) {
      return json({ ok: false, error: "Code fully used" }, 400);
    }

    // Ownership check
    const userEmail = (user.email ?? "").toLowerCase();
    const ownsByUser = reward.user_id && reward.user_id === user.id;
    const ownsByEmail = reward.buyer_email && reward.buyer_email.toLowerCase() === userEmail;
    if (!ownsByUser && !ownsByEmail) {
      return json({ ok: false, error: "Code does not belong to you" }, 403);
    }

    return json({
      ok: true,
      code: reward.code,
      free_songs_remaining: reward.free_songs_remaining,
      original_order_id: reward.order_id,
    });
  } catch (e: any) {
    console.error("redeem-reward-code error:", e);
    return json({ ok: false, error: e.message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
