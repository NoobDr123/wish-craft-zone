import { Link } from "@tanstack/react-router";
import { Logo } from "./Logo";
import { useAuth } from "@/hooks/useAuth";

export function SiteHeader() {
  const { user, loading } = useAuth();

  return (
    <>
      {/* Warm sienna/bronze gradient strip. replaces legacy multi-color cancer ribbon */}
      <div
        className="h-[3px] w-full"
        style={{
          background:
            "linear-gradient(to right, #7A4A2E 0%, #B5532A 35%, #D9764A 55%, #B5532A 75%, #7A4A2E 100%)",
        }}
      />

      {/* Promo bar. dog-loss positioning */}
      <div className="bg-[#1F1A17] px-4 py-[10px] text-center text-[12px] font-medium tracking-[0.01em] text-[#F8F1E4] sm:px-5 sm:py-[11px] sm:text-[13px]">
        <span className="mr-1.5 text-[#F5E6D8]">🐾</span>
        <span className="hidden sm:inline">
          For the dog you'll never stop missing. Delivered with care in five days.
        </span>
        <span className="sm:hidden">For the dog you miss. Delivered in 5 days.</span>
        <Link
          to="/create"
          className="ml-2 border-b border-current text-[#E8B58A]"
        >
          Start Their Custom Song 🐾
        </Link>
      </div>

      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-[#E8DDC9] bg-[rgba(246,240,230,0.92)] py-3 backdrop-blur-md sm:py-[18px]">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-3 px-4 sm:px-6">
          <Logo />
          <nav className="hidden items-center gap-8 text-[14.5px] font-medium text-[#5A5148] md:flex">
            <Link to="/" hash="listen" className="transition-colors hover:text-[#B5532A]">Listen</Link>
            <Link to="/" hash="who" className="transition-colors hover:text-[#B5532A]">Who it's for</Link>
            <Link to="/" hash="how" className="transition-colors hover:text-[#B5532A]">How it works</Link>
            <Link to="/" hash="stories" className="transition-colors hover:text-[#B5532A]">Stories</Link>
            <Link to="/" hash="faq" className="transition-colors hover:text-[#B5532A]">FAQ</Link>
          </nav>
          <div className="flex items-center gap-5 text-[14.5px]">
            {!loading &&
              (user ? (
                <Link to="/account" className="text-[#5A5148] transition-colors hover:text-[#B5532A]">
                  My account
                </Link>
              ) : (
                <Link to="/login" search={{ redirect: undefined }} className="text-[#5A5148] transition-colors hover:text-[#B5532A]">
                  Sign in
                </Link>
              ))}
          </div>
        </div>
      </header>
    </>
  );
}
