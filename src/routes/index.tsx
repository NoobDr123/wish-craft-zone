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
    const [featuredRes, testimonialRes] = await Promise.all([
      supabase
        .from("featured_samples")
        .select(
          "id,title,quote,for_text,genre_label,cover_image_url,audio_url,lyrics,synced_lyrics,testimonial_slug",
        )
        .eq("published", true)
        .is("testimonial_slug", null)
        .not("audio_url", "is", null)
        .order("sort_order", { ascending: true })
        .limit(6),
      supabase
        .from("featured_samples")
        .select("id,testimonial_slug,audio_url,title")
        .eq("published", true)
        .not("testimonial_slug", "is", null),
    ]);
    if (featuredRes.error) {
      console.error("[index loader] featured_samples error", featuredRes.error);
    }
    if (testimonialRes.error) {
      console.error("[index loader] testimonial samples error", testimonialRes.error);
    }
    const testimonialSongs: Record<string, { id: string; audio_url: string | null; title: string }> = {};
    for (const row of testimonialRes.data ?? []) {
      if (row.testimonial_slug) {
        testimonialSongs[row.testimonial_slug] = {
          id: row.id,
          audio_url: row.audio_url,
          title: row.title,
        };
      }
    }
    return {
      samples: (featuredRes.data ?? []) as FeaturedSample[],
      testimonialSongs,
    };
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

  useEffect(() => {
    if (!visible) return;
    const a = audioRef.current;
    if (!a) return;
    const onTime = () => setT(a.currentTime);
    // Poll as a fallback — some browsers fire timeupdate sparsely (every 250ms+)
    // and we want smooth word-level highlighting.
    const interval = window.setInterval(() => {
      if (!a.paused) setT(a.currentTime);
    }, 100);
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("seeked", onTime);
    return () => {
      window.clearInterval(interval);
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("seeked", onTime);
    };
  }, [audioRef, visible]);

  if (!visible || !lines || lines.length === 0) return null;

  // Find active line index (the latest line whose start <= t)
  let activeIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (t >= lines[i].start) activeIdx = i;
    else break;
  }
  // If we're past the active line's end and before the next line, still
  // show that line as the most recent (so the screen never goes blank
  // mid-song); only treat as "before any line" if we haven't reached the
  // first line's start yet.
  if (activeIdx === -1) activeIdx = 0;

  const active = lines[activeIdx];
  const prev = activeIdx > 0 ? lines[activeIdx - 1] : null;
  const next = activeIdx < lines.length - 1 ? lines[activeIdx + 1] : null;

  // Word-level progress inside the active line
  const words = active.text.split(/\s+/).filter(Boolean);
  const lineDuration = Math.max(0.4, active.end - active.start);
  const progress = Math.min(
    1,
    Math.max(0, (t - active.start) / lineDuration),
  );
  const wordsHit = Math.floor(progress * words.length);

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-10 px-4 pt-4 sm:px-6 sm:pt-6">
      <div className="mx-auto max-w-[420px] rounded-2xl bg-black/55 px-4 py-3 text-center backdrop-blur-md sm:px-5 sm:py-3.5">
        {prev && (
          <div className="mb-1 truncate text-[11px] font-medium leading-tight text-white/45 sm:text-xs">
            {prev.text}
          </div>
        )}
        <div className="text-[15px] font-semibold leading-snug text-white sm:text-[17px]">
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
          <div className="mt-1 truncate text-[11px] font-medium leading-tight text-white/45 sm:text-xs">
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
  slug: string;
  quote: string;
  name: string;
  meta: string;
  avatar: string;
}> = [
  {
    slug: "david-k",
    quote:
      '"I almost didn\'t order because it felt like too much. I was wrong. It\'s the only thing I gave him during the whole fight that he asked to hear again."',
    name: "David K.",
    meta: "Austin, TX  ·  Son, for his father in treatment",
    avatar: "https://i.pravatar.cc/80?img=67",
  },
  {
    slug: "sarah-r",
    quote:
      '"My mom played it in her earbuds during infusions. She said the nurses asked her what she was listening to every single week."',
    name: "Sarah R.",
    meta: "Columbus, OH  ·  Daughter, for her mother",
    avatar: "https://i.pravatar.cc/80?img=45",
  },
  {
    slug: "priya-sam",
    quote:
      '"Two years free of cancer, and this song still plays at every birthday. It became our family\'s anthem. Our daughter asks for it by name now."',
    name: "Priya & Sam",
    meta: "Seattle, WA  ·  Parents of a survivor",
    avatar: "https://i.pravatar.cc/80?img=39",
  },
  {
    slug: "marcus-d",
    quote:
      '"We played it at his bedside the night before he passed. The chorus said the things we couldn\'t. The most precious thing our family owns."',
    name: "Marcus D.",
    meta: "Phoenix, AZ  ·  Brother, in loving memory",
    avatar: "https://i.pravatar.cc/80?img=52",
  },
  {
    slug: "patricia-m",
    quote:
      '"He heard it twice before we lost him. Thank you will never cover it."',
    name: "Patricia M.",
    meta: "Tampa, FL  ·  Wife, for her husband in hospice",
    avatar: "https://i.pravatar.cc/80?img=23",
  },
  {
    slug: "jenna-l",
    quote:
      '"It captured something I couldn\'t put into words for fifteen years. The first time I played it for her, we both just sat in the car and cried."',
    name: "Jenna L.",
    meta: "Denver, CO  ·  Daughter, for her mother in remission",
    avatar: "https://i.pravatar.cc/80?img=29",
  },
  {
    slug: "elena-v",
    quote:
      '"My dad isn\'t a crier. He listened once, walked out to the porch, and stayed there for an hour. When he came back in he just hugged me. That was everything."',
    name: "Elena V.",
    meta: "San Diego, CA  ·  Daughter, for her father after surgery",
    avatar: "https://i.pravatar.cc/80?img=47",
  },
  {
    slug: "trevor-h",
    quote:
      '"We played it at her celebration of life. Three hundred people went silent. My aunt said it sounded like Mom wrote it herself."',
    name: "Trevor H.",
    meta: "Nashville, TN  ·  Son, in loving memory",
    avatar: "https://i.pravatar.cc/80?img=15",
  },
  {
    slug: "diane-w",
    quote:
      '"I was skeptical until I heard it. They used the nickname only my husband called me. I sobbed in the kitchen for twenty minutes. Worth every penny."',
    name: "Diane W.",
    meta: "Pittsburgh, PA  ·  Wife, after her husband\'s remission",
    avatar: "https://i.pravatar.cc/80?img=31",
  },
  {
    slug: "rebecca-t",
    quote:
      '"Our oncology nurses asked for a copy. They wanted to share it with another family. That\'s when I knew it wasn\'t just ours anymore."',
    name: "Rebecca T.",
    meta: "Minneapolis, MN  ·  Sister, for her brother in treatment",
    avatar: "https://i.pravatar.cc/80?img=44",
  },
  {
    slug: "aisha-m",
    quote:
      '"My grandmother kept asking us to play it again. She said it was the first time in months she felt like herself. We played it the morning she passed."',
    name: "Aisha M.",
    meta: "Atlanta, GA  ·  Granddaughter, for her grandmother in hospice",
    avatar: "https://i.pravatar.cc/80?img=49",
  },
  {
    slug: "michael-b",
    quote:
      '"I gave it to him on his last birthday. He played it on repeat in the hospital and made the staff listen. He died proud of the life this song described."',
    name: "Michael B.",
    meta: "Boston, MA  ·  Son, for his father in loving memory",
    avatar: "https://i.pravatar.cc/80?img=53",
  },
  {
    slug: "carlos-r",
    quote:
      '"Five years cancer-free this month. We still play our song on the anniversary. It\'s become how our kids understand what their mom went through."',
    name: "Carlos R.",
    meta: "Miami, FL  ·  Husband, for his wife in remission",
    avatar: "https://i.pravatar.cc/80?img=12",
  },
  {
    slug: "naomi-k",
    quote:
      '"I gave it to my sister on day one of chemo. She made it her playlist for every infusion. She told me the song carried her through the worst weeks of her life."',
    name: "Naomi K.",
    meta: "Brooklyn, NY  ·  Sister, for her sister in treatment",
    avatar: "https://i.pravatar.cc/80?img=20",
  },
  {
    slug: "thomas-r",
    quote:
      '"My wife passed in March. We played our song at her service and again on what would have been her birthday. Our kids know her voice through the lyrics now."',
    name: "Thomas R.",
    meta: "Charleston, SC  ·  Husband, in loving memory",
    avatar: "https://i.pravatar.cc/80?img=68",
  },
  {
    slug: "olivia-w",
    quote:
      '"I ordered it the day my mom got the diagnosis. She listened on the drive to her first appointment. She said it gave her something to hold onto when she had nothing."',
    name: "Olivia W.",
    meta: "Portland, OR  ·  Daughter, for her mother newly diagnosed",
    avatar: "https://i.pravatar.cc/80?img=5",
  },
  {
    slug: "emma-c",
    quote:
      '"My twin brother and I lost our mom last spring. We played the song at her wake. People who never met her told us they felt like they had."',
    name: "Emma C.",
    meta: "Burlington, VT  ·  Daughter, in loving memory",
    avatar: "https://i.pravatar.cc/80?img=10",
  },
  {
    slug: "raj-p",
    quote:
      '"My father is from India and rarely shows emotion. He listened with his eyes closed, then asked me to play it again. Three times. He still plays it on Sundays."',
    name: "Raj P.",
    meta: "Edison, NJ  ·  Son, for his father in remission",
    avatar: "https://i.pravatar.cc/80?img=60",
  },
  {
    slug: "lauren-b",
    quote:
      '"I gave it to my best friend on her last day of radiation. She walked into her appointment with my voice in her ears. She rang the bell to our song."',
    name: "Lauren B.",
    meta: "Kansas City, MO  ·  Best friend, for a survivor",
    avatar: "https://i.pravatar.cc/80?img=32",
  },
  {
    slug: "javier-m",
    quote:
      '"Mi abuela barely spoke English at the end. The song was in Spanish. She held my hand the whole way through. She passed two days later."',
    name: "Javier M.",
    meta: "El Paso, TX  ·  Grandson, in loving memory",
    avatar: "https://i.pravatar.cc/80?img=11",
  },
  {
    slug: "kelly-d",
    quote:
      '"Stage IV. They told us six months. We made it eighteen. Our song played at every milestone. We still play it for the kids on her birthday."',
    name: "Kelly D.",
    meta: "Cleveland, OH  ·  Husband, in loving memory",
    avatar: "https://i.pravatar.cc/80?img=14",
  },
  {
    slug: "maya-h",
    quote:
      '"I am eleven years old. My dad has cancer. I ordered the song with my allowance and gave it to him for Father\'s Day. He cried. Mom helped me write this."',
    name: "Maya H.",
    meta: "Madison, WI  ·  Daughter, for her dad in treatment",
    avatar: "https://i.pravatar.cc/80?img=16",
  },
  {
    slug: "william-t",
    quote:
      '"I am 78. My wife of 54 years has Alzheimer\'s and is now in palliative care. The song talks about a beach we honeymooned on. She squeezed my hand at the chorus."',
    name: "William T.",
    meta: "Sarasota, FL  ·  Husband, for his wife in hospice",
    avatar: "https://i.pravatar.cc/80?img=51",
  },
  {
    slug: "tasha-w",
    quote:
      '"I am a nurse on the oncology floor. A patient\'s family played their song for the room. Three of us cried at the nurses\' station. I ordered one for my own mom that night."',
    name: "Tasha W.",
    meta: "Detroit, MI  ·  Oncology nurse · Daughter",
    avatar: "https://i.pravatar.cc/80?img=48",
  },
  {
    slug: "henry-and-paul",
    quote:
      '"My husband Paul was diagnosed at 41. We have two boys. The song is so they remember his laugh, his stupid jokes, the way he sang in the kitchen. They will."',
    name: "Henry & Paul",
    meta: "Brooklyn, NY  ·  Husband, in loving memory",
    avatar: "https://i.pravatar.cc/80?img=33",
  },
  {
    slug: "grace-l",
    quote:
      '"Pediatric oncology unit. My daughter is six. They wheeled in a portable speaker so the whole hallway could hear. Even the doctors stopped working."',
    name: "Grace L.",
    meta: "Cincinnati, OH  ·  Mother, for her daughter in treatment",
    avatar: "https://i.pravatar.cc/80?img=26",
  },
  {
    slug: "moshe-k",
    quote:
      '"We played it at my father\'s shiva. The rabbi asked who wrote it. When I said it was custom, half the room asked for the link. Dad would have loved that."',
    name: "Moshe K.",
    meta: "Baltimore, MD  ·  Son, in loving memory",
    avatar: "https://i.pravatar.cc/80?img=58",
  },
  {
    slug: "amelia-f",
    quote:
      '"I am a hospice chaplain. I have officiated 200+ services. Three families have used your songs and they have all been the most powerful moment of the room. Thank you."',
    name: "Rev. Amelia F.",
    meta: "Asheville, NC  ·  Hospice chaplain",
    avatar: "https://i.pravatar.cc/80?img=22",
  },
  {
    slug: "darnell-j",
    quote:
      '"My pops fought cancer for nine years. Nine. We played the song the morning he passed. The hospice nurse said it was the most peaceful goodbye she has ever witnessed."',
    name: "Darnell J.",
    meta: "Chicago, IL  ·  Son, in loving memory",
    avatar: "https://i.pravatar.cc/80?img=59",
  },
  {
    slug: "linda-and-ray",
    quote:
      '"Ray and I have been married 41 years. Breast cancer twice, both times beat. The song is our second wedding gift to each other. We dance to it in the kitchen."',
    name: "Linda & Ray",
    meta: "Des Moines, IA  ·  Wife, two-time survivor",
    avatar: "https://i.pravatar.cc/80?img=24",
  },
  {
    slug: "aiyana-r",
    quote:
      '"My grandfather was Lakota. The song honored his name and the prayers he taught us. My family said it sounded like home. He passed wearing the headphones."',
    name: "Aiyana R.",
    meta: "Rapid City, SD  ·  Granddaughter, in loving memory",
    avatar: "https://i.pravatar.cc/80?img=35",
  },
  {
    slug: "sergeant-m",
    quote:
      '"My sister is a Marine. Glioblastoma at 34. She did not cry once during treatment. She cried when we played her the song. That is when I knew it was right."',
    name: "Sgt. Marcus T.",
    meta: "San Antonio, TX  ·  Brother, for his sister in treatment",
    avatar: "https://i.pravatar.cc/80?img=64",
  },
  {
    slug: "yuki-h",
    quote:
      '"My mother does not speak English. The song was instrumental but used a melody she sang to me as a child. She recognized it instantly. We held each other and wept."',
    name: "Yuki H.",
    meta: "San Francisco, CA  ·  Daughter, for her mother in remission",
    avatar: "https://i.pravatar.cc/80?img=19",
  },
  {
    slug: "father-and-twins",
    quote:
      '"Our twins were born during my wife\'s chemo. We played her song in the delivery room while she was pumped full of medicine. They are two now. Mom is cancer-free."',
    name: "Anthony R.",
    meta: "Phoenix, AZ  ·  Husband, for his wife in remission",
    avatar: "https://i.pravatar.cc/80?img=65",
  },
  {
    slug: "claire-and-mom",
    quote:
      '"Mom is 92. Lung cancer, stage IV, refused treatment. She wanted dignity. We played her song as her last wish. She mouthed thank you. It will haunt me forever in the best way."',
    name: "Claire D.",
    meta: "Boise, ID  ·  Daughter, in loving memory",
    avatar: "https://i.pravatar.cc/80?img=36",
  },
  {
    slug: "iris-and-jamal",
    quote:
      '"My husband Jamal beat throat cancer last year. He lost his singing voice for nine months. The song uses his old recordings. He cried when he heard himself again."',
    name: "Iris W.",
    meta: "New Orleans, LA  ·  Wife, for her husband in remission",
    avatar: "https://i.pravatar.cc/80?img=43",
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
      } ${fullWidth ? "w-full" : ""}`}
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
  const { samples, testimonialSongs } = Route.useLoaderData() as {
    samples: FeaturedSample[];
    testimonialSongs: Record<string, { id: string; audio_url: string | null; title: string }>;
  };
  // (sample modal removed — playback is now inline on each card)
  // The hero "Listen to Example" button plays the first published, regenerated
  // sample (Margaret/Gospel) so it always reflects the latest admin regen.
  // Falls back to the hardcoded constant if no samples loaded.
  const heroSample = samples[0];
  const heroSongUrl = heroSample?.audio_url || RACHEL_SONG_URL;
  const heroSyncedLyrics = heroSample?.synced_lyrics ?? [];
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
        <div className="mx-auto max-w-[1200px] px-5 sm:px-6">
          <div className="mb-6 flex w-full flex-col items-center gap-3 text-center sm:mb-8 md:mb-12 md:gap-5">
            <span className="hidden h-px w-16 bg-[#8D6FAF]/50 md:block" />
            <h2 style={{ fontFamily: 'Nunito, system-ui, sans-serif', fontWeight: 800 }} className="text-[16px] uppercase leading-[1.3] tracking-[0.14em] text-[#8D6FAF] sm:text-[18px] md:whitespace-nowrap md:text-[26px] md:tracking-[0.16em] lg:text-[30px]">
              The Most Meaningful Gift For Someone You Love Fighting Cancer
            </h2>
            <span className="hidden h-px w-16 bg-[#8D6FAF]/50 md:block" />
          </div>
          <div className="grid items-center gap-8 md:grid-cols-[1.15fr_1fr] md:gap-[60px]">
            <div className="order-2 md:order-1">
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
              <div className="mb-6 text-[13px] leading-[1.5] text-[#8A8175] md:mb-7 md:text-sm">
                <strong className="font-semibold text-[#5A5148]">
                  Rachel L., 34 · Columbus, OH
                </strong>
                <br />
                Daughter of Margaret, 62 · Stage 3 breast cancer, now in remission
              </div>
              <p className="mb-7 max-w-[540px] text-[16px] leading-[1.55] text-[#5A5148] md:mb-8 md:text-[18px]">
                When cancer takes the words away, give them a personalized song that says what you can't, and reminds them they're loved on the hardest days.{" "}
                <strong className="font-semibold text-[#1F1B16]">
                  Written just for them. Produced with care. Theirs to keep forever.
                </strong>
              </p>
              <div className="mb-7 flex w-full flex-col items-stretch gap-3">
                <PrimaryBtn large fullWidth>Start My Custom Song 🎗️</PrimaryBtn>
              </div>
              <div className="w-full text-center text-[13px] leading-[1.4] text-[#5A5148] md:text-[13.5px]">
                Trusted by{" "}
                <strong className="text-[#1F1B16]">2,400+ families</strong>{" "}
                in hospitals, homes, and hospices
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
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#8D6FAF] sm:h-9 sm:w-9">
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
                  <span className="text-[14px] font-semibold tracking-[0.005em] text-[#1F1B16] sm:text-[15px]">
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

      {/* HOW IT WORKS */}
      <section id="how" className="relative overflow-hidden px-0 py-[72px] md:py-[110px]">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(141,111,175,0.08),transparent_60%),radial-gradient(ellipse_at_bottom,rgba(232,197,71,0.06),transparent_55%)]"
        />
        <div className="relative mx-auto max-w-[1200px] px-5 sm:px-6">
          <div className="mx-auto mb-12 max-w-[760px] text-center md:mb-16">
            <Eyebrow center>How it works</Eyebrow>
            <h2 className="mb-4 font-display text-[clamp(30px,7.4vw,52px)] font-medium leading-[1.05] tracking-[-0.024em] text-[#1F1B16]">
              How <em className="italic text-[#8D6FAF]">RibbonSong</em> Works
            </h2>
            <p className="mx-auto mt-4 max-w-[560px] text-[17px] leading-[1.55] text-[#5A5148]">
              You don't have to know music. You don't have to know what to say.
              You just have to know them.
            </p>
          </div>

          <div className="relative grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-7">
            <div
              aria-hidden
              className="pointer-events-none absolute left-0 right-0 top-[44px] hidden h-px bg-gradient-to-r from-transparent via-[#D9CEB9] to-transparent md:block"
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
                m: "Don't love it? You get one free rewrite, or a full refund. No questions.",
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
                  </svg>
                ),
              },
            ].map((s) => (
              <div
                key={s.n}
                className="group relative flex flex-col rounded-[20px] border border-[#D9CEB9] bg-[#FBF6EC]/80 p-7 backdrop-blur-sm transition-all duration-300 hover:-translate-y-[4px] hover:border-[#8D6FAF]/40 hover:bg-[#FBF6EC] hover:shadow-[0_14px_40px_-12px_rgba(141,111,175,0.25)] md:p-8"
              >
                <div className="relative mb-5 flex items-center gap-3">
                  <div className="flex h-[56px] w-[56px] items-center justify-center rounded-full border border-[#D9CEB9] bg-[#F6F0E6] font-display text-[20px] font-medium text-[#8D6FAF] shadow-[inset_0_1px_2px_rgba(255,255,255,0.6),0_2px_8px_rgba(31,27,22,0.04)] transition-all group-hover:border-[#8D6FAF]/50 group-hover:bg-white">
                    {s.n}
                  </div>
                  <span className="text-[#8D6FAF]/70 transition-colors group-hover:text-[#8D6FAF]">
                    {s.icon}
                  </span>
                </div>

                <h3 className="mb-3 font-display text-[22px] font-medium leading-[1.2] tracking-[-0.012em] text-[#1F1B16] md:text-[24px]">
                  {s.h}
                </h3>
                <p className="mb-4 text-[15px] leading-[1.6] text-[#5A5148] md:text-[15.5px]">
                  {s.p}
                </p>
                <p className="mt-auto border-t border-[#D9CEB9]/60 pt-4 text-[13.5px] italic leading-[1.55] text-[#8A8175]">
                  {s.m}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-12 text-center md:mt-14">
            <PrimaryBtn large>Start My Custom Song 🎗️</PrimaryBtn>
          </div>
        </div>
      </section>

      {/* LISTEN SECTION */}
      <section id="listen" className="bg-[#ECE2D0] px-0 py-[64px] md:py-[100px]">
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
            <PrimaryBtn large>Start My Custom Song 🎗️</PrimaryBtn>
          </div>
        </div>
      </section>

      {/* WHO IT'S FOR */}
      <section id="who" className="px-0 py-[72px] md:py-[100px]">
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
            <PrimaryBtn large>Start My Custom Song 🎗️</PrimaryBtn>
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
            {testimonials.map((t, i) => {
              const song = testimonialSongs[t.slug];
              const hasAudio = !!song?.audio_url;
              const isPlaying = hasAudio && playingSampleId === song!.id;
              return (
                <div
                  key={i}
                  className="flex flex-col rounded-[16px] border border-[#D9CEB9] bg-[#FBF6EC] p-[24px_22px]"
                >
                  <div className="flex items-start gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="mb-4 text-[14.5px] leading-[1.55] text-[#1F1B16]">
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
                      <div className="absolute left-1/2 top-1/2 flex h-[34%] w-[34%] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-[#8D6FAF]">
                        <div className="h-[6px] w-[6px] rounded-full bg-[#FBF6EC]" />
                      </div>
                      {/* Play/pause icon overlay */}
                      {!isPlaying && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#FBF6EC]/95 shadow-[0_2px_6px_rgba(0,0,0,0.4)] sm:h-6 sm:w-6 md:h-7 md:w-7">
                            <svg
                              width="10"
                              height="11"
                              viewBox="0 0 11 12"
                              fill="none"
                              className="ml-[1px]"
                            >
                              <path d="M0 0L11 6L0 12V0Z" fill="#1F1B16" />
                            </svg>
                          </div>
                        </div>
                      )}
                      {isPlaying && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#FBF6EC]/95 shadow-[0_2px_6px_rgba(0,0,0,0.4)] sm:h-6 sm:w-6 md:h-7 md:w-7">
                            <svg width="9" height="11" viewBox="0 0 10 12" fill="none">
                              <rect x="0" y="0" width="3" height="12" fill="#1F1B16" />
                              <rect x="7" y="0" width="3" height="12" fill="#1F1B16" />
                            </svg>
                          </div>
                        </div>
                      )}
                    </button>
                  </div>
                  <div className="mt-4 flex items-center gap-3 border-t border-[#D9CEB9] pt-4">
                    <img
                      src={t.avatar}
                      alt=""
                      loading="lazy"
                      className="h-10 w-10 rounded-full object-cover"
                    />
                    <div className="min-w-0">
                      <div className="text-[13.5px] font-semibold text-[#1F1B16]">
                        {t.name}
                      </div>
                      <div className="truncate text-[12px] text-[#8A8175]">
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
          <PrimaryBtn large>Start My Custom Song 🎗️</PrimaryBtn>
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
