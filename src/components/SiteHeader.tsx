import { Link } from "@tanstack/react-router";
import { Logo } from "./Logo";
import { useAuth } from "@/hooks/useAuth";

export function SiteHeader() {
  const { user, loading } = useAuth();

  return (
    <>
      {/* Multi-color cancer awareness ribbon strip */}
      <div
        className="h-[3px] w-full"
        style={{
          background:
            "linear-gradient(to right, #E8A5B8 0%, #E8A5B8 14%, #B8E0E0 14%, #B8E0E0 28%, #E8D8A0 28%, #E8D8A0 42%, #E8B090 42%, #E8B090 56%, #B0D4A8 56%, #B0D4A8 70%, #C8B0E0 70%, #C8B0E0 84%, #9B2D77 84%, #9B2D77 100%)",
        }}
      />

      {/* Promo bar */}
      <div className="bg-[#1F1B16] px-4 py-[10px] text-center text-[12px] font-medium tracking-[0.01em] text-[#F6F0E6] sm:px-5 sm:py-[11px] sm:text-[13px]">
        <span className="mr-1.5 text-[#E5D9EF]">🎗️</span>
        <span className="hidden sm:inline">
          For every fighter, every survivor, every loved one. Delivered with
          care in five days.
        </span>
        <span className="sm:hidden">Delivered with care in 5 days.</span>
        <Link
          to="/create"
          className="ml-2 border-b border-current text-[#C9A85A]"
        >
          Start My Song ❤️
        </Link>
      </div>

      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-[#D9CEB9] bg-[rgba(246,240,230,0.92)] py-3 backdrop-blur-md sm:py-[18px]">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-3 px-4 sm:px-6">
          <Logo />
          <nav className="hidden items-center gap-8 text-[14.5px] font-medium text-[#5A5148] md:flex">
            <a href="/#listen" className="transition-colors hover:text-[#8D6FAF]">Listen</a>
            <a href="/#who" className="transition-colors hover:text-[#8D6FAF]">Who it's for</a>
            <a href="/#how" className="transition-colors hover:text-[#8D6FAF]">How it works</a>
            <a href="/#stories" className="transition-colors hover:text-[#8D6FAF]">Stories</a>
            <a href="/#faq" className="transition-colors hover:text-[#8D6FAF]">FAQ</a>
          </nav>
          <div className="flex items-center gap-3 text-[14.5px] sm:gap-5">
            {!loading &&
              (user ? (
                <Link to="/account" className="hidden text-[#5A5148] transition-colors hover:text-[#1F1B16] sm:inline">
                  My account
                </Link>
              ) : (
                <Link to="/login" className="hidden text-[#5A5148] transition-colors hover:text-[#1F1B16] sm:inline">
                  Sign in
                </Link>
              ))}
            <Link
              to="/create"
              className="inline-flex shrink-0 items-center gap-2 rounded-full bg-[#8D6FAF] px-4 py-[10px] text-[13px] font-semibold text-[#FFF7EE] shadow-[0_6px_16px_rgba(141,111,175,0.28)] transition-all hover:-translate-y-px hover:bg-[#6B4F8A] hover:shadow-[0_10px_24px_rgba(141,111,175,0.35)] sm:gap-2.5 sm:px-[26px] sm:py-[14px] sm:text-[15px]"
            >
              <span className="hidden sm:inline">Start My Custom Song 🎗️ →</span>
              <span className="sm:hidden">Start Here →</span>
            </Link>
          </div>
        </div>
      </header>
    </>
  );
}
