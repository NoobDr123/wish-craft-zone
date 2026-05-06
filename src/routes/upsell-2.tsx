import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { UpsellShell } from "@/components/UpsellShell";
import { Delivery48Downsell } from "@/components/Delivery48Downsell";
import { useQuizStore } from "@/stores/quizStore";
import { supabase } from "@/integrations/supabase/client";
import { stripeEnvironment } from "@/lib/stripe";
import { track } from "@/lib/tracking";

export const Route = createFileRoute("/upsell-2")({
  component: Upsell2,
});

function Upsell2() {
  const navigate = useNavigate();
  const q = useQuizStore();
  const [processing, setProcessing] = useState(false);
  const [showDownsell, setShowDownsell] = useState(false);
  const [downsellProcessing, setDownsellProcessing] = useState(false);

  useEffect(() => {
    void track({
      type: "upsell_view",
      upsellType: "rush_delivery",
      orderId: q.orderId,
      buyerEmail: q.buyer_email || undefined,
    });
  }, [q.orderId, q.buyer_email]);

  const accept = async () => {
    void track({
      type: "upsell_accept",
      upsellType: "rush_delivery",
      orderId: q.orderId,
      buyerEmail: q.buyer_email || undefined,
      amountCents: 2999,
    });
    if (!q.orderId) {
      navigate({ to: "/upsell-3" });
      return;
    }
    setProcessing(true);
    const { data } = await supabase.functions.invoke("charge-upsell", {
      body: {
        orderId: q.orderId,
        upsellType: "rush_delivery",
        environment: stripeEnvironment,
        sessionId: q.checkoutSessionId,
      },
    });
    if (data?.success) q.set("is_rush", true);
    navigate({ to: "/upsell-3" });
  };

  // Decline 24h rush → open the slim 48-hour downsell.
  const decline = () => {
    void track({
      type: "upsell_decline",
      upsellType: "rush_delivery",
      orderId: q.orderId,
      buyerEmail: q.buyer_email || undefined,
    });
    void track({
      type: "upsell_view",
      upsellType: "delivery_48h",
      orderId: q.orderId,
      buyerEmail: q.buyer_email || undefined,
    });
    setShowDownsell(true);
  };

  const accept48 = async () => {
    void track({
      type: "upsell_accept",
      upsellType: "delivery_48h",
      orderId: q.orderId,
      buyerEmail: q.buyer_email || undefined,
      amountCents: 1499,
    });
    if (!q.orderId) {
      setShowDownsell(false);
      navigate({ to: "/upsell-3" });
      return;
    }
    setDownsellProcessing(true);
    const { data } = await supabase.functions.invoke("charge-upsell", {
      body: {
        orderId: q.orderId,
        upsellType: "delivery_48h",
        environment: stripeEnvironment,
        sessionId: q.checkoutSessionId,
      },
    });
    if (data?.success) q.set("is_rush", true);
    setDownsellProcessing(false);
    setShowDownsell(false);
    navigate({ to: "/upsell-3" });
  };

  const decline48 = () => {
    void track({
      type: "upsell_decline",
      upsellType: "delivery_48h",
      orderId: q.orderId,
      buyerEmail: q.buyer_email || undefined,
    });
    setShowDownsell(false);
    navigate({ to: "/upsell-3" });
  };

  return (
    <>
      <UpsellShell
        step={2}
        badge="Get their song faster"
        headline="Hear your dog's song in 24 hours"
        description={
          <>
            Standard takes up to 5 days. Skip the line and get the finished song
            in your inbox in the next{" "}
            <span className="font-semibold text-foreground">24 hours</span> —
            ideal if there's a birthday, a vet visit, or you just can't wait
            another night.
          </>
        }
        highlights={[
          "Front of the queue — we start producing within the hour",
          "Hand-checked by a real human before it lands",
          "Emailed the moment it's ready, day or night",
        ]}
        priceLabel="$29.99"
        declineLabel="No thanks, I can wait 5 days"
        onAccept={accept}
        onDecline={decline}
        processing={processing}
      />

      <Delivery48Downsell
        open={showDownsell}
        processing={downsellProcessing}
        onAccept={accept48}
        onDecline={decline48}
      />
    </>
  );
}
