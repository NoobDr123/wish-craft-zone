import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
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
  head: () => ({
    meta: [
      { title: "RibbonSong — Give them a song when words run out" },
      {
        name: "description",
        content:
          "When cancer takes the words away, give them a song. Written with care. Produced in studio. Delivered to your inbox in seven days.",
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

const samples = [
  {
    title: "For My Mother (Through Chemo)",
    quote:
      '"She used to sing us to sleep. I wanted something she could play when she\'s scared."',
    forText: "Written for Diane, 58. Breast cancer, in treatment.",
    genre: "Acoustic Folk · Female Voice",
    img: "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=600&q=80",
  },
  {
    title: "Stronger Than the Storm",
    quote: '"My son asks for it every time we get a clear scan."',
    forText: "Written for James, 12. Leukemia, in remission.",
    genre: "Uplifting Pop · Male Voice",
    img: "https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?auto=format&fit=crop&w=600&q=80",
  },
  {
    title: "Quiet Light (In Loving Memory)",
    quote: '"We played it at her memorial instead of a hymn. It was her."',
    forText: "Written for Eleanor, 71. Ovarian cancer, in loving memory.",
    genre: "Cinematic · Strings",
    img: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=600&q=80",
  },
  {
    title: "The Promise (For Dad)",
    quote: '"I gave it to him in hospice. He played it three times in a row."',
    forText: "Written for Tom, 64. Stage IV pancreatic.",
    genre: "Country · Male Voice",
    img: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80",
  },
  {
    title: "Rachel's Anthem",
    quote: '"Two years free of cancer. We play it at every birthday now."',
    forText: "Written for Rachel, 34. Breast cancer, survivor.",
    genre: "Gospel · Female Voice",
    img: "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&w=600&q=80",
  },
  {
    title: "Carry Me Home",
    quote:
      '"My husband\'s prayer set to music. The choir at his service sang it."',
    forText: "Written for David, 52. Glioblastoma, in loving memory.",
    genre: "Worship · Duet",
    img: "https://images.unsplash.com/photo-1518976024611-28bf4b48222e?auto=format&fit=crop&w=600&q=80",
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

const testimonials: Array<
  | {
      type: "text";
      quote: string;
      name: string;
      meta: string;
      avatar: string;
    }
  | {
      type: "video";
      song: string;
      who: string;
      img: string;
    }
> = [
  {
    type: "text",
    quote:
      '"I almost didn\'t order because it felt like too much. I was wrong. It\'s the only thing I gave him during the whole fight that he asked to hear again."',
    name: "David K.",
    meta: "Austin, TX  ·  Son, for his father in treatment",
    avatar: "https://i.pravatar.cc/80?img=67",
  },
  {
    type: "video",
    song: '"God Gave Me You"',
    who: "Watch Wendy's story",
    img: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=500&q=80",
  },
  {
    type: "text",
    quote:
      '"My mom played it in her earbuds during infusions. She said the nurses asked her what she was listening to every single week."',
    name: "Sarah R.",
    meta: "Columbus, OH  ·  Daughter, for her mother",
    avatar: "https://i.pravatar.cc/80?img=45",
  },
  {
    type: "video",
    song: '"The Promise (For Dad)"',
    who: "Watch Marcus's story",
    img: "https://images.unsplash.com/photo-1518976024611-28bf4b48222e?auto=format&fit=crop&w=500&q=80",
  },
  {
    type: "text",
    quote:
      '"Two years free of cancer, and this song still plays at every birthday. It became our family\'s anthem. Our daughter asks for it by name now."',
    name: "Priya & Sam",
    meta: "Seattle, WA  ·  Parents of a survivor",
    avatar: "https://i.pravatar.cc/80?img=39",
  },
  {
    type: "video",
    song: '"Quiet Light (In Memory)"',
    who: "Watch Eleanor's family's story",
    img: "https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&w=500&q=80",
  },
  {
    type: "text",
    quote:
      '"We played it at his bedside the night before he passed. The chorus said the things we couldn\'t. The most precious thing our family owns."',
    name: "Marcus D.",
    meta: "Phoenix, AZ  ·  Brother, in loving memory",
    avatar: "https://i.pravatar.cc/80?img=52",
  },
  {
    type: "video",
    song: '"Stronger Than the Storm"',
    who: "Watch James ring the bell",
    img: "https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?auto=format&fit=crop&w=500&q=80",
  },
  {
    type: "text",
    quote:
      '"He heard it twice before we lost him. Thank you will never cover it."',
    name: "Patricia M.",
    meta: "Tampa, FL  ·  Wife, for her husband in hospice",
    avatar: "https://i.pravatar.cc/80?img=23",
  },
];

const faqs = [
  {
    q: "How long does it take?",
    a: "Standard delivery is seven days. If you're up against a hospice timeline or a specific date we need to hit, tell us. We will do everything in our power to meet the moment.",
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
  to = "/create",
}: {
  children: React.ReactNode;
  large?: boolean;
  to?: string;
}) {
  return (
    <Link
      to={to}
      className={`group inline-flex items-center gap-2.5 rounded-full bg-[#8D6FAF] font-semibold text-[#FFF7EE] tracking-[0.005em] shadow-[0_6px_16px_rgba(141,111,175,0.28)] transition-all hover:-translate-y-px hover:bg-[#6B4F8A] hover:shadow-[0_10px_24px_rgba(141,111,175,0.35)] ${
        large ? "px-[34px] py-[18px] text-[16.5px]" : "px-[26px] py-[14px] text-[15px]"
      }`}
    >
      {children}
      <span className="transition-transform group-hover:translate-x-1">→</span>
    </Link>
  );
}

function GhostBtn({ children, href }: { children: React.ReactNode; href: string }) {
  return (
    <a
      href={href}
      className="inline-flex items-center gap-2.5 rounded-full border border-[#1F1B16] bg-transparent px-[26px] py-[14px] text-[15px] font-semibold text-[#1F1B16] transition-all hover:bg-[#1F1B16] hover:text-[#F6F0E6]"
    >
      {children}
    </a>
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
          <div className="grid items-center gap-10 md:grid-cols-[1.15fr_1fr] md:gap-[60px]">
            <div>
              <Eyebrow>The #1 Custom Song Platform For Cancer Families</Eyebrow>
              <h1 className="mb-[22px] max-w-[700px] font-display text-[clamp(30px,8vw,64px)] font-medium italic leading-[1.06] tracking-[-0.025em] text-[#1F1B16] md:mb-[26px]">
                <span className="font-display text-[1.1em] font-semibold not-italic text-[#8D6FAF] -mr-[0.04em]">
                  &ldquo;
                </span>
                I played it on the drive home from her last chemo. We both
                cried the whole way.
                <span className="font-display text-[1.1em] font-semibold not-italic text-[#8D6FAF]">
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
              <div className="mb-7 flex flex-wrap items-center gap-3 sm:gap-4">
                <PrimaryBtn large>Start their song</PrimaryBtn>
                <GhostBtn href="#listen">Listen to real songs</GhostBtn>
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-[13px] text-[#5A5148] sm:gap-3.5">
                <span className="tracking-[1px] text-[#C9A85A]">★★★★★</span>
                <span>
                  <strong className="text-[#1F1B16]">4.9</strong> from 2,400+
                  families
                </span>
                <span className="hidden sm:inline-block h-[3px] w-[3px] rounded-full bg-[#8A8175]" />
                <span>Free revisions</span>
                <span className="hidden sm:inline-block h-[3px] w-[3px] rounded-full bg-[#8A8175]" />
                <span>Money back guarantee</span>
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

            {/* Hero video */}
            <div className="relative aspect-[4/5] overflow-hidden rounded-[18px] bg-[#ECE2D0] shadow-[0_20px_60px_rgba(31,27,22,0.12)]">
              <img
                src="https://images.unsplash.com/photo-1609220136736-443140cffec6?auto=format&fit=crop&w=900&q=80"
                alt="Mother and daughter listening"
                className="h-full w-full object-cover"
              />
              <button
                aria-label="Play video"
                className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-[rgba(246,240,230,0.95)] shadow-[0_8px_32px_rgba(0,0,0,0.3)] transition-transform hover:scale-110 sm:h-20 sm:w-20"
              >
                <span
                  className="ml-1 inline-block"
                  style={{
                    width: 0,
                    height: 0,
                    borderLeft: "16px solid #8D6FAF",
                    borderTop: "10px solid transparent",
                    borderBottom: "10px solid transparent",
                  }}
                />
              </button>
              <div className="absolute inset-x-4 bottom-4 rounded-[10px] bg-[rgba(31,27,22,0.85)] p-[12px_14px] text-[12.5px] leading-[1.45] text-[#F6F0E6] backdrop-blur-md sm:inset-x-5 sm:bottom-5 sm:p-[14px_16px] sm:text-[13.5px]">
                <strong className="mb-1 block text-[10.5px] font-semibold uppercase tracking-[0.1em] text-[#E5D9EF] sm:text-[11px]">
                  Watch Rachel's story
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
            <span className="font-sans text-[13px] font-bold uppercase tracking-[0.12em] text-[#5A5148] opacity-70 transition-opacity hover:opacity-100 md:text-[15px]">
              FOX
            </span>
            <span className="font-display text-[17px] font-semibold tracking-[-0.01em] text-[#5A5148] opacity-70 transition-opacity hover:opacity-100 md:text-[20px]">
              Good Morning America
            </span>
            <span className="font-sans text-[13px] font-bold uppercase tracking-[0.12em] text-[#5A5148] opacity-70 transition-opacity hover:opacity-100 md:text-[15px]">
              Survivornet
            </span>
            <span className="font-display text-[17px] font-semibold tracking-[-0.01em] text-[#5A5148] opacity-70 transition-opacity hover:opacity-100 md:text-[20px]">
              Yahoo Life
            </span>
          </div>
        </div>
      </div>

      {/* LISTEN */}
      <section id="listen" className="px-0 py-[64px] md:py-[100px]">
        <div className="mx-auto max-w-[1200px] px-5 sm:px-6">
          <div className="mx-auto mb-10 max-w-[720px] text-center md:mb-14">
            <Eyebrow center>Listen</Eyebrow>
            <h2 className="mb-3.5 font-display text-[clamp(28px,7vw,48px)] font-medium leading-[1.1] tracking-[-0.022em] text-[#1F1B16]">
              <em className="italic text-[#8D6FAF]">real families.</em>
            </h2>
            <p className="mx-auto mt-3.5 max-w-[560px] text-[17px] leading-[1.55] text-[#5A5148]">
              Every song below was written for one real person, fighting one
              real cancer, by their family. No templates. No two alike.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {samples.map((s) => (
              <div
                key={s.title}
                className="group cursor-pointer overflow-hidden rounded-[14px] border border-[#D9CEB9] bg-[#FBF6EC] transition-all hover:-translate-y-1 hover:shadow-[0_8px_24px_rgba(31,27,22,0.08)]"
              >
                <div className="relative aspect-[16/10] overflow-hidden bg-[#ECE2D0]">
                  <img
                    src={s.img}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute bottom-3 left-3 flex h-10 w-10 items-center justify-center rounded-full bg-[rgba(246,240,230,0.95)]">
                    <span
                      className="ml-[3px] inline-block"
                      style={{
                        width: 0,
                        height: 0,
                        borderLeft: "10px solid #8D6FAF",
                        borderTop: "6px solid transparent",
                        borderBottom: "6px solid transparent",
                      }}
                    />
                  </div>
                  <div className="absolute right-3 top-3 rounded-full bg-[rgba(31,27,22,0.82)] px-2.5 py-[5px] text-[11px] font-medium tracking-[0.03em] text-[#F6F0E6] backdrop-blur-sm">
                    {s.genre}
                  </div>
                </div>
                <div className="p-[20px_22px_22px]">
                  <h3 className="mb-2.5 font-display text-[20px] font-medium leading-[1.2] tracking-[-0.01em] text-[#1F1B16]">
                    {s.title}
                  </h3>
                  <div className="mb-3.5 border-l-2 border-[#E5D9EF] pl-3 text-[14.5px] italic leading-[1.5] text-[#5A5148]">
                    {s.quote}
                  </div>
                  <div className="border-t border-[#D9CEB9] pt-3 text-[12.5px] text-[#8A8175]">
                    {s.forText}
                  </div>
                </div>
              </div>
            ))}
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

      {/* HOW IT WORKS */}
      <section id="how" className="px-0 py-[64px] md:py-[100px]">
        <div className="mx-auto max-w-[1200px] px-5 sm:px-6">
          <div className="mx-auto mb-10 max-w-[720px] text-center md:mb-14">
            <Eyebrow center>How it works</Eyebrow>
            <h2 className="mb-3.5 font-display text-[clamp(28px,7vw,48px)] font-medium leading-[1.1] tracking-[-0.022em] text-[#1F1B16]">
              Three gentle steps. <em className="italic text-[#8D6FAF]">Seven days.</em>
            </h2>
            <p className="mx-auto mt-3.5 max-w-[560px] text-[17px] leading-[1.55] text-[#5A5148]">
              You don't have to know music. You don't have to know what to say.
              You just have to know them.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {[
              {
                n: "01",
                h: "Tell their story.",
                p: "A guided, unhurried conversation. Written, not a call. We ask the kinds of questions that bring the right memories up without you having to dig for them.",
                m: "Takes about ten minutes. Families tell us this part alone is already a gift.",
              },
              {
                n: "02",
                h: "We write and record.",
                p: "You pick the genre, the tempo, and the voice. Or let us recommend based on the story you shared. Acoustic folk, country, gospel, worship, uplifting pop, or cinematic strings.",
                m: "Produced to the same quality you hear on the radio.",
              },
              {
                n: "03",
                h: "Delivered to your inbox.",
                p: "Within seven days. MP3 and WAV files, a printable lyric sheet, and a private share page they can keep forever.",
                m: "If the first version doesn't feel like them, we rewrite it. Always free.",
              },
            ].map((step) => (
              <div key={step.n}>
                <div className="mb-3.5 font-display text-[76px] font-medium italic leading-none tracking-[-0.02em] text-[#8D6FAF] opacity-35">
                  {step.n}
                </div>
                <h3 className="mb-3 font-display text-[26px] font-medium leading-[1.15] tracking-[-0.015em] text-[#1F1B16]">
                  {step.h}
                </h3>
                <p className="text-[15.5px] leading-[1.6] text-[#5A5148]">
                  {step.p}
                </p>
                <div className="mt-3 text-[13px] italic text-[#8A8175]">
                  {step.m}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* OBJECTION */}
      <section className="relative overflow-hidden bg-[#1F1B16] px-0 py-[60px] text-[#F6F0E6] md:py-[80px]">
        <div
          className="absolute -left-12 -top-12 h-[300px] w-[300px] opacity-[0.22]"
          style={{
            background:
              "radial-gradient(circle, #8D6FAF 0%, transparent 70%)",
          }}
        />
        <div className="relative z-10 mx-auto max-w-[920px] px-5 sm:px-6">
          <div className="mb-[18px] inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#E5D9EF] md:mb-[22px] md:text-[11.5px]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#E5D9EF]" />
            You don't have to find the words
          </div>
          <h2 className="mb-6 font-display text-[clamp(26px,6.5vw,44px)] font-normal italic leading-[1.15] tracking-[-0.015em] text-[#F6F0E6] md:mb-7">
            "I'm not a songwriter. I don't even know what to say."{" "}
            <em className="font-medium not-italic text-[#E5D9EF]">Good.</em>
          </h2>
          <p className="mb-5 max-w-[640px] text-[17.5px] leading-[1.65] text-[rgba(246,240,230,0.78)]">
            That's the whole reason this exists.
          </p>
          <p className="mb-5 max-w-[640px] text-[17.5px] leading-[1.65] text-[rgba(246,240,230,0.78)]">
            Most families come to us unsure of what to say, because cancer has
            a way of making even love hard to put into words. So we built our
            story questionnaire to do the remembering for you. The prompts
            bring the right memories up on their own. You don't have to find
            them. You just have to answer them.
          </p>
          <p className="mb-5 max-w-[640px] text-[17.5px] leading-[1.65] text-[rgba(246,240,230,0.78)]">
            <strong className="font-semibold text-[#F6F0E6]">
              Families tell us this part alone, answering the questions, is
              already a gift.
            </strong>{" "}
            Some print them out just to keep.
          </p>
          <p className="mb-5 max-w-[640px] text-[17.5px] leading-[1.65] text-[rgba(246,240,230,0.78)]">
            The only thing you have to bring is the love. You already have
            that.
          </p>
          <Link
            to="/create"
            className="group mt-4 inline-flex items-center gap-2.5 rounded-full bg-[#F6F0E6] px-[34px] py-[18px] text-[16.5px] font-semibold text-[#1F1B16] transition-all hover:-translate-y-px hover:bg-[#E5D9EF]"
          >
            Start their song
            <span className="transition-transform group-hover:translate-x-1">
              →
            </span>
          </Link>
        </div>
      </section>

      {/* WHAT YOU GET */}
      <section className="px-0 py-[64px] md:py-[100px]">
        <div className="mx-auto max-w-[1200px] px-5 sm:px-6">
          <div className="grid items-center gap-10 md:grid-cols-2 md:gap-[60px]">
            <div>
              <Eyebrow>What you get</Eyebrow>
              <h2 className="mb-6 font-display text-[clamp(28px,7vw,48px)] font-medium leading-[1.1] tracking-[-0.022em] text-[#1F1B16]">
                Exactly what{" "}
                <em className="italic text-[#8D6FAF]">arrives in your inbox.</em>
              </h2>
              <ul className="list-none">
                {[
                  {
                    s: "A studio quality song",
                    d: "MP3 and WAV files. Ready to play on any device. Phone, car, speaker.",
                  },
                  {
                    s: "A printable lyric sheet",
                    d: "Designed like a keepsake. Beautifully typeset PDF.",
                  },
                  {
                    s: "A private share page",
                    d: "Hidden from search. Keeps the full story behind the song.",
                  },
                  {
                    s: "A free revision",
                    d: "If the first version doesn't feel like them, we rewrite it.",
                  },
                  {
                    s: "Yours forever",
                    d: "No subscription. No paywall. No ads. Ever.",
                  },
                ].map((b, i, arr) => (
                  <li
                    key={b.s}
                    className={`flex items-start gap-3.5 py-4 text-[16px] text-[#1F1B16] ${
                      i === 0 ? "pt-0" : ""
                    } ${
                      i === arr.length - 1
                        ? ""
                        : "border-b border-[#D9CEB9]"
                    }`}
                  >
                    <div className="mt-[1px] flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#8D6FAF]">
                      <span
                        className="block"
                        style={{
                          width: "5px",
                          height: "9px",
                          border: "solid #F6F0E6",
                          borderWidth: "0 2px 2px 0",
                          transform: "rotate(45deg) translate(-1px, -1px)",
                        }}
                      />
                    </div>
                    <div>
                      <strong className="mb-0.5 block font-semibold">
                        {b.s}
                      </strong>
                      <div className="mt-0.5 text-[13.5px] font-normal text-[#8A8175]">
                        {b.d}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* Deliverable visual */}
            <div className="rounded-[14px] bg-[#ECE2D0] p-9 shadow-[0_8px_24px_rgba(31,27,22,0.08)]">
              <div className="mb-[18px] rounded-[12px] border border-[#D9CEB9] bg-[#FBF6EC] p-[22px] shadow-[0_2px_8px_rgba(31,27,22,0.06)]">
                <div className="mb-3.5 flex items-center justify-between border-b border-[#D9CEB9] pb-3 text-[12px] text-[#8A8175]">
                  <span>from RibbonSong</span>
                  <span>today, 2:14 PM</span>
                </div>
                <div className="mb-2.5 font-display text-[20px] font-medium italic leading-[1.2] text-[#1F1B16]">
                  Your song for Diane is ready 🎗️
                </div>
                <div className="text-[13.5px] leading-[1.5] text-[#5A5148]">
                  Hi Rachel, we finished "For My Mother (Through Chemo)."
                  Listen below, download your files, and find the private share
                  page inside. We made something beautiful for her.
                </div>
              </div>
              <div className="flex items-center gap-4 rounded-[14px] bg-[#1F1B16] p-[20px_22px] text-[#F6F0E6]">
                <div className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-full bg-[#8D6FAF]">
                  <span
                    className="ml-[3px] inline-block"
                    style={{
                      width: 0,
                      height: 0,
                      borderLeft: "10px solid #F6F0E6",
                      borderTop: "7px solid transparent",
                      borderBottom: "7px solid transparent",
                    }}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="mb-0.5 font-display text-[15px] font-medium">
                    For My Mother (Through Chemo)
                  </div>
                  <div className="text-[11.5px] text-[rgba(246,240,230,0.6)]">
                    Acoustic Folk · 3:42
                  </div>
                </div>
                <div className="flex h-7 flex-1 items-center gap-[2px]">
                  {[10, 16, 22, 14, 20, 26, 18, 24, 12, 20, 28, 15, 22, 18, 14, 20, 26, 11, 18, 22, 14, 10, 16, 12].map(
                    (h, i) => (
                      <div
                        key={i}
                        className="flex-1 rounded-[1px]"
                        style={{
                          height: `${h}px`,
                          background: i < 12 ? "#8D6FAF" : "#E5D9EF",
                          opacity: i < 12 ? 1 : 0.4,
                        }}
                      />
                    ),
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT'S MADE */}
      <section className="bg-[#ECE2D0] px-0 py-[64px] md:py-[100px]">
        <div className="mx-auto max-w-[1200px] px-5 sm:px-6">
          <div className="mb-10 max-w-[720px] md:mb-14">
            <Eyebrow>Made with care</Eyebrow>
            <h2 className="mb-3.5 font-display text-[clamp(28px,7vw,48px)] font-medium leading-[1.1] tracking-[-0.022em] text-[#1F1B16]">
              How your song <em className="italic text-[#8D6FAF]">comes together.</em>
            </h2>
            <p className="max-w-[560px] text-[17px] leading-[1.55] text-[#5A5148]">
              Every RibbonSong moves through a careful creative process.
              Nothing is automated. Nothing is rushed. Every detail is paid
              attention to, because we know what's riding on it.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-7 md:grid-cols-3">
            {[
              {
                role: "The Story",
                h: "Someone sits with your words.",
                p: "Before a single note is written, someone reads everything you shared. They take the time to find the line that matters most, then build the rest of the song around it.",
              },
              {
                role: "The Sound",
                h: "Shaped to fit the person it's for.",
                p: "You pick the genre, the tempo, and the voice. The song is produced to the same quality you hear on the radio. If your story calls for strings, it gets strings. If it calls for gospel, it gets gospel.",
              },
              {
                role: "The Final Listen",
                h: "It passes through our team before it reaches you.",
                p: "Before anything leaves our studio, someone listens to the full song from beginning to end. If something doesn't feel right, we catch it. If you tell us something doesn't feel right, we fix it.",
              },
            ].map((m) => (
              <div
                key={m.role}
                className="rounded-[14px] border border-[#D9CEB9] bg-[#FBF6EC] p-[32px_28px]"
              >
                <div className="mb-4 text-[11.5px] font-semibold uppercase tracking-[0.14em] text-[#8D6FAF]">
                  {m.role}
                </div>
                <h3 className="mb-3.5 font-display text-[22px] font-medium leading-[1.2] tracking-[-0.015em] text-[#1F1B16]">
                  {m.h}
                </h3>
                <p className="text-[14.5px] leading-[1.6] text-[#5A5148]">
                  {m.p}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-12 flex items-center gap-5 rounded-[14px] bg-[#1F1B16] px-9 py-7 text-[#F6F0E6]">
            <div className="shrink-0 text-[32px]">🎗️</div>
            <p className="font-display text-[19px] italic leading-[1.45] tracking-[-0.01em]">
              We built RibbonSong to hold what language alone cannot. We know
              what's riding on every song we send. This is not a sweatshirt.
            </p>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section id="stories" className="px-0 py-[64px] md:py-[100px]">
        <div className="mx-auto max-w-[1200px] px-5 sm:px-6">
          <div className="mb-10 max-w-[720px] md:mb-14">
            <Eyebrow>Stories from families</Eyebrow>
            <h2 className="mb-3.5 font-display text-[clamp(28px,7vw,48px)] font-medium leading-[1.1] tracking-[-0.022em] text-[#1F1B16]">
              2,400+ families.{" "}
              <em className="italic text-[#8D6FAF]">Here's what they said.</em>
            </h2>
            <p className="max-w-[560px] text-[17px] leading-[1.55] text-[#5A5148]">
              The best way to know what you're getting is to hear from the
              families who already gave one.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {testimonials.map((t, i) =>
              t.type === "text" ? (
                <div
                  key={i}
                  className="flex flex-col justify-between rounded-[14px] border border-[#D9CEB9] bg-[#FBF6EC] p-[28px_26px]"
                >
                  <div>
                    <div className="mb-3.5 text-[14px] tracking-[2px] text-[#C9A85A]">
                      ★★★★★
                    </div>
                    <blockquote className="mb-[22px] font-display text-[17px] italic leading-[1.45] tracking-[-0.005em] text-[#1F1B16]">
                      {t.quote}
                    </blockquote>
                  </div>
                  <div className="flex items-center gap-3 border-t border-[#D9CEB9] pt-[18px]">
                    <img
                      src={t.avatar}
                      alt=""
                      className="h-10 w-10 rounded-full object-cover"
                    />
                    <div className="text-[13px] leading-[1.35]">
                      <strong className="block font-semibold text-[#1F1B16]">
                        {t.name}
                      </strong>
                      <span className="text-[12px] text-[#8A8175]">
                        {t.meta}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  key={i}
                  className="relative aspect-[4/5] min-h-[320px] overflow-hidden rounded-[14px]"
                >
                  <img
                    src={t.img}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                  <div
                    className="absolute inset-0"
                    style={{
                      background:
                        "linear-gradient(to top, rgba(31,27,22,0.88) 0%, transparent 55%)",
                    }}
                  />
                  <div className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-[rgba(246,240,230,0.95)]">
                    <span
                      className="ml-[2px] inline-block"
                      style={{
                        width: 0,
                        height: 0,
                        borderLeft: "9px solid #8D6FAF",
                        borderTop: "5.5px solid transparent",
                        borderBottom: "5.5px solid transparent",
                      }}
                    />
                  </div>
                  <div className="absolute inset-x-5 bottom-5 z-10 text-[#F6F0E6]">
                    <div className="mb-1.5 font-display text-[17px] font-medium">
                      {t.song}
                    </div>
                    <div className="text-[12px] text-[rgba(246,240,230,0.78)]">
                      {t.who}
                    </div>
                  </div>
                </div>
              ),
            )}
          </div>

          <div className="mt-12 text-center">
            <a
              href="#stories"
              className="border-b border-current pb-0.5 text-[15px] font-semibold text-[#8D6FAF]"
            >
              Read all 2,400+ reviews
            </a>
          </div>
        </div>
      </section>

      {/* GUARANTEE */}
      <section className="bg-[#ECE2D0] px-0 py-[100px]">
        <div className="mx-auto max-w-[1200px] px-6">
          <div className="relative mx-auto max-w-[820px] rounded-[14px] border-2 border-[#8D6FAF] bg-[#FBF6EC] p-[52px_56px] text-center">
            <div className="absolute -top-7 left-1/2 -translate-x-1/2 rounded-full bg-[#8D6FAF] px-6 py-2.5 text-[12px] font-semibold uppercase tracking-[0.1em] text-[#F6F0E6]">
              Our promise to you
            </div>
            <h2 className="mb-[18px] font-display text-[clamp(28px,3.2vw,38px)] font-medium leading-[1.2] tracking-[-0.018em]">
              If it doesn't feel like{" "}
              <em className="italic text-[#8D6FAF]">them</em>, we rewrite it.
              Until it does.
            </h2>
            <p className="mx-auto mb-4 max-w-[620px] text-[17px] leading-[1.6] text-[#5A5148]">
              If the first version of the song doesn't feel like the person
              you love, not "isn't good enough," but doesn't feel like them, we
              rewrite it. Free. As many times as it takes.
            </p>
            <p className="mx-auto mb-4 max-w-[620px] text-[17px] leading-[1.6] text-[#5A5148]">
              And if after all of that it still isn't right, we refund you in
              full. No questions. No forms. No argument.
            </p>
            <div className="mt-[26px] font-display text-[18px] italic leading-[1.4] text-[#8D6FAF]">
              You cannot lose money on this.
              <br />
              The only thing you can do is give them something nobody else in
              the world could give them.
            </div>
          </div>
        </div>
      </section>

      {/* BEGIN BLOCK */}
      <section id="begin" className="relative overflow-hidden px-0 py-[100px] text-center">
        <div
          className="pointer-events-none absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 opacity-50"
          style={{
            background:
              "radial-gradient(circle, #E5D9EF 0%, transparent 70%)",
          }}
        />
        <div className="relative z-10 mx-auto max-w-[920px] px-6">
          <Eyebrow center>Ready when you are</Eyebrow>
          <h2 className="mb-[18px] font-display text-[clamp(32px,4vw,52px)] font-medium leading-[1.1] tracking-[-0.022em] text-[#1F1B16]">
            Tell us about them.{" "}
            <em className="italic text-[#8D6FAF]">We'll take it from there.</em>
          </h2>
          <p className="mx-auto mb-9 max-w-[560px] text-[18px] leading-[1.55] text-[#5A5148]">
            Your song starts with one story. Answer a few gentle questions,
            choose how you want it to sound, and we'll do the rest.
          </p>
          <PrimaryBtn large>Start their song</PrimaryBtn>
          <div className="mt-[22px] text-[13.5px] tracking-[0.02em] text-[#8A8175]">
            No risk to begin &nbsp;·&nbsp; Free revisions &nbsp;·&nbsp;
            Refunded if it isn't right
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="bg-[#ECE2D0] px-0 py-[80px]">
        <div className="mx-auto max-w-[1200px] px-6">
          <div className="mx-auto mb-14 max-w-[720px] text-center">
            <Eyebrow center>Frequently asked</Eyebrow>
            <h2 className="font-display text-[clamp(32px,4vw,48px)] font-medium leading-[1.1] tracking-[-0.022em] text-[#1F1B16]">
              Everything you want to know{" "}
              <em className="italic text-[#8D6FAF]">before you decide.</em>
            </h2>
          </div>

          <div className="mx-auto max-w-[820px]">
            {faqs.map((f, i) => (
              <details
                key={f.q}
                className={`group border-b border-[#D9CEB9] py-6 ${
                  i === 0 ? "border-t" : ""
                }`}
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-5 font-display text-[20px] font-medium tracking-[-0.01em] text-[#1F1B16] [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <span className="shrink-0 font-sans text-[24px] leading-none text-[#8D6FAF] group-open:hidden">
                    +
                  </span>
                  <span className="hidden shrink-0 font-sans text-[24px] leading-none text-[#8D6FAF] group-open:inline">
                    −
                  </span>
                </summary>
                <div className="max-w-[700px] pt-4 text-[15.5px] leading-[1.65] text-[#5A5148]">
                  {f.a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="relative overflow-hidden bg-[#1F1B16] px-0 py-[120px] text-center text-[#F6F0E6]">
        <div
          className="absolute -right-24 -top-24 h-[400px] w-[400px] opacity-[0.22]"
          style={{
            background:
              "radial-gradient(circle, #8D6FAF 0%, transparent 70%)",
          }}
        />
        <div
          className="absolute -bottom-36 -left-24 h-[400px] w-[400px] opacity-10"
          style={{
            background:
              "radial-gradient(circle, #C9A85A 0%, transparent 70%)",
          }}
        />
        <div className="relative z-10 mx-auto max-w-[920px] px-6">
          <h2 className="mb-[22px] font-display text-[clamp(32px,4.4vw,56px)] font-normal leading-[1.12] tracking-[-0.025em] text-[#F6F0E6]">
            On the chemo days. The scan days. The milestone days.
            <br />
            And on the days{" "}
            <em className="italic text-[#E5D9EF]">you miss them most.</em>
          </h2>
          <p className="mx-auto mb-9 max-w-[580px] text-[17px] leading-[1.55] text-[rgba(246,240,230,0.75)]">
            Give them something only you could give.
          </p>
          <Link
            to="/create"
            className="group inline-flex items-center gap-2.5 rounded-full bg-[#8D6FAF] px-10 py-5 text-[17px] font-semibold text-[#F6F0E6] transition-all hover:-translate-y-px hover:bg-[#6B4F8A]"
          >
            Start their song
            <span className="transition-transform group-hover:translate-x-1">
              →
            </span>
          </Link>
          <div className="mt-6 text-[13px] tracking-[0.02em] text-[rgba(246,240,230,0.6)]">
            Delivered in seven days &nbsp;·&nbsp; Free revisions &nbsp;·&nbsp;
            Money back guarantee
          </div>
          <div className="mt-3 tracking-[2px] text-[15px] text-[#C9A85A]">
            ★★★★★{" "}
            <span className="ml-2 font-sans text-[13px] tracking-normal text-[rgba(246,240,230,0.7)]">
              4.9 from 2,400+ families
            </span>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
