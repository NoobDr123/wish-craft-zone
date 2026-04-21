import { create } from "zustand";
import { persist } from "zustand/middleware";

export type RelationshipKey =
  | "Husband"
  | "Wife"
  | "Mother"
  | "Father"
  | "Child"
  | "Sibling"
  | "Friend"
  | "Other";

export type StageKey =
  | "Just diagnosed"
  | "In treatment"
  | "Remission"
  | "Finding peace"
  | "Memorial";

export type CoreMessage =
  | "You are not alone"
  | "I'm so proud of your strength"
  | "Keep fighting"
  | "Thank you for everything"
  | "It's okay to rest now";

export type GenreKey =
  | "Acoustic Folk"
  | "Pop"
  | "Country"
  | "R&B"
  | "Gospel/Worship"
  | "Cinematic";

export type TempoKey = "Slow & Tender" | "Mid-tempo" | "Upbeat & Triumphant";
export type VoiceKey = "Female Voice" | "Male Voice" | "No Preference";

export interface QuizState {
  // Step 1
  relationship?: RelationshipKey;
  recipient_name: string;
  stage?: StageKey;
  // Step 2
  qualities: string;
  memory: string;
  message?: CoreMessage;
  // Step 3
  genre?: GenreKey;
  tempo?: TempoKey;
  voice?: VoiceKey;
  // Step 4
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
  qualities: "",
  memory: "",
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
