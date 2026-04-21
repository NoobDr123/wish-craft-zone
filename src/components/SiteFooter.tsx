import { Logo } from "./Logo";

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 bg-background">
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-6 py-12 md:flex-row md:items-center">
        <div className="space-y-3">
          <Logo />
          <p className="max-w-sm text-sm text-muted-foreground">
            Because sometimes words aren&rsquo;t enough. Turn your love into a song
            for the bravest fighter in your life.
          </p>
        </div>
        <div className="flex flex-col gap-2 text-sm text-muted-foreground md:items-end">
          <a href="mailto:hello@ribbonsong.com" className="hover:text-foreground">
            hello@ribbonsong.com
          </a>
          <p className="text-xs">
            &copy; {new Date().getFullYear()} RibbonSong. Made with care.
          </p>
        </div>
      </div>
    </footer>
  );
}
