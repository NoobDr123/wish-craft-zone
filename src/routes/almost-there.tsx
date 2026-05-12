import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Logo } from "@/components/Logo";
import { useQuizStore } from "@/stores/quizStore";
import { ArrowRight, ShieldCheck, Star } from "lucide-react";

export const Route = createFileRoute("/almost-there")({
  component: AlmostTherePage,
  head: () => ({
    meta: [{ title: "Almost there · PawPrint Song" }],
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
    name: "Sarah K.",
    dog: "For Daisy, Golden Retriever, 11",
    quote:
      "I thought I was just buying a song. When Daisy's name came in during the chorus, I had to pull the car over. It felt like someone finally understood what she meant to me.",
  },
  {
    name: "Marcus T.",
    dog: "For Cooper, Black Lab, 13",
    quote:
      "Cooper was with our family for thirteen years. The song turned little details from his life into something we can keep playing. My wife said it was the first gift that actually helped.",
  },
  {
    name: "Elena R.",
    dog: "For Juno, Rescue Collie, 9",
    quote:
      "I almost waited because I did not know if it would be worth it. Now my kids ask for Juno's song at bedtime, and for three minutes it feels like she is back in the room with us.",
  },
];

function AlmostTherePage() {
  const navigate = useNavigate();
  const q = useQuizStore();
  const [hydrated, setHydrated] = useState(() => useQuizStore.persist.hasHydrated());

  useEffect(() => {
    const unsubscribe = useQuizStore.persist.onFinishHydration(() => setHydrated(true));
    if (useQuizStore.persist.hasHydrated()) setHydrated(true);
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (!q.dog_name || !q.buyer_email) navigate({ to: "/create" });
  }, [hydrated, q.dog_name, q.buyer_email, navigate]);

  return (
    <div className="min-h-screen bg-background">
      <header className="px-6 pt-8">
        <div className="mx-auto max-w-2xl">
          <Logo />
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-10">
        <div className="mb-4 flex w-full justify-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
            Your discount is reserved
          </span>
        </div>
        <h1 className="text-balance text-center font-display text-4xl font-semibold leading-tight text-foreground md:text-5xl">
          {q.dog_name || "Your dog"}'s song is one step away.
        </h1>
        <p className="mx-auto mt-4 max-w-[520px] text-balance text-center text-[15.5px] leading-relaxed text-muted-foreground md:text-base">
          1,200+ families have already made a song for the dog they miss. Yours is next, and your discount is locked in for the next few minutes.
        </p>

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
          1,200+ dog families · 4.9★ average rating
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
              <figcaption className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{t.name}</span>
                <span className="inline-flex items-center gap-1 text-success">
                  <ShieldCheck className="h-3.5 w-3.5" /> Verified
                </span>
                <span className="basis-full text-xs text-muted-foreground">{t.dog}</span>
              </figcaption>
            </figure>
          ))}
        </div>

        {/* Guarantee */}
        <div className="mt-8 rounded-2xl border border-success/30 bg-success/5 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-success/15">
              <ShieldCheck className="h-5 w-5 text-success" />
            </div>
            <p className="font-display text-lg font-semibold text-foreground">
              30 Day Money Back Guarantee
            </p>
          </div>
          <p className="mt-3 text-center text-[15px] leading-relaxed text-muted-foreground">
            We're confident you'll love your PawPrint Song. If you're not satisfied,
            email us and we'll give you a full refund.
          </p>
        </div>

        {/* CTA */}
        <button
          onClick={() => navigate({ to: "/scratch" })}
          className="mt-8 flex w-full items-center justify-center gap-3 rounded-2xl bg-primary px-8 py-5 text-lg font-semibold text-primary-foreground shadow-glow transition-all hover:bg-primary-hover active:scale-[0.99]"
        >
          Continue to checkout <ArrowRight className="h-5 w-5" />
        </button>

        {/* Featured on local news */}
        <div className="mt-10 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Featured on Local News
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-x-8 gap-y-4">
            <span className="font-display text-base font-bold tracking-tight text-foreground">
              <span className="inline-block h-4 w-4 rounded-full bg-foreground align-middle ring-2 ring-foreground ring-offset-2 ring-offset-background" />{" "}
              CBS NEWS
            </span>
            <span className="font-display text-2xl font-extrabold italic text-[#1d3aa8]">
              FOX
            </span>
            <span className="rounded-md bg-[#FFD43B] px-2 py-1 font-display text-sm font-extrabold text-foreground">
              AOL
            </span>
            <span className="font-display text-xl font-extrabold lowercase text-[#5f01d2]">
              yahoo!<span className="text-foreground">life</span>
            </span>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Secure checkout · One time payment · No subscription
        </p>
      </main>
    </div>
  );
}
