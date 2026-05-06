import { useEffect } from "react";
import { X } from "lucide-react";
import {
  useQuizStore,
  type DogBreedKey,
  type DogGenderKey,
  type GenreKey,
  type VoiceKey,
} from "@/stores/quizStore";

interface ReviewSurveyModalProps {
  open: boolean;
  onClose: () => void;
}

const BREEDS: DogBreedKey[] = [
  "Labrador Retriever",
  "Golden Retriever",
  "German Shepherd",
  "Goldendoodle / Labradoodle",
  "Husky",
  "Pit Bull / Staffordshire Terrier",
  "Mixed breed (proudly)",
  "Rescue, breed unknown",
  "Other",
];

const GENDERS: { value: DogGenderKey; label: string }[] = [
  { value: "she", label: "She / her" },
  { value: "he", label: "He / him" },
];

const GENRES: GenreKey[] = ["Acoustic", "Country", "Folk", "Lullaby", "Cinematic", "Instrumental only"];

const VOICES: VoiceKey[] = ["Female Voice", "Male Voice"];

export function ReviewSurveyModal({ open, onClose }: ReviewSurveyModalProps) {
  const q = useQuizStore();

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-stretch justify-center bg-foreground/40 px-3 py-4 backdrop-blur-sm md:items-center md:p-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="review-survey-title"
    >
      <div
        className="flex h-full w-full max-w-lg flex-col overflow-hidden rounded-3xl bg-background shadow-card md:max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex shrink-0 items-start justify-between border-b border-border px-6 py-5">
          <div>
            <h2 id="review-survey-title" className="font-display text-xl font-bold text-foreground">
              Review and edit your answers
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">Scroll down to see all answers</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg border border-primary/40 p-1.5 text-muted-foreground transition-colors hover:bg-primary/5 hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8">
          <section>
            <h3 className="font-display text-sm font-bold uppercase tracking-wider text-primary">
              About her
            </h3>
            <div className="mt-5">
              <label className="text-sm font-medium text-foreground">Her name</label>
              <Input
                value={q.dog_name}
                onChange={(v) => q.set("dog_name", v)}
                placeholder="e.g. Daisy"
              />
            </div>
            <div className="mt-5">
              <label className="text-sm font-medium text-foreground">Pronouns</label>
              <div className="mt-2 flex flex-wrap gap-2">
                {GENDERS.map((g) => (
                  <Pill
                    key={g.value}
                    selected={q.dog_gender === g.value}
                    onClick={() => q.set("dog_gender", g.value)}
                  >
                    {g.label}
                  </Pill>
                ))}
              </div>
            </div>
            <div className="mt-5">
              <label className="text-sm font-medium text-foreground">Her breed</label>
              <div className="mt-2 flex flex-wrap gap-2">
                {BREEDS.map((b) => (
                  <Pill
                    key={b}
                    selected={q.dog_breed === b}
                    onClick={() => q.set("dog_breed", b)}
                  >
                    {b}
                  </Pill>
                ))}
              </div>
            </div>
          </section>

          <section>
            <h3 className="font-display text-sm font-bold uppercase tracking-wider text-primary">
              Her sound
            </h3>
            <div className="mt-5">
              <label className="text-sm font-medium text-foreground">Genre</label>
              <div className="mt-2 flex flex-wrap gap-2">
                {GENRES.map((g) => (
                  <Pill key={g} selected={q.genre === g} onClick={() => q.set("genre", g)}>
                    {g}
                  </Pill>
                ))}
              </div>
            </div>
            <div className="mt-5">
              <label className="text-sm font-medium text-foreground">Voice</label>
              <div className="mt-2 flex flex-wrap gap-2">
                {VOICES.map((v) => (
                  <Pill key={v} selected={q.voice === v} onClick={() => q.set("voice", v)}>
                    {v}
                  </Pill>
                ))}
              </div>
            </div>
          </section>

          <section>
            <h3 className="font-display text-sm font-bold uppercase tracking-wider text-primary">
              Her story
            </h3>
            <div className="mt-5">
              <label className="text-sm font-medium text-foreground">Who she was</label>
              <Textarea
                value={q.dog_personality ?? ""}
                onChange={(v) => q.set("dog_personality", v)}
                placeholder="Goofy, loud, the world's biggest greeter…"
              />
            </div>
            <div className="mt-5">
              <label className="text-sm font-medium text-foreground">A memory</label>
              <Textarea
                value={q.dog_memory ?? ""}
                onChange={(v) => q.set("dog_memory", v)}
                placeholder="The day you met. A walk that became a story…"
              />
            </div>
            <div className="mt-5">
              <label className="text-sm font-medium text-foreground">Your letter to her</label>
              <Textarea
                value={q.letter_to_dog ?? ""}
                onChange={(v) => q.set("letter_to_dog", v)}
                placeholder="If you could say one thing to her now…"
              />
            </div>
          </section>
        </div>

        <footer className="flex shrink-0 items-center justify-end gap-3 border-t border-border bg-background px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-border bg-background px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground shadow-soft transition-all hover:brightness-95 active:scale-[0.99]"
          >
            Save
          </button>
        </footer>
      </div>
    </div>
  );
}

function Pill({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-4 py-2 text-sm font-medium transition-all ${
        selected
          ? "border-primary bg-primary text-primary-foreground shadow-soft"
          : "border-border bg-background text-foreground hover:border-primary/40 hover:bg-primary/5"
      }`}
    >
      {children}
    </button>
  );
}

function Input({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="mt-2 w-full rounded-xl border-2 border-border bg-background px-4 py-3 text-base text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
    />
  );
}

function Textarea({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={3}
      className="mt-2 w-full resize-none rounded-xl border-2 border-border bg-background px-4 py-3 text-base text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
    />
  );
}
