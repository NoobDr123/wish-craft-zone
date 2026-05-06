import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

// Quiz answers persist in localStorage for 6 hours, then auto-clear.
// Completed orders are saved permanently in the database (orders.quiz_payload),
// so the admin panel still shows full history regardless of this TTL.
const QUIZ_TTL_MS = 6 * 60 * 60 * 1000;
const QUIZ_TIMESTAMP_KEY = "pawprintsong-quiz-v1-savedAt";
const QUIZ_KEY = "pawprintsong-quiz-v1";

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
      // Wipe any leftover cancer-era quiz state.
      window.localStorage.removeItem("ribbonsong-quiz-v3");
      window.localStorage.removeItem("ribbonsong-quiz-v3-savedAt");
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

// Breeds list comes from the funnel spec (`pawprintsong-funnel-copy.md`, Step 1).
export type DogBreedKey =
  | "Labrador Retriever"
  | "Golden Retriever"
  | "German Shepherd"
  | "French Bulldog"
  | "Bulldog"
  | "Poodle"
  | "Goldendoodle / Labradoodle"
  | "Beagle"
  | "Rottweiler"
  | "Yorkshire Terrier"
  | "Dachshund"
  | "Boxer"
  | "Australian Shepherd"
  | "Border Collie"
  | "Pomeranian"
  | "Cavalier King Charles Spaniel"
  | "Chihuahua"
  | "Pit Bull / Staffordshire Terrier"
  | "Husky"
  | "Shih Tzu"
  | "Bernese Mountain Dog"
  | "Cocker Spaniel"
  | "Mixed breed (proudly)"
  | "Rescue, breed unknown"
  | "Other";

export type DogGenderKey = "she" | "he";

// Genres from spec Step 6.
export type GenreKey =
  | "Acoustic"
  | "Country"
  | "Folk"
  | "Lullaby"
  | "Cinematic"
  | "Instrumental only";

export type VoiceKey = "Female Voice" | "Male Voice";

export interface QuizState {
  // Step 1 — basics
  dog_name: string;
  pronunciation: string;
  dog_gender?: DogGenderKey;
  dog_breed?: DogBreedKey;
  dog_breed_other: string;

  // Step 2 — photo
  dog_photo_url: string;

  // Step 3 — personality
  dog_personality: string;

  // Step 4 — memory
  dog_memory: string;

  // Step 5 — letter to her
  letter_to_dog: string;

  // Step 6 — sound
  genre?: GenreKey;
  voice?: VoiceKey;
  song_title_idea: string;

  // Step 7 — contact
  buyer_name: string;
  buyer_email: string;

  // Gift / scheduling (kept for back-compat with existing checkout/email code)
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
  dog_name: "",
  pronunciation: "",
  dog_breed_other: "",
  dog_photo_url: "",
  dog_personality: "",
  dog_memory: "",
  letter_to_dog: "",
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
    { name: QUIZ_KEY, storage: createJSONStorage(() => ttlStorage) },
  ),
);

// Convenience: resolve the displayable breed string (handles "Other").
export function resolveBreed(q: Pick<QuizState, "dog_breed" | "dog_breed_other">): string | null {
  if (q.dog_breed === "Other" && q.dog_breed_other.trim()) {
    return q.dog_breed_other.trim();
  }
  return q.dog_breed ?? null;
}

// Pronoun helpers driven by selected gender. Defaults to "she" per spec
// (Daisy is the canonical example dog).
export function pronouns(gender?: DogGenderKey) {
  if (gender === "he") {
    return { sub: "he", obj: "him", poss: "his", possPron: "his" } as const;
  }
  return { sub: "she", obj: "her", poss: "her", possPron: "hers" } as const;
}
