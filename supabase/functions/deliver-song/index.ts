// Delivery: marks order as delivered, sends transactional email to recipient
// (or buyer if not a gift) with link to /listen/:slug. Idempotent.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const SITE_URL = "https://ribbonsong.com";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { orderId } = await req.json();
    if (!orderId) return json({ error: "Missing orderId" }, 400);

    const { data: order } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (!order) return json({ error: "Order not found" }, 404);
    if (order.delivered_at) return json({ ok: true, skipped: "already_delivered" });
    if (order.status !== "ready_to_deliver") {
      return json({ error: `Order not ready (status=${order.status})` }, 400);
    }

    // Honor scheduled_delivery_at — if still in future, requeue silently
    if (order.scheduled_delivery_at && new Date(order.scheduled_delivery_at) > new Date()) {
      return json({ ok: true, skipped: "not_yet_due" });
    }

    const slug = order.share_page_slug ?? order.id;
    const listenUrl = `${SITE_URL}/listen/${slug}`;

    // Determine recipient. For gifts, send to recipient_email if provided,
    // otherwise notify buyer. Always notify buyer too on first delivery.
    const targets: { email: string; role: "buyer" | "recipient" }[] = [];
    if (order.is_gift && order.recipient_email) {
      targets.push({ email: order.recipient_email, role: "recipient" });
    }
    targets.push({ email: order.buyer_email, role: "buyer" });

    for (const t of targets) {
      try {
        await fetch(`${Deno.env.get("SUPABASE_URL")!}/functions/v1/send-app-email`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!}`,
          },
          body: JSON.stringify({
            template: "song-delivered",
            to: t.email,
            data: {
              recipient_name: order.recipient_name,
              buyer_name: order.buyer_name ?? "Someone who loves you",
              listen_url: listenUrl,
              personal_note: order.personal_note ?? null,
              role: t.role,
            },
          }),
        });
      } catch (e) {
        console.error(`Failed sending to ${t.email}`, e);
      }
    }

    await supabase
      .from("orders")
      .update({
        status: "delivered",
        delivered_at: new Date().toISOString(),
      })
      .eq("id", orderId);

    await supabase.from("job_events").insert({
      order_id: orderId,
      event_type: "delivered",
      payload: { listen_url: listenUrl, sent_to: targets.map((t) => t.email) },
    });

    return json({ ok: true, listenUrl });
  } catch (e: any) {
    console.error("deliver-song error", e);
    return json({ error: e.message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
