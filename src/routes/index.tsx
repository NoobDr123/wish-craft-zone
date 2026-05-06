import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import rachelPhoto from "@/assets/rachel-mother-real.jpg";

const RACHEL_SONG_URL =
  "https://tempfile.aiquickdraw.com/r/d4899ca946ec497dbd5e86027fb1b52f.mp3";
const HERO_SAMPLE_ID = "7c2985a2-8ab5-4920-a0bb-347dcf619019";
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
    const [heroRes, featuredRes, testimonialRes] = await Promise.all([
      supabase
        .from("public_featured_samples")
        .select(
          "id,title,quote,for_text,genre_label,cover_image_url,audio_url,lyrics,synced_lyrics,testimonial_slug,dog_name,dog_breed",
        )
        .eq("id", HERO_SAMPLE_ID)
        .maybeSingle(),
      supabase
        .from("public_featured_samples")
        .select(
          "id,title,quote,for_text,genre_label,cover_image_url,audio_url,lyrics,synced_lyrics,testimonial_slug,dog_name,dog_breed",
        )
        .is("testimonial_slug", null)
        .not("audio_url", "is", null)
        // Exclude the current hero song so it doesn't repeat in the grid
        .neq("id", HERO_SAMPLE_ID)
        .order("sort_order", { ascending: true })
        .limit(6),
      supabase
        .from("public_featured_samples")
        .select("id,testimonial_slug,audio_url,title")
        .not("testimonial_slug", "is", null),
    ]);
    if (heroRes.error) {
      console.error("[index loader] hero featured sample error", heroRes.error);
    }
    if (featuredRes.error) {
      console.error("[index loader] featured_samples error", featuredRes.error);
    }
    if (testimonialRes.error) {
      console.error("[index loader] testimonial samples error", testimonialRes.error);
    }
    const testimonialSongs: Record<string, { id: string; audio_url: string | null; title: string }> = {};
    for (const row of testimonialRes.data ?? []) {
      if (row.testimonial_slug && row.id && row.title) {
        testimonialSongs[row.testimonial_slug] = {
          id: row.id,
          audio_url: row.audio_url,
          title: row.title,
        };
      }
    }
    return {
      heroSample: (heroRes.data as FeaturedSample | null) ?? null,
      samples: (featuredRes.data ?? []) as FeaturedSample[],
      testimonialSongs,
    };
  },
  head: () => ({
    meta: [
      { title: "PawprintSong. A song that brings her back into the room" },
      {
        name: "description",
        content:
          "When the house goes quiet, give yourself a song that holds her. Original. Custom. Written from your memories. Delivered in five days.",
      },
      {
        property: "og:title",
        content: "PawprintSong. A song that brings her back into the room",
      },
      {
        property: "og:description",
        content:
          "Original songs for the dogs we've loved and lost. Written from your memories. Hers forever.",
      },
      { property: "og:image", content: heroImg },
      { name: "twitter:image", content: heroImg },
    ],
  }),
});

interface SyncedLine {
  start: number;
  end: number;
  text: string;
}

interface FeaturedSample {
  id: string;
  title: string;
  quote: string | null;
  for_text: string | null;
  genre_label: string;
  cover_image_url: string | null;
  audio_url: string | null;
  lyrics: string | null;
  synced_lyrics?: SyncedLine[] | null;
  dog_name?: string | null;
  dog_breed?: string | null;
}

/**
 * Karaoke-style synced lyrics overlay.
 *
 * Listens to the provided <audio> element's timeupdate and renders the
 * active line bright + a previous and next line dimmed. Active words
 * inside the line are progressively highlighted based on time elapsed
 * within that line.
 */
function KaraokeOverlay({
  audioRef,
  lines,
  visible,
}: {
  audioRef: React.RefObject<HTMLAudioElement | null>;
  lines: SyncedLine[];
  visible: boolean;
}) {
  const [t, setT] = useState(0);
  const firstLineStart = lines[0]?.start ?? 0;

  useEffect(() => {
    if (!visible) {
      setT(0);
      return;
    }
    const a = audioRef.current;
    if (!a) return;
    const onTime = () => setT(a.currentTime);
    const syncFromAudio = () => setT(a.currentTime);
    setT(a.currentTime);
    // Poll as a fallback. some browsers fire timeupdate sparsely (every 250ms+)
    // and we want smooth word-level highlighting.
    const interval = window.setInterval(() => {
      if (!a.paused) setT(a.currentTime);
    }, 100);
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("seeked", onTime);
    a.addEventListener("play", syncFromAudio);
    a.addEventListener("loadedmetadata", syncFromAudio);
    return () => {
      window.clearInterval(interval);
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("seeked", onTime);
      a.removeEventListener("play", syncFromAudio);
      a.removeEventListener("loadedmetadata", syncFromAudio);
    };
  }, [audioRef, visible]);

  if (!visible || !lines || lines.length === 0) return null;
  const preRoll = t < Math.max(0, firstLineStart - 0.1);

  // Find the active line for the current playback window.
  let activeIdx = 0;
  if (!preRoll) {
    activeIdx = lines.length - 1;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const nextStart = lines[i + 1]?.start ?? Number.POSITIVE_INFINITY;
      if (t >= line.start && t < nextStart) {
        activeIdx = i;
        break;
      }
    }
  }

  const active = lines[activeIdx];
  const prev = activeIdx > 0 ? lines[activeIdx - 1] : null;
  const next = activeIdx < lines.length - 1 ? lines[activeIdx + 1] : null;

  // Word-level progress inside the active line
  const words = active.text.split(/\s+/).filter(Boolean);
  const lineDuration = Math.max(0.4, active.end - active.start);
  const progress = preRoll
    ? 0
    : Math.min(1, Math.max(0, (t - active.start) / lineDuration));
  const wordsHit = Math.floor(progress * words.length);

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-30 px-3 pt-3 sm:px-4 sm:pt-4">
      <div className="mx-auto max-w-[480px] rounded-2xl bg-black/70 px-4 py-3 text-center shadow-lg backdrop-blur-md sm:px-5 sm:py-4">
        {prev && (
          <div className="mb-1.5 truncate text-[12px] font-medium leading-tight text-white/50 sm:text-[13px]">
            {prev.text}
          </div>
        )}
        <div className="text-[17px] font-semibold leading-snug text-white drop-shadow-sm sm:text-[19px]">
          {words.map((w, i) => (
            <span
              key={i}
              className={
                i < wordsHit
                  ? "text-[#E8C547]"
                  : i === wordsHit
                    ? "text-white"
                    : "text-white/70"
              }
            >
              {w}
              {i < words.length - 1 ? " " : ""}
            </span>
          ))}
        </div>
        {next && (
          <div className="mt-1.5 truncate text-[12px] font-medium leading-tight text-white/50 sm:text-[13px]">
            {next.text}
          </div>
        )}
      </div>
    </div>
  );
}

