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

    // Fire Meta Pixel Purchase on upsell-1 view (per buyer request).
    // Deduped per order via localStorage so refreshes / back-navigation
    // never double-count. Uses the main order's amount_paid_cents as the
    // purchase value so reporting matches the actual sale.
    if (!q.orderId) return;
    const key = `rs_px_upsell1_${q.orderId}`;
    if (typeof window === "undefined" || localStorage.getItem(key)) return;
    let cancelled = false;
    void (async () => {
      try {
        const { data: order } = await supabase
          .from("orders")
          .select("amount_paid_cents, amount_cents, currency")
          .eq("id", q.orderId!)
          .maybeSingle();
        if (cancelled) return;
        const cents = order?.amount_paid_cents || order?.amount_cents || 0;
        const { pixelTrack } = await import("@/lib/metaPixel");
        pixelTrack(
          "Purchase",
          {
            value: Number((cents / 100).toFixed(2)),
            currency: (order?.currency || "USD").toUpperCase(),
            content_type: "product",
            content_name: "RibbonSong Personalized Song",
            content_ids: [q.orderId],
            order_id: q.orderId,
          },
          { eventID: q.orderId },
        );
        localStorage.setItem(key, "1");
      } catch {
        /* never block the funnel on pixel errors */
      }
    })();
    return () => {
      cancelled = true;
    };
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
