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
      badge="Make it unforgettable"
      headline="Wait, make it even more emotional."
      description={
        <>
          Your song comes with two beautiful verses. For just{" "}
          <span className="font-semibold text-foreground">$19.99</span>, add a
          tender bridge and a third verse. This is usually where the tears start
          flowing.
        </>
      }
      highlights={[
        "A reflective bridge that names what matters most",
        "A third verse that brings the story home",
        "About 90 extra seconds of music to sit with",
      ]}
      acceptLabel="Yes, add the bridge & 3rd verse · $19.99"
      declineLabel="No thanks, two verses is enough"
      onAccept={accept}
      onDecline={decline}
      processing={processing}
      countdown={countdown}
    />
  );
}
