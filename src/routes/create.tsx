import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { QuizShell } from "@/components/QuizShell";
import {
  EmailInput,
  PillSelect,
  Question,
  TextArea,
  TextInput,
  TipChips,
} from "@/components/QuizInputs";
import { BreedSelect } from "@/components/BreedSelect";
import { DogPhotoUploader } from "@/components/DogPhotoUploader";
import {
  useQuizStore,
  type DogBreedKey,
  type DogGenderKey,
  type GenreKey,
  type VoiceKey,
  pronouns,
  resolveBreed,
} from "@/stores/quizStore";
import {
  GENRE_OPTIONS,
  LETTER_CHIPS,
  MEMORY_CHIPS,
  MEMORY_PLACEHOLDER,
  letterPlaceholder,
  personalityCopy,
} from "@/lib/quizCopy";
import { track, ensureSession } from "@/lib/tracking";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Gift, AlertCircle } from "lucide-react";

type CreateSearch = { reward?: string; promo?: string };

export const Route = createFileRoute("/create")({
  component: CreatePage,
  validateSearch: (search: Record<string, unknown>): CreateSearch => {
    const out: CreateSearch = {};
    if (typeof search.reward === "string") out.reward = search.reward;
    if (typeof search.promo === "string") out.promo = search.promo;
    return out;
  },
  head: () => ({
    meta: [
      { title: "Tell us about your dog · PawPrint Song" },
      {
        name: "description",
        content:
          "A gentle, guided conversation about your dog. We'll turn her story into a song just for her.",
      },
    ],
  }),
});

const BREEDS: DogBreedKey[] = [
  "Labrador Retriever",
  "Golden Retriever",
  "German Shepherd",
  "French Bulldog",
  "Bulldog",
  "Poodle",
  "Goldendoodle / Labradoodle",
  "Beagle",
  "Rottweiler",
  "Yorkshire Terrier",
  "Dachshund",
  "Boxer",
  "Australian Shepherd",
  "Border Collie",
  "Pomeranian",
  "Cavalier King Charles Spaniel",
  "Chihuahua",
  "Pit Bull / Staffordshire Terrier",
  "Husky",
  "Shih Tzu",
  "Bernese Mountain Dog",
  "Cocker Spaniel",
  "Great Dane",
  "Doberman Pinscher",
  "Shiba Inu",
  "Akita",
  "Maltese",
  "Pug",
  "Boston Terrier",
  "Jack Russell Terrier",
  "Miniature Schnauzer",
  "Standard Schnauzer",
  "Cane Corso",
  "Mastiff",
  "Saint Bernard",
  "Newfoundland",
  "Greyhound",
  "Italian Greyhound",
  "Whippet",
  "Vizsla",
  "Weimaraner",
  "Springer Spaniel",
  "Brittany Spaniel",
  "Basset Hound",
  "Bloodhound",
  "Collie",
  "Sheltie (Shetland Sheepdog)",
  "Old English Sheepdog",
  "Samoyed",
  "Alaskan Malamute",
  "Chow Chow",
  "Bichon Frise",
  "Havanese",
  "Papillon",
  "Pekingese",
  "Miniature Pinscher",
  "Australian Cattle Dog (Heeler)",
  "Corgi (Pembroke / Cardigan)",
  "Rhodesian Ridgeback",
  "Dalmatian",
  "Portuguese Water Dog",
  "American Eskimo Dog",
  "Mixed breed (proudly)",
  "Rescue, breed unknown",
  "Other",
];

const GENDERS: { value: DogGenderKey; label: string }[] = [
  { value: "she", label: "She / her" },
  { value: "he", label: "He / him" },
];

const VOICES: VoiceKey[] = ["Female Voice", "Male Voice"];

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type QuizSnapshot = ReturnType<typeof useQuizStore.getState>;

interface Step {
  key: string;
  chapter: string;
  title: string;
  subtitle?: string;
  optional?: boolean;
  isValid: (q: QuizSnapshot) => boolean;
  render: () => React.ReactNode;
  nextLabel?: string;
  answer: (q: QuizSnapshot) => Record<string, unknown>;
}

