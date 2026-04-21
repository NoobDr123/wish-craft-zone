import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import confetti from "canvas-confetti";
import { Logo } from "@/components/Logo";
import { useQuizStore } from "@/stores/quizStore";
import { ArrowLeft, ArrowRight, Gift, Sparkles } from "lucide-react";

export const Route = createFileRoute("/scratch")({
  component: ScratchPage,
  head: () => ({
    meta: [{ title: "Scratch to reveal · RibbonSong" }],
  }),
});

const REVEAL_THRESHOLD = 0.45; // 45% scratched off → auto reveal

function ScratchPage() {
  const navigate = useNavigate();
  const q = useQuizStore();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [revealed, setRevealed] = useState(false);
  const drawingRef = useRef(false);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!q.recipient_name) navigate({ to: "/create" });
  }, [q.recipient_name, navigate]);

  // Initialize scratch surface
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    // Foil-like gradient
    const grad = ctx.createLinearGradient(0, 0, rect.width, rect.height);
    grad.addColorStop(0, "#7c5cff");
    grad.addColorStop(0.5, "#b18cff");
    grad.addColorStop(1, "#d97757");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, rect.width, rect.height);

    // Sparkle dots
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    for (let i = 0; i < 60; i++) {
      const x = Math.random() * rect.width;
      const y = Math.random() * rect.height;
      const r = Math.random() * 1.6 + 0.4;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // "SCRATCH HERE" text overlay
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.font = "700 22px Inter, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("✨ SCRATCH HERE ✨", rect.width / 2, rect.height / 2 - 12);
    ctx.font = "500 14px Inter, system-ui, sans-serif";
    ctx.fillText(
      "to reveal your special offer",
      rect.width / 2,
      rect.height / 2 + 16,
    );
  }, []);

  const fireConfetti = () => {
    const end = Date.now() + 800;
    const colors = ["#7c5cff", "#d97757", "#f4c5a0", "#7bb37b"];
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
    confetti({
      particleCount: 120,
      spread: 100,
      origin: { y: 0.55 },
      colors,
    });
  };

  const reveal = () => {
    if (revealed) return;
    setRevealed(true);
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    fireConfetti();
  };

  const checkProgress = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { width, height } = canvas;
    const sample = ctx.getImageData(0, 0, width, height).data;
    let cleared = 0;
    // Sample every 40th pixel for speed
    for (let i = 3; i < sample.length; i += 160) {
      if (sample[i] === 0) cleared++;
    }
    const total = sample.length / 160;
    if (cleared / total > REVEAL_THRESHOLD) reveal();
  };

  const scratchAt = (x: number, y: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.globalCompositeOperation = "destination-out";
    ctx.lineWidth = 38;
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
      ctx.arc(x, y, 19, 0, Math.PI * 2);
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
    e.currentTarget.setPointerCapture(e.pointerId);
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
            <Sparkles className="h-3.5 w-3.5" /> Surprise unlocked
          </span>
          <h1 className="mt-4 text-balance font-display text-3xl font-bold leading-tight text-foreground md:text-4xl">
            You earned a special offer for {recipient}'s song
          </h1>
          <p className="mt-3 text-balance text-muted-foreground">
            Scratch the card below to reveal your discount.
          </p>
        </div>

        {/* Scratch card */}
        <div className="mt-8 select-none">
          <div className="relative mx-auto aspect-[5/3] w-full max-w-md overflow-hidden rounded-3xl border-2 border-peach bg-card shadow-card">
            {/* Reveal layer */}
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-primary/10 via-card to-ribbon/10 p-6 text-center">
              <span className="rounded-full border-2 border-ribbon/40 bg-ribbon/10 px-3 py-1 text-xs font-bold tracking-wider text-ribbon">
                50% OFF UNLOCKED
              </span>
              <p className="mt-3 flex items-baseline gap-2">
                <span className="text-lg font-medium text-muted-foreground line-through">
                  $199
                </span>
                <span className="font-display text-5xl font-bold text-ribbon">
                  $99
                </span>
              </p>
              <p className="mt-2 text-sm font-medium text-foreground">
                Your custom RibbonSong · USD
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Code applied automatically at checkout
              </p>
            </div>
            {/* Scratchable canvas overlay */}
            <canvas
              ref={canvasRef}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              className={`absolute inset-0 h-full w-full touch-none transition-opacity duration-500 ${
                revealed ? "pointer-events-none opacity-0" : "cursor-grab active:cursor-grabbing"
              }`}
              style={{ touchAction: "none" }}
            />
          </div>

          {!revealed && (
            <button
              onClick={reveal}
              className="mx-auto mt-4 block text-sm font-medium text-muted-foreground underline hover:text-foreground"
            >
              Reveal instead
            </button>
          )}
        </div>

        {/* CTA */}
        <button
          onClick={() => navigate({ to: "/checkout" })}
          disabled={!revealed}
          className="mt-8 flex w-full items-center justify-center gap-2 rounded-full bg-ribbon px-8 py-4 text-base font-bold text-ribbon-foreground shadow-glow transition-all hover:brightness-95 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
        >
          <Gift className="h-5 w-5" /> Claim my $99 offer
          <ArrowRight className="h-5 w-5" />
        </button>
        <p className="mt-3 text-center text-xs text-muted-foreground">
          {revealed
            ? "Offer applied · Limited time · 30-day money-back"
            : "Scratch the card above to unlock your discount"}
        </p>
      </main>
    </div>
  );
}
