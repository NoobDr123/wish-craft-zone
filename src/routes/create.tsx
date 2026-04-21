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
          "Tell us about the special person in your life — we'll craft a song just for them.",
      },
    ],
  }),
});

const RELATIONSHIPS = [
  "Husband",
  "Wife",
  "Mother",
  "Father",
  "Child",
  "Sibling",
  "Friend",
  "Other",
] as const;

const STAGES = [
  "Just diagnosed",
  "In treatment",
  "Remission",
  "Finding peace",
  "Memorial",
] as const;

const MESSAGES = [
  "You are not alone",
  "I'm so proud of your strength",
  "Keep fighting",
  "Thank you for everything",
  "It's okay to rest now",
] as const;

const GENRES = [
  "Acoustic Folk",
  "Pop",
  "Country",
  "R&B",
  "Gospel/Worship",
  "Cinematic",
] as const;

const TEMPOS = ["Slow & Tender", "Mid-tempo", "Upbeat & Triumphant"] as const;
const VOICES = ["Female Voice", "Male Voice", "No Preference"] as const;

function CreatePage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const q = useQuizStore();

  const next = () => {
    if (step < 4) setStep((s) => (s + 1) as 1 | 2 | 3 | 4);
    else navigate({ to: "/checkout" });
  };
  const back = () => setStep((s) => (s > 1 ? ((s - 1) as 1 | 2 | 3 | 4) : 1));

  if (step === 1) {
    const valid = !!q.relationship && q.recipient_name.trim().length > 0 && !!q.stage;
    return (
      <QuizShell
        step={1}
        title="Let's start with the basics."
        subtitle="Tell us about the special person in your life."
        onNext={next}
        isValid={valid}
      >
        <Question label="Who is this for?">
          <PillSelect
            options={RELATIONSHIPS}
            value={q.relationship}
            onChange={(v) => q.set("relationship", v)}
            columns={4}
          />
        </Question>

        <Question
          label="What's their name?"
          helper="Tip: add pronunciation for clarity, e.g. Alicia: ah-lee-sha"
        >
          <TextInput
            placeholder="First name"
            value={q.recipient_name}
            onChange={(e) => q.set("recipient_name", e.target.value)}
            maxLength={80}
          />
        </Question>

        <Question label="Where are they in their journey?">
          <ListSelect
            options={STAGES}
            value={q.stage}
            onChange={(v) => q.set("stage", v)}
          />
        </Question>
      </QuizShell>
    );
  }

  if (step === 2) {
    const valid =
      q.qualities.trim().length > 10 &&
      q.memory.trim().length > 10 &&
      !!q.message;
    return (
      <QuizShell
        step={2}
        title="What makes them special?"
        subtitle="Describe their character and the qualities you love most."
        onNext={next}
        onBack={back}
        isValid={valid}
      >
        <Question label="Their beautiful qualities">
          <TextArea
            placeholder="Are they patient, wise, funny, encouraging? What makes them incredible to you?"
            value={q.qualities}
            onChange={(e) => q.set("qualities", e.target.value)}
            maxLength={600}
          />
        </Question>

        <Question label="Share a specific memory">
          <TextArea
            placeholder="A moment you laugh about? Something you went through together?"
            value={q.memory}
            onChange={(e) => q.set("memory", e.target.value)}
            maxLength={600}
          />
        </Question>

        <Question label="The core message of the song">
          <ListSelect
            options={MESSAGES}
            value={q.message}
            onChange={(v) => q.set("message", v)}
          />
        </Question>
      </QuizShell>
    );
  }

  if (step === 3) {
    const valid = !!q.genre && !!q.tempo && !!q.voice;
    return (
      <QuizShell
        step={3}
        title="Choose their sound."
        subtitle="What kind of music moves them?"
        onNext={next}
        onBack={back}
        isValid={valid}
      >
        <Question label="Preferred genre">
          <PillSelect
            options={GENRES}
            value={q.genre}
            onChange={(v) => q.set("genre", v)}
            columns={3}
          />
        </Question>

        <Question label="Tempo & energy">
          <PillSelect
            options={TEMPOS}
            value={q.tempo}
            onChange={(v) => q.set("tempo", v)}
            columns={3}
          />
        </Question>

        <Question label="Voice preference">
          <PillSelect
            options={VOICES}
            value={q.voice}
            onChange={(v) => q.set("voice", v)}
            columns={3}
          />
        </Question>
      </QuizShell>
    );
  }

  // step 4
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(q.buyer_email);
  const giftOk = !q.is_gift || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(q.recipient_email);
  const valid = emailOk && giftOk;

  return (
    <QuizShell
      step={4}
      title="Where should we send it?"
      subtitle="We'll email you when it's ready — usually within 7 days."
      onNext={next}
      onBack={back}
      isValid={valid}
      nextLabel="Proceed to checkout · $39"
    >
      <Question label="Your email">
        <TextInput
          type="email"
          placeholder="you@example.com"
          value={q.buyer_email}
          onChange={(e) => q.set("buyer_email", e.target.value)}
          maxLength={120}
        />
      </Question>

      <Question label="Gift directly to them?">
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
              ? "We'll deliver the song to them on a date you choose."
              : "We'll send it to you, and you can share it however you like."}
          </span>
        </div>
      </Question>

      {q.is_gift && (
        <div className="space-y-6 rounded-3xl border border-dashed border-peach bg-card/60 p-6 animate-in fade-in slide-in-from-top-2">
          <Question label="Recipient's email">
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
              rows={4}
            />
          </Question>
        </div>
      )}
    </QuizShell>
  );
}