function CreatePage() {
  const navigate = useNavigate();
  const q = useQuizStore();
  const search = useSearch({ from: "/create" });
  const { user, loading: authLoading } = useAuth();
  const [index, setIndex] = useState(0);
  const stepEnteredAt = useRef<number>(Date.now());
  const quizStartedAt = useRef<number | null>(null);

  const [rewardStatus, setRewardStatus] = useState<
    "idle" | "validating" | "valid" | "invalid" | "needs_login"
  >("idle");
  const [rewardError, setRewardError] = useState<string | null>(null);
  const [rewardRemaining, setRewardRemaining] = useState<number | null>(null);

  useEffect(() => {
    const code = search.reward?.trim();
    if (!code) return;
    if (authLoading) return;
    if (!user) {
      setRewardStatus("needs_login");
      return;
    }
    setRewardStatus("validating");
    setRewardError(null);
    void supabase.functions
      .invoke("redeem-reward-code", { body: { code } })
      .then(({ data, error }) => {
        if (error || !data?.ok) {
          setRewardStatus("invalid");
          setRewardError(data?.error || error?.message || "Invalid code");
          return;
        }
        setRewardStatus("valid");
        setRewardRemaining(data.free_songs_remaining ?? null);
        q.set("reward_code", data.code);
        if (user.email && !q.buyer_email) q.set("buyer_email", user.email);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search.reward, user, authLoading]);

  useEffect(() => {
    const promo = search.promo?.trim();
    if (promo) {
      try {
        sessionStorage.setItem("rs_pending_promo", promo);
      } catch {
        /* ignore */
      }
    }
  }, [search.promo]);

  useEffect(() => {
    void ensureSession();
    quizStartedAt.current = Date.now();
    void track({ type: "quiz_start", stepIndex: 0 });
  }, []);

  const stepRef = useRef<{ key?: string; answer?: Record<string, unknown> }>({});
  useEffect(() => {
    stepEnteredAt.current = Date.now();
    void track({
      type: "question_view",
      stepIndex: index,
      stepKey: stepRef.current.key,
      buyerEmail: q.buyer_email || undefined,
    });
  }, [index, q.buyer_email]);

  const breedDisplay = useMemo(() => resolveBreed(q) ?? "your dog", [q.dog_breed, q.dog_breed_other]);
  const pn = useMemo(() => pronouns(q.dog_gender), [q.dog_gender]);
  const personality = useMemo(() => personalityCopy(q.dog_breed), [q.dog_breed]);
  const dogName = q.dog_name.trim() || "your dog";

  const steps: Step[] = [
    // 1. Basics — name, pronunciation, gender
    {
      key: "basics",
      chapter: "Their name",
      title: "Tell us about them.",
      subtitle: "Just the basics. Their name will be in every chorus.",
      isValid: (s) =>
        s.dog_name.trim().length >= 1 && !!s.dog_gender,
      answer: (s) => ({
        dog_name: s.dog_name,
        dog_gender: s.dog_gender,
      }),
      render: () => (
        <div className="space-y-7">
          <Question label="Their name" helper="Just their name. Nicknames are welcome.">
            <TextInput
              placeholder="e.g. Daisy"
              value={q.dog_name}
              onChange={(e) => q.set("dog_name", e.target.value)}
              maxLength={40}
              autoFocus
            />
          </Question>
          <Question label="How do you say it? (optional)" helper="Only if it's tricky — 'DAY-zee', 'lou-LOO'…">
            <TextInput
              placeholder="e.g. DAY-zee"
              value={q.pronunciation}
              onChange={(e) => q.set("pronunciation", e.target.value)}
              maxLength={40}
            />
          </Question>
          <Question label={`${dogName} is a…`}>
            <PillSelect
              options={GENDERS.map((g) => g.label)}
              value={GENDERS.find((g) => g.value === q.dog_gender)?.label}
              onChange={(label) => {
                const found = GENDERS.find((g) => g.label === label);
                if (found) q.set("dog_gender", found.value);
              }}
              columns={2}
            />
          </Question>
          <p className="rounded-2xl border border-border bg-secondary/40 px-4 py-3 text-center text-xs leading-relaxed text-muted-foreground">
            By continuing through this quiz you agree to our{" "}
            <Link to="/terms" className="font-medium text-foreground underline">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link to="/privacy" className="font-medium text-foreground underline">
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      ),
    },

    // 2. Breed (own page)
    {
      key: "breed",
      chapter: "Their breed",
      title: `What breed is ${dogName}?`,
      subtitle: "Pick the closest match — or search any breed below.",
      isValid: (s) =>
        !!s.dog_breed &&
        (s.dog_breed !== "Other" || (s.dog_breed_other ?? "").trim().length >= 1),
      answer: (s) => ({ dog_breed: s.dog_breed }),
      render: () => <BreedStep />,
    },

    // 2. Photo (optional)
    {
      key: "photo",
      chapter: "Her face",
      title: `A photo of ${dogName} (optional)`,
      subtitle:
        "We don't use the photo in the song. It just helps us picture her while we write. You can skip this.",
      optional: true,
      isValid: () => true,
      answer: (s) => ({ has_photo: !!s.dog_photo_url }),
      render: () => (
        <Question label="Upload a photo" helper="Choose one from your device or photo gallery.">
          <DogPhotoUploader
            value={q.dog_photo_url}
            onChange={(url) => q.set("dog_photo_url", url)}
          />
        </Question>
      ),
    },

    // 3. Personality
    {
      key: "personality",
      chapter: "Who she was",
      title: `Tell us who ${dogName} was.`,
      subtitle: `What made ${pn.obj} unmistakably ${pn.poss} self? The little things — the dramatic ones, the weird ones, the ones only you noticed.`,
      isValid: (s) => (s.dog_personality ?? "").trim().length >= 1,
      answer: (s) => ({ length: (s.dog_personality ?? "").length }),
      render: () => (
        <Question label={`What made ${dogName} ${dogName}?`}>
          <TextArea
            placeholder={personality.placeholder}
            value={q.dog_personality}
            onChange={(e) => q.set("dog_personality", e.target.value)}
            rows={6}
            autoFocus
          />
          <TipChips
            label={`Things people remember about a ${breedDisplay}`}
            chips={personality.chips}
          />
        </Question>
      ),
    },

    // 4. Memory
    {
      key: "memory",
      chapter: "Your story",
      title: `One memory of ${dogName}.`,
      subtitle:
        "Don't pick the biggest one — pick the one that comes first. The little detail you keep replaying.",
      isValid: (s) => (s.dog_memory ?? "").trim().length >= 1,
      answer: (s) => ({ length: (s.dog_memory ?? "").length }),
      render: () => (
        <Question label="A moment, a day, a small thing">
          <TextArea
            placeholder={MEMORY_PLACEHOLDER}
            value={q.dog_memory}
            onChange={(e) => q.set("dog_memory", e.target.value)}
            rows={6}
          />
          <TipChips chips={MEMORY_CHIPS} />
        </Question>
      ),
    },

    // 5. Letter
    {
      key: "letter",
      chapter: "What you'd say",
      title: `If you could say one thing to ${dogName} now…`,
      subtitle:
        "Write it like you're talking to her. Doesn't need to rhyme. Doesn't need to be neat. We'll do the rest.",
      isValid: (s) => (s.letter_to_dog ?? "").trim().length >= 1,
      answer: (s) => ({ length: (s.letter_to_dog ?? "").length }),
      render: () => (
        <Question label={`Your letter to ${dogName}`}>
          <TextArea
            placeholder={letterPlaceholder(q.dog_name)}
            value={q.letter_to_dog}
            onChange={(e) => q.set("letter_to_dog", e.target.value)}
            rows={8}
            autoFocus
          />
          <TipChips
            label="Things that make these letters unforgettable"
            chips={LETTER_CHIPS}
          />
        </Question>
      ),
    },

    // 6. Sound — genre + voice
    {
      key: "sound",
      chapter: "Her sound",
      title: "How should her song sound?",
      subtitle: "Pick what feels right. We'll shape everything to fit.",
      isValid: (s) => !!s.genre && !!s.voice,
      answer: (s) => ({ genre: s.genre, voice: s.voice }),
      render: () => (
        <div className="space-y-7">
          <Question label="Genre">
            <div className="grid gap-2.5 sm:grid-cols-2">
              {GENRE_OPTIONS.map((opt) => {
                const active = q.genre === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => q.set("genre", opt.value as GenreKey)}
                    className={`flex w-full items-start justify-between gap-4 rounded-2xl border p-4 text-left transition-all ${
                      active
                        ? "border-primary bg-accent shadow-soft"
                        : "border-border bg-card hover:border-primary/50 hover:bg-accent/40"
                    }`}
                  >
                    <span className="flex-1">
                      <span className="block font-display text-base font-medium text-foreground">
                        {opt.title}
                      </span>
                      <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                        {opt.subtitle}
                      </span>
                    </span>
                    <span
                      className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all ${
                        active ? "border-primary bg-primary" : "border-border"
                      }`}
                    >
                      {active && <span className="h-2 w-2 rounded-full bg-primary-foreground" />}
                    </span>
                  </button>
                );
              })}
            </div>
          </Question>
          <Question label="Voice">
            <PillSelect
              options={VOICES}
              value={q.voice}
              onChange={(v) => q.set("voice", v as VoiceKey)}
              columns={2}
            />
          </Question>
          <Question label="A title idea (optional)" helper="Just a phrase or feeling. We'll write the title — this is a hint.">
            <TextInput
              placeholder="e.g. Daisy on the porch"
              value={q.song_title_idea}
              onChange={(e) => q.set("song_title_idea", e.target.value)}
              maxLength={80}
            />
          </Question>
        </div>
      ),
    },

    // 7. Contact
    {
      key: "delivery",
      chapter: "Delivery",
      title: "Where should we send it?",
      subtitle: "We'll email you when it's ready — usually within 5 days.",
      isValid: (s) => s.buyer_name.trim().length > 1 && emailRe.test(s.buyer_email),
      answer: (s) => ({ has_buyer_name: !!s.buyer_name, has_buyer_email: !!s.buyer_email }),
      nextLabel: "Review my order",
      render: () => (
        <div className="space-y-6">
          <Question label="Your name">
            <TextInput
              placeholder="Your first name"
              value={q.buyer_name}
              onChange={(e) => q.set("buyer_name", e.target.value)}
              maxLength={60}
            />
          </Question>
          <Question label="Your email">
            <EmailInput
              placeholder="you@example.com"
              value={q.buyer_email}
              onChange={(e) => q.set("buyer_email", e.target.value)}
              maxLength={120}
              name="email"
            />
          </Question>
        </div>
      ),
    },
  ];

  const total = steps.length;
  const safeIndex = Math.min(index, total - 1);
  const step = steps[safeIndex];
  const valid = step.isValid(q);

  stepRef.current = { key: step.key, answer: step.answer(q) };

  const next = () => {
    const elapsed = Date.now() - stepEnteredAt.current;
    void track({
      type: "question_answer",
      stepIndex: safeIndex,
      stepKey: step.key,
      timeOnStepMs: elapsed,
      payload: step.answer(q),
      buyerEmail: q.buyer_email || undefined,
    });
    if (safeIndex < total - 1) setIndex(safeIndex + 1);
    else {
      const totalTime = quizStartedAt.current ? Date.now() - quizStartedAt.current : null;
      void track({
        type: "quiz_complete",
        stepIndex: total,
        stepKey: step.key,
        timeOnStepMs: totalTime ?? undefined,
        payload: {
          dog_breed: q.dog_breed,
          dog_gender: q.dog_gender,
          genre: q.genre,
          voice: q.voice,
          personality_len: (q.dog_personality ?? "").length,
          memory_len: (q.dog_memory ?? "").length,
          letter_len: (q.letter_to_dog ?? "").length,
        },
        buyerEmail: q.buyer_email || undefined,
      });
      navigate({ to: "/almost-there" });
    }
  };
  const back = () => {
    const elapsed = Date.now() - stepEnteredAt.current;
    void track({
      type: "question_back",
      stepIndex: safeIndex,
      stepKey: step.key,
      timeOnStepMs: elapsed,
      buyerEmail: q.buyer_email || undefined,
    });
    setIndex(Math.max(0, safeIndex - 1));
  };

  return (
    <>
      {(rewardStatus === "valid" ||
        rewardStatus === "validating" ||
        rewardStatus === "needs_login" ||
        rewardStatus === "invalid") && (
        <div className="mx-auto max-w-2xl px-5 pt-4">
          {rewardStatus === "valid" && (
            <div className="flex items-start gap-3 rounded-2xl border border-success/40 bg-success/10 p-4 text-sm text-foreground">
              <Gift className="mt-0.5 h-5 w-5 shrink-0 text-success" />
              <div>
                <p className="font-semibold">Free song unlocked 🎁</p>
                <p className="mt-1 text-muted-foreground">
                  Reward code <span className="font-mono">{search.reward}</span> applied. You won't be charged for this song.
                  {rewardRemaining !== null
                    ? ` ${rewardRemaining} free song${rewardRemaining === 1 ? "" : "s"} remaining on this code after redemption.`
                    : ""}
                </p>
              </div>
            </div>
          )}
          {rewardStatus === "validating" && (
            <div className="rounded-2xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
              Validating reward code…
            </div>
          )}
          {rewardStatus === "needs_login" && (
            <div className="flex items-start gap-3 rounded-2xl border border-primary/40 bg-primary/5 p-4 text-sm text-foreground">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div>
                <p className="font-semibold">Sign in to redeem your free song</p>
                <p className="mt-1 text-muted-foreground">
                  Reward codes are tied to your account. Please{" "}
                  <a
                    href={`/login?redirect=${encodeURIComponent(`/create?reward=${search.reward}`)}`}
                    className="font-medium underline"
                  >
                    log in
                  </a>{" "}
                  to continue.
                </p>
              </div>
            </div>
          )}
          {rewardStatus === "invalid" && (
            <div className="flex items-start gap-3 rounded-2xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-foreground">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
              <div>
                <p className="font-semibold">Reward code couldn't be applied</p>
                <p className="mt-1 text-muted-foreground">{rewardError}</p>
              </div>
            </div>
          )}
        </div>
      )}
      <QuizShell
        current={safeIndex + 1}
        total={total}
        chapter={step.chapter}
        title={step.title}
        subtitle={step.subtitle}
        onNext={next}
        onBack={safeIndex > 0 ? back : undefined}
        isValid={valid}
        nextLabel={step.nextLabel ?? (safeIndex === total - 1 ? "Finish" : "Continue")}
        optional={step.optional}
      >
        {step.render()}
      </QuizShell>
    </>
  );
}
