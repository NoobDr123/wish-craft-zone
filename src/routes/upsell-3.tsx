import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { UpsellShell } from "@/components/UpsellShell";
import { useQuizStore } from "@/stores/quizStore";
import { supabase } from "@/integrations/supabase/client";
import { stripeEnvironment } from "@/lib/stripe";

export const Route = createFileRoute("/upsell-3")({
  component: Upsell3,
});

function Upsell3() {
  const navigate = useNavigate();
  const q = useQuizStore();
  const [processing, setProcessing] = useState(false);

  const finishAndAdvance = async () => {
    // Tell the backend upsell decisions are done — this flips status to
    // upsells_complete which fires the trigger that enqueues brief generation.
    if (q.orderId) {
      await supabase.functions.invoke("mark-upsells-complete", {
        body: { orderId: q.orderId },
      });
    }
    navigate({ to: "/processing" });
  };

  const accept = async () => {
    if (!q.orderId) {
      await finishAndAdvance();
      return;
    }
    setProcessing(true);
    const { data } = await supabase.functions.invoke("charge-upsell", {
      body: {
        orderId: q.orderId,
        upsellType: "unlimited_edits",
        environment: stripeEnvironment,
      },
    });
    if (data?.success) q.set("has_unlimited_edits", true);
    await finishAndAdvance();
  };

  const decline = async () => {
    await finishAndAdvance();
  };

  return (
    <UpsellShell
      step={3}
      badge="The Perfectionist Pass"
      headline="Want to keep refining it?"
      description={
        <>
          Want to tweak the lyrics or try a different genre after you hear it?
          Unlock <span className="font-semibold text-foreground">unlimited edits</span>{" "}
          for 14 days for{" "}
          <span className="font-semibold text-foreground">$32.99</span>.
        </>
      }
      highlights={[
        "Unlimited lyric and tone refinements",
        "Try a different genre or voice anytime",
        "14 days from delivery, no rush",
      ]}
      acceptLabel="Yes, add unlimited edits · $32.99"
      declineLabel="No thanks, I trust the song you'll create"
      onAccept={accept}
      onDecline={decline}
      processing={processing}
    />
  );
}
