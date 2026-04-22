import { useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { QuizShell } from "@/components/QuizShell";
import {
  ListSelect,
  PillSelect,
  Question,
  TextArea,
  TextInput,
  TipChips,
} from "@/components/QuizInputs";
import { useQuizStore } from "@/stores/quizStore";
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

export const Route = createFileRoute("/create")({
  component: CreatePage,
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
  const [index, setIndex] = useState(0);

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
            maxLength={200}
            rows={5}
            showCount
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
            maxLength={200}
            rows={5}
            showCount
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
            maxLength={300}
            rows={5}
            showCount
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
      subtitle: "We'll email you when it is ready, usually within 7 days.",
      isValid: (s) =>
        s.buyer_name.trim().length > 1 && emailRe.test(s.buyer_email),
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
            <TextInput
              type="email"
              placeholder="you@example.com"
              value={q.buyer_email}
              onChange={(e) => q.set("buyer_email", e.target.value)}
              maxLength={120}
            />
          </Question>
        </div>
      ),
    },

    // 10. Gift toggle
    {
      chapter: "Delivery",
      title: "Send it directly to them?",
      subtitle: "Or keep it private and share it your own way.",
      isValid: (s) =>
        !s.is_gift || s.recipient_email === "" || emailRe.test(s.recipient_email),
      nextLabel: "Review my order",
      render: () => (
        <div className="space-y-6">
          <Question label="Send as a gift?">
            <div className="flex items-start gap-4">
              <button
                type="button"
                onClick={() => q.set("is_gift", !q.is_gift)}
                className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
                  q.is_gift ? "bg-primary" : "bg-border"
                }`}
                aria-pressed={q.is_gift}
              >
                <span
                  className={`absolute top-0.5 h-6 w-6 rounded-full bg-card shadow-soft transition-all ${
                    q.is_gift ? "left-[22px]" : "left-0.5"
                  }`}
                />
              </button>
              <span className="text-sm leading-relaxed text-muted-foreground">
                {q.is_gift
                  ? "We will deliver the song to them on a date you choose."
                  : "We will send it to you to share however you like."}
              </span>
            </div>
          </Question>

          {q.is_gift && (
            <div className="space-y-6 rounded-3xl border border-dashed border-border bg-secondary/40 p-6 animate-in fade-in slide-in-from-top-2">
              <Question label="Their email (optional)">
                <TextInput
                  type="email"
                  placeholder="recipient@example.com"
                  value={q.recipient_email}
                  onChange={(e) => q.set("recipient_email", e.target.value)}
                  maxLength={120}
                />
              </Question>
              <Question label="Delivery date (optional)">
                <TextInput
                  type="date"
                  value={q.delivery_date}
                  onChange={(e) => q.set("delivery_date", e.target.value)}
                />
              </Question>
              <Question label="A personal note (optional)">
                <TextArea
                  placeholder="A few warm words to greet them when they open the gift…"
                  value={q.personal_note}
                  onChange={(e) => q.set("personal_note", e.target.value)}
                  maxLength={300}
                  rows={3}
                  showCount
                />
              </Question>
            </div>
          )}
        </div>
      ),
    },
  ];

  const total = steps.length;
  const safeIndex = Math.min(index, total - 1);
  const step = steps[safeIndex];
  const valid = step.isValid(q);

  const next = () => {
    if (safeIndex < total - 1) setIndex(safeIndex + 1);
    else navigate({ to: "/almost-there" });
  };
  const back = () => setIndex(Math.max(0, safeIndex - 1));

  return (
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
  );
}
