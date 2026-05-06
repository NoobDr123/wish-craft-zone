import labrador from "@/assets/breeds/labrador-retriever.png";
import golden from "@/assets/breeds/golden-retriever.png";
import germanShepherd from "@/assets/breeds/german-shepherd.png";
import frenchBulldog from "@/assets/breeds/french-bulldog.png";
import bulldog from "@/assets/breeds/bulldog.png";
import poodle from "@/assets/breeds/poodle.png";
import goldendoodle from "@/assets/breeds/goldendoodle.png";
import beagle from "@/assets/breeds/beagle.png";
import rottweiler from "@/assets/breeds/rottweiler.png";
import yorkie from "@/assets/breeds/yorkshire-terrier.png";
import dachshund from "@/assets/breeds/dachshund.png";
import boxer from "@/assets/breeds/boxer.png";
import aussie from "@/assets/breeds/australian-shepherd.png";
import borderCollie from "@/assets/breeds/border-collie.png";
import pomeranian from "@/assets/breeds/pomeranian.png";
import cavalier from "@/assets/breeds/cavalier-king-charles.png";
import chihuahua from "@/assets/breeds/chihuahua.png";
import pitBull from "@/assets/breeds/pit-bull.png";
import husky from "@/assets/breeds/husky.png";
import shihTzu from "@/assets/breeds/shih-tzu.png";
import bernese from "@/assets/breeds/bernese-mountain-dog.png";
import cocker from "@/assets/breeds/cocker-spaniel.png";
import mixed from "@/assets/breeds/mixed-breed.png";
import rescue from "@/assets/breeds/rescue-unknown.png";
import other from "@/assets/breeds/other.png";

const BREED_IMAGES: Record<string, string> = {
  "Labrador Retriever": labrador,
  "Golden Retriever": golden,
  "German Shepherd": germanShepherd,
  "French Bulldog": frenchBulldog,
  "Bulldog": bulldog,
  "Poodle": poodle,
  "Goldendoodle / Labradoodle": goldendoodle,
  "Beagle": beagle,
  "Rottweiler": rottweiler,
  "Yorkshire Terrier": yorkie,
  "Dachshund": dachshund,
  "Boxer": boxer,
  "Australian Shepherd": aussie,
  "Border Collie": borderCollie,
  "Pomeranian": pomeranian,
  "Cavalier King Charles Spaniel": cavalier,
  "Chihuahua": chihuahua,
  "Pit Bull / Staffordshire Terrier": pitBull,
  "Husky": husky,
  "Shih Tzu": shihTzu,
  "Bernese Mountain Dog": bernese,
  "Cocker Spaniel": cocker,
  "Mixed breed (proudly)": mixed,
  "Rescue, breed unknown": rescue,
  "Other": other,
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
        const img = BREED_IMAGES[opt] ?? other;
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
            <div className="aspect-square w-full overflow-hidden rounded-xl bg-peach/20">
              <img
                src={img}
                alt={opt}
                loading="lazy"
                width={256}
                height={256}
                className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-[1.04]"
              />
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
