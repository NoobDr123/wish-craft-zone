import { create } from "zustand";
import { persist } from "zustand/middleware";

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

export type CoreMessage =
  | "You are not alone"
  | "I'm so proud of your strength"
  | "Keep fighting — we're with you"
  | "Thank you for everything"
  | "It's okay to rest now"
  | "Your love lives on in us"
  | "We will carry you through this";

export type GenreKey =
  | "Acoustic Folk"
  | "Pop"
  | "Country"
  | "R&B / Soul"
  | "Gospel / Worship"
  | "Cinematic / Orchestral";

export type TempoKey = "Slow & Tender" | "Mid-tempo" | "Upbeat & Triumphant";
export type VoiceKey = "Female Voice" | "Male Voice" | "Duet" | "No Preference";

export interface QuizState {
  // Step 1 — Who is this for
  relationship?: RelationshipKey;
  relationship_other: string;
  recipient_name: string;
  pronunciation: string;
  age_range: string;

  // Step 2 — Their fight
  stage?: StageKey;
  cancer_type?: CancerTypeKey;
  fighting_for: string; // who/what they're fighting for
  signature_strength: string; // how they show strength
  hardest_moment: string; // optional, the hard thing
  what_helps_most: string; // what brings them comfort

  // Step 3 — Who they are
  qualities: string;
  inside_joke: string;
  shared_memory: string;
  little_things: string; // small details — laugh, smell, phrase
  faith_or_beliefs: string;

  // Step 4 — The message
  message?: CoreMessage;
  personal_words: string; // free-form letter to them
  hope_for_them: string;

  // Step 5 — Sound
  genre?: GenreKey;
  tempo?: TempoKey;
  voice?: VoiceKey;
  song_title_idea: string;

  // Step 6 — Delivery
  buyer_name: string;
  buyer_email: string;
  is_gift: boolean;
  recipient_email: string;
  delivery_date: string;
  personal_note: string;

  // Order context (set after checkout sim)
  orderId?: string;
  has_3rd_verse: boolean;
  is_rush: boolean;
  has_unlimited_edits: boolean;

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
      reset: () => set({ ...initial, orderId: undefined }),
    }),
    { name: "ribbonsong-quiz" },
  ),
);
