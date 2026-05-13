import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { UpsellShell } from "@/components/UpsellShell";
import { Rush24Downsell } from "@/components/Rush24Downsell";
import { useQuizStore } from "@/stores/quizStore";
import { supabase } from "@/integrations/supabase/client";
import { stripeEnvironment } from "@/lib/stripe";
import { track } from "@/lib/tracking";
import { useBuyerCurrency } from "@/hooks/useBuyerCurrency";
import { formatProduct, getProductPrice } from "@/lib/currency";

export const Route = createFileRoute("/upsell-1")({
  component: Upsell1,
});

function Upsell1() {
  const navigate = useNavigate();
  const q = useQuizStore();
  const [processing, setProcessing] = useState(false);
  const [showDownsell, setShowDownsell] = useState(false);
  const [downsellProcessing, setDownsellProcessing] = useState(false);

  useEffect(() => {
    void track({
      type: "upsell_view",
      upsellType: "express_90min",
      orderId: q.orderId,
      buyerEmail: q.buyer_email || undefined,
    });
  }, [q.orderId, q.buyer_email]);

  const accept = async () => {
    void track({
      type: "upsell_accept",
      upsellType: "express_90min",
      orderId: q.orderId,
      buyerEmail: q.buyer_email || undefined,
      amountCents: 5999,
    });
    if (!q.orderId) {
      navigate({ to: "/upsell-2" });
      return;
    }
    setProcessing(true);
    const { data } = await supabase.functions.invoke("charge-upsell", {
      body: {
        orderId: q.orderId,
        upsellType: "express_90min",
        environment: stripeEnvironment,
        sessionId: q.checkoutSessionId,
      },
    });
    if (data?.success) q.set("is_rush", true);
    navigate({ to: "/upsell-2" });
  };

  // Decline 90-min priority → open the 24h rush downsell.
  const decline = () => {
    void track({
      type: "upsell_decline",
      upsellType: "express_90min",
      orderId: q.orderId,
      buyerEmail: q.buyer_email || undefined,
    });
    void track({
      type: "upsell_view",
      upsellType: "rush_delivery",
      orderId: q.orderId,
      buyerEmail: q.buyer_email || undefined,
    });
    setShowDownsell(true);
  };

  const accept24 = async () => {
    void track({
      type: "upsell_accept",
      upsellType: "rush_delivery",
      orderId: q.orderId,
      buyerEmail: q.buyer_email || undefined,
      amountCents: 3999,
    });
    if (!q.orderId) {
      setShowDownsell(false);
      navigate({ to: "/upsell-2" });
      return;
    }
    setDownsellProcessing(true);
    const { data } = await supabase.functions.invoke("charge-upsell", {
      body: {
        orderId: q.orderId,
        upsellType: "rush_delivery",
        environment: stripeEnvironment,
        sessionId: q.checkoutSessionId,
      },
    });
    if (data?.success) q.set("is_rush", true);
    setDownsellProcessing(false);
    setShowDownsell(false);
    navigate({ to: "/upsell-2" });
  };

  const decline24 = () => {
    void track({
      type: "upsell_decline",
      upsellType: "rush_delivery",
      orderId: q.orderId,
      buyerEmail: q.buyer_email || undefined,
    });
    setShowDownsell(false);
    navigate({ to: "/upsell-2" });
  };

  return (
    <>
      <UpsellShell
        step={1}
        badge="Top priority delivery"
        headline="Hear your dog's song in 90 minutes"
        description={
          <>
            Standard takes up to 5 days. Jump straight to the very top of our
            queue and get the finished song in your inbox in the next{" "}
            <span className="font-semibold text-foreground">90 minutes</span>.
            Perfect if today is the day, a vet visit, a birthday, or you simply
            cannot wait one more minute.
          </>
        }
        highlights={[
          "Top of the entire queue, ahead of every other order",
          "We start producing the moment you accept, around the clock",
          "Hand-checked by a real human before it lands in your inbox",
        ]}
        priceLabel="$59.99"
        declineLabel="No thanks, I can wait"
        onAccept={accept}
        onDecline={decline}
        processing={processing}
      />

      <Rush24Downsell
        open={showDownsell}
        processing={downsellProcessing}
        onAccept={accept24}
        onDecline={decline24}
      />
    </>
  );
}
