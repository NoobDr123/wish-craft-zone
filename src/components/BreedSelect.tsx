import breedSprite from "@/assets/breeds-sprite.png";

// 5x5 grid order matches the generated sprite
const BREED_GRID: Record<string, [number, number]> = {
  "Labrador Retriever": [0, 0],
  "Golden Retriever": [1, 0],
  "German Shepherd": [2, 0],
  "French Bulldog": [3, 0],
  "Bulldog": [4, 0],
  "Poodle": [0, 1],
  "Goldendoodle / Labradoodle": [1, 1],
  "Beagle": [2, 1],
  "Rottweiler": [3, 1],
  "Yorkshire Terrier": [4, 1],
  "Dachshund": [0, 2],
  "Boxer": [1, 2],
  "Australian Shepherd": [2, 2],
  "Border Collie": [3, 2],
  "Pomeranian": [4, 2],
  "Cavalier King Charles Spaniel": [0, 3],
  "Chihuahua": [1, 3],
  "Pit Bull / Staffordshire Terrier": [2, 3],
  "Husky": [3, 3],
  "Shih Tzu": [4, 3],
  "Bernese Mountain Dog": [0, 4],
  "Cocker Spaniel": [1, 4],
  "Mixed breed (proudly)": [2, 4],
  "Rescue, breed unknown": [3, 4],
  "Other": [4, 4],
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
    <div className="flex flex-col gap-2">
      {options.map((opt) => {
        const active = value === opt;
        const [col, row] = BREED_GRID[opt] ?? BREED_GRID["Other"];
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={`group flex w-full items-center gap-3 rounded-xl border bg-card px-3 py-2 text-left transition-all ${
              active
                ? "border-primary shadow-soft ring-2 ring-primary/40"
                : "border-border hover:border-primary/50 hover:bg-peach/30"
            }`}
          >
            <div
              role="img"
              aria-label={opt}
              className="h-9 w-9 shrink-0 rounded-md bg-peach/20"
              style={{
                backgroundImage: `url(${breedSprite})`,
                backgroundSize: "500% 500%",
                backgroundPosition: `${col * 25}% ${row * 25}%`,
                backgroundRepeat: "no-repeat",
              }}
            />
            <span
              className={`text-[14px] font-medium leading-tight ${
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
