import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import confetti from "canvas-confetti";
import { Logo } from "@/components/Logo";
import { journeyStageOf, useQuizStore } from "@/stores/quizStore";
import { prefetchCheckout } from "@/lib/checkoutPrefetch";
import { ArrowLeft, ArrowRight, Gift, Timer, AlertTriangle, Flame, Heart, Sparkles } from "lucide-react";

export const Route = createFileRoute("/scratch")({
  component: ScratchPage,
  head: () => ({
    meta: [
      { title: "Scratch to reveal · RibbonSong" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

const REVEAL_THRESHOLD = 0.4; // 40% scratched off → auto reveal
const COUNTDOWN_SECONDS = 10 * 60; // 10:00

function ScratchPage() {
  const q = useQuizStore();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [stage, setStage] = useState<"scratch" | "claim">("scratch");
  const [progress, setProgress] = useState(0);
  const drawingRef = useRef(false);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);
  const initRef = useRef(false);
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const [hydrated, setHydrated] = useState(() => useQuizStore.persist.hasHydrated());

  const recipientName = (q.recipient_name || "").trim();
  const firstName = recipientName.split(/\s+/)[0] || "";
  const journey = useMemo(() => journeyStageOf(q.stage), [q.stage]);
  const relationship = q.relationship_other?.trim() || q.relationship || "";

  // Stage-aware copy
  const copy = useMemo(() => {
    if (journey === "memory") {
      return {
        eyebrow: `A keepsake for ${firstName}'s memory`,
        scratchHeadline: `A small gift, in honor of ${firstName}`,
        scratchSub: `Scratch the gold below — we've set aside something gentle to help you create ${firstName}'s song.`,
        claimHeadline: `Your tribute to ${firstName} just got easier 💛`,
        claimSub: `Use this within 10 minutes to lock in -50% off ${firstName}'s memorial song.`,
        ctaLabel: `Claim -50% off ${firstName}'s song`,
        emoji: "🕊️",
      };
    }
    if (journey === "hospice") {
      return {
        eyebrow: `Every moment with ${firstName} matters`,
        scratchHeadline: `A little something to help you reach ${firstName} sooner`,
        scratchSub: `Scratch the gold — we've reserved a discount so ${firstName} can hear their song without delay.`,
        claimHeadline: `Get ${firstName}'s song into their hands faster 💛`,
        claimSub: `This -50% offer holds your priority slot for the next 10 minutes.`,
        ctaLabel: `Claim -50% & prioritize ${firstName}`,
        emoji: "🤍",
      };
    }
    return {
      eyebrow: `A surprise for ${firstName}${relationship ? `, your ${relationship.toLowerCase()}` : ""}`,
      scratchHeadline: `You unlocked something special for ${firstName}!`,
      scratchSub: `Scratch the gold below to reveal an exclusive discount on ${firstName}'s personalized song 👇`,
      claimHeadline: `${firstName}'s song just got 50% off! 🎉`,
      claimSub: `Lock it in within 10 minutes — this offer is only on this page.`,
      ctaLabel: `Claim ${firstName}'s -50% offer`,
      emoji: "🎁",
    };
  }, [journey, firstName, relationship]);

  useEffect(() => {
    const unsubscribe = useQuizStore.persist.onFinishHydration(() => setHydrated(true));
    if (useQuizStore.persist.hasHydrated()) setHydrated(true);
    return unsubscribe;
  }, []);

  // Countdown urgency timer (only on claim screen)
  useEffect(() => {
    if (stage !== "claim") return;
    const id = setInterval(() => {
      setCountdown((c) => (c > 0 ? c - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, [stage]);

  // Initialize scratch surface — wait for actual layout size
  useEffect(() => {
    if (stage !== "scratch") return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const paint = () => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width < 4 || rect.height < 4) return;
      if (initRef.current) return;
      initRef.current = true;

      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Gold foil gradient
      const grad = ctx.createLinearGradient(0, 0, rect.width, rect.height);
      grad.addColorStop(0, "#c9914a");
      grad.addColorStop(0.45, "#e9c089");
      grad.addColorStop(0.55, "#f4d9a8");
      grad.addColorStop(1, "#b07a36");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, rect.width, rect.height);

      // Sparkle dots
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      for (let i = 0; i < 90; i++) {
        const x = Math.random() * rect.width;
        const y = Math.random() * rect.height;
        const r = Math.random() * 1.6 + 0.4;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }

      // Overlay text — personalized
      ctx.fillStyle = "rgba(255,255,255,0.95)";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = "800 22px Inter, system-ui, sans-serif";
      const top = firstName
        ? `✨ FOR ${firstName.toUpperCase()} ✨`
        : "✨ SCRATCH HERE ✨";
      ctx.fillText(top, rect.width / 2, rect.height / 2 - 14);
      ctx.font = "500 13px Inter, system-ui, sans-serif";
      ctx.fillText(
        "Drag to reveal your discount",
        rect.width / 2,
        rect.height / 2 + 14,
      );
    };

    paint();
    const ro = new ResizeObserver(() => paint());
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [stage, firstName]);

  const fireConfetti = () => {
    const colors = ["#d97757", "#e9c089", "#f4d9a8", "#7bb37b", "#a07fe6"];
    confetti({
      particleCount: 180,
      spread: 110,
      origin: { y: 0.5 },
      colors,
    });
    const end = Date.now() + 1000;
    (function frame() {
      confetti({
        particleCount: 5,
        angle: 60,
        spread: 70,
        origin: { x: 0, y: 0.7 },
        colors,
      });
      confetti({
        particleCount: 5,
        angle: 120,
        spread: 70,
        origin: { x: 1, y: 0.7 },
        colors,
      });
      if (Date.now() < end) requestAnimationFrame(frame);
    })();
  };

  const reveal = () => {
    if (revealed) return;
    setRevealed(true);
    setProgress(1);
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
      }
    }
    fireConfetti();
    // High-intent moment: warm Stripe.js + create the order/PaymentIntent in
    // the background so /checkout can mount the form instantly on arrival.
    prefetchCheckout();
    // Auto-advance to claim screen after a short delay
    setTimeout(() => setStage("claim"), 1400);
  };

  const checkProgress = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { width, height } = canvas;
    if (width === 0 || height === 0) return;
    const data = ctx.getImageData(0, 0, width, height).data;
    let cleared = 0;
    let total = 0;
    for (let i = 3; i < data.length; i += 160) {
      total++;
      if (data[i] < 16) cleared++;
    }
    const ratio = total > 0 ? cleared / total : 0;
    setProgress(ratio);
    if (ratio > REVEAL_THRESHOLD) reveal();
  };

  const scratchAt = (x: number, y: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.globalCompositeOperation = "destination-out";
    ctx.lineWidth = 44;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    const last = lastPosRef.current;
    if (last) {
      ctx.beginPath();
      ctx.moveTo(last.x, last.y);
      ctx.lineTo(x, y);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(x, y, 22, 0, Math.PI * 2);
      ctx.fill();
    }
    lastPosRef.current = { x, y };
  };

  const getPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (revealed) return;
    drawingRef.current = true;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    const { x, y } = getPos(e);
    scratchAt(x, y);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current || revealed) return;
    const { x, y } = getPos(e);
    scratchAt(x, y);
  };
  const onPointerUp = () => {
    drawingRef.current = false;
    lastPosRef.current = null;
    if (!revealed) checkProgress();
  };

  const mins = Math.floor(countdown / 60)
    .toString()
    .padStart(2, "0");
  const secs = (countdown % 60).toString().padStart(2, "0");
  const expired = stage === "claim" && countdown === 0;

  const warmCheckout = () => {
    void prefetchCheckout().catch((error) => {
      console.error("[scratch] checkout prefetch failed before navigation:", error);
    });
  };

  return (
    <div className="min-h-screen bg-gradient-warm">
      <header className="border-b border-peach/60 bg-background/60 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-5 py-4">
          {stage === "scratch" ? (
            <Link
              to="/almost-there"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </Link>
          ) : (
            <span className="w-12" />
          )}
          <Logo />
          <span className="w-12" />
        </div>
      </header>

      {stage === "scratch" ? (
        <main className="mx-auto max-w-xl px-5 py-12">
          <div className="text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              {copy.eyebrow}
            </span>
            <div className="mt-5 text-5xl">{copy.emoji}</div>
            <h1 className="mt-4 text-balance font-display text-3xl font-bold leading-tight text-foreground md:text-4xl">
              {copy.scratchHeadline}
            </h1>
            <p className="mt-3 text-balance text-muted-foreground">
              {copy.scratchSub}
            </p>
          </div>

          {/* Scratch card */}
          <div className="mt-8 select-none">
            <div className="relative mx-auto aspect-[5/3] w-full max-w-md overflow-hidden rounded-3xl border-2 border-[#c9914a]/40 bg-card shadow-card">
              {/* Reveal layer — personalized */}
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-peach/40 p-6 text-center">
                {firstName && (
                  <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/80">
                    For {firstName}
                  </span>
                )}
                <span className="mt-1 font-display text-7xl font-extrabold text-primary md:text-8xl">
                  -50%
                </span>
                <span className="mt-1 text-sm font-medium text-foreground/70">
                  off your personalized song
                </span>
              </div>
              {/* Scratchable canvas overlay */}
              <canvas
                ref={canvasRef}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
                onPointerLeave={onPointerUp}
                className={`absolute inset-0 h-full w-full transition-opacity duration-500 ${
                  revealed
                    ? "pointer-events-none opacity-0"
                    : "cursor-grab active:cursor-grabbing"
                }`}
                style={{ touchAction: "none" }}
              />
            </div>

            {/* Progress hint */}
            {!revealed && (
              <div className="mx-auto mt-4 max-w-md">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-peach/60">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-200"
                    style={{
                      width: `${Math.min(100, Math.round((progress / REVEAL_THRESHOLD) * 100))}%`,
                    }}
                  />
                </div>
                <button
                  onClick={reveal}
                  className="mx-auto mt-3 block text-sm font-medium text-primary underline-offset-2 hover:underline"
                >
                  Tap to reveal instantly
                </button>
              </div>
            )}
          </div>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            <Flame className="mr-1 inline h-4 w-4 text-primary" />
            838 people claimed this discount today
          </p>
        </main>
      ) : (
        <main className="mx-auto max-w-xl px-5 py-12">
          <div className="text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
              <Heart className="h-3.5 w-3.5" />
              Reserved for {firstName || "you"}
            </span>
            <div className="mt-5 text-5xl">🎉</div>
            <h1 className="mt-4 text-balance font-display text-3xl font-bold leading-tight text-foreground md:text-4xl">
              {copy.claimHeadline}
            </h1>
            <p className="mt-3 text-balance text-muted-foreground">
              {copy.claimSub}
            </p>
          </div>

          {/* Discount badge — personalized */}
          <div className="mt-8 flex flex-col items-center justify-center rounded-3xl border-2 border-primary/30 bg-peach/40 p-10 text-center shadow-card">
            {firstName && (
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/80">
                {journey === "memory"
                  ? `In honor of ${firstName}`
                  : `${firstName}'s song`}
              </span>
            )}
            <span className="mt-2 font-display text-7xl font-extrabold text-primary md:text-8xl">
              -50%
            </span>
            <span className="mt-1 text-sm font-medium text-foreground/70">
              off your personalized song
            </span>
          </div>

          {/* Countdown urgency banner */}
          <div className="mt-6 flex items-center justify-center gap-2 rounded-2xl border border-primary/30 bg-primary/5 px-4 py-3 text-center text-sm font-semibold text-primary">
            <Timer className="h-4 w-4" />
            {expired ? (
              <span>
                Your discount expired — but you can still order {firstName || "their"}'s song.
              </span>
            ) : (
              <span>
                {firstName ? `${firstName}'s discount expires in ` : "Discount expires in "}
                <span className="tabular-nums">
                  {mins}:{secs}
                </span>
              </span>
            )}
          </div>

          {/* CTA */}
          <Link
            to="/checkout"
            onClick={warmCheckout}
            onMouseEnter={warmCheckout}
            onFocus={warmCheckout}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-primary px-8 py-5 text-base font-bold text-primary-foreground shadow-glow transition-all hover:bg-primary-hover active:scale-[0.99] disabled:cursor-wait disabled:opacity-70"
          >
            <Gift className="h-5 w-5" />
            {copy.ctaLabel}
            <ArrowRight className="h-5 w-5" />
          </Link>

          <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
            <AlertTriangle className="h-3.5 w-3.5" />
            Once the timer expires, this discount is gone for good
          </p>
          <p className="mt-3 text-center text-sm text-muted-foreground">
            <Flame className="mr-1 inline h-4 w-4 text-primary" />
            838 people claimed this discount today
          </p>
        </main>
      )}
    </div>
  );
}