// Fallback display data when no samples are published yet
const fallbackSamples: Array<{
  title: string;
  quote: string;
  for_text: string;
  genre_label: string;
  cover_image_url: string;
  audio_url: string;
}> = [
  {
    title: "Cheeto Paws",
    quote:
      '"Her paws smelled like cheetos. I miss her smelly breath. I miss everything."',
    for_text: "Written for Max, 12 years. Yellow Lab.",
    genre_label: "Acoustic Singer-Songwriter · Female Voice",
    cover_image_url: whoCaregiver,
    audio_url: RACHEL_SONG_URL,
  },
  {
    title: "Still on the Couch",
    quote:
      '"I still leave the spot by the window open for her. Always will."',
    for_text: "Written for Bella, 9 years. Goldendoodle.",
    genre_label: "Soft Folk · Male Voice",
    cover_image_url: whoNewlyDiagnosed,
    audio_url: RACHEL_SONG_URL,
  },
  {
    title: "Good Girl, Always",
    quote: '"Fifteen years. She got me through everything."',
    for_text: "Written for Ruby, 15 years. German Shepherd.",
    genre_label: "Country · Female Voice",
    cover_image_url: whoSurvivor,
    audio_url: RACHEL_SONG_URL,
  },
  {
    title: "My Shadow",
    quote:
      '"She was always two steps behind me. I keep forgetting to listen for her."',
    for_text: "Written for Charlie, 8 years. Border Collie.",
    genre_label: "Acoustic · Male Voice",
    cover_image_url: whoMemory,
    audio_url: RACHEL_SONG_URL,
  },
  {
    title: "The Front Door",
    quote: '"I still look for her when I come home."',
    for_text: "Written for Buddy, 13 years. Beagle.",
    genre_label: "Cinematic · Strings",
    cover_image_url: whoChild,
    audio_url: RACHEL_SONG_URL,
  },
  {
    title: "Where the Sunbeam Was",
    quote:
      '"She always found the warmest spot in the house. The room is colder now."',
    for_text: "Written for Rocky, 14 years. Mixed breed rescue.",
    genre_label: "Lullaby · Piano",
    cover_image_url: whoInTreatment,
    audio_url: RACHEL_SONG_URL,
  },
];

const useCases = [
  {
    eyebrow: "For your soul dog",
    label: "The one who got you through everything",
    body: "Fifteen years. The breakup. The move. The hardest year. She was there for all of it.",
    img: whoNewlyDiagnosed,
  },
  {
    eyebrow: "For your goofy girl",
    label: "The one who made everyone laugh",
    body: "The dramatic greeter. The food obsessive. The reason you came home faster.",
    img: whoInTreatment,
  },
  {
    eyebrow: "For your senior dog",
    label: "The greying muzzle, the slow walks",
    body: "The one you loved through her last good years. Soft mornings. Quiet evenings.",
    img: whoSurvivor,
  },
  {
    eyebrow: "For your rescue",
    label: "The one who chose you",
    body: "She came from somewhere hard. You gave her the rest of her life. She gave you all of hers.",
    img: whoMemory,
  },
  {
    eyebrow: "For the dog you lost too soon",
    label: "The one you didn't get long enough with",
    body: "Cancer at five. An accident. A heart that just stopped. The years you didn't get hurt the most.",
    img: whoChild,
  },
  {
    eyebrow: "For your childhood dog",
    label: "The one who grew up with you",
    body: "Family photos. The backyard. The dog who's been gone longer than she was here.",
    img: whoCaregiver,
  },
  {
    eyebrow: "On the anniversary",
    label: "For the day your body remembers first",
    body: "One year. Five years. Ten. The grief doesn't end. it just changes shape.",
    img: whoParent,
  },
  {
    eyebrow: "For a friend who lost theirs",
    label: "When you don't know what to say",
    body: "The most thoughtful gift you can give someone grieving a dog. We'll write it from their memories.",
    img: whoStrength,
  },
  {
    eyebrow: "For the dog still with you",
    label: "Capture her while she's here",
    body: "Many owners commission a song while their dog is still around. to hold every quirk before time takes them.",
    img: whoYourself,
  },
];

