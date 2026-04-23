import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { UpsellShell } from "@/components/UpsellShell";
import { useQuizStore } from "@/stores/quizStore";
import { supabase } from "@/integrations/supabase/client";
import { stripeEnvironment } from "@/lib/stripe";

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

  const accept = async () => {
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

  const decline = () => navigate({ to: "/upsell-2" });

  return (
    <UpsellShell
      step={1}
      badge="Make their song unforgettable"
      headline="Add a heartfelt bridge and a 3rd verse"
      description={
        <>
          Your song already comes with two verses and a chorus. Add a tender
          bridge and a third verse, about{" "}
          <span className="font-semibold text-foreground">90 extra seconds</span>{" "}
          of music, for only{" "}
          <span className="font-semibold text-foreground">$19.99</span>. This is
          where most people say the tears start.
        </>
      }
      highlights={[
        "A reflective bridge that names what matters most about them",
        "A third verse that brings their story full circle",
        "About 90 extra seconds of music to sit in together",
      ]}
      priceLabel="$19.99"
      declineLabel="No thanks, two verses is enough"
      onAccept={accept}
      onDecline={decline}
      processing={processing}
      countdown={countdown}
    />
  );
}
