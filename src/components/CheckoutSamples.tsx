import { useEffect, useRef, useState } from "react";
import { Music2, PawPrint } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AudioPlayer } from "@/components/AudioPlayer";
import sampleYellowLab from "@/assets/sample-yellow-lab.jpg";
import sampleGoldendoodle from "@/assets/sample-goldendoodle.jpg";
import sampleGermanShepherd from "@/assets/sample-german-shepherd.jpg";

interface SampleSong {
  id: string;
  title: string;
  for_text: string | null;
  quote: string | null;
  audio_url: string | null;
  dog_name: string | null;
  gone_text?: string | null;
  memory_text?: string | null;
  photo_url?: string | null;
}

const FALLBACK_AUDIO =
  "https://tempfile.aiquickdraw.com/r/d4899ca946ec497dbd5e86027fb1b52f.mp3";

const FALLBACK_SAMPLES: SampleSong[] = [
  {
    id: "fb-1",
    title: "Cheeto Paws",
    for_text: "Written for Max · 12 years · Yellow Lab",
    quote: "Her paws smelled like cheetos. I miss her smelly breath. I miss everything.",
    audio_url: FALLBACK_AUDIO,
    dog_name: "Max",
    gone_text: "Gone 3 months ago",
    memory_text: "still her favorite blanket on the couch",
    photo_url: sampleYellowLab,
  },
  {
    id: "fb-2",
    title: "Still on the Couch",
    for_text: "Written for Bella · 9 years · Goldendoodle",
    quote: "I still leave the spot by the window open for her. Always will.",
    audio_url: FALLBACK_AUDIO,
    dog_name: "Bella",
    gone_text: "Gone 2 years ago",
    memory_text: "the window seat is still hers",
    photo_url: sampleGoldendoodle,
  },
  {
    id: "fb-3",
    title: "Good Girl, Always",
    for_text: "Written for Ruby · 15 years · German Shepherd",
    quote: "Fifteen years. She got me through everything.",
    audio_url: FALLBACK_AUDIO,
    dog_name: "Ruby",
    gone_text: "Gone 8 months ago",
    memory_text: "15 years of being everything",
    photo_url: sampleGermanShepherd,
  },
];

/**
 * Below-the-fold "Hear other PawPrint Songs we made" block. Lazily fetches
 * featured samples from Supabase; if none are published, falls back to a
 * curated set so the section is never empty.
 */
export default function CheckoutSamples() {
  const containerRef = useRef<HTMLElement | null>(null);
  const [samples, setSamples] = useState<SampleSong[] | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            io.disconnect();
            break;
          }
        }
      },
      { rootMargin: "300px 0px" },
    );
    io.observe(node);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!visible || samples !== null) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("public_featured_samples")
        .select("id,title,for_text,quote,audio_url,dog_name")
        .not("audio_url", "is", null)
        .order("sort_order", { ascending: true })
        .limit(3);
      if (cancelled) return;
      const rows = (data ?? []) as SampleSong[];
      setSamples(rows.length > 0 ? rows : FALLBACK_SAMPLES);
    })();
    return () => {
      cancelled = true;
    };
  }, [visible, samples]);

  return (
    <section
      ref={containerRef}
      className="mt-6 rounded-3xl border border-peach/70 bg-card p-6 shadow-soft md:p-7"
    >
      <h2 className="flex items-center gap-2 font-display text-2xl font-bold text-foreground">
        <Music2 className="h-5 w-5 text-primary" /> Songs we made for other dog owners
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        Real songs, written from real memories other owners shared with us. Yours will be just as personal, built only from what you tell us about your dog.
      </p>
      <div className="mt-5 space-y-5">
        {samples === null ? (
          <>
            <div className="h-24 animate-pulse rounded-2xl bg-peach/30" />
            <div className="h-24 animate-pulse rounded-2xl bg-peach/30" />
            <div className="h-24 animate-pulse rounded-2xl bg-peach/30" />
          </>
        ) : (
          samples.map((s) => (
            <article
              key={s.id}
              className="rounded-2xl border border-peach/60 bg-background/60 p-4"
            >
              <div className="flex items-start gap-3">
                {/* Memorial silhouette: dark blacked-out paw avatar with small RIP tag */}
                <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-foreground/85 text-background shadow-sm ring-1 ring-foreground/10">
                  <PawPrint className="h-5 w-5 opacity-90" strokeWidth={2.25} />
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full bg-background px-1.5 py-px text-[8px] font-bold uppercase tracking-[0.12em] text-foreground/80 ring-1 ring-foreground/15">
                    RIP
                  </span>
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-foreground">{s.title}</p>
                  {s.for_text && (
                    <p className="mt-0.5 text-xs text-muted-foreground">{s.for_text}</p>
                  )}
                  {s.gone_text && (
                    <p className="mt-1.5 text-[12px] font-semibold uppercase tracking-[0.08em] text-primary/90">
                      {s.gone_text}
                      {s.memory_text && (
                        <span className="ml-1.5 font-normal normal-case tracking-normal text-muted-foreground">
                          · {s.memory_text}
                        </span>
                      )}
                    </p>
                  )}
                </div>
              </div>

              {s.audio_url && (
                <div className="mt-3">
                  <AudioPlayer src={s.audio_url} title={s.title} variant="compact" />
                </div>
              )}
              {s.quote && (
                <p className="mt-3 text-sm italic leading-relaxed text-foreground/80">
                  &ldquo;{s.quote}&rdquo;
                </p>
              )}
            </article>
          ))
        )}
      </div>
    </section>
  );
}
