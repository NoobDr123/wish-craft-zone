import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { UpsellShell } from "@/components/UpsellShell";
import { useQuizStore } from "@/stores/quizStore";
import { supabase } from "@/integrations/supabase/client";
import { stripeEnvironment } from "@/lib/stripe";
import { track } from "@/lib/tracking";

export const Route = createFileRoute("/upsell-1")({
  component: Upsell1,
});

function useCountdown(seconds: number) {
  const [time, setTime] = useState(seconds);
  useEffect(() => {
    if (time <= 0) return;
    const t = setInterval(() => setTime((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [time]);
  const m = Math.floor(time / 60);
  const s = (time % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function Upsell1() {
  const navigate = useNavigate();
  const q = useQuizStore();
  const [processing, setProcessing] = useState(false);
  const countdown = useCountdown(5 * 60);

  useEffect(() => {
    void track({
      type: "upsell_view",
      upsellType: "extra_verse",
      orderId: q.orderId,
      buyerEmail: q.buyer_email || undefined,
    });
  }, [q.orderId, q.buyer_email]);

  const accept = async () => {
    void track({
      type: "upsell_accept",
      upsellType: "extra_verse",
      orderId: q.orderId,
      buyerEmail: q.buyer_email || undefined,
      amountCents: 1999,
    });
    if (!q.orderId) {
      navigate({ to: "/upsell-2" });
      return;
    }
    setProcessing(true);
    const { data } = await supabase.functions.invoke("charge-upsell", {
      body: {
        orderId: q.orderId,
        upsellType: "extra_verse",
        environment: stripeEnvironment,
        sessionId: q.checkoutSessionId,
      },
    });
    if (data?.success) q.set("has_3rd_verse", true);
    // Whether it succeeded or silently failed, move to the next step.
    navigate({ to: "/upsell-2" });
  };

  const decline = () => {
    void track({
      type: "upsell_decline",
      upsellType: "extra_verse",
      orderId: q.orderId,
      buyerEmail: q.buyer_email || undefined,
    });
    navigate({ to: "/upsell-2" });
  };

  return (
    <UpsellShell
      step={1}
      badge="One more verse for your pup"
      headline="Add a third verse — the one that gets you"
      description={
        <>
          Your song already has two verses and a chorus. Add a soft bridge and a
          third verse about your dog —{" "}
          <span className="font-semibold text-foreground">about 90 more seconds</span>{" "}
          of music — so the song has room to name the little things only you
          two know.
        </>
      }
      highlights={[
        "A bridge that captures their quirks — the zoomies, the head tilt, the snore",
        "A third verse that ties their story together",
        "About 90 extra seconds of song to sit with",
      ]}
      priceLabel="$19.99"
      declineLabel="No thanks, two verses is plenty"
      onAccept={accept}
      onDecline={decline}
      processing={processing}
      countdown={countdown}
    />
  );
}
