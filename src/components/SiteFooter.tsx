import { Link } from "@tanstack/react-router";
import { RibbonMark } from "./Logo";

export function SiteFooter() {
  return (
    <footer className="border-t border-[rgba(246,240,230,0.1)] bg-[#1F1B16] px-0 py-10 pb-8 text-[13px] text-[rgba(246,240,230,0.6)] md:py-[48px] md:pb-9">
      <div className="mx-auto flex max-w-[1200px] flex-col items-center gap-5 px-5 text-center sm:px-6 md:flex-row md:flex-wrap md:justify-between md:text-left">

        <Link
          to="/"
          className="inline-flex items-center gap-2 font-display text-[18px] font-semibold tracking-[-0.02em] text-[#F6F0E6]"
        >
          <RibbonMark className="h-6 w-6" />
          RibbonSong
        </Link>
        <ul className="flex flex-wrap gap-7">
          <li>
            <a href="/#stories" className="hover:text-[#E5D9EF]">
              Reviews
            </a>
          </li>
          <li>
            <a href="/#press" className="hover:text-[#E5D9EF]">
              Press
            </a>
          </li>
          <li>
            <Link to="/login" className="hover:text-[#E5D9EF]">
              Track Order
            </Link>
          </li>
          <li>
            <a href="/terms" className="hover:text-[#E5D9EF]">
              Terms
            </a>
          </li>
          <li>
            <a href="/privacy" className="hover:text-[#E5D9EF]">
              Privacy
            </a>
          </li>
          <li>
            <a href="mailto:hello@ribbonsong.com" className="hover:text-[#E5D9EF]">
              Contact
            </a>
          </li>
        </ul>
        <div>© {new Date().getFullYear()} RibbonSong</div>
      </div>
    </footer>
  );
}
