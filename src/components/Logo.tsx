import { Link } from "@tanstack/react-router";
import logoMark from "@/assets/pawprintsong-logo.png";

interface LogoProps {
  className?: string;
}

export function Logo({ className = "" }: LogoProps) {
  return (
    <Link
      to="/"
      className={`group inline-flex items-center gap-2 ${className}`}
      aria-label="PawPrint Song home"
    >
      <RibbonMark className="h-12 w-12 transition-transform group-hover:rotate-[-6deg] sm:h-14 sm:w-14" />
      <span className="font-display text-2xl font-semibold tracking-tight text-foreground sm:text-[28px]">
        PawPrint<span className="text-primary"> Song</span>
      </span>
    </Link>
  );
}

export function RibbonMark({ className = "" }: { className?: string }) {
  return (
    <img
      src={logoMark}
      alt=""
      width={64}
      height={64}
      loading="lazy"
      className={`object-contain ${className}`}
      aria-hidden
    />
  );
}
