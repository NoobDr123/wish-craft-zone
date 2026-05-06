// Breed-conditional copy for the PawprintSong quiz, per spec (Step 3 matrix).

import type { DogBreedKey } from "@/stores/quizStore";

export type BreedFamily =
  | "lab"
  | "husky"
  | "guard"
  | "small"
  | "hound"
  | "herding"
  | "bulldog"
  | "big"
  | "mixed";

export function breedFamily(breed?: DogBreedKey | string | null): BreedFamily {
  if (!breed) return "mixed";
  const b = String(breed).toLowerCase();
  if (b.includes("labrador") || b.includes("golden") || b.includes("doodle") || b.includes("retriever")) {
    return "lab";
  }
  if (b.includes("husky") || b.includes("malamute")) return "husky";
  if (
    b.includes("german shepherd") ||
    b.includes("rottweiler") ||
    b.includes("doberman") ||
    b.includes("pit bull") ||
    b.includes("staffordshire")
  ) {
    return "guard";
  }
  if (
    b.includes("chihuahua") ||
    b.includes("pomeranian") ||
    b.includes("yorkshire") ||
    b.includes("yorkie") ||
    b.includes("shih tzu") ||
    b.includes("cavalier")
  ) {
    return "small";
  }
  if (b.includes("beagle") || b.includes("dachshund") || b.includes("cocker")) {
    return "hound";
  }
  if (
    b.includes("australian shepherd") ||
    b.includes("border collie") ||
    b.includes("heeler")
  ) {
    return "herding";
  }
  if (b.includes("bulldog") || b.includes("frenchie") || b.includes("french bull")) {
    return "bulldog";
  }
  if (b.includes("boxer") || b.includes("bernese") || b.includes("mountain")) {
    return "big";
  }
  return "mixed";
}

interface BreedCopy {
  placeholder: string;
  chips: string[];
}

const PERSONALITY_BY_FAMILY: Record<BreedFamily, BreedCopy> = {
  lab: {
    placeholder:
      "Goofy, dramatic, the world's biggest greeter. Loved tennis balls way more than was reasonable. Believed every meal was the last meal. Loved with her whole body.",
    chips: [
      "the way she greeted you",
      "her relationship with food (chaotic)",
      "the dramatic reactions",
      "how she fit against you",
      "her unhinged enthusiasm for tennis balls",
    ],
  },
  husky: {
    placeholder:
      "Loud, dramatic, opinionated. Talked back to everything. Could not be left alone with anything she could destroy. The most beautiful chaos.",
    chips: [
      "the talking, the screaming",
      "her energy levels (illegal)",
      "the look she gave when you said no",
      "how she'd run if she got the chance",
      "her opinions, expressed loudly",
    ],
  },
  guard: {
    placeholder:
      "Loyal, watchful, the softest big dog you'd ever meet. Slept against my back every night. Watched the door without being asked. Loved her family like her job depended on it.",
    chips: [
      "the way she watched over you",
      "her one soft spot (always the family)",
      "how she chose her people",
      "the gentleness no one expected",
      "her quiet loyalty",
    ],
  },
  small: {
    placeholder:
      "All personality, no size. Decided who got near her and who didn't. Barked at everything bigger than her, which was everything. The fiercest love in a tiny package.",
    chips: [
      "the personality vs. the size",
      "who she allowed near",
      "the bark that was bigger than her",
      "where she sat to feel tall",
      "her favorite human (ranked)",
    ],
  },
  hound: {
    placeholder:
      "Driven, vocal, the world's most committed nose. Howled at sirens like she had something to add. Followed scents I couldn't see for hours.",
    chips: [
      "her nose, her obsession",
      "the howl",
      "what she'd follow for hours",
      "her ears (the way they moved)",
      "how stubborn she could be",
    ],
  },
  herding: {
    placeholder:
      "Smart in a way that scared me. Knew the schedule better than I did. Watched everything. Worked even when nobody asked her to.",
    chips: [
      "how smart she actually was",
      "the way she watched you",
      "her energy that needed a job",
      "how she herded everyone",
      "the look she gave when she was thinking",
    ],
  },
  bulldog: {
    placeholder:
      "The snorts, the snores, the daily existential crises about stairs. Lazy when convenient, dramatic always. The face she made for treats was illegal.",
    chips: [
      "the snorts, the snores, the drama",
      "her relationship with stairs",
      "the way she'd flop somewhere mid-walk",
      "the face she made for treats",
      "how lazy she could be when convenient",
    ],
  },
  big: {
    placeholder:
      "Big, soft, convinced she was a lap dog. Leaned her whole weight against me when she wanted love. The sweetest mountain of a dog.",
    chips: [
      "the lean (her whole weight on you)",
      "the boofs and woos",
      "how soft she was for her size",
      "her confusion at small dogs",
      "the way she fit nowhere but tried anyway",
    ],
  },
  mixed: {
    placeholder:
      "The breed mystery she kept alive. The look that was 100% hers. Came from somewhere hard, gave me everything anyway. Nobody else had her.",
    chips: [
      "the breed mystery she kept alive",
      "the look that was 100% hers",
      "which side of her showed up when",
      "how she made everyone love her",
      "the personality nobody could explain",
    ],
  },
};

export function personalityCopy(breed?: DogBreedKey | string | null): BreedCopy {
  return PERSONALITY_BY_FAMILY[breedFamily(breed)];
}

// Step 4 — memory (single shared placeholder + chips per spec)
export const MEMORY_PLACEHOLDER =
  "The first night we brought her home from the shelter. She wouldn't sleep in her bed, only on my chest. I didn't move for six hours. I think she chose me right then.";

export const MEMORY_CHIPS = [
  "the day you met",
  "a walk that became a story",
  "a time she comforted you without being asked",
  "something she did that always made you laugh",
  "the last good day",
];

// Step 5 — letter to her
export function letterPlaceholder(dogName: string): string {
  const name = dogName.trim() || "Daisy";
  return `${name}, I don't know if I told you enough how much you saved me. The year I lost my dad, you slept on my feet every night without me asking. You knew before I did when I needed you. I'm sorry I wasn't there at the very end. I love you, girl. Forever.`;
}

export const LETTER_CHIPS = [
  "thank her for something",
  "something you wish you'd said",
  "a promise you want to make her",
  "something only she would understand",
  "how she changed you",
];

// Genre + voice meta for Step 6 cards.
export interface GenreOption {
  value: "Acoustic" | "Country" | "Folk" | "Lullaby" | "Cinematic" | "Instrumental only";
  title: string;
  subtitle: string;
  default?: boolean;
}

export const GENRE_OPTIONS: GenreOption[] = [
  { value: "Acoustic", title: "Acoustic", subtitle: "Soft guitar, gentle vocals. Most personal.", default: true },
  { value: "Country", title: "Country", subtitle: "Warm, story-driven, classic." },
  { value: "Folk", title: "Folk", subtitle: "Quiet, intimate, reflective." },
  { value: "Lullaby", title: "Lullaby", subtitle: "Piano-led, soothing." },
  { value: "Cinematic", title: "Cinematic", subtitle: "Strings, orchestral, sweeping." },
  { value: "Instrumental only", title: "Instrumental only", subtitle: "No vocals, for tribute videos." },
];
