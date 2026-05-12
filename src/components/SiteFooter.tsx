import { Link } from "@tanstack/react-router";
import { RibbonMark } from "./Logo";

export function SiteFooter() {
  return (
    <footer className="border-t border-[rgba(246,240,230,0.1)] bg-[#1F1A17] px-0 py-10 pb-8 text-[13px] text-[rgba(246,240,230,0.6)] md:py-[48px] md:pb-9">
      <div className="mx-auto flex max-w-[1200px] flex-col items-center gap-5 px-5 text-center sm:px-6 md:flex-row md:flex-wrap md:justify-between md:text-left">

        <Link
          to="/"
          className="inline-flex items-center gap-2 font-display text-[18px] font-semibold tracking-[-0.02em] text-[#F8F1E4]"
        >
          <RibbonMark className="h-6 w-6" />
          PawPrint Song
        </Link>
        <ul className="flex flex-wrap gap-7">
          <li>
            <Link to="/" hash="stories" className="hover:text-[#F5E6D8]">
              Reviews
            </Link>
          </li>
          <li>
            <Link to="/" hash="press" className="hover:text-[#F5E6D8]">
              Press
            </Link>
          </li>
          <li>
            <Link to="/login" search={{ redirect: undefined }} className="hover:text-[#F5E6D8]">
              Track Order
            </Link>
          </li>
          <li>
            <Link to="/terms" className="hover:text-[#F5E6D8]">
              Terms and Conditions
            </Link>
          </li>
          <li>
            <Link to="/privacy" className="hover:text-[#F5E6D8]">
              Privacy Policy
            </Link>
          </li>
          <li>
            <Link to="/contact" className="hover:text-[#F5E6D8]">
              Contact
            </Link>
          </li>
        </ul>
        <div>© {new Date().getFullYear()} PawPrint Song</div>
      </div>
    </footer>
  );
}
