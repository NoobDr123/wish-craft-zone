import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { QuizShell } from "@/components/QuizShell";
import {
  EmailInput,
  ListSelect,
  PillSelect,
  Question,
  TextArea,
  TextInput,
  TipChips,
} from "@/components/QuizInputs";
import { useQuizStore } from "@/stores/quizStore";
import { track, ensureSession } from "@/lib/tracking";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Gift, AlertCircle } from "lucide-react";
import {
  getProfile,
  journeyOptions,
  themeOptions,
  q4Copy,
  q5Copy,
  q6Copy,
  q8Copy,
  q4Tips,
  q5Tips,
  q6Tips,
  q8Tips,
} from "@/lib/quizCopy";

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
      { title: "Create Their Song · RibbonSong" },
      {
        name: "description",
        content:
          "A gentle, guided conversation about the person you love. We'll turn their story into a song just for them.",
      },
    ],
  }),
});

const RELATIONSHIPS = [
  "Husband",
  "Wife",
  "Mother",
  "Father",
  "Son",
  "Daughter",
  "Sibling",
  "Grandparent",
  "Friend",
  "Other",
] as const;

const GENRES = [
  "Acoustic Folk",
  "Pop",
  "Country",
  "R&B / Soul",
  "Gospel / Worship",
  "Cinematic / Orchestral",
  "Hip-Hop / Rap",
  "Rock / Indie",
] as const;

const TEMPOS = ["Slow & Tender", "Mid-tempo", "Upbeat & Triumphant"] as const;
const VOICES = ["Female Voice", "Male Voice", "Duet", "No Preference"] as const;

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type QuizSnapshot = ReturnType<typeof useQuizStore.getState>;

type Step = {
  chapter: string;
  title: string;
  subtitle?: string;
  optional?: boolean;
  isValid: (q: QuizSnapshot) => boolean;
  render: () => React.ReactNode;
  nextLabel?: string;
};

