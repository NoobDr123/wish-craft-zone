import { createFileRoute } from "@tanstack/react-router";
import { AudioPlayer } from "@/components/AudioPlayer";
import { RibbonMark } from "@/components/Logo";

export const Route = createFileRoute("/listen/$id")({
  component: ListenPage,
  head: () => ({
    meta: [
      { title: "A song for you · RibbonSong" },
      {
        name: "description",
        content: "A personal song crafted with love, just for you.",
      },
    ],
  }),
});

const DEMO_LYRICS = `[Verse 1]
You taught me how to laugh at rain
How to hold a hand and ease the pain
Every story, every quiet song
You're the reason I am strong

[Chorus]
And I will sing you through the night
A ribbon of love, a thread of light
Whatever comes, you're not alone
I'll carry you all the way home

[Verse 2]
The little kitchen, summer pies
The way you crinkled up your eyes
You're the kindness I still know
Wherever, whoever I go

[Chorus]
And I will sing you through the night
A ribbon of love, a thread of light
Whatever comes, you're not alone
I'll carry you all the way home

[Outro]
We'll carry you all the way home`;

function ListenPage() {
  return (
    <div className="min-h-screen bg-gradient-warm">
      <main className="mx-auto max-w-2xl px-6 py-20">
        <div className="text-center">
          <RibbonMark className="mx-auto h-12 w-12 text-primary" />
          <p className="mt-4 text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
            A song for you
          </p>
          <h1 className="mt-4 font-display text-5xl font-semibold leading-tight text-foreground md:text-6xl">
            From someone who loves you.
          </h1>
        </div>

        <figure className="mt-12 rounded-[2rem] border border-border bg-card/80 p-8 shadow-soft backdrop-blur md:p-10">
          <blockquote className="font-display text-xl italic leading-relaxed text-foreground">
            &ldquo;I wrote this with you in my heart. Every word is true. I wanted
            you to have something you could play whenever you needed to feel
            held. I love you.&rdquo;
          </blockquote>
          <figcaption className="mt-4 text-sm text-muted-foreground">
            , With all my love
          </figcaption>
        </figure>

        <div className="mt-10">
          <AudioPlayer
            variant="full"
            title="A Song For You"
            artist="Made with love"
            src="https://cdn.pixabay.com/audio/2022/10/30/audio_347111d654.mp3"
            lyrics={DEMO_LYRICS}
          />
        </div>

        <p className="mt-12 text-center text-xs text-muted-foreground">
          Made with love via{" "}
          <span className="font-medium text-foreground">RibbonSong</span>
        </p>
      </main>
    </div>
  );
}
