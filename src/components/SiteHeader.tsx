import { Link } from "@tanstack/react-router";
import { Logo } from "./Logo";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Logo />
        <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
          <a href="/#for-who" className="transition-colors hover:text-foreground">
            Who it's for
          </a>
          <a href="/#how-it-works" className="transition-colors hover:text-foreground">
            How it works
          </a>
          <a href="/#samples" className="transition-colors hover:text-foreground">
            Listen
          </a>
          <a href="/#stories" className="transition-colors hover:text-foreground">
            Stories
          </a>
        </nav>
        <Link
          to="/create"
          className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-soft transition-all hover:bg-primary-hover hover:shadow-glow"
        >
          Create their song
        </Link>
      </div>
    </header>
  );
}
