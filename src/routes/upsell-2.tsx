import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { UpsellShell } from "@/components/UpsellShell";
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

  useEffect(() => {
    void track({
      type: "upsell_view",
      upsellType: "unlimited_edits",
      orderId: q.orderId,
      buyerEmail: q.buyer_email || undefined,
    });
  }, [q.orderId, q.buyer_email]);

  const finishAndAdvance = async () => {
    // Tell the backend upsell decisions are done — flips status to
    // upsells_complete which fires the trigger that enqueues brief generation.
    if (q.orderId) {
      try {
        await supabase.functions.invoke("mark-upsells-complete", {
          body: { orderId: q.orderId, sessionId: q.checkoutSessionId },
        });
      } catch (err) {
        console.warn("mark-upsells-complete failed (non-fatal):", err);
      }
    }
    navigate({ to: "/processing" });
  };

  const accept = async () => {
    void track({
      type: "upsell_accept",
      upsellType: "unlimited_edits",
      orderId: q.orderId,
      buyerEmail: q.buyer_email || undefined,
      amountCents: 3299,
    });
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
        sessionId: q.checkoutSessionId,
      },
    });
    if (data?.success) q.set("has_unlimited_edits", true);
    await finishAndAdvance();
  };

  const decline = async () => {
    void track({
      type: "upsell_decline",
      upsellType: "unlimited_edits",
      orderId: q.orderId,
      buyerEmail: q.buyer_email || undefined,
    });
    await finishAndAdvance();
  };

  return (
    <UpsellShell
      step={2}
      badge="Get it exactly right"
      headline="Tweak your dog's song until it's perfect"
      description={
        <>
          Once you hear the first version, want to swap a lyric, try a softer
          voice, or change the genre? Unlock{" "}
          <span className="font-semibold text-foreground">unlimited edits</span>{" "}
          for 14 full days. No extra fees, no caps, just keep refining until it
          sounds like them.
        </>
      }
      highlights={[
        "Reword any lyric until it captures your dog perfectly",
        "Try a different genre, voice, or tempo as many times as you like",
        "14 days from delivery, no rush, no catches",
      ]}
      priceLabel="$32.99"
      declineLabel="No thanks, I trust the first version"
      onAccept={accept}
      onDecline={decline}
      processing={processing}
    />
  );
}
