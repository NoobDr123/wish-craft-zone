import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import rachelPhoto from "@/assets/rachel-mother-real.jpg";

const RACHEL_SONG_URL =
  "https://tempfile.aiquickdraw.com/r/87ddf1c43b994c3c9e593b383ec8de16.mp3";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { supabase } from "@/integrations/supabase/client";

import heroImg from "@/assets/hero-ribbon.jpg";
import whoNewlyDiagnosed from "@/assets/who-newly-diagnosed.png";
import whoInTreatment from "@/assets/who-in-treatment.png";
import whoSurvivor from "@/assets/who-survivor.png";
import whoMemory from "@/assets/who-memory.png";
import whoChild from "@/assets/who-child.png";
import whoCaregiver from "@/assets/who-caregiver.png";
import whoParent from "@/assets/who-parent.png";
import whoStrength from "@/assets/who-strength.png";
import whoYourself from "@/assets/who-yourself.png";

export const Route = createFileRoute("/")({
  component: LandingPage,
  loader: async () => {
    const { data, error } = await supabase
      .from("featured_samples")
      .select(
        "id,title,quote,for_text,genre_label,cover_image_url,audio_url,lyrics",
      )
      .eq("published", true)
      .not("audio_url", "is", null)
      .order("sort_order", { ascending: true })
      .limit(6);
    if (error) {
      console.error("[index loader] featured_samples error", error);
      return { samples: [] as FeaturedSample[] };
    }
    return { samples: (data ?? []) as FeaturedSample[] };
  },
  head: () => ({
    meta: [
      { title: "RibbonSong — Give them a song when words run out" },
      {
        name: "description",
        content:
          "When cancer takes the words away, give them a song. Written with care. Produced in studio. Delivered to your inbox in five days.",
      },
      {
        property: "og:title",
        content: "RibbonSong — Give them a song when words run out",
      },
      {
        property: "og:description",
        content:
          "Personalized songs for cancer fighters, survivors, and those we've loved and lost.",
      },
      { property: "og:image", content: heroImg },
      { name: "twitter:image", content: heroImg },
    ],
  }),
});

interface FeaturedSample {
  id: string;
  title: string;
  quote: string | null;
  for_text: string | null;
  genre_label: string;
  cover_image_url: string | null;
  audio_url: string | null;
  lyrics: string | null;
}

// Fallback display data when no samples are published yet
const fallbackSamples: Array<{
  title: string;
  quote: string;
  for_text: string;
  genre_label: string;
  cover_image_url: string;
}> = [
  {
    title: "For My Mother (Through Chemo)",
    quote:
      '"She used to sing us to sleep. I wanted something she could play when she\'s scared."',
    for_text: "Written for Diane, 58. Breast cancer, in treatment.",
    genre_label: "Acoustic Folk · Female Voice",
    cover_image_url:
      "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=600&q=80",
  },
  {
    title: "Stronger Than the Storm",
    quote: '"My son asks for it every time we get a clear scan."',
    for_text: "Written for James, 12. Leukemia, in remission.",
    genre_label: "Uplifting Pop · Male Voice",
    cover_image_url:
      "https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?auto=format&fit=crop&w=600&q=80",
  },
  {
    title: "Quiet Light (In Loving Memory)",
    quote: '"We played it at her memorial instead of a hymn. It was her."',
    for_text: "Written for Eleanor, 71. Ovarian cancer, in loving memory.",
    genre_label: "Cinematic · Strings",
    cover_image_url:
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=600&q=80",
  },
  {
    title: "The Promise (For Dad)",
    quote: '"I gave it to him in hospice. He played it three times in a row."',
    for_text: "Written for Tom, 64. Stage IV pancreatic.",
    genre_label: "Country · Male Voice",
    cover_image_url:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80",
  },
  {
    title: "Rachel's Anthem",
    quote: '"Two years free of cancer. We play it at every birthday now."',
    for_text: "Written for Rachel, 34. Breast cancer, survivor.",
    genre_label: "Gospel · Female Voice",
    cover_image_url:
      "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&w=600&q=80",
  },
  {
    title: "Carry Me Home",
    quote:
      '"My husband\'s prayer set to music. The choir at his service sang it."',
    for_text: "Written for David, 52. Glioblastoma, in loving memory.",
    genre_label: "Worship · Duet",
    cover_image_url:
      "https://images.unsplash.com/photo-1518976024611-28bf4b48222e?auto=format&fit=crop&w=600&q=80",
  },
];