const testimonials: Array<{
  slug: string;
  quote: string;
  name: string;
  meta: string;
  avatar: string;
}> = [
  {
    slug: "david-k",
    quote:
      '"I almost didn\'t order because it felt like too much. I was wrong. The first time I heard her name in the chorus I fell apart in the best way. It\'s the most precious thing I own."',
    name: "David K.",
    meta: "Austin, TX  ·  For Bella, his 12-year-old Lab",
    avatar: "https://i.pravatar.cc/80?img=67",
  },
  {
    slug: "sarah-r",
    quote:
      '"My husband doesn\'t cry. He listened once, walked out to the porch, stayed there for an hour. When he came back in he just hugged me. That was about Cooper."',
    name: "Sarah R.",
    meta: "Columbus, OH  ·  For Cooper, their Golden Retriever",
    avatar: "https://i.pravatar.cc/80?img=45",
  },
  {
    slug: "priya-sam",
    quote:
      '"It\'s been a year next week. We play it every Sunday morning, the way we used to take her for a walk. The kids ask for it by name now."',
    name: "Priya & Sam",
    meta: "Seattle, WA  ·  For Lulu, their family Boxer",
    avatar: "https://i.pravatar.cc/80?img=39",
  },
  {
    slug: "marcus-d",
    quote:
      '"My coworkers told me it was \'just a dog.\' This song was the first thing that took her seriously. I wept for an hour."',
    name: "Marcus D.",
    meta: "Phoenix, AZ  ·  For Daisy, his Husky",
    avatar: "https://i.pravatar.cc/80?img=52",
  },
  {
    slug: "patricia-m",
    quote:
      '"He played it twice and asked me to leave the room. He never talks about her since she went. The song let him do it without finding words. Thank you."',
    name: "Patricia M.",
    meta: "Tampa, FL  ·  For her father\'s Shepherd, Maggie",
    avatar: "https://i.pravatar.cc/80?img=23",
  },
  {
    slug: "jenna-l",
    quote:
      '"I didn\'t realize it was the anniversary until I started crying for no reason. Then I remembered. I played the song. It helped."',
    name: "Jenna L.",
    meta: "Denver, CO  ·  For Penny, her childhood dog",
    avatar: "https://i.pravatar.cc/80?img=29",
  },
  {
    slug: "elena-v",
    quote:
      '"Our daughter is six. He was her first heartbreak. She asks us to play his song every night before bed. She talks to him through it."',
    name: "Elena V.",
    meta: "San Diego, CA  ·  For Buddy, their family dog",
    avatar: "https://i.pravatar.cc/80?img=47",
  },
  {
    slug: "trevor-h",
    quote:
      '"Fifteen years. He saw me through college, my divorce, my mom dying. The song talks about a beach where we used to walk. The most precious thing I own."',
    name: "Trevor H.",
    meta: "Nashville, TN  ·  For Sammy, his soul dog",
    avatar: "https://i.pravatar.cc/80?img=15",
  },
  {
    slug: "diane-w",
    quote:
      '"I gave it to my best friend on the one-year mark. She called me crying. She said it was the first thing in a year that made her remember loving Tucker without immediately remembering losing him."',
    name: "Diane W.",
    meta: "Pittsburgh, PA  ·  Gift, for her friend\'s Boxer",
    avatar: "https://i.pravatar.cc/80?img=31",
  },
  {
    slug: "rebecca-t",
    quote:
      '"I made a slideshow with our song under it. My family on three continents watched it. My grandma in Poland called me crying. He was loved everywhere."',
    name: "Rebecca T.",
    meta: "Minneapolis, MN  ·  For Bear, her Bernese Mountain Dog",
    avatar: "https://i.pravatar.cc/80?img=44",
  },
  {
    slug: "aisha-m",
    quote:
      '"I kept the order private. I didn\'t want to explain why I was crying about a \'pet.\' Then I played it and I wasn\'t ashamed anymore."',
    name: "Aisha M.",
    meta: "Atlanta, GA  ·  For Coco, her Pomeranian",
    avatar: "https://i.pravatar.cc/80?img=49",
  },
  {
    slug: "michael-b",
    quote:
      '"My dog passed eleven years ago. I always felt silly still missing him. The song made me feel less crazy. It made me feel like the love still counted."',
    name: "Michael B.",
    meta: "Boston, MA  ·  For Riley, his Lab from childhood",
    avatar: "https://i.pravatar.cc/80?img=53",
  },
  {
    slug: "carlos-r",
    quote:
      '"Five years gone. Still playing his song every birthday. The kids who never met him know him through the lyrics now."',
    name: "Carlos R.",
    meta: "Miami, FL  ·  For Bruno, his German Shepherd",
    avatar: "https://i.pravatar.cc/80?img=12",
  },
  {
    slug: "naomi-k",
    quote:
      '"I gave it to my mom on the one-year anniversary of losing Pepper. She called me at 11pm sobbing thank you over and over."',
    name: "Naomi K.",
    meta: "Brooklyn, NY  ·  Gift, for her mother\'s Yorkie",
    avatar: "https://i.pravatar.cc/80?img=20",
  },
  {
    slug: "thomas-r",
    quote:
      '"I was a wreck for months. The song didn\'t fix it. But it gave me something to put the love into. Now I have somewhere to go when I miss her."',
    name: "Thomas R.",
    meta: "Charleston, SC  ·  For Daisy, his rescue",
    avatar: "https://i.pravatar.cc/80?img=68",
  },
  {
    slug: "olivia-w",
    quote:
      '"My wife passed last spring. Her dog Roxy followed three months later. I played both songs back to back at her birthday. The whole family sat in silence."',
    name: "Olivia W.",
    meta: "Portland, OR  ·  For Roxy, her late wife\'s dog",
    avatar: "https://i.pravatar.cc/80?img=5",
  },
  {
    slug: "maya-h",
    quote:
      '"I am eleven years old. My dog Zeke died of cancer last year. I saved my allowance and ordered him a song. My mom helped me write the prompt. I play it before bed."',
    name: "Maya H.",
    meta: "Madison, WI  ·  For Zeke, her childhood Lab",
    avatar: "https://i.pravatar.cc/80?img=16",
  },
  {
    slug: "william-t",
    quote:
      '"I am 78. My wife of 54 years passed in March. Two months later we lost our dog Tilly. The song mentions both of them. I am not alone in this house anymore."',
    name: "William T.",
    meta: "Sarasota, FL  ·  For Tilly",
    avatar: "https://i.pravatar.cc/80?img=51",
  },
  {
    slug: "tasha-w",
    quote:
      '"I am a vet tech. I see this grief every week. I ordered a song for my own dog the night I started crying at work. It helped me come back the next morning."',
    name: "Tasha W.",
    meta: "Detroit, MI  ·  For Max, her Pit Bull mix",
    avatar: "https://i.pravatar.cc/80?img=48",
  },
  {
    slug: "henry-and-paul",
    quote:
      '"Our pup Pippa died at three from a sudden heart condition. We didn\'t get long enough. The song let us hold what little we had. It will play at our wedding next year. she should have been our flower girl."',
    name: "Henry & Paul",
    meta: "Brooklyn, NY  ·  For Pippa, their Cavalier",
    avatar: "https://i.pravatar.cc/80?img=33",
  },
  {
    slug: "grace-l",
    quote:
      '"He was a shelter dog who chose me at the worst time of my life. Fourteen years later he was the only thing left from that version of me. The song honored that. I cried like a child."',
    name: "Grace L.",
    meta: "Cincinnati, OH  ·  For Boomer, her rescue mutt",
    avatar: "https://i.pravatar.cc/80?img=26",
  },
  {
    slug: "moshe-k",
    quote:
      '"My grandfather lived alone with his dog Otis for ten years after grandma died. When Otis went, we made him this song for his birthday. He plays it on the porch every morning."',
    name: "Moshe K.",
    meta: "Baltimore, MD  ·  For Otis, his grandfather\'s dog",
    avatar: "https://i.pravatar.cc/80?img=58",
  },
  {
    slug: "amelia-f",
    quote:
      '"I am a hospice nurse. A patient asked me to play her dog\'s song the night before she passed. They went together in her mind. Most peaceful thing I\'ve ever witnessed."',
    name: "Rev. Amelia F.",
    meta: "Asheville, NC  ·  Hospice nurse",
    avatar: "https://i.pravatar.cc/80?img=22",
  },
  {
    slug: "darnell-j",
    quote:
      '"My pops fought cancer for nine years. His dog Ranger never left his side. We played Ranger\'s song at the memorial. Ranger had passed six months earlier. Half the room cried."',
    name: "Darnell J.",
    meta: "Chicago, IL  ·  For Ranger, his father\'s dog",
    avatar: "https://i.pravatar.cc/80?img=59",
  },
];

