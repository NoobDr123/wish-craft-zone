// Listen page — public share view of a delivered song.
// Anyone with the URL can play. Loads order by share_page_slug or id.

import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AudioPlayer } from "@/components/AudioPlayer";
import { RibbonMark } from "@/components/Logo";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/listen/$id")({
  component: ListenPage,
  head: ({ loaderData }: any) => {
    const dog = loaderData?.order?.dog_name;
    const songTitle = loaderData?.title;
    const pageTitle = dog
      ? `A song for ${dog}${songTitle ? ` — "${songTitle}"` : ""} · PawPrint Song`
      : "A song for you · PawPrint Song";
    const desc = dog
      ? `A personal tribute song for ${dog}, crafted with love.`
      : "A personal song crafted with love, just for you.";
    return {
      meta: [
        { title: pageTitle },
        { name: "description", content: desc },
        { property: "og:title", content: dog ? `A song for ${dog}` : "A song for you" },
        { property: "og:description", content: desc },
      ],
    };
  },
  loader: async ({ params }) => {
    // Reads through a safe public RPC — no buyer email, no Stripe IDs,
    // no personal notes are exposed publicly, and no login is required.
    const { data, error } = await (supabase as any)
      .rpc("get_public_shared_song", { _id: params.id })
      .maybeSingle();

    if (error || !data) throw notFound();
    return {
      title: (data.brief as any)?.title ?? null,
      order: data,
    };
  },
  notFoundComponent: () => (
    <div className="min-h-screen bg-background flex items-center justify-center px-6 text-center">
      <div>
        <RibbonMark className="mx-auto h-12 w-12 text-primary" />
        <h1 className="mt-4 font-display text-3xl font-semibold">Song not found</h1>
        <p className="mt-2 text-muted-foreground">
          This song link may have been mistyped or is not yet delivered.
        </p>
        <Link to="/" className="mt-6 inline-block text-primary underline">
          Back to PawPrint Song
        </Link>
      </div>
    </div>
  ),
});

function ListenPage() {
  const { order, title } = Route.useLoaderData();
  const [variant, setVariant] = useState<any>(null);
  const playRecorded = useRef(false);
  const viewRecorded = useRef(false);
  const playEventIdRef = useRef<number | null>(null);
  const pendingFirstPlayRef = useRef<Promise<void> | null>(null);

  useEffect(() => {
    const variants = (order.audio_variants as any[]) ?? [];
    const chosen =
      variants.find((v) => v.id === order.selected_variant_id) ?? variants[0];
    setVariant(chosen);
  }, [order]);

  // Fire once per browser session — tells Stripe the recipient actually opened
  // the share page. Dedupe key includes order id so each shared song counts
  // independently for the buyer.
  useEffect(() => {
    if (viewRecorded.current) return;
    const sessionKey = `rs_share_view_${order.id}`;
    try {
      if (typeof window !== "undefined" && sessionStorage.getItem(sessionKey)) {
        viewRecorded.current = true;
        return;
      }
      sessionStorage.setItem(sessionKey, "1");
    } catch {
      /* sessionStorage unavailable (private mode) — still ping */
    }
    viewRecorded.current = true;
    void supabase.functions
      .invoke("record-play", {
        body: { orderId: order.id, kind: "view", source: "listen_page" },
      })
      .catch(() => {
        /* silent — analytics is best-effort */
      });
  }, [order.id]);

  const lyrics = (order.brief as any)?.lyrics ?? "";

  // Fire once per page load when the user actually starts playing.
  // This becomes Stripe chargeback evidence ("they listened to their song").
  const handleFirstPlay = () => {
    if (playRecorded.current) return;
    playRecorded.current = true;
    pendingFirstPlayRef.current = supabase.functions
      .invoke("record-play", {
        body: {
          orderId: order.id,
          variantId: variant?.id ?? null,
          source: "listen_page",
        },
      })
      .then(({ data }) => {
        const id = (data as any)?.playEventId;
        if (typeof id === "number") playEventIdRef.current = id;
      })
      .catch(() => {
        // Silent — chargeback evidence is best-effort; never block playback.
      });
  };

  // Push cumulative listened-ms back to the same play_events row. Heartbeats
  // every ~10s while playing + a final flush on pause/ended/pagehide.
  const handleListenUpdate = (totalMs: number, opts: { final: boolean }) => {
    const send = () => {
      const id = playEventIdRef.current;
      if (!id) return;
      // Try sendBeacon on final flush (survives page unload), else regular fetch.
      const body = JSON.stringify({
        orderId: order.id,
        playEventId: id,
        durationMs: totalMs,
      });
      if (opts.final && typeof navigator !== "undefined" && navigator.sendBeacon) {
        const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/record-play`;
        const blob = new Blob([body], { type: "application/json" });
        try {
          navigator.sendBeacon(url, blob);
          return;
        } catch {
          /* fall through to invoke */
        }
      }
      void supabase.functions
        .invoke("record-play", {
          body: { orderId: order.id, playEventId: id, durationMs: totalMs },
        })
        .catch(() => {});
    };
    // If first-play insert is still in flight, wait for the id then send.
    if (!playEventIdRef.current && pendingFirstPlayRef.current) {
      pendingFirstPlayRef.current.then(send).catch(() => {});
    } else {
      send();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-warm">
      <main className="mx-auto max-w-2xl px-6 py-20">
        {(() => {
          const name = order.dog_name ?? "your beloved dog";
          const gender = (order.dog_gender ?? "").toLowerCase();
          const pronoun = gender === "female" ? "her" : gender === "male" ? "him" : "them";
          const breed = order.dog_breed?.trim();
          const tone = (order.brief as any)?.emotional_tone;
          const meta = [breed, order.genre].filter(Boolean).join(" · ");
          return (
            <div className="text-center">
              <RibbonMark className="mx-auto h-12 w-12 text-primary" />
              <p className="mt-4 text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
                A song for {pronoun}
              </p>
              <h1 className="mt-3 font-display text-5xl font-semibold leading-tight text-foreground md:text-6xl">
                {name}
              </h1>
              {meta && (
                <p className="mt-3 text-sm text-muted-foreground">{meta}</p>
              )}
              {title && (
                <p className="mt-5 font-display text-xl italic text-muted-foreground md:text-2xl">
                  "{title}"
                </p>
              )}
              {tone && (
                <p className="mt-2 text-xs uppercase tracking-[0.18em] text-muted-foreground/70">
                  {tone}
                </p>
              )}
            </div>
          );
        })()}

        <div className="mt-10">
          {variant?.audio_url ? (
            <AudioPlayer
              variant="full"
              title={title ?? `A Song for ${order.dog_name ?? "you"}`}
              artist={`${order.genre ?? "Acoustic"} · ${(order as any).voice ?? "Vocal"}`}
              src={variant.audio_url}
              lyrics={lyrics}
              onFirstPlay={handleFirstPlay}
              onListenUpdate={handleListenUpdate}
            />
          ) : (
            <p className="text-center text-muted-foreground">
              Audio is loading. Please refresh in a moment.
            </p>
          )}
        </div>

        <p className="mt-12 text-center font-display text-base italic text-muted-foreground">
          Forever in our hearts, {order.dog_name ?? "sweet friend"}.
        </p>
        <p className="mt-3 text-center text-xs text-muted-foreground">
          Made with love via{" "}
          <Link to="/" className="font-medium text-foreground underline">
            PawPrint Song
          </Link>
        </p>
      </main>
    </div>
  );
}
