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
    // 1. Relationship (with inline "Other" reveal)
    {
      chapter: "Who they are",
      title: "Who is this song for?",
      subtitle: "Your relationship helps us write the song in the right voice.",
      isValid: (s) =>
        !!s.relationship &&
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
            <Question
              label="Who are they to you?"
              helper="e.g. my godmother, my best friend since kindergarten, my mother-in-law"
            >
              <TextInput
                placeholder="My..."
                value={q.relationship_other}
                onChange={(e) => q.set("relationship_other", e.target.value)}
                maxLength={120}
                autoFocus
              />
            </Question>
          )}
        </div>
      ),
    },

    // 2. Their name
    {
      chapter: "Who they are",
      title: "What is their first name?",
      subtitle: "We will weave their name through the song.",
      isValid: (s) => s.recipient_name.trim().length > 0,
      render: () => (
        <Question label="Their first name">
          <TextInput
            placeholder="e.g. Maria"
            value={q.recipient_name}
            onChange={(e) => q.set("recipient_name", e.target.value)}
            maxLength={80}
            autoFocus
          />
        </Question>
      ),
    },

    // 3. Stage
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

    // 4. Fighting for
    {
      chapter: "Their fight",
      title: `Who or what is ${name} fighting for?`,
      subtitle:
        "The people, dreams, or moments that pull them forward on the hardest days.",
      isValid: (s) => s.fighting_for.trim().length > 4,
      render: () => (
        <Question label="They are fighting for...">
          <TextArea
            placeholder="Their grandkids. Walking their daughter down the aisle. One more summer at the lake. The novel they are still writing…"
            value={q.fighting_for}
            onChange={(e) => q.set("fighting_for", e.target.value)}
            maxLength={500}
            autoFocus
          />
        </Question>
      ),
    },

    // 5. Qualities
    {
      chapter: "Their soul",
      title: "What makes them, them?",
      subtitle: "The qualities you love most about them.",
      isValid: (s) => s.qualities.trim().length > 10,
      render: () => (
        <Question label="The qualities you love most">
          <TextArea
            placeholder="Wickedly funny. The most patient person I know. Stubborn in the best way. Generous to a fault…"
            value={q.qualities}
            onChange={(e) => q.set("qualities", e.target.value)}
            maxLength={500}
            rows={4}
            autoFocus
          />
        </Question>
      ),
    },

    // 6. Memory
    {
      chapter: "Their soul",
      title: "A memory you will never forget.",
      subtitle: "The more specific, the more the song will sound like them.",
      isValid: (s) => s.shared_memory.trim().length > 15,
      render: () => (
        <Question label="A moment with them">
          <TextArea
            placeholder="The summer we got lost driving to the coast. Dancing in the kitchen on Christmas morning. The day she taught me to ride a bike…"
            value={q.shared_memory}
            onChange={(e) => q.set("shared_memory", e.target.value)}
            maxLength={600}
            rows={5}
            autoFocus
          />
        </Question>
      ),
    },

    // 7. Core message
    {
      chapter: "The message",
      title: "What is the heart of this song?",
      subtitle: "Choose the feeling you most want them to hear.",
      isValid: (s) => !!s.message,
      render: () => (
        <Question label="The message">
          <ListSelect
            options={MESSAGES}
            value={q.message}
            onChange={(v) => q.set("message", v)}
          />
        </Question>
      ),
    },

    // 8. Personal words
    {
      chapter: "The message",
      title: `What do you wish you could say to ${name}?`,
      subtitle: "Write to them like a letter. We will weave your words into the lyrics.",
      isValid: (s) => s.personal_words.trim().length > 25,
      render: () => (
        <Question label="Your words to them">
          <TextArea
            placeholder={`${name === "them" ? "Mom" : name}, I do not say this enough. You are the bravest person I have ever known...`}
            value={q.personal_words}
            onChange={(e) => q.set("personal_words", e.target.value)}
            maxLength={1000}
            rows={7}
            autoFocus
          />
        </Question>
      ),
    },

    // 9. Genre
    {
      chapter: "Their sound",
      title: "What genre feels most like them?",
      isValid: (s) => !!s.genre,
      render: () => (
        <Question label="Genre">
          <PillSelect
            options={GENRES}
            value={q.genre}
            onChange={(v) => q.set("genre", v)}
            columns={2}
          />
        </Question>
      ),
    },

    // 10. Tempo
    {
      chapter: "Their sound",
      title: "What pace fits the feeling?",
      isValid: (s) => !!s.tempo,
      render: () => (
        <Question label="Tempo and energy">
          <PillSelect
            options={TEMPOS}
            value={q.tempo}
            onChange={(v) => q.set("tempo", v)}
            columns={3}
          />
        </Question>
      ),
    },

    // 11. Voice
    {
      chapter: "Their sound",
      title: "Whose voice should sing it?",
      isValid: (s) => !!s.voice,
      render: () => (
        <Question label="Voice">
          <PillSelect
            options={VOICES}
            value={q.voice}
            onChange={(v) => q.set("voice", v)}
            columns={2}
          />
        </Question>
      ),
    },

    // 12. Buyer name
    {
      chapter: "Delivery",
      title: "What is your name?",
      subtitle: "So we can sign the gift from you.",
      isValid: (s) => s.buyer_name.trim().length > 0,
      render: () => (
        <Question label="Your name">
          <TextInput
            placeholder="Your full name"
            value={q.buyer_name}
            onChange={(e) => q.set("buyer_name", e.target.value)}
            maxLength={80}
            autoFocus
          />
        </Question>
      ),
    },

    // 13. Buyer email
    {
      chapter: "Delivery",
      title: "Where should we send the song?",
      subtitle: "We will email you when it is ready, usually within 7 days.",
      isValid: (s) => emailRe.test(s.buyer_email),
      render: () => (
        <Question label="Your email">
          <TextInput
            type="email"
            placeholder="you@example.com"
            value={q.buyer_email}
            onChange={(e) => q.set("buyer_email", e.target.value)}
            maxLength={120}
            autoFocus
          />
        </Question>
      ),
    },

    // 14. Gift toggle (+ inline gift details)
    {
      chapter: "Delivery",
      title: "Send it directly to them as a gift?",
      subtitle: "Or keep it private and share it on your own.",
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
      nextLabel: "Proceed to checkout · $39",
    },
  ];

  const total = steps.length;
  const safeIndex = Math.min(index, total - 1);
  const step = steps[safeIndex];
  const valid = step.isValid(q);

  const next = () => {
    if (safeIndex < total - 1) setIndex(safeIndex + 1);
    else navigate({ to: "/checkout" });
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
