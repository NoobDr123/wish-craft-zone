import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

// Quiz answers are persisted in localStorage for 24 hours, then auto-cleared.
const QUIZ_TTL_MS = 24 * 60 * 60 * 1000;
const QUIZ_TIMESTAMP_KEY = "ribbonsong-quiz-v3-savedAt";

const ttlStorage = {
  getItem: (name: string): string | null => {
    if (typeof window === "undefined") return null;
    try {
      const savedAtRaw = window.localStorage.getItem(QUIZ_TIMESTAMP_KEY);
      if (savedAtRaw) {
        const savedAt = Number(savedAtRaw);
        if (Number.isFinite(savedAt) && Date.now() - savedAt > QUIZ_TTL_MS) {
          window.localStorage.removeItem(name);
          window.localStorage.removeItem(QUIZ_TIMESTAMP_KEY);
          return null;
        }
      }
      return window.localStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem: (name: string, value: string): void => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(name, value);
      window.localStorage.setItem(QUIZ_TIMESTAMP_KEY, String(Date.now()));
    } catch {
      // ignore quota / privacy errors
    }
  },
  removeItem: (name: string): void => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.removeItem(name);
      window.localStorage.removeItem(QUIZ_TIMESTAMP_KEY);
    } catch {
      // ignore
    }
  },
};

export type RelationshipKey =
  | "Husband"
  | "Wife"
  | "Mother"
  | "Father"
  | "Son"
  | "Daughter"
  | "Sibling"
  | "Grandparent"
  | "Friend"
  | "Other";

export type StageKey =
  | "Just diagnosed"
  | "In treatment"
  | "Between treatments"
  | "In remission / survivor"
  | "In hospice / final chapter"
  | "In loving memory";

// Kept for back-compat with existing code paths; not surfaced in new quiz UI.
export type CancerTypeKey =
  | "Breast"
  | "Lung"
  | "Colon / Colorectal"
  | "Prostate"
  | "Blood (Leukemia / Lymphoma)"
  | "Brain"
  | "Pancreatic"
  | "Ovarian"
  | "Childhood cancer"
  | "Another type"
  | "Prefer not to say";

export type ToneKey =
  | "Comforting & gentle"
  | "Uplifting & hopeful"
  | "Strong & defiant"
  | "Joyful & celebratory"
  | "Reverent & prayerful"
  | "Bittersweet & honoring";

// New theme set — superset across journey stages. Filtered by stage in UI.
export type CoreMessage =
  | "You are not alone"
  | "I'm so proud of your strength"
  | "Keep fighting, we're with you"
  | "Thank you for everything"
  | "It's okay to rest now"
  | "Your love lives on in us"
  | "We will carry you through this"
  | "You shaped who I am"
  | "I will remember you every day";

export type GenreKey =
  | "Acoustic Folk"
  | "Pop"
  | "Country"
  | "R&B / Soul"
  | "Gospel / Worship"
  | "Cinematic / Orchestral"
  | "Hip-Hop / Rap"
  | "Rock / Indie";

export type TempoKey = "Slow & Tender" | "Mid-tempo" | "Upbeat & Triumphant";
export type VoiceKey = "Female Voice" | "Male Voice" | "Duet" | "No Preference";

export type JourneyStage = "active" | "hospice" | "memory";
export type Tense = "present" | "present_fading" | "past";

export interface QuizState {
  // Step 1 — Who is this for
  relationship?: RelationshipKey;
  relationship_other: string;
  recipient_name: string;
  pronunciation: string;
  age_range: string;

  // Step 2 — Their journey
  stage?: StageKey;
  cancer_type?: CancerTypeKey;

  // Step 3-6 — Story (free text)
  fighting_for: string; // q4 — fighting for / holding onto / lived for
  qualities: string; // q5 — qualities you love / loved
  shared_memory: string; // q6 — one memory

  // Legacy free-text fields (kept for back-compat with edge fn; unused in new UI)
  signature_strength: string;
  hardest_moment: string;
  what_helps_most: string;
  inside_joke: string;
  little_things: string;
  faith_or_beliefs: string;

  // Step 7-8 — The message
  message?: CoreMessage; // q7 theme
  personal_words: string; // q8 letter
  hope_for_them: string;

  // Step 9 — Sound
  genre?: GenreKey;
  tempo?: TempoKey;
  voice?: VoiceKey;
  song_title_idea: string;

  // Step 10-11 — Delivery
  buyer_name: string;
  buyer_email: string;
  is_gift: boolean;
  recipient_email: string;
  delivery_date: string;
  personal_note: string;

  // Order context (set after checkout sim)
  orderId?: string;
  checkoutSessionId?: string;
  has_3rd_verse: boolean;
  is_rush: boolean;
  has_unlimited_edits: boolean;

  // Free-song reward redemption (set when user enters quiz via ?reward=CODE)
  reward_code?: string;

  set: <K extends keyof QuizState>(key: K, value: QuizState[K]) => void;
  reset: () => void;
}

const initial = {
  recipient_name: "",
  relationship_other: "",
  pronunciation: "",
  age_range: "",
  fighting_for: "",
  signature_strength: "",
  hardest_moment: "",
  what_helps_most: "",
  qualities: "",
  inside_joke: "",
  shared_memory: "",
  little_things: "",
  faith_or_beliefs: "",
  personal_words: "",
  hope_for_them: "",
  song_title_idea: "",
  buyer_name: "",
  buyer_email: "",
  is_gift: false,
  recipient_email: "",
  delivery_date: "",
  personal_note: "",
  has_3rd_verse: false,
  is_rush: false,
  has_unlimited_edits: false,
};

export const useQuizStore = create<QuizState>()(
  persist(
    (set) => ({
      ...initial,
      set: (key, value) => set({ [key]: value } as Partial<QuizState>),
      reset: () => set({ ...initial, orderId: undefined, reward_code: undefined }),
    }),
    { name: "ribbonsong-quiz-v3", storage: createJSONStorage(() => ttlStorage) },
  ),
);

// -------- Helpers --------

export function journeyStageOf(stage?: StageKey): JourneyStage {
  if (stage === "In loving memory") return "memory";
  if (stage === "In hospice / final chapter") return "hospice";
  return "active";
}

export function tenseOf(stage?: StageKey): Tense {
  const j = journeyStageOf(stage);
  if (j === "memory") return "past";
  if (j === "hospice") return "present_fading";
  return "present";
}
