import { createFileRoute, Link } from "@tanstack/react-router";
import { Heart, Music, Sparkles, ArrowRight, Quote } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { AudioPlayer } from "@/components/AudioPlayer";
import heroImg from "@/assets/hero-ribbon.jpg";

export const Route = createFileRoute("/")({
  component: LandingPage,
  head: () => ({
    meta: [
      { title: "RibbonSong — A song for the one fighting cancer" },
      {
        name: "description",
        content:
          "When someone you love is facing cancer, a card feels too small. RibbonSong turns your memories, prayers, and love into a personal song that lasts forever.",
      },
      {
        property: "og:title",
        content: "RibbonSong — A song for the one fighting cancer",
      },
      {
        property: "og:description",
        content:
          "Personalized songs for cancer fighters, survivors, and those we've loved and lost. Because sometimes words aren't enough.",
      },
      { property: "og:image", content: heroImg },
      { name: "twitter:image", content: heroImg },
    ],
  }),
});

const samples = [
  {
    title: "For My Mother — Through Chemo",
    artist: "Acoustic Folk · Female Voice",
    src: "https://cdn.pixabay.com/audio/2022/10/30/audio_347111d654.mp3",
  },
  {
    title: "Stronger Than the Storm",
    artist: "Uplifting Pop · For a survivor",
    src: "https://cdn.pixabay.com/audio/2024/02/15/audio_03ca069cf8.mp3",
  },
  {
    title: "Quiet Light — In Loving Memory",
    artist: "Cinematic · Strings",
    src: "https://cdn.pixabay.com/audio/2022/03/15/audio_c8c8a73467.mp3",
  },
  {
    title: "The Promise — For Dad",
    artist: "Country · Male Voice",
    src: "https://cdn.pixabay.com/audio/2023/06/10/audio_6c7c89a60a.mp3",
  },
];

const steps = [
  {
    icon: Heart,
    title: "Tell their story",
    body: "A gentle, guided conversation about who they are, what they're fighting for, and the moments you'll never forget.",
  },
  {
    icon: Music,
    title: "Choose their sound",
    body: "Pick a genre, tempo, and voice — from acoustic folk to country, gospel, or uplifting pop.",
  },
  {
    icon: Sparkles,
    title: "Give the gift of music",
    body: "Within seven days, you'll receive a beautifully produced song and a private share page they can keep forever.",
  },
];

const stories = [
  {
    quote:
      "I sent it to my mom on the morning of her last chemo session. She listened on the drive home and we both cried the whole way. It captured her exactly.",
    name: "Rachel L.",
    role: "Daughter · for her mother in treatment",
  },
  {
    quote:
      "We played it at his bedside the night before he passed. The chorus said the things we couldn't. It is the most precious thing our family owns.",
    name: "Marcus D.",
    role: "Brother · in loving memory",
  },
  {
    quote:
      "Two years cancer-free and this song still plays at every birthday. It became our family's anthem.",
    name: "Priya & Sam",
    role: "For their daughter, survivor",
  },
];

const forWho = [
  {
    title: "For the newly diagnosed",
    body: "When the world has just changed and the right words don't exist yet.",
  },
  {
    title: "For someone in treatment",
    body: "A reminder, on the hardest days, of who they are and who's standing with them.",
  },
  {
    title: "For a survivor",
    body: "A celebration of every scan, every milestone, every breath of remission.",
  },
  {
    title: "In loving memory",
    body: "A keepsake that holds their voice in your life — for memorials, anniversaries, and quiet nights.",
  },
];

