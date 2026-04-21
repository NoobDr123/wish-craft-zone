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

const CANCER_TYPES = [
  "Breast",
  "Lung",
  "Colon / Colorectal",
  "Prostate",
  "Blood (Leukemia / Lymphoma)",
  "Brain",
  "Pancreatic",
  "Ovarian",
  "Childhood cancer",
  "Another type",
  "Prefer not to say",
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

// Single source of truth for the quiz flow.
// Each entry = one screen.
type QuizSnapshot = ReturnType<typeof useQuizStore.getState>;

type Step = {
  chapter: string;
  title: string;
  subtitle?: string;
  optional?: boolean;
  // returns true when the user can advance
  isValid: (q: QuizSnapshot) => boolean;
  render: () => React.ReactNode;
  nextLabel?: string;
  // optional gate: only include the step when this returns true
  when?: (q: QuizSnapshot) => boolean;
};

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function CreatePage() {
  const navigate = useNavigate();
  const q = useQuizStore();
  const [index, setIndex] = useState(0);

  const name = q.recipient_name.trim() || "them";

  const steps: Step[] = [
    // ── Chapter 1: Who they are ────────────────────────────────────
    {
      chapter: "Who they are",
      title: "Who is this song for?",
      subtitle: "Your relationship helps us write in the right voice.",
      isValid: (s) => !!s.relationship,
      render: () => (
        <Question label="They are my...">
          <PillSelect
            options={RELATIONSHIPS}
            value={q.relationship}
            onChange={(v) => q.set("relationship", v)}
            columns={3}
          />
        </Question>
      ),
    },
    {
      chapter: "Who they are",
      title: "Tell us a little more about who they are.",
      subtitle:
        "A few words about your relationship helps us write the song in the right voice.",
      // Only show this step when relationship is "Other".
      when: (s) => s.relationship === "Other",
      isValid: (s) => s.relationship_other.trim().length > 1,
      render: () => (
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
      ),
    },
    {
      chapter: "Who they are",
      title: "What's their name?",
      subtitle:
        "We'll use it tenderly throughout the song. Add a pronunciation if it helps.",
      isValid: (s) => s.recipient_name.trim().length > 0,
      render: () => (
        <div className="space-y-6">
          <Question label="First name">
            <TextInput
              placeholder="e.g. Maria"
              value={q.recipient_name}
              onChange={(e) => q.set("recipient_name", e.target.value)}
              maxLength={80}
              autoFocus
            />
          </Question>
          <Question
            label="Pronunciation (optional)"
            helper="e.g. Alicia: ah-LEE-sha"
          >
            <TextInput
              placeholder="How it sounds"
              value={q.pronunciation}
              onChange={(e) => q.set("pronunciation", e.target.value)}
              maxLength={80}
            />
          </Question>
        </div>
      ),
    },
    {
      chapter: "Who they are",
      title: "About how old are they?",
      subtitle: "Helps us pick the right tone and references.",
      optional: true,
      isValid: () => true,
      render: () => (
        <Question label="Age range (optional)">
          <PillSelect
            options={["Child", "Teen", "20s, 30s", "40s, 50s", "60s, 70s", "80+"] as const}
            value={
              (["Child", "Teen", "20s, 30s", "40s, 50s", "60s, 70s", "80+"] as const).find(
                (p) => p === q.age_range,
              ) ?? undefined
            }
            onChange={(v) => q.set("age_range", v)}
            columns={3}
          />
        </Question>
      ),
    },

    // ── Chapter 2: Their fight ─────────────────────────────────────
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
    {
      chapter: "Their fight",
      title: "What kind of cancer are they facing?",
      subtitle:
        "We never name it in the song unless you ask. This just helps us understand.",
      optional: true,
      isValid: () => true,
      render: () => (
        <Question label="Type (optional)">
          <ListSelect
            options={CANCER_TYPES}
            value={q.cancer_type}
            onChange={(v) => q.set("cancer_type", v)}
          />
        </Question>
      ),
    },
    {
      chapter: "Their fight",
      title: `Who or what is ${name} fighting for?`,
      subtitle:
        "The people, dreams, or moments that pull them forward on the hardest days.",
      isValid: (s) => s.fighting_for.trim().length > 4,
      render: () => (
        <Question label="They're fighting for…">
          <TextArea
            placeholder="Their grandkids. Walking their daughter down the aisle. One more summer at the lake. The novel they're still writing…"
            value={q.fighting_for}
            onChange={(e) => q.set("fighting_for", e.target.value)}
            maxLength={500}
            autoFocus
          />
        </Question>
      ),
    },
    {
      chapter: "Their fight",
      title: "How do they show their strength?",
      subtitle:
        "Strength looks different for everyone. Quiet, fierce, gentle, stubborn. How does theirs show up?",
      isValid: (s) => s.signature_strength.trim().length > 10,
      render: () => (
        <Question label="Their kind of brave">
          <TextArea
            placeholder="She still makes everyone laugh from her hospital bed. He shows up to chemo in his Sunday best. They never miss a chance to say I love you…"
            value={q.signature_strength}
            onChange={(e) => q.set("signature_strength", e.target.value)}
            maxLength={500}
          />
        </Question>
      ),
    },
    {
      chapter: "Their fight",
      title: "What's been the hardest part?",
      subtitle:
        "Only share what you want to. Naming the hard thing helps the song honor it.",
      optional: true,
      isValid: () => true,
      render: () => (
        <Question label="The hard part (optional)">
          <TextArea
            placeholder="Watching them lose their hair. The day of the diagnosis. Being far away. The fear of what comes next…"
            value={q.hardest_moment}
            onChange={(e) => q.set("hardest_moment", e.target.value)}
            maxLength={500}
          />
        </Question>
      ),
    },
    {
      chapter: "Their fight",
      title: `What brings ${name} comfort?`,
      subtitle: "The small things that get them through.",
      optional: true,
      isValid: () => true,
      render: () => (
        <Question label="Their comforts (optional)">
          <TextArea
            placeholder="Sunday morning coffee on the porch. Their dog Biscuit. Praying with their sister. Old country songs…"
            value={q.what_helps_most}
            onChange={(e) => q.set("what_helps_most", e.target.value)}
            maxLength={500}
          />
        </Question>
      ),
    },

    // ── Chapter 3: Their soul ──────────────────────────────────────
    {
      chapter: "Their soul",
      title: "What makes them, them?",
      subtitle:
        "The qualities you'd brag about. The ones you'll pass down to your kids.",
      isValid: (s) => s.qualities.trim().length > 15,
      render: () => (
        <Question label="The qualities you love most">
          <TextArea
            placeholder="Wickedly funny. The most patient person I know. A natural caretaker. Stubborn in the best way. Generous to a fault…"
            value={q.qualities}
            onChange={(e) => q.set("qualities", e.target.value)}
            maxLength={600}
            autoFocus
          />
        </Question>
      ),
    },
    {
      chapter: "Their soul",
      title: "Tell us a memory you'll never forget.",
      subtitle:
        "A specific moment. The more detail, the more the song will feel like them.",
      isValid: (s) => s.shared_memory.trim().length > 20,
      render: () => (
        <Question label="The memory">
          <TextArea
            placeholder="The summer we got lost driving to the coast and ended up at that diner. Dancing in the kitchen on Christmas morning. The day she taught me to ride a bike…"
            value={q.shared_memory}
            onChange={(e) => q.set("shared_memory", e.target.value)}
            maxLength={700}
          />
        </Question>
      ),
    },
    {
      chapter: "Their soul",
      title: "An inside joke or saying?",
      subtitle:
        "A phrase only your family says. A nickname. Something that will make them smile when they hear it.",
      optional: true,
      isValid: () => true,
      render: () => (
        <Question label="The thing only you two get (optional)">
          <TextArea
            placeholder="The nickname only they call you. The phrase your family always says. A running joke that still makes you laugh…"
            value={q.inside_joke}
            onChange={(e) => q.set("inside_joke", e.target.value)}
            maxLength={400}
          />
        </Question>
      ),
    },
    {
      chapter: "Their soul",
      title: "The little details.",
      subtitle:
        "Their laugh, their handwriting, the smell of their kitchen. The tiny things that make us miss them when they're not in the room.",
      optional: true,
      isValid: () => true,
      render: () => (
        <Question label="Little things (optional)">
          <TextArea
            placeholder="The gap in his front teeth when he laughs. Her perfume (Estée Lauder). The way Dad hums while he reads…"
            value={q.little_things}
            onChange={(e) => q.set("little_things", e.target.value)}
            maxLength={500}
          />
        </Question>
      ),
    },
    {
      chapter: "Their soul",
      title: "Their faith or what they believe in.",
      subtitle:
        "If faith, prayer, or a guiding belief is part of their life, we'd love to honor it.",
      optional: true,
      isValid: () => true,
      render: () => (
        <Question label="Faith / beliefs (optional)">
          <TextArea
            placeholder="Lifelong Catholic. Quietly spiritual but not religious. She believes love is the only thing that lasts. Psalm 23 is her favorite…"
            value={q.faith_or_beliefs}
            onChange={(e) => q.set("faith_or_beliefs", e.target.value)}
            maxLength={400}
          />
        </Question>
      ),
    },

    // ── Chapter 4: The message ─────────────────────────────────────
    {
      chapter: "The message",
      title: "If the song could say one thing…",
      subtitle: "Pick the heart of what you want them to feel.",
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
    {
      chapter: "The message",
      title: `What do you wish you could say to ${name}?`,
      subtitle:
        "Write to them like a letter. We'll weave your words into the lyrics.",
      isValid: (s) => s.personal_words.trim().length > 30,
      render: () => (
        <Question label="Your words to them">
          <TextArea
            placeholder="Mom, I don't say this enough. you are the bravest person I've ever known. Every time I hear you laugh in the next room, I remember…"
            value={q.personal_words}
            onChange={(e) => q.set("personal_words", e.target.value)}
            maxLength={1200}
            rows={8}
            autoFocus
          />
        </Question>
      ),
    },
    {
      chapter: "The message",
      title: `What do you hope for ${name}?`,
      subtitle: "The future you're praying into being.",
      optional: true,
      isValid: () => true,
      render: () => (
        <Question label="Your hope (optional)">
          <TextArea
            placeholder="That she sees her grandbabies grow up. That he feels no more pain. That she knows, every single day, how loved she is…"
            value={q.hope_for_them}
            onChange={(e) => q.set("hope_for_them", e.target.value)}
            maxLength={500}
          />
        </Question>
      ),
    },

    // ── Chapter 5: Their sound ─────────────────────────────────────
    {
      chapter: "Their sound",
      title: "What's the feeling we're going for?",
      subtitle: "The emotional color of the song.",
      isValid: () => true, // tone is optional but we steer toward it
      render: () => (
        <Question label="Choose a tone">
          <PillSelect
            options={
              [
                "Comforting & gentle",
                "Uplifting & hopeful",
                "Strong & defiant",
                "Joyful & celebratory",
                "Reverent & prayerful",
                "Bittersweet & honoring",
              ] as const
            }
            // Reuse song_title_idea slot? No. Store tone in personal_note? we will just skip persistence for tone
            value={undefined}
            onChange={() => {}}
            columns={2}
          />
        </Question>
      ),
    },
    {
      chapter: "Their sound",
      title: "Pick a musical genre.",
      subtitle: "What kind of music moves them most?",
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
    {
      chapter: "Their sound",
      title: "Tempo and energy?",
      isValid: (s) => !!s.tempo,
      render: () => (
        <Question label="Pace of the song">
          <PillSelect
            options={TEMPOS}
            value={q.tempo}
            onChange={(v) => q.set("tempo", v)}
            columns={3}
          />
        </Question>
      ),
    },
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
    {
      chapter: "Their sound",
      title: "Got a song title in mind?",
      subtitle: "We will riff on it, or come up with one for you.",
      optional: true,
      isValid: () => true,
      render: () => (
        <Question label="Title idea (optional)">
          <TextInput
            placeholder='e.g. "Stronger Than the Storm"'
            value={q.song_title_idea}
            onChange={(e) => q.set("song_title_idea", e.target.value)}
            maxLength={80}
          />
        </Question>
      ),
    },

    // ── Chapter 6: Delivery ────────────────────────────────────────
    {
      chapter: "Delivery",
      title: "Who is this song from?",
      isValid: (s) => s.buyer_name.trim().length > 0,
      render: () => (
        <Question label="Your name">
          <TextInput
            placeholder="So we can sign the gift from you"
            value={q.buyer_name}
            onChange={(e) => q.set("buyer_name", e.target.value)}
            maxLength={80}
            autoFocus
          />
        </Question>
      ),
    },
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
    {
      chapter: "Delivery",
      title: "Would you like us to gift it directly to them?",
      subtitle:
        "We can send it to you to share, or deliver it as a surprise on a date you choose.",
      isValid: (s) =>
        !s.is_gift || (emailRe.test(s.recipient_email) || s.recipient_email === ""),
      render: () => (
        <div className="space-y-6">
          <Question label="Send directly to them?">
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
              <Question label="Their email">
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
        </div>
      ),
      nextLabel: "Proceed to checkout · $39",
    },
  ];

  // Filter out steps that are gated off (e.g. "Other" follow-up).
  const visibleSteps = steps.filter((s) => !s.when || s.when(q));
  const total = visibleSteps.length;
  const safeIndex = Math.min(index, total - 1);
  const step = visibleSteps[safeIndex];
  const valid = step.isValid(q);

  const next = () => {
    if (index < total - 1) setIndex((i) => i + 1);
    else navigate({ to: "/checkout" });
  };
  const back = () => setIndex((i) => Math.max(0, i - 1));

  return (
    <QuizShell
      current={index + 1}
      total={total}
      chapter={step.chapter}
      title={step.title}
      subtitle={step.subtitle}
      onNext={next}
      onBack={index > 0 ? back : undefined}
      isValid={valid}
      nextLabel={
        step.nextLabel ?? (index === total - 1 ? "Finish" : "Continue")
      }
      optional={step.optional}
    >
      {step.render()}
    </QuizShell>
  );
}
