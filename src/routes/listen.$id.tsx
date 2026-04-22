// Listen page — public share view of a delivered song.
// Anyone with the URL can play. Loads order by share_page_slug or id.

import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AudioPlayer } from "@/components/AudioPlayer";
import { RibbonMark } from "@/components/Logo";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/listen/$id")({
  component: ListenPage,
  head: ({ loaderData }: any) => ({
    meta: [
      {
        title: loaderData?.title
          ? `${loaderData.title} · A song for you · RibbonSong`
          : "A song for you · RibbonSong",
      },
      {
        name: "description",
        content: "A personal song crafted with love, just for you.",
      },
      { property: "og:title", content: loaderData?.title ?? "A song for you" },
      {
        property: "og:description",
        content: "A personal song crafted with love.",
      },
    ],
  }),
  loader: async ({ params }) => {
    // Reads from the safe `public_shared_songs` view — no buyer email, no Stripe IDs,
    // no personal notes are exposed publicly.
    const { data, error } = await (supabase as any)
      .from("public_shared_songs")
      .select(
        "id, recipient_name, audio_variants, selected_variant_id, brief, genre, tempo, share_page_slug",
      )
      .or(`share_page_slug.eq.${params.id},id.eq.${params.id}`)
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
          Back to RibbonSong
        </Link>
      </div>
    </div>
  ),
});

function ListenPage() {
  const { order, title } = Route.useLoaderData();
  const [variant, setVariant] = useState<any>(null);

  useEffect(() => {
    const variants = (order.audio_variants as any[]) ?? [];
    const chosen =
      variants.find((v) => v.id === order.selected_variant_id) ?? variants[0];
    setVariant(chosen);
  }, [order]);

  const lyrics = (order.brief as any)?.lyrics ?? "";

  return (
    <div className="min-h-screen bg-gradient-warm">
      <main className="mx-auto max-w-2xl px-6 py-20">
        <div className="text-center">
          <RibbonMark className="mx-auto h-12 w-12 text-primary" />
          <p className="mt-4 text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
            A song for {order.recipient_name}
          </p>
          <h1 className="mt-4 font-display text-5xl font-semibold leading-tight text-foreground md:text-6xl">
            {title ?? "From someone who loves you."}
          </h1>
        </div>

        <div className="mt-10">
          {variant?.audio_url ? (
            <AudioPlayer
              variant="full"
              title={title ?? `A Song for ${order.recipient_name}`}
              artist={`${order.genre ?? "Acoustic"} · ${order.tempo ?? "Mid-tempo"}`}
              src={variant.audio_url}
              lyrics={lyrics}
            />
          ) : (
            <p className="text-center text-muted-foreground">
              Audio is loading. Please refresh in a moment.
            </p>
          )}
        </div>

        <p className="mt-12 text-center text-xs text-muted-foreground">
          Made with love via{" "}
          <Link to="/" className="font-medium text-foreground underline">
            RibbonSong
          </Link>
        </p>
      </main>
    </div>
  );
}