const faqs = [
  {
    q: "How long does it take?",
    a: "Standard delivery is five days. If you need it sooner. for an anniversary, a memorial, a date you need to hit. our 24-hour express option is available at checkout. Tell us what you're working with and we'll do everything we can to meet the moment.",
  },
  {
    q: "What if I don't know what to write?",
    a: "Most owners don't. The questionnaire is guided. Soft prompts and tap-to-insert tips bring the right memories up on their own. You don't have to find the words. You just have to remember her.",
  },
  {
    q: "My dog passed years ago. Is it too late?",
    a: "It's never too late. Some of our most moving songs have been written for dogs who've been gone five, ten, even fifteen years. The love doesn't expire. Neither does the song.",
  },
  {
    q: "Will you use her name?",
    a: "Always. Her name appears in every chorus and throughout the lyrics. It's her song, by name.",
  },
  {
    q: "What if my dog is still alive?",
    a: "Many owners commission a song while their dog is still here. to capture every quirk before time takes them. The song becomes something to play together now, and to hold onto later. Same form, same process.",
  },
  {
    q: "What if my dog was a rescue and I don't know her breed?",
    a: "Pick \"Rescue, breed unknown\" in the form. Tell us what you saw in her. the personality, the look, the way she loved you. That's all we need.",
  },
  {
    q: "What if the song doesn't feel right?",
    a: "We rewrite it. Free. As many times as it takes. And if after all of that it still isn't right, you have a full 30 days from delivery to request a complete refund. No questions, no fine print.",
  },
  {
    q: "Can I share the song? Use it at a memorial? Post it online?",
    a: "Yes to all of those. Once it's hers, it's yours.",
  },
  {
    q: "Is this a subscription?",
    a: "No. The song is yours forever. No ads, no paywall, no renewal.",
  },
  {
    q: "Who's behind PawprintSong?",
    a: "PawprintSong was started by people who lost their own dogs and couldn't find anything that took it as seriously as they needed it to. Pet sympathy cards, paw-print necklaces, generic memorial videos. none of it felt like the dog. We built this so the love had somewhere to go that wasn't a drawer.",
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
      onClick={() => {
        void import("@/lib/tracking").then(({ track }) =>
          track({ type: "lander_cta_click", payload: { to } })
        );
      }}
      className={`group inline-flex items-center justify-center gap-2.5 rounded-full bg-[#B5532A] font-semibold text-[#FFF7EE] tracking-[0.005em] shadow-[0_6px_16px_rgba(181,83,42,0.28)] transition-all hover:-translate-y-px hover:bg-[#7A4A2E] hover:shadow-[0_10px_24px_rgba(181,83,42,0.35)] ${
        large ? "px-[34px] py-[18px] text-[16.5px]" : "px-[26px] py-[14px] text-[15px]"
      } ${fullWidth ? "w-full" : ""}`}
    >
      {children}
      <span className="transition-transform group-hover:translate-x-1">→</span>
    </Link>
  );
}

