import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { UpsellShell } from "@/components/UpsellShell";
import { useQuizStore } from "@/stores/quizStore";
import { supabase } from "@/integrations/supabase/client";
import { stripeEnvironment } from "@/lib/stripe";

export const Route = createFileRoute("/upsell-2")({
  component: Upsell2,
});

function Upsell2() {
  const navigate = useNavigate();
  const q = useQuizStore();
  const [processing, setProcessing] = useState(false);

  const accept = async () => {
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

  const decline = () => navigate({ to: "/upsell-3" });

  return (
    <UpsellShell
      step={2}
      badge="Priority delivery"
      headline="Need it sooner?"
      description={
        <>
          Standard delivery takes 7 days. Skip the line and get your song
          delivered in the next{" "}
          <span className="font-semibold text-foreground">24 hours</span> for{" "}
          <span className="font-semibold text-foreground">$59.00</span>.
        </>
      }
      highlights={[
        "Front of the queue, we start within the hour",
        "Personally reviewed by our team before delivery",
        "Email the moment it's ready",
      ]}
      acceptLabel="Yes, 24-hour rush · $59.00"
      declineLabel="No thanks, I can wait 7 days"
      onAccept={accept}
      onDecline={decline}
      processing={processing}
    />
  );
}
