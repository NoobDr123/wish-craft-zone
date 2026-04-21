import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Logo } from "@/components/Logo";
import { useQuizStore } from "@/stores/quizStore";
import { ArrowRight, ShieldCheck, Star } from "lucide-react";

export const Route = createFileRoute("/almost-there")({
  component: AlmostTherePage,
  head: () => ({
    meta: [{ title: "Almost there · RibbonSong" }],
  }),
});

const AVATARS = [
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop&crop=faces",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&h=80&fit=crop&crop=faces",
  "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&h=80&fit=crop&crop=faces",
  "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=80&h=80&fit=crop&crop=faces",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&crop=faces",
  "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=80&h=80&fit=crop&crop=faces",
];

const TESTIMONIALS = [
  {
    name: "Sarah M.",
    quote:
      "I cried the moment it started playing. My mom said it was the most meaningful gift she'd ever received during her treatment.",
  },
  {
    name: "David R.",
    quote:
      "We played it at my wife's last chemo session. The whole infusion room was in tears. It captured her spirit perfectly.",
  },
  {
    name: "Emily K.",
    quote:
      "My dad listens to his song every morning before radiation. It gives him strength. Worth every penny.",
  },
];

function AlmostTherePage() {
  const navigate = useNavigate();
  const q = useQuizStore();

  useEffect(() => {
    if (!q.recipient_name) navigate({ to: "/create" });
  }, [q.recipient_name, navigate]);

  return (
    <div className="min-h-screen bg-background">
      <header className="px-6 pt-8">
        <div className="mx-auto max-w-2xl">
          <Logo />
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-10">
        <h1 className="text-balance text-center font-display text-4xl font-semibold leading-tight text-foreground md:text-5xl">
          You're moments away from {q.recipient_name}'s song.
        </h1>

        {/* Avatar row */}
        <div className="mt-8 flex items-center justify-center -space-x-3">
          {AVATARS.map((src, i) => (
            <img
              key={i}
              src={src}
              alt=""
              loading="lazy"
              className="h-12 w-12 rounded-full border-2 border-background object-cover shadow-soft"
            />
          ))}
          <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-background bg-peach text-xs font-medium text-foreground shadow-soft">
            +1k
          </div>
        </div>
        <p className="mt-4 text-center text-sm font-medium text-foreground">
          1,000+ families have shared their RibbonSong
        </p>

        {/* Testimonials */}
        <div className="mt-10 space-y-4">
          {TESTIMONIALS.map((t) => (
            <figure
              key={t.name}
              className="rounded-2xl border border-border bg-card p-5 shadow-soft"
            >
              <div className="flex items-center gap-1 text-primary">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-current" />
                ))}
              </div>
              <blockquote className="mt-3 text-[15px] leading-relaxed text-foreground">
                &ldquo;{t.quote}&rdquo;
              </blockquote>
              <figcaption className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{t.name}</span>
                <span className="inline-flex items-center gap-1 text-success">
                  <ShieldCheck className="h-3.5 w-3.5" /> Verified
                </span>
              </figcaption>
            </figure>
          ))}
        </div>

        {/* Guarantee */}
        <div className="mt-8 rounded-2xl border border-success/30 bg-success/5 p-5">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 shrink-0 text-success" />
            <p className="font-medium text-foreground">
              30-Day Money-Back Guarantee
            </p>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            If your song doesn't move you, email us within 30 days for a full
            refund. No questions asked.
          </p>
        </div>

        {/* CTA */}
        <button
          onClick={() => navigate({ to: "/scratch" })}
          className="mt-8 flex w-full items-center justify-center gap-2 rounded-full bg-primary px-8 py-4 text-base font-semibold text-primary-foreground shadow-glow transition-all hover:bg-primary-hover"
        >
          Continue <ArrowRight className="h-5 w-5" />
        </button>
        <p className="mt-3 text-center text-xs text-muted-foreground">
          Secure checkout · One-time payment · No subscription
        </p>
      </main>
    </div>
  );
}