function TrustBadges({ tone = "light" }: { tone?: "light" | "dark" }) {
  const isDark = tone === "dark";
  const guaranteeBg = isDark
    ? "bg-[#F8F1E4] border-[#F8F1E4]"
    : "bg-gradient-to-b from-[#B5532A] to-[#9C4520] border-[#B5532A]";
  const guaranteeIconBg = isDark ? "bg-[#7A4A2E] text-[#F8F1E4]" : "bg-[#F8F1E4] text-[#B5532A]";
  const guaranteeText = isDark ? "text-[#7A4A2E]" : "text-[#F8F1E4]";
  const sideCardBg = isDark
    ? "bg-[#F8F1E4]/10 border-[#F8F1E4]/25 backdrop-blur-sm"
    : "bg-[#FDF7E9] border-[#E8DDC9]";
  const sideIconRing = isDark
    ? "bg-[#F8F1E4]/15 text-[#F8F1E4] ring-1 ring-[#F8F1E4]/30"
    : "bg-[#F8F1E4] text-[#B5532A] ring-1 ring-[#E8DDC9]";
  const sideText = isDark ? "text-[#F8F1E4]" : "text-[#1F1A17]";
  return (
    <div className="mx-auto mt-6 grid max-w-[640px] grid-cols-3 gap-2.5">
      {/* 30-day money back */}
      <div className={`flex items-center gap-2.5 rounded-[14px] border-2 px-3 py-2.5 shadow-[0_6px_16px_-4px_rgba(181,83,42,0.35)] ${guaranteeBg}`}>
        <span className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full shadow-[inset_0_1px_2px_rgba(0,0,0,0.12)] ${guaranteeIconBg}`}>
          <span className="font-display text-[14px] font-bold leading-none tracking-[-0.02em]">30</span>
        </span>
        <span className={`text-left text-[10.5px] font-bold uppercase leading-[1.2] tracking-[0.05em] sm:text-[11px] ${guaranteeText}`}>
          Day money-back<br />guarantee
        </span>
      </div>
      {/* Free rewrites */}
      <div className={`flex items-center gap-2.5 rounded-[14px] border px-3 py-2.5 ${sideCardBg}`}>
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${sideIconRing}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]">
            <path d="M21 12a9 9 0 1 1-3.51-7.13" />
            <polyline points="21 4 21 10 15 10" />
          </svg>
        </span>
        <span className={`text-left text-[10.5px] font-bold uppercase leading-[1.2] tracking-[0.05em] sm:text-[11px] ${sideText}`}>
          Unlimited<br />free rewrites
        </span>
      </div>
      {/* 5-day delivery */}
      <div className={`flex items-center gap-2.5 rounded-[14px] border px-3 py-2.5 ${sideCardBg}`}>
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${sideIconRing}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]">
            <rect x="3" y="5" width="18" height="16" rx="2" />
            <line x1="3" y1="10" x2="21" y2="10" />
            <line x1="8" y1="3" x2="8" y2="7" />
            <line x1="16" y1="3" x2="16" y2="7" />
          </svg>
        </span>
        <span className={`text-left text-[10.5px] font-bold uppercase leading-[1.2] tracking-[0.05em] sm:text-[11px] ${sideText}`}>
          Delivered in<br />5 days
        </span>
      </div>
    </div>
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
      className={`mb-[22px] inline-flex items-center gap-2 text-[11.5px] font-semibold uppercase tracking-[0.16em] text-[#B5532A] ${
        center ? "justify-center" : ""
      } ${className}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-[#B5532A]" />
      {children}
    </div>
  );
}

function LandingPage() {
  const { heroSample, samples, testimonialSongs } = Route.useLoaderData() as {
    heroSample: FeaturedSample | null;
    samples: FeaturedSample[];
    testimonialSongs: Record<string, { id: string; audio_url: string | null; title: string }>;
  };
  const heroSongUrl = heroSample?.audio_url || RACHEL_SONG_URL;
  const heroSyncedLyrics = heroSample?.synced_lyrics ?? [];
  const heroAudioRef = useRef<HTMLAudioElement | null>(null);
  const [heroPlaying, setHeroPlaying] = useState(false);
  const [heroEverPlayed, setHeroEverPlayed] = useState(false);

  // Funnel tracking. record one lander_view per session per page load
  useEffect(() => {
    void import("@/lib/tracking").then(({ track, ensureSession }) => {
      void ensureSession();
      void track({ type: "lander_view", stepKey: "index" });
    });
  }, []);

  // Inline sample playback. one audio at a time, no modal
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
    // Ensure src is set (defensive against SSR / rerender edge cases)
    if (!a.src || a.src === window.location.href) {
      a.src = heroSongUrl;
    }
    a.currentTime = 0;
    const playPromise = a.play();
    if (playPromise && typeof playPromise.then === "function") {
      playPromise
        .then(() => setHeroPlaying(true))
        .catch((err) => {
          console.error("[hero] audio play failed", err, { src: a.src });
          setHeroPlaying(false);
        });
    } else {
      setHeroPlaying(true);
    }
  };

  // Choose displayed list. real samples if available, otherwise the fallback set
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
          audio_url: s.audio_url,
          lyrics: null,
          dog_name: null,
          dog_breed: null,
        })) satisfies FeaturedSample[]);

  return (
    <div className="overflow-x-hidden bg-[#F8F1E4] font-sans text-[#1F1A17]">
      <SiteHeader />

      {/* HERO */}
      <section className="relative overflow-hidden px-0 py-[40px] pb-[40px] sm:py-[70px] sm:pb-[60px]">
        <div className="mx-auto max-w-[1200px] px-5 sm:px-6">
          <div className="mb-6 flex w-full flex-col items-center gap-3 text-center sm:mb-8 md:mb-12 md:gap-5">
            <span className="hidden h-px w-16 bg-[#B5532A]/50 md:block" />
            <h2 style={{ fontFamily: 'Nunito, system-ui, sans-serif', fontWeight: 800 }} className="text-[16px] uppercase leading-[1.3] tracking-[0.14em] text-[#B5532A] sm:text-[18px] md:whitespace-nowrap md:text-[26px] md:tracking-[0.16em] lg:text-[30px]">
              A Song For The Dog You'll Never Stop Missing
            </h2>
            <span className="hidden h-px w-16 bg-[#B5532A]/50 md:block" />
          </div>
          <div className="grid items-center gap-8 md:grid-cols-[1.15fr_1fr] md:gap-[60px]">
            <div className="order-2 md:order-1">
              <h1 className="mb-[20px] max-w-[640px] font-display text-[clamp(22px,3.4vw,34px)] font-medium italic leading-[1.22] tracking-[-0.018em] text-[#1F1A17] md:mb-[22px]">
                <span className="font-display text-[1.05em] font-semibold not-italic text-[#B5532A]">
                  &ldquo;
                </span>
                She's been gone three months. I made her a song. Now I play it on the drive to work, where she used to sit in the passenger seat. Some days it's the only thing that helps.
                <span className="font-display text-[1.05em] font-semibold not-italic text-[#B5532A]">
                  &rdquo;
                </span>
              </h1>
              <div className="mb-6 text-[13px] leading-[1.5] text-[#8A8175] md:mb-7 md:text-sm">
                <strong className="font-semibold text-[#5A5148]">
                  Sarah K., 38, Portland, OR
                </strong>
                <br />
                Lost Daisy, her 11-year-old Golden Retriever, in February
              </div>
              <p className="mb-7 max-w-[540px] text-[16px] leading-[1.55] text-[#5A5148] md:mb-8 md:text-[17px]">
                When the house goes quiet, give yourself a song that brings her back into the room.{" "}
                <strong className="font-semibold text-[#1F1A17]">
                  Written from your memories. Her name in every chorus. Yours to keep forever.
                </strong>
              </p>
              <div className="mb-5 flex w-full flex-col items-stretch gap-3">
                <PrimaryBtn large fullWidth>Make Her Song 🐾</PrimaryBtn>
              </div>

              {/* Trust badges row. refined icons, balanced weights */}
              <div className="mb-5 grid grid-cols-3 gap-2.5">
                {/* 30-day money back. accented */}
                <div className="flex items-center gap-2.5 rounded-[14px] border-2 border-[#B5532A] bg-gradient-to-b from-[#B5532A] to-[#9C4520] px-3 py-2.5 shadow-[0_6px_16px_-4px_rgba(181,83,42,0.45)]">
                  <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F8F1E4] text-[#B5532A] shadow-[inset_0_1px_2px_rgba(0,0,0,0.08)]">
                    <span className="font-display text-[14px] font-bold leading-none tracking-[-0.02em]">30</span>
                  </span>
                  <span className="text-left text-[10.5px] font-bold uppercase leading-[1.2] tracking-[0.05em] text-[#F8F1E4] sm:text-[11px]">
                    Day money-back<br />guarantee
                  </span>
                </div>

                {/* Free rewrites */}
                <div className="flex items-center gap-2.5 rounded-[14px] border border-[#E8DDC9] bg-[#FDF7E9] px-3 py-2.5 shadow-[0_2px_6px_-2px_rgba(31,27,22,0.05)]">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F8F1E4] text-[#B5532A] ring-1 ring-[#E8DDC9]">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]">
                      <path d="M21 12a9 9 0 1 1-3.51-7.13" />
                      <polyline points="21 4 21 10 15 10" />
                    </svg>
                  </span>
                  <span className="text-left text-[10.5px] font-bold uppercase leading-[1.2] tracking-[0.05em] text-[#1F1A17] sm:text-[11px]">
                    Unlimited<br />free rewrites
                  </span>
                </div>

                {/* 5-day delivery */}
                <div className="flex items-center gap-2.5 rounded-[14px] border border-[#E8DDC9] bg-[#FDF7E9] px-3 py-2.5 shadow-[0_2px_6px_-2px_rgba(31,27,22,0.05)]">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F8F1E4] text-[#B5532A] ring-1 ring-[#E8DDC9]">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]">
                      <rect x="3" y="5" width="18" height="16" rx="2" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                      <line x1="8" y1="3" x2="8" y2="7" />
                      <line x1="16" y1="3" x2="16" y2="7" />
                    </svg>
                  </span>
                  <span className="text-left text-[10.5px] font-bold uppercase leading-[1.2] tracking-[0.05em] text-[#1F1A17] sm:text-[11px]">
                    Delivered in<br />5 days
                  </span>
                </div>
              </div>

              <div className="w-full text-[13px] leading-[1.4] text-[#5A5148] md:text-[13.5px]">
                Made for{" "}
                <strong className="text-[#1F1A17]">1,200+ dogs</strong>{" "}
                who are gone but still loved
              </div>
            </div>

            {/* Hero photo + song */}
            <div className="relative order-1 md:order-2">
              <div className="group relative aspect-[4/5] overflow-hidden rounded-[18px] bg-[#ECE2D0] shadow-[0_20px_60px_rgba(31,27,22,0.12)]">
                {heroPlaying ? (
                  <video
                    src="/rachel-mother-real.mp4"
                    poster={rachelPhoto}
                    className="h-full w-full object-contain bg-[#1F1A17]"
                    autoPlay
                    loop
                    muted
                    playsInline
                    onClick={handleHeroPlay}
                  />
                ) : (
                  <img
                    src={rachelPhoto}
                    alt="Sarah holding her Golden Retriever Daisy in the late afternoon light"
                    className="h-full w-full object-contain bg-[#1F1A17]"
                    onClick={handleHeroPlay}
                  />
                )}
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/55 via-black/15 to-transparent" />

                <KaraokeOverlay
                  audioRef={heroAudioRef}
                  lines={heroSyncedLyrics}
                  visible={heroPlaying}
                />

                <audio
                  ref={heroAudioRef}
                  src={heroSongUrl}
                  preload="metadata"
                  onEnded={() => { setHeroPlaying(false); }}
                />

                <button
                  aria-label={heroPlaying ? "Pause song" : "Listen to Example"}
                  onClick={handleHeroPlay}
                  className="absolute inset-x-3 bottom-3 z-20 flex items-center justify-center gap-2.5 rounded-full bg-[rgba(246,240,230,0.97)] py-3 shadow-[0_8px_24px_rgba(0,0,0,0.28)] ring-1 ring-black/5 transition-all hover:-translate-y-px hover:shadow-[0_10px_28px_rgba(0,0,0,0.32)] sm:inset-x-4 sm:bottom-4 sm:py-3.5"
                >
                  {!heroPlaying && (
                    <span aria-hidden="true" className="animate-nudge-right text-[#B5532A] text-[14px] font-semibold sm:text-[15px]">›››</span>
                  )}
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#B5532A] sm:h-9 sm:w-9">
                    {heroPlaying ? (
                      <span className="flex gap-[3px]">
                        <span className="block h-3 w-[3px] rounded-sm bg-white sm:h-3.5" />
                        <span className="block h-3 w-[3px] rounded-sm bg-white sm:h-3.5" />
                      </span>
                    ) : (
                      <span
                        className="ml-[2px] inline-block"
                        style={{
                          width: 0,
                          height: 0,
                          borderLeft: "9px solid #ffffff",
                          borderTop: "6px solid transparent",
                          borderBottom: "6px solid transparent",
                        }}
                      />
                    )}
                  </span>
                  <span className="text-[14px] font-semibold tracking-[0.005em] text-[#1F1A17] sm:text-[15px]">
                    {heroPlaying ? "Pause" : "Listen to Example"}
                  </span>
                  {!heroPlaying && (
                    <span aria-hidden="true" className="animate-nudge-left text-[#B5532A] text-[14px] font-semibold sm:text-[15px]">‹‹‹</span>
                  )}
                </button>

                {heroPlaying && (
                  <div className="absolute left-3 top-3 flex items-center gap-2 rounded-full bg-black/45 px-3 py-1.5 backdrop-blur-sm sm:left-4 sm:top-4">
                    <span className="flex h-2 w-2 animate-pulse rounded-full bg-[#E8C547]" />
                    <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-white/95">
                      {heroSample?.title ? `${heroSample.title}. Now playing` : "Now playing"}
                    </span>
                  </div>
                )}
              </div>
              <div className="mt-3 px-1 text-[13px] leading-[1.5] text-[#5A5148] sm:text-[13.5px]">
                <strong className="mr-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#B5532A]">
                  Hear Daisy's Song ·
                </strong>
                Made for Sarah's Golden Retriever three months after she passed.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PRESS STRIP */}
      <div
        id="press"
        className="border-y border-[#E8DDC9] bg-[#ECE2D0] px-0 py-7 md:py-9"
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

      {/* HOW IT WORKS */}
      <section id="how" className="relative overflow-hidden px-0 py-[72px] md:py-[110px]">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(181,83,42,0.08),transparent_60%),radial-gradient(ellipse_at_bottom,rgba(232,197,71,0.06),transparent_55%)]"
        />
        <div className="relative mx-auto max-w-[1200px] px-5 sm:px-6">
          <div className="mx-auto mb-12 max-w-[760px] text-center md:mb-16">
            <Eyebrow center>How it works</Eyebrow>
            <h2 className="mb-4 font-display text-[clamp(30px,7.4vw,52px)] font-medium leading-[1.05] tracking-[-0.024em] text-[#1F1A17]">
              How <em className="italic text-[#B5532A]">PawPrint Song</em> Works
            </h2>
            <p className="mx-auto mt-4 max-w-[560px] text-[17px] leading-[1.55] text-[#5A5148]">
              You don't have to know music. You don't have to know what to say.
              You just have to know them.
            </p>
          </div>

          <div className="relative grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-7">
            <div
              aria-hidden
              className="pointer-events-none absolute left-0 right-0 top-[44px] hidden h-px bg-gradient-to-r from-transparent via-[#E8DDC9] to-transparent md:block"
            />

            {[
              {
                n: "01",
                h: "Share their story.",
                p: "Answer a few simple questions in writing. No calls, no pressure. Our prompts gently surface the right memories for you.",
                m: "Takes about 10 minutes. Families say this part alone already feels like a gift.",
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
                  </svg>
                ),
              },
              {
                n: "02",
                h: "We write & record it.",
                p: "Pick the genre, tempo, and voice. Or let us suggest. Folk, country, gospel, pop, or cinematic strings, fully produced in studio.",
                m: "Built to be played, not just heard.",
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
                  </svg>
                ),
              },
              {
                n: "03",
                h: "Delivered in 5 days.",
                p: "Straight to your inbox. Streamable and downloadable, yours forever to share, gift, or play at the bedside.",
                m: "Don't love it? Free rewrites. or a full refund within 30 days. No questions.",
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
                  </svg>
                ),
              },
            ].map((s) => (
              <div
                key={s.n}
                className="group relative flex flex-col rounded-[20px] border border-[#E8DDC9] bg-[#FDF7E9]/80 p-7 backdrop-blur-sm transition-all duration-300 hover:-translate-y-[4px] hover:border-[#B5532A]/40 hover:bg-[#FDF7E9] hover:shadow-[0_14px_40px_-12px_rgba(181,83,42,0.25)] md:p-8"
              >
                <div className="relative mb-5 flex items-center gap-3">
                  <div className="flex h-[56px] w-[56px] items-center justify-center rounded-full border border-[#E8DDC9] bg-[#F8F1E4] font-display text-[20px] font-medium text-[#B5532A] shadow-[inset_0_1px_2px_rgba(255,255,255,0.6),0_2px_8px_rgba(31,27,22,0.04)] transition-all group-hover:border-[#B5532A]/50 group-hover:bg-white">
                    {s.n}
                  </div>
                  <span className="text-[#B5532A]/70 transition-colors group-hover:text-[#B5532A]">
                    {s.icon}
                  </span>
                </div>

                <h3 className="mb-3 font-display text-[22px] font-medium leading-[1.2] tracking-[-0.012em] text-[#1F1A17] md:text-[24px]">
                  {s.h}
                </h3>
                <p className="mb-4 text-[15px] leading-[1.6] text-[#5A5148] md:text-[15.5px]">
                  {s.p}
                </p>
                <p className="mt-auto border-t border-[#E8DDC9]/60 pt-4 text-[13.5px] italic leading-[1.55] text-[#8A8175]">
                  {s.m}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-12 text-center md:mt-14">
            <PrimaryBtn large>Make Her Song 🐾</PrimaryBtn>
            <TrustBadges />
          </div>
        </div>
      </section>

      {/* LISTEN SECTION */}
      <section id="listen" className="bg-[#ECE2D0] px-0 py-[64px] md:py-[100px]">
        <div className="mx-auto max-w-[1200px] px-5 sm:px-6">
          <div className="mx-auto mb-10 max-w-[720px] text-center md:mb-14">
            <Eyebrow center>Listen first</Eyebrow>
            <h2 className="mb-3.5 font-display text-[clamp(28px,7vw,48px)] font-medium leading-[1.1] tracking-[-0.022em] text-[#1F1A17]">
              Real songs, written for{" "}
              <em className="italic text-[#B5532A]">real people.</em>
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
                      ? `${s.title}. coming soon`
                      : isPlaying
                        ? `Pause ${s.title}`
                        : `Play ${s.title}`
                  }
                  className="group relative flex flex-col overflow-hidden rounded-[16px] border border-[#E8DDC9] bg-[#FDF7E9] text-left transition-all hover:-translate-y-[3px] hover:shadow-[0_8px_24px_rgba(31,27,22,0.08)] disabled:cursor-default"
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
                          <div className="absolute left-1/2 top-1/2 aspect-square w-[46%] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-full ring-2 ring-[#1F1A17]/40">
                            <img
                              src={s.cover_image_url}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                            <div className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#F8F1E4] ring-1 ring-black/30" />
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
                          className={`relative z-10 flex h-14 w-14 items-center justify-center rounded-full bg-[#B5532A] shadow-[0_6px_18px_rgba(181,83,42,0.45)] transition-transform group-hover:scale-110 ${
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
                      <div className="absolute right-3 top-3 rounded-full bg-[rgba(31,27,22,0.7)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#F8F1E4]">
                        Coming soon
                      </div>
                    )}
                    {isPlaying && (
                      <div className="absolute left-3 top-3 z-10 flex items-center gap-1.5 rounded-full bg-[rgba(31,27,22,0.75)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#F8F1E4]">
                        <span className="flex h-1.5 w-1.5 animate-pulse rounded-full bg-[#E8C547]" />
                        Now playing
                      </div>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col p-[20px_22px_22px]">
                    <h3 className="mb-2 font-display text-[19px] font-medium leading-[1.25] tracking-[-0.01em] text-[#1F1A17] md:text-[20px]">
                      {s.title}
                    </h3>
                    {s.quote ? (
                      <p className="mb-3 text-[14px] italic leading-[1.55] text-[#5A5148]">
                        {s.quote}
                      </p>
                    ) : s.dog_name && s.dog_breed ? (
                      <p className="mb-3 text-[14px] italic leading-[1.55] text-[#5A5148]">
                        A song made for {s.dog_name}, from a {s.dog_breed.toLowerCase()} who couldn't find the words.
                      </p>
                    ) : null}
                    <div className="mt-auto pt-2 text-[12px] leading-[1.5] text-[#8A8175]">
                      {s.for_text
                        ? s.for_text
                        : s.dog_name && s.dog_breed
                          ? `Written for ${s.dog_name} · From a ${s.dog_breed.toLowerCase()}`
                          : null}
                    </div>
                    <div className="mt-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#B5532A]">
                      {s.genre_label}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-12 text-center">
            <PrimaryBtn large>Make Her Song 🐾</PrimaryBtn>
            <TrustBadges />
          </div>
        </div>
      </section>

      {/* HOW IT WORKS moved up. see after PRESS STRIP */}
      {/* TESTIMONIALS */}
      <section id="stories" className="bg-[#F3E7D2] px-0 py-[64px] md:py-[100px]">
        <div className="mx-auto max-w-[1200px] px-5 sm:px-6">
          <div className="mx-auto mb-10 max-w-[720px] text-center md:mb-14">
            <Eyebrow center>Real owners</Eyebrow>
            <h2 className="mb-3.5 font-display text-[clamp(28px,7vw,48px)] font-medium leading-[1.1] tracking-[-0.022em] text-[#1F1A17]">
              <em className="italic text-[#B5532A]">1,200+</em> dogs honored.
              <br />
              Each song held something a frame couldn't.
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {testimonials.map((t, i) => {
              const song = testimonialSongs[t.slug];
              const hasAudio = !!song?.audio_url;
              const isPlaying = hasAudio && playingSampleId === song!.id;
              return (
                <div
                  key={i}
                  className="flex flex-col rounded-[16px] border border-[#E8DDC9] bg-[#FDF7E9] p-[24px_22px]"
                >
                  <div className="flex items-start gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="mb-4 text-[14.5px] leading-[1.55] text-[#1F1A17]">
                        {t.quote}
                      </p>
                    </div>
                    {/* Vinyl */}
                    <button
                      type="button"
                      onClick={() => {
                        if (!hasAudio) return;
                        handleSamplePlay({
                          id: song!.id,
                          title: song!.title,
                          quote: null,
                          for_text: null,
                          genre_label: "",
                          cover_image_url: null,
                          audio_url: song!.audio_url,
                          lyrics: null,
                        });
                      }}
                      aria-label={
                        hasAudio
                          ? isPlaying
                            ? `Pause song for ${t.name}`
                            : `Play song for ${t.name}`
                          : `Song for ${t.name} is being prepared`
                      }
                      className={`group relative flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full transition-transform sm:h-[60px] sm:w-[60px] md:h-[72px] md:w-[72px] ${
                        hasAudio ? "cursor-pointer hover:scale-[1.04]" : "cursor-default opacity-60"
                      }`}
                    >
                      {/* Vinyl disc */}
                      <div
                        className={`absolute inset-0 rounded-full bg-[radial-gradient(circle_at_center,#1a1a1a_0%,#0a0a0a_45%,#1a1a1a_50%,#0a0a0a_55%,#1a1a1a_60%,#0a0a0a_65%,#1a1a1a_70%,#0a0a0a_75%,#1a1a1a_80%,#0a0a0a_85%,#1a1a1a_100%)] shadow-[0_6px_14px_rgba(31,27,22,0.25)] ${
                          isPlaying ? "animate-vinyl-spin" : ""
                        }`}
                      />
                      {/* Center label */}
                      <div className="absolute left-1/2 top-1/2 flex h-[34%] w-[34%] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-[#B5532A]">
                        <div className="h-[6px] w-[6px] rounded-full bg-[#FDF7E9]" />
                      </div>
                      {/* Play/pause icon overlay */}
                      {!isPlaying && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#FDF7E9]/95 shadow-[0_2px_6px_rgba(0,0,0,0.4)] sm:h-6 sm:w-6 md:h-7 md:w-7">
                            <svg
                              width="10"
                              height="11"
                              viewBox="0 0 11 12"
                              fill="none"
                              className="ml-[1px]"
                            >
                              <path d="M0 0L11 6L0 12V0Z" fill="#1F1A17" />
                            </svg>
                          </div>
                        </div>
                      )}
                      {isPlaying && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#FDF7E9]/95 shadow-[0_2px_6px_rgba(0,0,0,0.4)] sm:h-6 sm:w-6 md:h-7 md:w-7">
                            <svg width="9" height="11" viewBox="0 0 10 12" fill="none">
                              <rect x="0" y="0" width="3" height="12" fill="#1F1A17" />
                              <rect x="7" y="0" width="3" height="12" fill="#1F1A17" />
                            </svg>
                          </div>
                        </div>
                      )}
                    </button>
                  </div>
                  <div className="mt-4 flex items-center gap-3 border-t border-[#E8DDC9] pt-4">
                    <img
                      src={t.avatar}
                      alt=""
                      loading="lazy"
                      className="h-10 w-10 rounded-full object-cover"
                    />
                    <div className="min-w-0">
                      <div className="text-[13.5px] font-semibold text-[#1F1A17]">
                        {t.name}
                      </div>
                      <div className="text-[12px] leading-snug text-[#8A8175] break-words">
                        {t.meta}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* GUARANTEE */}
      <section className="bg-[#ECE2D0] px-0 py-[64px] md:py-[110px]">
        <div className="mx-auto max-w-[1080px] px-5 sm:px-6">
          <div className="relative overflow-hidden rounded-[24px] border-2 border-[#1F1A17] bg-[#FDF7E9] p-[44px_28px] shadow-[0_30px_80px_-30px_rgba(31,27,22,0.25)] md:p-[80px_72px]">
            {/* decorative concentric arcs */}
            <svg
              aria-hidden="true"
              className="pointer-events-none absolute -right-24 -top-24 h-[420px] w-[420px] text-[#B5532A]/10 md:-right-20 md:-top-20 md:h-[520px] md:w-[520px]"
              viewBox="0 0 200 200"
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
            >
              <circle cx="100" cy="100" r="90" />
              <circle cx="100" cy="100" r="74" />
              <circle cx="100" cy="100" r="58" strokeDasharray="2 4" />
              <circle cx="100" cy="100" r="42" />
            </svg>

            <div className="relative grid gap-10 md:grid-cols-[300px_1fr] md:items-center md:gap-16 lg:grid-cols-[340px_1fr] lg:gap-20">
              {/* The 30-DAY SEAL */}
              <div className="mx-auto md:mx-0">
                <div className="relative h-[220px] w-[220px] md:h-[300px] md:w-[300px] lg:h-[340px] lg:w-[340px]">
                  {/* rotating outer ring with text */}
                  <svg
                    viewBox="0 0 200 200"
                    className="absolute inset-0 h-full w-full animate-[spin_28s_linear_infinite] text-[#1F1A17]"
                    aria-hidden="true"
                  >
                    <defs>
                      <path
                        id="sealCircle"
                        d="M 100,100 m -82,0 a 82,82 0 1,1 164,0 a 82,82 0 1,1 -164,0"
                      />
                    </defs>
                    <text
                      fill="currentColor"
                      style={{
                        fontFamily: "var(--font-display, Georgia, serif)",
                        fontSize: "13px",
                        letterSpacing: "0.32em",
                        textTransform: "uppercase",
                        fontWeight: 500,
                      }}
                    >
                      <textPath href="#sealCircle" startOffset="0">
                        Money-back guarantee · No questions asked ·
                      </textPath>
                    </text>
                  </svg>

                  {/* inner stamp */}
                  <div className="absolute inset-[24px] flex flex-col items-center justify-center rounded-full border-2 border-[#1F1A17] bg-gradient-to-br from-[#C25D32] to-[#9C4520] text-center text-[#F8F1E4] shadow-[inset_0_2px_10px_rgba(0,0,0,0.22),0_12px_32px_rgba(122,74,46,0.32)] md:inset-[34px] lg:inset-[40px]">
                    <div className="font-display text-[68px] font-medium leading-none tracking-[-0.04em] md:text-[92px] lg:text-[108px]">
                      30
                    </div>
                    <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-[#F5E6D8] md:text-[11px]">
                      Day
                    </div>
                    <div className="mt-2 h-px w-10 bg-[#F5E6D8]/50 md:w-14" />
                    <div className="mt-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#F8F1E4] md:text-[12px]">
                      Full refund
                    </div>
                  </div>
                </div>
              </div>

              {/* Copy */}
              <div className="text-center md:text-left">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#1F1A17]/15 bg-[#F8F1E4] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#B5532A]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#B5532A]" />
                  Our promise
                </div>
                <h2 className="mb-5 font-display text-[clamp(26px,5.5vw,40px)] font-medium leading-[1.15] tracking-[-0.018em] text-[#1F1A17]">
                  If it doesn't feel right,{" "}
                  <em className="italic text-[#B5532A]">we rewrite it.</em>
                  <br />
                  Still not right? Full refund. for{" "}
                  <span className="whitespace-nowrap rounded-md bg-[#B5532A]/12 px-1.5 py-0.5 text-[#B5532A]">
                    30 full days.
                  </span>
                </h2>
                <p className="mb-6 max-w-[520px] text-[15.5px] leading-[1.6] text-[#5A5148] md:text-[16.5px]">
                  Every song goes through a careful review before it reaches you.
                  If it isn't right, we revise it as many times as it takes. at no
                  cost. And you have a full <strong className="font-semibold text-[#1F1A17]">30 days from delivery</strong> to ask for
                  every cent back. No questions, no fine print.
                </p>

                {/* Reassurance row */}
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {[
                    { k: "✓", v: "Unlimited free rewrites" },
                    { k: "✓", v: "30-day money back" },
                    { k: "✓", v: "No questions asked" },
                  ].map((r) => (
                    <div
                      key={r.v}
                      className="flex items-center justify-center gap-2 rounded-[10px] border border-[#E8DDC9] bg-[#F8F1E4] px-3 py-2 text-[13px] font-medium text-[#1F1A17] sm:justify-start"
                    >
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#B5532A] text-[11px] font-bold text-[#F8F1E4]">
                        {r.k}
                      </span>
                      {r.v}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="bg-[#FDF7E9] px-0 py-[64px] md:py-[100px]">
        <div className="mx-auto max-w-[820px] px-5 sm:px-6">
          <div className="mb-10 text-center md:mb-14">
            <Eyebrow center>Common questions</Eyebrow>
            <h2 className="font-display text-[clamp(28px,7vw,44px)] font-medium leading-[1.12] tracking-[-0.02em] text-[#1F1A17]">
              Everything you might be{" "}
              <em className="italic text-[#B5532A]">wondering.</em>
            </h2>
          </div>

          <div className="space-y-3">
            {faqs.map((f) => (
              <details
                key={f.q}
                className="group rounded-[14px] border border-[#E8DDC9] bg-[#FDF7E9] p-[20px_24px] transition-colors open:border-[#B5532A]"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-display text-[17px] font-medium leading-[1.3] tracking-[-0.005em] text-[#1F1A17] md:text-[18px]">
                  {f.q}
                  <span className="shrink-0 text-[#B5532A] transition-transform group-open:rotate-45 text-[22px] leading-none">
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
      <section className="bg-[#7A4A2E] px-0 py-[72px] md:py-[110px]">
        <div className="mx-auto max-w-[820px] px-5 text-center sm:px-6">
          <h2 className="mb-6 font-display text-[clamp(28px,7vw,52px)] font-medium italic leading-[1.1] tracking-[-0.02em] text-[#F8F1E4]">
            <span className="not-italic text-[#F5E6D8]">&ldquo;</span>
            I play her song on the days the house feels too empty.
            <span className="not-italic text-[#F5E6D8]">&rdquo;</span>
          </h2>
          <p className="mx-auto mb-8 max-w-[560px] text-[16px] leading-[1.6] text-[rgba(246,240,230,0.75)] md:text-[17px]">
            There's no right time to give yourself this. There's just now. and
            her, still in the music, whenever you need her.
          </p>
          <PrimaryBtn large>Make Her Song 🐾</PrimaryBtn>
          <TrustBadges tone="dark" />
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
