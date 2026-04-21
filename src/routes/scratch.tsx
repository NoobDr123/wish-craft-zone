import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import confetti from "canvas-confetti";
import { Logo } from "@/components/Logo";
import { useQuizStore } from "@/stores/quizStore";
import { ArrowLeft, ArrowRight, Gift, Sparkles, Timer } from "lucide-react";

export const Route = createFileRoute("/scratch")({
  component: ScratchPage,
  head: () => ({
    meta: [{ title: "Scratch to reveal · RibbonSong" }],
  }),
});

const REVEAL_THRESHOLD = 0.4; // 40% scratched off → auto reveal

function ScratchPage() {
  const navigate = useNavigate();
  const q = useQuizStore();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [progress, setProgress] = useState(0);
  const drawingRef = useRef(false);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);
  const initRef = useRef(false);
  const [countdown, setCountdown] = useState(15 * 60); // 15:00

  useEffect(() => {
    if (!q.recipient_name) navigate({ to: "/create" });
  }, [q.recipient_name, navigate]);

  // Countdown urgency timer
  useEffect(() => {
    const id = setInterval(() => {
      setCountdown((c) => (c > 0 ? c - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // Initialize scratch surface — wait for actual layout size
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const paint = () => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width < 4 || rect.height < 4) return; // not laid out yet
      if (initRef.current) return;
      initRef.current = true;

      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Purple foil gradient (uses brand primary)
      const grad = ctx.createLinearGradient(0, 0, rect.width, rect.height);
      grad.addColorStop(0, "#6b4bd1");
      grad.addColorStop(0.5, "#a07fe6");
      grad.addColorStop(1, "#7c5cff");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, rect.width, rect.height);

      // Sparkle dots
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      for (let i = 0; i < 80; i++) {
        const x = Math.random() * rect.width;
        const y = Math.random() * rect.height;
        const r = Math.random() * 1.6 + 0.4;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }

      // "SCRATCH HERE" text overlay
      ctx.fillStyle = "rgba(255,255,255,0.95)";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = "800 26px Inter, system-ui, sans-serif";
      ctx.fillText("✨ SCRATCH HERE ✨", rect.width / 2, rect.height / 2 - 14);
      ctx.font = "500 14px Inter, system-ui, sans-serif";
      ctx.fillText(
        "Drag your finger to reveal",
        rect.width / 2,
        rect.height / 2 + 16,
      );
    };

    // Try immediately + on resize until painted
    paint();
    const ro = new ResizeObserver(() => paint());
    ro.observe(canvas);
    return () => ro.disconnect();
  }, []);

  const fireConfetti = () => {
    const colors = ["#7c5cff", "#a07fe6", "#d97757", "#7bb37b", "#f4c5a0"];
    confetti({
      particleCount: 160,
      spread: 100,
      origin: { y: 0.5 },
      colors,
    });
    const end = Date.now() + 900;
    (function frame() {
      confetti({
        particleCount: 4,
        angle: 60,
        spread: 70,
        origin: { x: 0, y: 0.7 },
        colors,
      });
      confetti({
        particleCount: 4,
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
    // Sample every 40th pixel (alpha channel)
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
    ctx.lineWidth = 42;
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

  const recipient = q.recipient_name || "your loved one";
  const mins = Math.floor(countdown / 60)
    .toString()
    .padStart(2, "0");
  const secs = (countdown % 60).toString().padStart(2, "0");

  return (
    <div className="min-h-screen bg-gradient-warm">
      <header className="border-b border-peach/60 bg-background/60 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-5 py-4">
          <Link
            to="/almost-there"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
          <Logo />
          <span className="w-12" />
        </div>
      </header>

      <main className="mx-auto max-w-xl px-5 py-10">
        <div className="text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary">
            <Sparkles className="h-3.5 w-3.5" /> 1 surprise unlocked
          </span>
          <h1 className="mt-4 text-balance font-display text-3xl font-bold leading-tight text-foreground md:text-4xl">
            Scratch to reveal a one-time discount on {recipient}'s song
          </h1>
          <p className="mt-3 text-balance text-muted-foreground">
            This offer is only shown once. Once revealed, it's locked to your
            order.
          </p>

          {/* Countdown chip */}
          <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-4 py-2 text-sm font-semibold text-primary">
            <Timer className="h-4 w-4" />
            Expires in{" "}
            <span className="tabular-nums">
              {mins}:{secs}
            </span>
          </div>
        </div>

        {/* Scratch card */}
        <div className="mt-8 select-none">
          <div className="relative mx-auto aspect-[5/3] w-full max-w-md overflow-hidden rounded-3xl border-2 border-primary/30 bg-card shadow-card">
            {/* Reveal layer */}
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-primary/15 via-card to-primary/5 p-6 text-center">
              <span className="rounded-full border-2 border-primary/40 bg-primary/10 px-3 py-1 text-xs font-bold tracking-wider text-primary">
                50% OFF UNLOCKED
              </span>
              <p className="mt-3 flex items-baseline gap-2">
                <span className="text-lg font-medium text-muted-foreground line-through">
                  $199
                </span>
                <span className="font-display text-5xl font-bold text-primary">
                  $99
                </span>
              </p>
              <p className="mt-2 text-sm font-medium text-foreground">
                Your custom RibbonSong · USD
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Discount applied automatically at checkout
              </p>
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

        {/* CTA */}
        <button
          onClick={() => navigate({ to: "/checkout" })}
          disabled={!revealed}
          className="mt-8 flex w-full items-center justify-center gap-2 rounded-full bg-primary px-8 py-4 text-base font-bold text-primary-foreground shadow-glow transition-all hover:bg-primary-hover active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
        >
          <Gift className="h-5 w-5" /> Claim my $99 offer
          <ArrowRight className="h-5 w-5" />
        </button>
        <p className="mt-3 text-center text-xs text-muted-foreground">
          {revealed
            ? "Offer applied · 30-day money-back · Secure checkout"
            : "Scratch the card above to unlock your one-time discount"}
        </p>
      </main>
    </div>
  );
}
