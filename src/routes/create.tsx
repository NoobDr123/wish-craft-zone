import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { QuizShell } from "@/components/QuizShell";
import {
  ListSelect,
  PillSelect,
  Question,
  TextArea,
  TextInput,
} from "@/components/QuizInputs";
import { useQuizStore } from "@/stores/quizStore";

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

const STAGES = [
  "Just diagnosed",
  "In treatment",
  "Between treatments",
  "In remission / survivor",
  "In hospice / final chapter",
  "In loving memory",
] as const;

const MESSAGES = [
  "You are not alone",
  "I'm so proud of your strength",
  "Keep fighting, we're with you",
  "Thank you for everything",
  "It's okay to rest now",
  "Your love lives on in us",
  "We will carry you through this",
] as const;

const GENRES = [
  "Acoustic Folk",
  "Pop",
  "Country",
  "R&B / Soul",
  "Gospel / Worship",
  "Cinematic / Orchestral",
] as const;

const TEMPOS = ["Slow & Tender", "Mid-tempo", "Upbeat & Triumphant"] as const;
const VOICES = ["Female Voice", "Male Voice", "Duet", "No Preference"] as const;

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

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function CreatePage() {
  const navigate = useNavigate();
  const q = useQuizStore();
  const [index, setIndex] = useState(0);

  const name = q.recipient_name.trim() || "them";

  const steps: Step[] = [
    // 1. Relationship + name (with inline "Other" reveal)
    {
      chapter: "Who they are",
      title: "Who is this song for?",
      subtitle: "Their name and your relationship help us write in the right voice.",
      isValid: (s) =>
        !!s.relationship &&
        s.recipient_name.trim().length > 0 &&
        (s.relationship !== "Other" || s.relationship_other.trim().length > 1),
      render: () => (
        <div className="space-y-6">
          <Question label="They are my...">
            <PillSelect
              options={RELATIONSHIPS}
              value={q.relationship}
              onChange={(v) => q.set("relationship", v)}
              columns={3}
            />
          </Question>
          {q.relationship === "Other" && (
            <Question label="Who are they to you?">
              <TextInput
                placeholder="My godmother, my best friend…"
                value={q.relationship_other}
                onChange={(e) => q.set("relationship_other", e.target.value)}
                maxLength={120}
                autoFocus
              />
            </Question>
          )}
          <Question label="Their first name">
            <TextInput
              placeholder="e.g. Maria"
              value={q.recipient_name}
              onChange={(e) => q.set("recipient_name", e.target.value)}
              maxLength={80}
            />
          </Question>
        </div>
      ),
    },

    // 2. Stage
    {
      chapter: "Their fight",
      title: `Where is ${name} in their journey?`,
      subtitle: "This shapes the emotional tone of the song.",
      isValid: (s) => !!s.stage,
      render: () => (
        <Question label="Choose what fits best today">
          <ListSelect
            options={STAGES}
            value={q.stage}
            onChange={(v) => q.set("stage", v)}
          />
        </Question>
      ),
    },

    // 3. Fighting for
    {
      chapter: "Their fight",
      title: `Who or what is ${name} fighting for?`,
      subtitle: "The people, dreams, or moments that pull them forward.",
      isValid: (s) => s.fighting_for.trim().length > 2,
      render: () => (
        <Question label="They are fighting for...">
          <TextArea
            placeholder="Their grandkids. Walking their daughter down the aisle. One more summer at the lake…"
            value={q.fighting_for}
            onChange={(e) => q.set("fighting_for", e.target.value)}
            maxLength={500}
            rows={4}
            autoFocus
          />
        </Question>
      ),
    },

    // 4a. Qualities
    {
      chapter: "Their soul",
      title: "What do you love most about them?",
      subtitle: "The qualities that make them, them.",
      isValid: (s) => s.qualities.trim().length > 2,
      render: () => (
        <Question label="The qualities you love most">
          <TextArea
            placeholder="Wickedly funny. Patient. Stubborn in the best way…"
            value={q.qualities}
            onChange={(e) => q.set("qualities", e.target.value)}
            maxLength={500}
            rows={4}
          />
        </Question>
      ),
    },

    // 4b. Memory
    {
      chapter: "Their soul",
      title: "Share a memory you'll never forget.",
      subtitle: "One moment with them that always stays with you.",
      isValid: (s) => s.shared_memory.trim().length > 2,
      render: () => (
        <Question label="A memory you will never forget">
          <TextArea
            placeholder="Dancing in the kitchen on Christmas morning. The day she taught me to ride a bike…"
            value={q.shared_memory}
            onChange={(e) => q.set("shared_memory", e.target.value)}
            maxLength={600}
            rows={5}
          />
        </Question>
      ),
    },

    // 5a. Core message
    {
      chapter: "The message",
      title: `What do you want ${name} to hear?`,
      subtitle: "Pick the heart of the song.",
      isValid: (s) => !!s.message,
      render: () => (
        <Question label="The heart of the song">
          <ListSelect
            options={MESSAGES}
            value={q.message}
            onChange={(v) => q.set("message", v)}
          />
        </Question>
      ),
    },

    // 5b. Personal words
    {
      chapter: "The message",
      title: `What do you wish you could say to ${name}?`,
      subtitle: "Write to them like a letter. We will weave your words into the lyrics.",
      isValid: (s) => s.personal_words.trim().length > 2,
      render: () => (
        <Question label="Your words to them">
          <TextArea
            placeholder={`${name === "them" ? "Mom" : name}, I do not say this enough...`}
            value={q.personal_words}
            onChange={(e) => q.set("personal_words", e.target.value)}
            maxLength={1000}
            rows={5}
            autoFocus
          />
        </Question>
      ),
    },

    // 6. Sound — genre + tempo + voice
    {
      chapter: "Their sound",
      title: "What should the song sound like?",
      subtitle: "Genre, pace, and voice all on one screen.",
      isValid: (s) => !!s.genre && !!s.tempo && !!s.voice,
      render: () => (
        <div className="space-y-6">
          <Question label="Genre">
            <PillSelect
              options={GENRES}
              value={q.genre}
              onChange={(v) => q.set("genre", v)}
              columns={2}
            />
          </Question>
          <Question label="Tempo and energy">
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

    // 7. Buyer name + email
    {
      chapter: "Delivery",
      title: "Where should we send it?",
      subtitle: "We will email you when it is ready, usually within 7 days.",
      isValid: (s) =>
        s.buyer_name.trim().length > 0 && emailRe.test(s.buyer_email),
      render: () => (
        <div className="space-y-6">
          <Question label="Your name">
            <TextInput
              placeholder="Your full name"
              value={q.buyer_name}
              onChange={(e) => q.set("buyer_name", e.target.value)}
              maxLength={80}
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

    // 8. Gift toggle
    {
      chapter: "Delivery",
      title: "Send it directly to them?",
      subtitle: "Or keep it private and share it your own way.",
      isValid: (s) =>
        !s.is_gift || s.recipient_email === "" || emailRe.test(s.recipient_email),
      render: () => (
        <div className="space-y-6">
          <Question label="Send as a gift?">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => q.set("is_gift", !q.is_gift)}
                className={`relative h-7 w-12 rounded-full transition-colors ${
                  q.is_gift ? "bg-primary" : "bg-peach"
                }`}
                aria-pressed={q.is_gift}
              >
                <span
                  className={`absolute top-0.5 h-6 w-6 rounded-full bg-card shadow-soft transition-all ${
                    q.is_gift ? "left-[22px]" : "left-0.5"
                  }`}
                />
              </button>
              <span className="text-sm text-muted-foreground">
                {q.is_gift
                  ? "We will deliver the song to them on a date you choose."
                  : "We will send it to you to share however you like."}
              </span>
            </div>
          </Question>

          {q.is_gift && (
            <div className="space-y-6 rounded-3xl border border-dashed border-peach bg-card/60 p-6 animate-in fade-in slide-in-from-top-2">
              <Question label="Their email (optional)">
                <TextInput
                  type="email"
                  placeholder="their@email.com"
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
                  maxLength={400}
                  rows={3}
                />
              </Question>
            </div>
          )}
        </div>
      ),
      nextLabel: "Review my order",
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