function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-20 md:grid-cols-2 md:py-28">
          <div className="space-y-8">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              For the bravest fighters and the families who love them
            </span>
            <h1 className="font-display text-5xl font-semibold leading-[1.05] tracking-tight text-foreground text-balance md:text-6xl lg:text-7xl">
              When cancer takes the words away,{" "}
              <span className="italic text-primary">give them a song.</span>
            </h1>
            <p className="max-w-xl text-lg leading-relaxed text-muted-foreground md:text-xl">
              A card feels too small. A bouquet wilts. RibbonSong turns your
              memories, prayers, and love into a personal song — a keepsake for
              the one fighting, surviving, or remembered.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <Link
                to="/create"
                className="group inline-flex items-center gap-2 rounded-full bg-primary px-8 py-4 text-base font-medium text-primary-foreground shadow-glow transition-all hover:bg-primary-hover hover:shadow-card"
              >
                Create their song
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <a
                href="#samples"
                className="text-sm font-medium text-foreground underline-offset-4 hover:underline"
              >
                Listen to samples ↓
              </a>
            </div>
            <div className="flex items-center gap-6 pt-4 text-sm text-muted-foreground">
              <div className="flex -space-x-2">
                {["bg-peach", "bg-ribbon/40", "bg-primary/30", "bg-success/40"].map(
                  (c) => (
                    <div
                      key={c}
                      className={`h-8 w-8 rounded-full border-2 border-background ${c}`}
                    />
                  ),
                )}
              </div>
              <p>
                <span className="font-medium text-foreground">2,400+ families</span>{" "}
                have gifted a RibbonSong.
              </p>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -left-6 -top-6 h-32 w-32 rounded-full bg-ribbon/20 blur-3xl" />
            <div className="absolute -bottom-8 -right-6 h-40 w-40 rounded-full bg-primary/20 blur-3xl" />
            <div className="relative overflow-hidden rounded-[2.5rem] border border-border bg-card shadow-card">
              <img
                src={heroImg}
                alt="A flowing watercolor ribbon of musical notes in terracotta and lavender"
                width={1536}
                height={1280}
                className="h-full w-full object-cover"
              />
            </div>
            <div className="absolute -bottom-6 left-6 right-6 rounded-2xl border border-border bg-card/95 p-4 shadow-card backdrop-blur md:-bottom-8 md:left-auto md:right-8 md:w-72">
              <p className="font-display text-sm italic text-foreground">
                &ldquo;The most personal gift for the bravest fighter.&rdquo;
              </p>
              <p className="mt-1 text-xs text-muted-foreground">— Our promise</p>
            </div>
          </div>
        </div>
      </section>

      {/* Samples */}
      <section id="samples" className="bg-card/50 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-12 max-w-2xl">
            <p className="text-sm font-medium uppercase tracking-wider text-primary">
              Listen
            </p>
            <h2 className="mt-3 font-display text-4xl font-semibold text-foreground md:text-5xl">
              Hear what&rsquo;s possible.
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Every song is original, written and produced just for one person.
              These are real songs from real families.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {samples.map((s) => (
              <AudioPlayer key={s.title} {...s} />
            ))}
          </div>
        </div>
      </section>

      {/* Who it's for */}
      <section id="for-who" className="py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-12 max-w-2xl">
            <p className="text-sm font-medium uppercase tracking-wider text-primary">
              Who it's for
            </p>
            <h2 className="mt-3 font-display text-4xl font-semibold text-foreground md:text-5xl">
              Wherever they are in the fight, we'll meet them there.
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Cancer touches every family differently. A RibbonSong is shaped to
              honor exactly where your loved one is right now.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {forWho.map((item) => (
              <div
                key={item.title}
                className="rounded-3xl border border-border bg-card p-6 shadow-soft"
              >
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-ribbon/15">
                  <Heart className="h-5 w-5 text-ribbon" />
                </div>
                <h3 className="font-display text-xl font-semibold text-foreground">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="bg-card/50 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-16 max-w-2xl">
            <p className="text-sm font-medium uppercase tracking-wider text-primary">
              How it works
            </p>
            <h2 className="mt-3 font-display text-4xl font-semibold text-foreground md:text-5xl">
              Three gentle steps to a song that lasts forever.
            </h2>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            {steps.map((step, i) => (
              <div
                key={step.title}
                className="relative rounded-3xl border border-border bg-card p-8 shadow-soft"
              >
                <div className="absolute -top-4 left-8 inline-flex h-8 items-center justify-center rounded-full bg-ribbon px-3 font-display text-sm text-ribbon-foreground">
                  Step {i + 1}
                </div>
                <step.icon className="h-8 w-8 text-primary" />
                <h3 className="mt-6 font-display text-2xl font-semibold text-foreground">
                  {step.title}
                </h3>
                <p className="mt-3 leading-relaxed text-muted-foreground">
                  {step.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stories */}
      <section id="stories" className="bg-card/50 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-12 max-w-2xl">
            <p className="text-sm font-medium uppercase tracking-wider text-primary">
              Stories
            </p>
            <h2 className="mt-3 font-display text-4xl font-semibold text-foreground md:text-5xl">
              Songs that became part of the journey.
            </h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {stories.map((s) => (
              <figure
                key={s.name}
                className="flex h-full flex-col justify-between rounded-3xl border border-border bg-card p-8 shadow-soft"
              >
                <Quote className="h-7 w-7 text-ribbon" />
                <blockquote className="mt-4 font-display text-lg leading-relaxed text-foreground">
                  &ldquo;{s.quote}&rdquo;
                </blockquote>
                <figcaption className="mt-6 text-sm">
                  <p className="font-medium text-foreground">{s.name}</p>
                  <p className="text-muted-foreground">{s.role}</p>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-28">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="font-display text-4xl font-semibold leading-tight text-foreground md:text-6xl">
            Their spirit, captured in music.
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
            A card feels too small. A generic gift feels empty. Give them
            something only you could give.
          </p>
          <Link
            to="/create"
            className="mt-10 inline-flex items-center gap-2 rounded-full bg-primary px-10 py-5 text-base font-medium text-primary-foreground shadow-glow transition-all hover:bg-primary-hover"
          >
            Start their song · $39
            <ArrowRight className="h-4 w-4" />
          </Link>
          <p className="mt-4 text-xs text-muted-foreground">
            Includes lyrics, full audio, and a beautiful share page.
          </p>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
