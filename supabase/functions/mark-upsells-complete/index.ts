import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/stripe.ts";
import { requireUser } from "../_shared/auth.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { orderId, sessionId } = await req.json();
    if (!orderId) return json({ error: "Missing orderId" }, 400);

    const { data: order } = await supabase
      .from("orders")
      .select("status, payment_status, user_id, buyer_email, stripe_checkout_session_id, stripe_payment_intent_id")
      .eq("id", orderId)
      .single();

    if (!order) return json({ error: "Order not found" }, 404);
    if (order.payment_status !== "paid") {
      return json({ error: "Order not paid" }, 400);
    }

    // ---- AuthZ: prove the caller owns this order. ----
    // Two valid paths so this works for ALL payment methods (card / Apple Pay /
    // Google Pay / Link), where the buyer is typically a guest right after
    // Stripe checkout and not logged in:
    //   (a) authed user matches the order, OR
    //   (b) the Stripe session/PI id from the checkout return URL matches the
    //       one we stored on the order. The id is unguessable and scoped to
    //       this single purchase, so it's a safe bearer token.
    const user = await requireUser(req);
    const ownsByUser =
      !!user &&
      ((order.user_id && order.user_id === user.id) ||
        (order.buyer_email && user.email &&
          order.buyer_email.toLowerCase() === user.email.toLowerCase()));

    const ownsBySession =
      typeof sessionId === "string" &&
      sessionId.length > 0 &&
      (order.stripe_checkout_session_id === sessionId ||
        order.stripe_payment_intent_id === sessionId);

    if (!ownsByUser && !ownsBySession) {
      return json({ error: "Forbidden" }, 403);
    }

    // Already past this stage? No-op (idempotent).
    if (order.status !== "awaiting_upsells" && order.status !== "paid") {
      // Still try to send confirmation email if it hasn't gone out yet.
      void sendOrderConfirmationIfNeeded(orderId);
      return json({ ok: true, alreadyAdvanced: true });
    }

    // Flipping to upsells_complete fires the trigger that enqueues brief generation.
    const { error } = await supabase
      .from("orders")
      .update({ status: "upsells_complete" })
      .eq("id", orderId);

    if (error) return json({ error: error.message }, 500);

    // Now that all upsell decisions are settled, send the confirmation email
    // with the FINAL order details (add-ons, delivery speed, total paid).
    void sendOrderConfirmationIfNeeded(orderId);

    return json({ ok: true });
  } catch (e: any) {
    console.error("mark-upsells-complete error:", e);
    return json({ error: e.message || "Internal error" }, 500);
  }
});

async function sendOrderConfirmationIfNeeded(orderId: string) {
  try {
    // Atomic claim — only one of the racing callers wins.
    const { data: claimed } = await supabase
      .from("orders")
      .update({ confirmation_email_sent_at: new Date().toISOString() })
      .eq("id", orderId)
      .is("confirmation_email_sent_at", null)
      .select("id, buyer_email")
      .maybeSingle();
    if (!claimed || !claimed.buyer_email) return;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const res = await fetch(`${supabaseUrl}/functions/v1/send-app-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({
        template: "order_confirmation",
        to: claimed.buyer_email,
        data: { orderId },
      }),
    });
    if (!res.ok) {
      await supabase
        .from("orders")
        .update({ confirmation_email_sent_at: null })
        .eq("id", orderId);
    }
  } catch (e) {
    console.error("sendOrderConfirmationIfNeeded failed:", e);
  }
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
