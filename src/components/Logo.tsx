import { Link } from "@tanstack/react-router";

interface LogoProps {
  className?: string;
}

export function Logo({ className = "" }: LogoProps) {
  return (
    <Link
      to="/"
      className={`group inline-flex items-center gap-2 ${className}`}
      aria-label="RibbonSong home"
    >
      <RibbonMark className="h-7 w-7 text-primary transition-transform group-hover:rotate-[-6deg]" />
      <span className="font-display text-xl font-semibold tracking-tight text-foreground">
        Ribbon<span className="text-primary">Song</span>
      </span>
    </Link>
  );
}

export function RibbonMark({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <path
        d="M11 4c-1.5 3-1.5 5 0 8l5 8 5-8c1.5-3 1.5-5 0-8"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M11 12l-3.5 5a3 3 0 002.5 4.6L13 21M21 12l3.5 5a3 3 0 01-2.5 4.6L19 21"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="16" cy="25" r="1.6" fill="currentColor" />
    </svg>
  );
}
