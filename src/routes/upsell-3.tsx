import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { UpsellShell } from "@/components/UpsellShell";
import { useQuizStore } from "@/stores/quizStore";
import { supabase } from "@/integrations/supabase/client";
import { stripeEnvironment } from "@/lib/stripe";
import { track } from "@/lib/tracking";

export const Route = createFileRoute("/upsell-3")({
  component: Upsell3,
});

function Upsell3() {
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
    // Tell the backend upsell decisions are done — this flips status to
    // upsells_complete which fires the trigger that enqueues brief generation.
    // Swallow any error (e.g. order not yet paid in test flows) so the user
    // always reaches the thank-you page instead of a blank-screen crash.
    if (q.orderId) {
      try {
        await supabase.functions.invoke("mark-upsells-complete", {
          body: { orderId: q.orderId },
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
      step={3}
      badge="The Perfectionist Pass"
      headline="Make their song exactly right"
      description={
        <>
          After you hear the first version, want to tweak a lyric, try a
          different genre, or swap the voice? Unlock{" "}
          <span className="font-semibold text-foreground">unlimited edits</span>{" "}
          for 14 full days, only{" "}
          <span className="font-semibold text-foreground">$32.99</span>.
        </>
      }
      highlights={[
        "Unlimited lyric and tone refinements until it's perfect",
        "Try a different genre, voice, or tempo anytime",
        "14 days from delivery, no rush, no extra fees",
      ]}
      priceLabel="$32.99"
      declineLabel="No thanks, I trust the first version"
      onAccept={accept}
      onDecline={decline}
      processing={processing}
    />
  );
}