const useCases = [
  {
    eyebrow: "Newly Diagnosed",
    label: "When the world just changed",
    body: "For the days right after the news, when nothing makes sense yet.",
    img: whoNewlyDiagnosed,
  },
  {
    eyebrow: "In Treatment",
    label: "A reminder on the hardest days",
    body: "Something to play during chemo, on the drive home, in the quiet hours.",
    img: whoInTreatment,
  },
  {
    eyebrow: "For a Survivor",
    label: "Every scan. Every milestone.",
    body: "An anthem for the bell rung, the all-clear, the next birthday.",
    img: whoSurvivor,
  },
  {
    eyebrow: "In Loving Memory",
    label: "A keepsake that holds them",
    body: "A song that carries their voice, their love, their light forward.",
    img: whoMemory,
  },
  {
    eyebrow: "For a Child Fighting",
    label: "Courage set to music",
    body: "Something brave they can play when the hospital feels too big.",
    img: whoChild,
  },
  {
    eyebrow: "For a Caregiver",
    label: "For the ones who stand beside them",
    body: "For the partners, the parents, the friends who never let go.",
    img: whoCaregiver,
  },
  {
    eyebrow: "For a Parent",
    label: "The ones who raised you",
    body: "For your mom, your dad, the person who taught you what love is.",
    img: whoParent,
  },
  {
    eyebrow: "For Strength",
    label: "When they need it most",
    body: "Something to hold onto when the weight feels too much to carry.",
    img: whoStrength,
  },
  {
    eyebrow: "For Yourself",
    label: "A song for your own fight",
    body: "Sometimes the song you need most is the one written for you.",
    img: whoYourself,
  },
];

const testimonials: Array<{
  quote: string;
  name: string;
  meta: string;
  avatar: string;
}> = [
  {
    quote:
      '"I almost didn\'t order because it felt like too much. I was wrong. It\'s the only thing I gave him during the whole fight that he asked to hear again."',
    name: "David K.",
    meta: "Austin, TX  ·  Son, for his father in treatment",
    avatar: "https://i.pravatar.cc/80?img=67",
  },
  {
    quote:
      '"My mom played it in her earbuds during infusions. She said the nurses asked her what she was listening to every single week."',
    name: "Sarah R.",
    meta: "Columbus, OH  ·  Daughter, for her mother",
    avatar: "https://i.pravatar.cc/80?img=45",
  },
  {
    quote:
      '"Two years free of cancer, and this song still plays at every birthday. It became our family\'s anthem. Our daughter asks for it by name now."',
    name: "Priya & Sam",
    meta: "Seattle, WA  ·  Parents of a survivor",
    avatar: "https://i.pravatar.cc/80?img=39",
  },
  {
    quote:
      '"We played it at his bedside the night before he passed. The chorus said the things we couldn\'t. The most precious thing our family owns."',
    name: "Marcus D.",
    meta: "Phoenix, AZ  ·  Brother, in loving memory",
    avatar: "https://i.pravatar.cc/80?img=52",
  },
  {
    quote:
      '"He heard it twice before we lost him. Thank you will never cover it."',
    name: "Patricia M.",
    meta: "Tampa, FL  ·  Wife, for her husband in hospice",
    avatar: "https://i.pravatar.cc/80?img=23",
  },
  {
    quote:
      '"It captured something I couldn\'t put into words for fifteen years. The first time I played it for her, we both just sat in the car and cried."',
    name: "Jenna L.",
    meta: "Denver, CO  ·  Daughter, for her mother in remission",
    avatar: "https://i.pravatar.cc/80?img=29",
  },
];

const faqs = [
  {
    q: "How long does it take?",
    a: "Standard delivery is five days. If you need it sooner, our 24-hour express option is available at checkout. If you're up against a hospice timeline or a specific date we need to hit, tell us. We will do everything in our power to meet the moment.",
  },
  {
    q: "What if I don't know what to say?",
    a: "Most families don't. That's why the questionnaire is guided. The prompts bring the right memories up on their own. You don't have to find the words. You just have to answer.",
  },
  {
    q: "Can I stay anonymous? I want it to be a surprise.",
    a: "Yes. We never contact the recipient without your permission. Many families gift their RibbonSong as a surprise.",
  },
  {
    q: "What if they've already passed?",
    a: "Many of our most moving songs have been written in loving memory. You don't need their voice, their permission, or their knowledge. You just need your memories.",
  },
  {
    q: "What if the song doesn't feel right?",
    a: "We rewrite it. Free. As many times as it takes. If after all of that it still isn't right, we refund you in full. No questions.",
  },
  {
    q: "Can I share it publicly? Use it at a memorial? Play it at church?",
    a: "Yes to all of those. Once it's yours, it's yours.",
  },
  {
    q: "Is this a subscription?",
    a: "No. The song is yours forever. No ads, no paywall, no renewal.",
  },
  {
    q: "Who's behind RibbonSong?",
    a: "RibbonSong was founded by a team who had each watched someone they love go through cancer. We started this because we couldn't find the right words either, and we believed music could hold what language alone could not.",
  },
];

