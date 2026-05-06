import { useEffect, useRef, useState } from "react";
import { Music2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AudioPlayer } from "@/components/AudioPlayer";

interface SampleSong {
  id: string;
  title: string;
  for_text: string | null;
  quote: string | null;
  audio_url: string | null;
  recipient_name: string;
}

/**
 * Below-the-fold "Hear other PawPrint Songs we made" block.
 *
 * Code-split (loaded only when the user scrolls near it) AND fetched on
 * mount via Supabase REST — no longer in the SSR loader, so the critical
 * checkout path is unblocked.
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
        .select("id,title,for_text,quote,audio_url,recipient_name")
        .not("audio_url", "is", null)
        .order("sort_order", { ascending: true })
        .limit(3);
      if (!cancelled) setSamples((data ?? []) as SampleSong[]);
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
        <Music2 className="h-5 w-5 text-primary" /> Hear Other PawPrint Songs We Made
      </h2>
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
              <p className="font-semibold text-foreground">{s.title}</p>
              {s.for_text && (
                <p className="mt-0.5 text-xs text-muted-foreground">{s.for_text}</p>
              )}
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
