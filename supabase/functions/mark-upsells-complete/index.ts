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
    const { orderId } = await req.json();
    if (!orderId) return json({ error: "Missing orderId" }, 400);

    const { data: order } = await supabase
      .from("orders")
      .select("status, payment_status")
      .eq("id", orderId)
      .single();

    if (!order) return json({ error: "Order not found" }, 404);
    if (order.payment_status !== "paid") {
      return json({ error: "Order not paid" }, 400);
    }
    // Already past this stage? No-op.
    if (order.status !== "awaiting_upsells" && order.status !== "paid") {
      return json({ ok: true, alreadyAdvanced: true });
    }

    // Flipping to upsells_complete fires the trigger that enqueues brief generation.
    const { error } = await supabase
      .from("orders")
      .update({ status: "upsells_complete" })
      .eq("id", orderId);

    if (error) return json({ error: error.message }, 500);

    return json({ ok: true });
  } catch (e: any) {
    console.error("mark-upsells-complete error:", e);
    return json({ error: e.message || "Internal error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