function PrimaryBtn({
  children,
  large,
  fullWidth,
  to = "/create",
}: {
  children: React.ReactNode;
  large?: boolean;
  fullWidth?: boolean;
  to?: string;
}) {
  return (
    <Link
      to={to}
      className={`group inline-flex items-center justify-center gap-2.5 rounded-full bg-[#8D6FAF] font-semibold text-[#FFF7EE] tracking-[0.005em] shadow-[0_6px_16px_rgba(141,111,175,0.28)] transition-all hover:-translate-y-px hover:bg-[#6B4F8A] hover:shadow-[0_10px_24px_rgba(141,111,175,0.35)] ${
        large ? "px-[34px] py-[18px] text-[16.5px]" : "px-[26px] py-[14px] text-[15px]"
      } ${fullWidth ? "w-full sm:w-auto" : ""}`}
    >
      {children}
      <span className="transition-transform group-hover:translate-x-1">→</span>
    </Link>
  );
}

function Eyebrow({
  children,
  className = "",
  center,
}: {
  children: React.ReactNode;
  className?: string;
  center?: boolean;
}) {
  return (
    <div
      className={`mb-[22px] inline-flex items-center gap-2 text-[11.5px] font-semibold uppercase tracking-[0.16em] text-[#8D6FAF] ${
        center ? "justify-center" : ""
      } ${className}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-[#8D6FAF]" />
      {children}
    </div>
  );
}

function LandingPage() {
  const { samples } = Route.useLoaderData() as { samples: FeaturedSample[] };
  // (sample modal removed — playback is now inline on each card)
  const heroAudioRef = useRef<HTMLAudioElement | null>(null);
  const [heroPlaying, setHeroPlaying] = useState(false);
  const [heroEverPlayed, setHeroEverPlayed] = useState(false);

  // Inline sample playback — one audio at a time, no modal
  const sampleAudioRef = useRef<HTMLAudioElement | null>(null);
  const [playingSampleId, setPlayingSampleId] = useState<string | null>(null);

  const handleSamplePlay = (s: FeaturedSample) => {
    if (!s.audio_url) return;
    const a = sampleAudioRef.current;
    if (!a) return;
    // Toggle off if same one is already playing
    if (playingSampleId === s.id) {
      a.pause();
      setPlayingSampleId(null);
      return;
    }
    // Pause hero if it's playing
    if (heroAudioRef.current && heroPlaying) {
      heroAudioRef.current.pause();
      setHeroPlaying(false);
    }
    a.src = s.audio_url;
    a.currentTime = 0;
    a.play()
      .then(() => setPlayingSampleId(s.id))
      .catch(() => setPlayingSampleId(null));
  };

  const handleHeroPlay = () => {
    const a = heroAudioRef.current;
    if (!a) return;
    if (heroPlaying) {
      a.pause();
      setHeroPlaying(false);
      return;
    }
    // Pause any playing sample
    if (sampleAudioRef.current && playingSampleId) {
      sampleAudioRef.current.pause();
      setPlayingSampleId(null);
    }
    setHeroEverPlayed(true);
    a.currentTime = 0;
    a.play()
      .then(() => setHeroPlaying(true))
      .catch(() => {});
  };

  // Choose displayed list — real samples if available, otherwise the fallback set
  const displaySamples =
    samples.length > 0
      ? samples
      : (fallbackSamples.map((s, i) => ({
          id: `fallback-${i}`,
          title: s.title,
          quote: s.quote,
          for_text: s.for_text,
          genre_label: s.genre_label,
          cover_image_url: s.cover_image_url,
          audio_url: null,
          lyrics: null,
        })) satisfies FeaturedSample[]);

  return (
    <div className="overflow-x-hidden bg-[#F6F0E6] font-sans text-[#1F1B16]">
      <SiteHeader />

      {/* HERO */}
      <section className="relative overflow-hidden px-0 py-[40px] pb-[40px] sm:py-[70px] sm:pb-[60px]">
        <div
          className="pointer-events-none absolute -right-[120px] -top-[100px] h-[420px] w-[420px] rounded-full opacity-60"
          style={{
            background:
              "radial-gradient(circle, #E5D9EF 0%, transparent 70%)",
          }}
        />
        <div className="mx-auto max-w-[1200px] px-5 sm:px-6">
          <div className="grid items-center gap-8 md:grid-cols-[1.15fr_1fr] md:gap-[60px]">
            <div className="order-2 md:order-1">
              <Eyebrow>The Most Meaningful Gift For Someone You Love Fighting Cancer</Eyebrow>
              <h1 className="mb-[22px] max-w-[700px] font-display text-[clamp(28px,7.5vw,64px)] font-medium italic leading-[1.08] tracking-[-0.025em] text-[#1F1B16] md:mb-[26px]">
                <span className="font-display text-[1.05em] font-semibold not-italic text-[#8D6FAF]">
                  &ldquo;
                </span>
                I played it on the drive home from her last chemo. We both
                cried the whole way.
                <span className="font-display text-[1.05em] font-semibold not-italic text-[#8D6FAF]">
                  &rdquo;
                </span>
              </h1>
              <div className="mb-6 text-[13px] text-[#8A8175] md:mb-7 md:text-sm">
                <strong className="font-semibold text-[#5A5148]">
                  Rachel L., Columbus OH
                </strong>{" "}
                &nbsp;·&nbsp; Daughter, for her mother in treatment
              </div>
              <p className="mb-7 max-w-[540px] text-[16px] leading-[1.55] text-[#5A5148] md:mb-8 md:text-[18px]">
                When cancer takes the words away, give them a song.{" "}
                <strong className="font-semibold text-[#1F1B16]">
                  Written with care. Produced in studio. Delivered to your
                  inbox.
                </strong>
              </p>
              <div className="mb-7 flex w-full flex-col items-stretch gap-3 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
                <PrimaryBtn large fullWidth>Start their song</PrimaryBtn>
              </div>
              <div className="flex flex-col items-center gap-2 text-center text-[13px] text-[#5A5148] sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-3 sm:gap-y-2 sm:text-left sm:gap-3.5">
                <div className="flex items-center gap-2">
                  <span className="tracking-[1px] text-[#C9A85A]">★★★★★</span>
                  <span>
                    <strong className="text-[#1F1B16]">4.9</strong> from 2,400+ families
                  </span>
                </div>
                <span className="hidden sm:inline-block h-[3px] w-[3px] rounded-full bg-[#8A8175]" />
                <span className="hidden sm:inline">Free revisions</span>
                <span className="hidden sm:inline-block h-[3px] w-[3px] rounded-full bg-[#8A8175]" />
                <span className="hidden sm:inline">Money back guarantee</span>
              </div>
              <div className="mt-8 flex items-center gap-3.5 border-t border-[#D9CEB9] pt-6 md:mt-9 md:pt-7">
                <div className="flex shrink-0">
                  {[47, 32, 26, 44, 16].map((id, i) => (
                    <img
                      key={id}
                      src={`https://i.pravatar.cc/80?img=${id}`}
                      alt=""
                      className={`h-9 w-9 rounded-full border-[2.5px] border-[#F6F0E6] object-cover ${
                        i === 0 ? "" : "-ml-2.5"
                      }`}
                    />
                  ))}
                </div>
                <div className="text-[13px] leading-[1.4] text-[#5A5148] md:text-[13.5px]">
                  Loved by{" "}
                  <strong className="text-[#1F1B16]">2,400+ families</strong>{" "}
                  fighting, surviving, and remembering
                </div>
              </div>
            </div>

            {/* Hero photo + song */}
            <div className="relative order-1 md:order-2">
              <div className="group relative aspect-[4/5] overflow-hidden rounded-[18px] bg-[#ECE2D0] shadow-[0_20px_60px_rgba(31,27,22,0.12)]">
                {heroPlaying ? (
                  <video
                    src="/rachel-mother-real.mp4"
                    poster={rachelPhoto}
                    className="h-full w-full object-contain bg-[#1F1B16]"
                    autoPlay
                    loop
                    muted
                    playsInline
                    onClick={handleHeroPlay}
                  />
                ) : (
                  <img
                    src={rachelPhoto}
                    alt="Rachel and her mother holding hands in the car after her last chemo infusion"
                    className="h-full w-full object-contain bg-[#1F1B16]"
                    onClick={handleHeroPlay}
                  />
                )}
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/55 via-black/15 to-transparent" />

                <audio
                  ref={heroAudioRef}
                  src={RACHEL_SONG_URL}
                  preload="metadata"
                  onEnded={() => { setHeroPlaying(false); }}
                />

                <button
                  aria-label={heroPlaying ? "Pause song" : "Listen to Example"}
                  onClick={handleHeroPlay}
                  className="absolute bottom-3 right-3 z-20 flex items-center gap-2 rounded-full bg-[rgba(246,240,230,0.97)] py-2 pl-2 pr-3.5 shadow-[0_8px_24px_rgba(0,0,0,0.28)] ring-1 ring-black/5 transition-all hover:-translate-y-px hover:shadow-[0_10px_28px_rgba(0,0,0,0.32)] sm:bottom-4 sm:right-4 sm:py-2.5 sm:pl-2.5 sm:pr-4"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#8D6FAF] sm:h-8 sm:w-8">
                    {heroPlaying ? (
                      <span className="flex gap-[3px]">
                        <span className="block h-2.5 w-[3px] rounded-sm bg-white sm:h-3" />
                        <span className="block h-2.5 w-[3px] rounded-sm bg-white sm:h-3" />
                      </span>
                    ) : (
                      <span
                        className="ml-[2px] inline-block"
                        style={{
                          width: 0,
                          height: 0,
                          borderLeft: "8px solid #ffffff",
                          borderTop: "5px solid transparent",
                          borderBottom: "5px solid transparent",
                        }}
                      />
                    )}
                  </span>
                  <span className="text-[13px] font-semibold tracking-[0.005em] text-[#1F1B16] sm:text-[14px]">
                    {heroPlaying ? "Pause" : "Listen to Example"}
                  </span>
                </button>

                {heroPlaying && (
                  <div className="absolute left-3 top-3 flex items-center gap-2 rounded-full bg-black/45 px-3 py-1.5 backdrop-blur-sm sm:left-4 sm:top-4">
                    <span className="flex h-2 w-2 animate-pulse rounded-full bg-[#E8C547]" />
                    <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-white/95">
                      For My Mother — Now playing
                    </span>
                  </div>
                )}
              </div>
              <div className="mt-3 px-1 text-[13px] leading-[1.5] text-[#5A5148] sm:text-[13.5px]">
                <strong className="mr-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8D6FAF]">
                  Hear Rachel's song ·
                </strong>
                The song that played on the drive home from her mother's last
                infusion.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PRESS STRIP */}
      <div
        id="press"
        className="border-y border-[#D9CEB9] bg-[#ECE2D0] px-0 py-7 md:py-9"
      >
        <div className="mx-auto flex max-w-[1200px] flex-col items-center gap-5 px-5 sm:px-6 md:flex-row md:flex-wrap md:justify-between md:gap-10">
          <div className="shrink-0 text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8A8175] md:text-[11.5px]">
            As featured in
          </div>
          <div className="flex flex-1 flex-wrap items-center justify-center gap-x-6 gap-y-3 md:justify-around md:gap-11">
            <span className="font-sans text-[13px] font-bold uppercase tracking-[0.12em] text-[#5A5148] opacity-70 transition-opacity hover:opacity-100 md:text-[15px]">
              CBS
            </span>
            <span className="font-display text-[17px] font-semibold tracking-[-0.01em] text-[#5A5148] opacity-70 transition-opacity hover:opacity-100 md:text-[20px]">
              People
            </span>
            <span className="font-display text-[16px] italic font-medium tracking-[-0.005em] text-[#5A5148] opacity-70 transition-opacity hover:opacity-100 md:text-[18px]">
              Good Morning America
            </span>
            <span className="font-sans text-[12.5px] font-bold uppercase tracking-[0.18em] text-[#5A5148] opacity-70 transition-opacity hover:opacity-100 md:text-[14px]">
              TODAY
            </span>
            <span className="font-display text-[16px] italic font-medium tracking-[-0.005em] text-[#5A5148] opacity-70 transition-opacity hover:opacity-100 md:text-[18px]">
              The Cut
            </span>
          </div>
        </div>
      </div>

      {/* LISTEN SECTION */}
      <section id="listen" className="px-0 py-[64px] md:py-[100px]">
        <div className="mx-auto max-w-[1200px] px-5 sm:px-6">
          <div className="mx-auto mb-10 max-w-[720px] text-center md:mb-14">
            <Eyebrow center>Listen first</Eyebrow>
            <h2 className="mb-3.5 font-display text-[clamp(28px,7vw,48px)] font-medium leading-[1.1] tracking-[-0.022em] text-[#1F1B16]">
              Real songs, written for{" "}
              <em className="italic text-[#8D6FAF]">real people.</em>
            </h2>
            <p className="mx-auto mt-3.5 max-w-[560px] text-[17px] leading-[1.55] text-[#5A5148]">
              Press play on a few. Some are anthems. Some are lullabies. Some
              are goodbyes. Each one was someone's love put to music.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {displaySamples.map((s) => {
              const isPlaying = playingSampleId === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => handleSamplePlay(s)}
                  disabled={!s.audio_url}
                  aria-label={
                    !s.audio_url
                      ? `${s.title} — coming soon`
                      : isPlaying
                        ? `Pause ${s.title}`
                        : `Play ${s.title}`
                  }
                  className="group relative flex flex-col overflow-hidden rounded-[16px] border border-[#D9CEB9] bg-[#FBF6EC] text-left transition-all hover:-translate-y-[3px] hover:shadow-[0_8px_24px_rgba(31,27,22,0.08)] disabled:cursor-default"
                >
                  <div className="relative aspect-[5/4] overflow-hidden bg-[#ECE2D0]">
                    {s.cover_image_url && (
                      <img
                        src={s.cover_image_url}
                        alt=""
                        loading="lazy"
                        className={`h-full w-full object-cover transition-all duration-700 ${
                          isPlaying
                            ? "scale-110 blur-md brightness-[0.55]"
                            : "group-hover:scale-[1.03]"
                        }`}
                      />
                    )}

                    {/* Spinning vinyl when playing */}
                    {isPlaying && s.cover_image_url && (
                      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                        <div className="relative aspect-square h-[78%] animate-vinyl-spin">
                          {/* Disc grooves */}
                          <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_center,#1a1a1a_0%,#0a0a0a_45%,#1a1a1a_50%,#0a0a0a_55%,#1a1a1a_60%,#0a0a0a_65%,#1a1a1a_70%,#0a0a0a_75%,#1a1a1a_80%,#0a0a0a_85%,#1a1a1a_100%)] shadow-[0_20px_50px_-15px_rgba(0,0,0,0.6)]" />
                          {/* Sheen */}
                          <div className="absolute inset-0 rounded-full bg-[conic-gradient(from_120deg,transparent_0deg,rgba(255,255,255,0.08)_45deg,transparent_90deg,transparent_360deg)]" />
                          {/* Cover photo as label */}
                          <div className="absolute left-1/2 top-1/2 aspect-square w-[46%] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-full ring-2 ring-[#1F1B16]/40">
                            <img
                              src={s.cover_image_url}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                            <div className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#F6F0E6] ring-1 ring-black/30" />
                          </div>
                        </div>
                      </div>
                    )}

                    {s.audio_url ? (
                      <div
                        className={`absolute inset-0 flex items-center justify-center transition-colors ${
                          isPlaying
                            ? "bg-transparent"
                            : "bg-[rgba(31,27,22,0.0)] group-hover:bg-[rgba(31,27,22,0.25)]"
                        }`}
                      >
                        <span
                          className={`relative z-10 flex h-14 w-14 items-center justify-center rounded-full bg-[#8D6FAF] shadow-[0_6px_18px_rgba(141,111,175,0.45)] transition-transform group-hover:scale-110 ${
                            isPlaying ? "opacity-0 group-hover:opacity-100" : ""
                          }`}
                        >
                          {isPlaying ? (
                            <span className="flex gap-[4px]">
                              <span className="block h-4 w-[4px] rounded-sm bg-white" />
                              <span className="block h-4 w-[4px] rounded-sm bg-white" />
                            </span>
                          ) : (
                            <span
                              className="ml-1 inline-block"
                              style={{
                                width: 0,
                                height: 0,
                                borderLeft: "13px solid #FFFFFF",
                                borderTop: "8px solid transparent",
                                borderBottom: "8px solid transparent",
                              }}
                            />
                          )}
                        </span>
                      </div>
                    ) : (
                      <div className="absolute right-3 top-3 rounded-full bg-[rgba(31,27,22,0.7)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#F6F0E6]">
                        Coming soon
                      </div>
                    )}
                    {isPlaying && (
                      <div className="absolute left-3 top-3 z-10 flex items-center gap-1.5 rounded-full bg-[rgba(31,27,22,0.75)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#F6F0E6]">
                        <span className="flex h-1.5 w-1.5 animate-pulse rounded-full bg-[#E8C547]" />
                        Now playing
                      </div>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col p-[20px_22px_22px]">
                    <h3 className="mb-2 font-display text-[19px] font-medium leading-[1.25] tracking-[-0.01em] text-[#1F1B16] md:text-[20px]">
                      {s.title}
                    </h3>
                    {s.quote && (
                      <p className="mb-3 text-[14px] italic leading-[1.55] text-[#5A5148]">
                        {s.quote}
                      </p>
                    )}
                    {s.for_text && (
                      <div className="mt-auto pt-2 text-[12px] leading-[1.5] text-[#8A8175]">
                        {s.for_text}
                      </div>
                    )}
                    <div className="mt-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8D6FAF]">
                      {s.genre_label}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-12 text-center">
            <PrimaryBtn large>Start their song</PrimaryBtn>
          </div>
        </div>
      </section>

      {/* WHO IT'S FOR */}
      <section id="who" className="bg-[#ECE2D0] px-0 py-[72px] md:py-[100px]">
        <div className="mx-auto max-w-[1200px] px-5 sm:px-6">
          <div className="mb-10 max-w-[720px] md:mb-14">
            <Eyebrow>Who it's for</Eyebrow>
            <h2 className="mb-3.5 font-display text-[clamp(28px,7vw,48px)] font-medium leading-[1.1] tracking-[-0.022em] text-[#1F1B16]">
              Wherever they are in the fight,{" "}
              <em className="italic text-[#8D6FAF]">meet them there.</em>
            </h2>
            <p className="max-w-[560px] text-[16px] leading-[1.55] text-[#5A5148] md:text-[17px]">
              Cancer doesn't touch two families the same way. A RibbonSong is
              shaped to honor exactly where your person is right now. Newly
              diagnosed, mid treatment, celebrating remission, or held in
              loving memory.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {useCases.map((u) => (
              <div
                key={u.eyebrow}
                className="group relative flex flex-col overflow-hidden rounded-[16px] border border-[#D9CEB9] bg-[#FBF6EC] transition-all hover:-translate-y-[3px] hover:shadow-[0_8px_24px_rgba(31,27,22,0.08)]"
              >
                <div className="relative aspect-[5/4] overflow-hidden bg-[#F6F0E6]">
                  <img
                    src={u.img}
                    alt=""
                    loading="lazy"
                    width={512}
                    height={640}
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                  />
                </div>
                <div className="flex flex-1 flex-col p-[22px_22px_24px]">
                  <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8D6FAF]">
                    {u.eyebrow}
                  </span>
                  <h3 className="mb-2 font-display text-[20px] font-medium leading-[1.2] tracking-[-0.01em] text-[#1F1B16] md:text-[22px]">
                    {u.label}
                  </h3>
                  <p className="text-[14px] leading-[1.55] text-[#5A5148]">
                    {u.body}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-10 text-center md:mt-12">
            <PrimaryBtn large>Start their song</PrimaryBtn>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS moved up — see after PRESS STRIP */}
      {/* TESTIMONIALS */}
      <section id="stories" className="bg-[#ECE2D0] px-0 py-[64px] md:py-[100px]">
        <div className="mx-auto max-w-[1200px] px-5 sm:px-6">
          <div className="mx-auto mb-10 max-w-[720px] text-center md:mb-14">
            <Eyebrow center>Real families</Eyebrow>
            <h2 className="mb-3.5 font-display text-[clamp(28px,7vw,48px)] font-medium leading-[1.1] tracking-[-0.022em] text-[#1F1B16]">
              <em className="italic text-[#8D6FAF]">2,400+</em> songs delivered.
              <br />
              Each one held something a card couldn't.
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {testimonials.map((t, i) => (
              <div
                key={i}
                className="flex flex-col rounded-[16px] border border-[#D9CEB9] bg-[#FBF6EC] p-[26px_24px]"
              >
                <p className="mb-5 flex-1 text-[15px] leading-[1.6] text-[#1F1B16]">
                  {t.quote}
                </p>
                <div className="flex items-center gap-3 border-t border-[#D9CEB9] pt-4">
                  <img
                    src={t.avatar}
                    alt=""
                    loading="lazy"
                    className="h-10 w-10 rounded-full object-cover"
                  />
                  <div>
                    <div className="text-[13.5px] font-semibold text-[#1F1B16]">
                      {t.name}
                    </div>
                    <div className="text-[12px] text-[#8A8175]">{t.meta}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* GUARANTEE */}
      <section className="px-0 py-[64px] md:py-[100px]">
        <div className="mx-auto max-w-[820px] px-5 sm:px-6">
          <div className="rounded-[20px] border-2 border-[#1F1B16] bg-[#FBF6EC] p-[40px_32px] text-center md:p-[60px_56px]">
            <div className="mx-auto mb-5 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8D6FAF]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#8D6FAF]" />
              Our promise
            </div>
            <h2 className="mb-5 font-display text-[clamp(26px,5.5vw,38px)] font-medium leading-[1.18] tracking-[-0.018em] text-[#1F1B16]">
              If it doesn't feel right,{" "}
              <em className="italic text-[#8D6FAF]">we rewrite it.</em>
              <br />
              If it still doesn't, you don't pay.
            </h2>
            <p className="mx-auto max-w-[560px] text-[15.5px] leading-[1.6] text-[#5A5148] md:text-[16.5px]">
              We know what's at stake. Every song goes through a careful review
              before it reaches you. If it isn't right, we revise it as many
              times as it takes — at no cost. And if after all of that you
              still aren't moved, we refund you in full.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="bg-[#ECE2D0] px-0 py-[64px] md:py-[100px]">
        <div className="mx-auto max-w-[820px] px-5 sm:px-6">
          <div className="mb-10 text-center md:mb-14">
            <Eyebrow center>Common questions</Eyebrow>
            <h2 className="font-display text-[clamp(28px,7vw,44px)] font-medium leading-[1.12] tracking-[-0.02em] text-[#1F1B16]">
              Everything you might be{" "}
              <em className="italic text-[#8D6FAF]">wondering.</em>
            </h2>
          </div>

          <div className="space-y-3">
            {faqs.map((f) => (
              <details
                key={f.q}
                className="group rounded-[14px] border border-[#D9CEB9] bg-[#FBF6EC] p-[20px_24px] transition-colors open:border-[#8D6FAF]"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-display text-[17px] font-medium leading-[1.3] tracking-[-0.005em] text-[#1F1B16] md:text-[18px]">
                  {f.q}
                  <span className="shrink-0 text-[#8D6FAF] transition-transform group-open:rotate-45 text-[22px] leading-none">
                    +
                  </span>
                </summary>
                <p className="mt-3 text-[14.5px] leading-[1.65] text-[#5A5148] md:text-[15px]">
                  {f.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="bg-[#1F1B16] px-0 py-[72px] md:py-[110px]">
        <div className="mx-auto max-w-[820px] px-5 text-center sm:px-6">
          <h2 className="mb-6 font-display text-[clamp(28px,7vw,52px)] font-medium italic leading-[1.1] tracking-[-0.02em] text-[#F6F0E6]">
            <span className="not-italic text-[#E5D9EF]">&ldquo;</span>
            They listened on repeat the night before they passed.
            <span className="not-italic text-[#E5D9EF]">&rdquo;</span>
          </h2>
          <p className="mx-auto mb-8 max-w-[560px] text-[16px] leading-[1.6] text-[rgba(246,240,230,0.75)] md:text-[17px]">
            You're not late. You're not too early. There's no perfect time to
            give someone a song that says everything you couldn't. There's just
            now.
          </p>
          <PrimaryBtn large>Start their song</PrimaryBtn>
          <div className="mt-6 text-[13px] text-[rgba(246,240,230,0.55)]">
            Delivered in 5 days · Free revisions · Money back guarantee
          </div>
        </div>
      </section>

      <SiteFooter />

      {/* Inline sample audio player (no modal) */}
      <audio
        ref={sampleAudioRef}
        preload="none"
        onEnded={() => setPlayingSampleId(null)}
        onPause={() => {
          // If paused via system controls, reflect state
          if (sampleAudioRef.current && sampleAudioRef.current.paused) {
            // Only clear if not transitioning to a new src
            // (handled in handleSamplePlay)
          }
        }}
      />
    </div>
  );
}