function CreatePage() {
  const navigate = useNavigate();
  const q = useQuizStore();
  const search = useSearch({ from: "/create" });
  const { user, loading: authLoading } = useAuth();
  const [index, setIndex] = useState(0);
  const stepEnteredAt = useRef<number>(Date.now());
  const quizStartedAt = useRef<number | null>(null);

  // Reward code validation state
  const [rewardStatus, setRewardStatus] = useState<
    "idle" | "validating" | "valid" | "invalid" | "needs_login"
  >("idle");
  const [rewardError, setRewardError] = useState<string | null>(null);
  const [rewardRemaining, setRewardRemaining] = useState<number | null>(null);

  // Validate ?reward=CODE on mount (and whenever auth resolves)
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
        // Pre-fill buyer email from logged-in user so the delivery step is skippable.
        if (user.email && !q.buyer_email) q.set("buyer_email", user.email);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search.reward, user, authLoading]);

  // Stash incoming ?promo=CODE (from Golden Ticket #2) so checkout auto-fills it.
  useEffect(() => {
    const promo = search.promo?.trim();
    if (promo) {
      try {
        sessionStorage.setItem("rs_pending_promo", promo);
      } catch {
        /* ignore storage failures */
      }
    }
  }, [search.promo]);

  // Track quiz_start once per mount
  useEffect(() => {
    void ensureSession();
    quizStartedAt.current = Date.now();
    void track({ type: "quiz_start", stepIndex: 0 });
  }, []);

  // Track question_view whenever step index changes
  useEffect(() => {
    stepEnteredAt.current = Date.now();
    void track({
      type: "question_view",
      stepIndex: index,
      buyerEmail: q.buyer_email || undefined,
    });
  }, [index, q.buyer_email]);

  const profile = useMemo(
    () => getProfile(q.relationship, q.relationship_other, q.recipient_name, q.stage),
    [q.relationship, q.relationship_other, q.recipient_name, q.stage],
  );
  const name = profile.name;

  const journey = useMemo(() => journeyOptions(profile), [profile]);
  const themes = useMemo(() => themeOptions(profile.stage), [profile.stage]);
  const c4 = useMemo(() => q4Copy(profile), [profile]);
  const c5 = useMemo(() => q5Copy(profile), [profile]);
  const c6 = useMemo(() => q6Copy(profile), [profile]);
  const c8 = useMemo(() => q8Copy(profile), [profile]);

  // If a previously-selected theme is no longer valid for the current stage, clear it.
  if (q.message && !themes.some((t) => t.value === q.message)) {
    q.set("message", undefined);
  }

  const steps: Step[] = [
    // 1. Relationship + (Other reveal) + first name
    {
      chapter: "Who they are",
      title: "Who is this song for?",
      subtitle: "Pick whoever fits closest. We'll use their name in the song.",
      isValid: (s) =>
        !!s.relationship &&
        s.recipient_name.trim().length > 1 &&
        (s.relationship !== "Other" || s.relationship_other.trim().length > 1),
      render: () => (
        <div className="space-y-7">
          <Question label="They are my…">
            <PillSelect
              options={RELATIONSHIPS}
              value={q.relationship}
              onChange={(v) => q.set("relationship", v)}
              columns={3}
            />
          </Question>
          {q.relationship === "Other" && (
            <Question label="Tell us how you know them" helper="A few words. Whatever feels true.">
              <TextInput
                placeholder="e.g. aunt, neighbor, godmother, best friend since childhood"
                value={q.relationship_other}
                onChange={(e) => q.set("relationship_other", e.target.value)}
                maxLength={80}
                autoFocus
              />
            </Question>
          )}
          <Question label="Their first name" helper="Just their first name.">
            <TextInput
              placeholder="e.g. Sarah"
              value={q.recipient_name}
              onChange={(e) => q.set("recipient_name", e.target.value)}
              maxLength={40}
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

    // 2. Journey stage (rich radio with sub-copy)
    {
      chapter: "Their fight",
      title: `Where is ${name} in their journey?`,
      subtitle: "Pick what's closest right now. This shapes the tone of the whole song.",
      isValid: (s) => !!s.stage,
      render: () => (
        <Question label="Choose what fits best today">
          <div className="space-y-2.5">
            {journey.map((opt) => {
              const active = q.stage === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => q.set("stage", opt.value)}
                  className={`flex w-full items-start justify-between gap-4 rounded-2xl border p-5 text-left transition-all ${
                    active
                      ? "border-primary bg-accent shadow-soft"
                      : "border-border bg-card hover:border-primary/50 hover:bg-accent/40"
                  }`}
                >
                  <span className="flex-1">
                    <span className="block font-display text-lg font-medium text-foreground">
                      {opt.title}
                    </span>
                    <span className="mt-1 block text-sm leading-relaxed text-muted-foreground">
                      {opt.sub}
                    </span>
                  </span>
                  <span
                    className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all ${
                      active ? "border-primary bg-primary" : "border-border"
                    }`}
                  >
                    {active && (
                      <span className="h-2 w-2 rounded-full bg-primary-foreground" />
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </Question>
      ),
    },

    // 3. Q4 — fighting for / holding onto / lived for
    {
      chapter: "Their fight",
      title: c4.question,
      subtitle: c4.helper,
      isValid: (s) => s.fighting_for.trim().length >= 15,
      render: () => (
        <Question label={c4.sublabel}>
          <TextArea
            placeholder={c4.placeholder}
            value={q.fighting_for}
            onChange={(e) => q.set("fighting_for", e.target.value)}
            rows={5}
            autoFocus
          />
          <TipChips chips={q4Tips(profile)} />
        </Question>
      ),
    },

    // 4. Q5 — qualities
    {
      chapter: "Their soul",
      title: c5.question,
      subtitle: c5.helper,
      isValid: (s) => s.qualities.trim().length >= 15,
      render: () => (
        <Question label={c5.sublabel}>
          <TextArea
            placeholder={c5.placeholder}
            value={q.qualities}
            onChange={(e) => q.set("qualities", e.target.value)}
            rows={5}
          />
          <TipChips chips={q5Tips(profile)} />
        </Question>
      ),
    },

    // 5. Q6 — one memory
    {
      chapter: "Their soul",
      title: c6.question,
      subtitle: c6.helper,
      isValid: (s) => s.shared_memory.trim().length >= 15,
      render: () => (
        <Question label={c6.sublabel}>
          <TextArea
            placeholder={c6.placeholder}
            value={q.shared_memory}
            onChange={(e) => q.set("shared_memory", e.target.value)}
            rows={5}
          />
          <TipChips chips={q6Tips(profile)} />
        </Question>
      ),
    },

    // 6. Q7 — theme (filtered by stage)
    {
      chapter: "The message",
      title: "What's the heart of this song?",
      subtitle: "Pick the one that says what you most want them to feel when they hear it.",
      isValid: (s) => !!s.message && themes.some((t) => t.value === s.message),
      render: () => (
        <Question label="Choose what fits">
          <ListSelect
            options={themes.map((t) => t.title)}
            value={themes.find((t) => t.value === q.message)?.title}
            onChange={(label) => {
              const found = themes.find((t) => t.title === label);
              if (found) q.set("message", found.value);
            }}
          />
        </Question>
      ),
    },

    // 7. Q8 — letter
    {
      chapter: "The message",
      title: c8.question,
      subtitle: c8.helper,
      isValid: (s) => s.personal_words.trim().length >= 40,
      render: () => (
        <Question label={c8.sublabel}>
          <TextArea
            placeholder={c8.placeholder}
            value={q.personal_words}
            onChange={(e) => q.set("personal_words", e.target.value)}
            maxLength={800}
            rows={8}
            showCount
            autoFocus
          />
          <TipChips
            label="Things that make letters unforgettable"
            chips={q8Tips(profile)}
          />
        </Question>
      ),
    },

    // 8. Sound — genre + tempo + voice
    {
      chapter: "Their sound",
      title: "How should it sound?",
      subtitle: "Pick what feels right. We'll shape everything to fit.",
      isValid: (s) => !!s.genre && !!s.tempo && !!s.voice,
      render: () => (
        <div className="space-y-7">
          <Question label="Genre">
            <PillSelect
              options={GENRES}
              value={q.genre}
              onChange={(v) => q.set("genre", v)}
              columns={2}
            />
          </Question>
          <Question label="Tempo">
            <PillSelect
              options={TEMPOS}
              value={q.tempo}
              onChange={(v) => q.set("tempo", v)}
              columns={3}
            />
          </Question>
          <Question label="Voice">
            <PillSelect
              options={VOICES}
              value={q.voice}
              onChange={(v) => q.set("voice", v)}
              columns={2}
            />
          </Question>
        </div>
      ),
    },

    // 9. Buyer name + email
    {
      chapter: "Delivery",
      title: "Where should we send it?",
      subtitle: "We'll email you when it is ready, usually within 5 days.",
      isValid: (s) =>
        s.buyer_name.trim().length > 1 && emailRe.test(s.buyer_email),
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

  const next = () => {
    const elapsed = Date.now() - stepEnteredAt.current;
    void track({
      type: "question_answer",
      stepIndex: safeIndex,
      timeOnStepMs: elapsed,
      buyerEmail: q.buyer_email || undefined,
    });
    if (safeIndex < total - 1) setIndex(safeIndex + 1);
    else {
      const totalTime = quizStartedAt.current
        ? Date.now() - quizStartedAt.current
        : null;
      void track({
        type: "quiz_complete",
        stepIndex: total,
        timeOnStepMs: totalTime ?? undefined,
        buyerEmail: q.buyer_email || undefined,
      });
      navigate({ to: "/almost-there" });
    }
  };
  const back = () => setIndex(Math.max(0, safeIndex - 1));

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
                  Reward code <span className="font-mono">{search.reward}</span>{" "}
                  applied. You won't be charged for this song.
                  {rewardRemaining !== null
                    ? ` ${rewardRemaining} free song${
                        rewardRemaining === 1 ? "" : "s"
                      } remaining on this code after redemption.`
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
        nextLabel={
          step.nextLabel ?? (safeIndex === total - 1 ? "Finish" : "Continue")
        }
        optional={step.optional}
      >
        {step.render()}
      </QuizShell>
    </>
  );
}
