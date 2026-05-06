const BREED_ICONS: Record<string, string> = {
  "Labrador Retriever": "🦮",
  "Golden Retriever": "🐕",
  "German Shepherd": "🐕‍🦺",
  "French Bulldog": "🐶",
  "Bulldog": "🐶",
  "Poodle": "🐩",
  "Goldendoodle / Labradoodle": "🐩",
  "Beagle": "🐕",
  "Rottweiler": "🐕",
  "Yorkshire Terrier": "🐶",
  "Dachshund": "🌭",
  "Boxer": "🥊",
  "Australian Shepherd": "🐕",
  "Border Collie": "🐕",
  "Pomeranian": "🦊",
  "Cavalier King Charles Spaniel": "🐶",
  "Chihuahua": "🐶",
  "Pit Bull / Staffordshire Terrier": "🐕",
  "Husky": "🐺",
  "Shih Tzu": "🐶",
  "Bernese Mountain Dog": "🐕‍🦺",
  "Cocker Spaniel": "🐕",
  "Mixed breed (proudly)": "💖",
  "Rescue, breed unknown": "🏡",
  "Other": "🐾",
};

interface BreedSelectProps<T extends string> {
  options: readonly T[];
  value: T | undefined;
  onChange: (value: T) => void;
}

export function BreedSelect<T extends string>({
  options,
  value,
  onChange,
}: BreedSelectProps<T>) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
      {options.map((opt) => {
        const active = value === opt;
        const icon = BREED_ICONS[opt] ?? "🐾";
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={`group relative flex flex-col items-center overflow-hidden rounded-2xl border bg-card p-3 text-center transition-all ${
              active
                ? "border-primary shadow-soft ring-2 ring-primary/40"
                : "border-border hover:-translate-y-0.5 hover:border-primary/50 hover:bg-peach/30"
            }`}
          >
            <div className="flex aspect-square w-full items-center justify-center rounded-xl bg-peach/20">
              <span
                className="text-5xl transition-transform duration-300 group-hover:scale-110 sm:text-6xl"
                role="img"
                aria-label={opt}
              >
                {icon}
              </span>
            </div>
            <span
              className={`mt-2.5 block text-[13px] font-medium leading-tight ${
                active ? "text-primary" : "text-foreground"
              }`}
            >
              {opt}
            </span>
          </button>
        );
      })}
    </div>
  );
}
