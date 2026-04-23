import { useEffect } from "react";
import { X } from "lucide-react";
import { useQuizStore, type GenreKey, type RelationshipKey, type VoiceKey } from "@/stores/quizStore";

interface ReviewSurveyModalProps {
  open: boolean;
  onClose: () => void;
}

const RELATIONSHIPS: RelationshipKey[] = [
  "Husband", "Wife", "Mother", "Father", "Son", "Daughter",
  "Sibling", "Grandparent", "Friend", "Other",
];

const GENRES: GenreKey[] = [
  "Pop", "Country", "Acoustic Folk", "R&B / Soul", "Gospel / Worship",
  "Rock / Indie", "Hip-Hop / Rap", "Cinematic / Orchestral",
];

const VOICES: VoiceKey[] = ["Female Voice", "Male Voice", "Duet", "No Preference"];

export function ReviewSurveyModal({ open, onClose }: ReviewSurveyModalProps) {
  const q = useQuizStore();

  // Lock background scroll while modal is open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Close on Escape
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
        {/* Header */}
        <header className="flex shrink-0 items-start justify-between border-b border-border px-6 py-5">
          <div>
            <h2 id="review-survey-title" className="font-display text-xl font-bold text-foreground">
              Review and Edit Your Survey
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">Scroll down to see your answers</p>
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

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8">
          {/* Section 1: Basics */}
          <section>
            <h3 className="font-display text-sm font-bold uppercase tracking-wider text-primary">
              Let's start with the basics
            </h3>

            <div className="mt-5">
              <label className="text-sm font-medium text-foreground">Who's this for?</label>
              <div className="mt-2 flex flex-wrap gap-2">
                {RELATIONSHIPS.map((r) => (
                  <Pill
                    key={r}
                    selected={q.relationship === r}
                    onClick={() => q.set("relationship", r)}
                  >
                    {r}
                  </Pill>
                ))}
              </div>
            </div>

            <div className="mt-5">
              <label className="text-sm font-medium text-foreground">What's their name?</label>
              <Input
                value={q.recipient_name}
                onChange={(v) => q.set("recipient_name", v)}
                placeholder="Their name"
              />
            </div>
          </section>

          {/* Section 2: Genre */}
          <section>
            <h3 className="font-display text-sm font-bold uppercase tracking-wider text-primary">
              Choose a genre
            </h3>

            <div className="mt-5">
              <label className="text-sm font-medium text-foreground">Preferred Genre</label>
              <div className="mt-2 flex flex-wrap gap-2">
                {GENRES.map((g) => (
                  <Pill
                    key={g}
                    selected={q.genre === g}
                    onClick={() => q.set("genre", g)}
                  >
                    {g}
                  </Pill>
                ))}
              </div>
            </div>

            <div className="mt-5">
              <label className="text-sm font-medium text-foreground">Preferred Voice</label>
              <div className="mt-2 flex flex-wrap gap-2">
                {VOICES.map((v) => (
                  <Pill
                    key={v}
                    selected={q.voice === v}
                    onClick={() => q.set("voice", v)}
                  >
                    {v}
                  </Pill>
                ))}
              </div>
            </div>
          </section>

          {/* Section 3: What makes them special */}
          <section>
            <h3 className="font-display text-sm font-bold uppercase tracking-wider text-primary">
              What makes them special?
            </h3>
            <div className="mt-5">
              <label className="text-sm font-medium text-foreground">Their beautiful qualities</label>
              <Textarea
                value={q.qualities}
                onChange={(v) => q.set("qualities", v)}
                placeholder="Kind, funny, brave…"
              />
            </div>

            <div className="mt-5">
              <label className="text-sm font-medium text-foreground">A shared memory</label>
              <Textarea
                value={q.shared_memory}
                onChange={(v) => q.set("shared_memory", v)}
                placeholder="A moment you'll always remember together"
              />
            </div>

            <div className="mt-5">
              <label className="text-sm font-medium text-foreground">A few personal words</label>
              <Textarea
                value={q.personal_words}
                onChange={(v) => q.set("personal_words", v)}
                placeholder="Anything else you want to say in the song"
              />
            </div>
          </section>
        </div>

        {/* Sticky footer */}
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
