import { Link } from "@tanstack/react-router";
import { RibbonMark } from "./Logo";

export function SiteFooter() {
  return (
    <footer className="border-t border-[rgba(246,240,230,0.1)] bg-[#1F1A17] text-[rgba(246,240,230,0.65)]">
      <div className="mx-auto max-w-[1200px] px-5 py-12 sm:px-6 md:py-14">
        {/* Top: brand + columns */}
        <div className="grid grid-cols-1 gap-10 md:grid-cols-12 md:gap-8">
          {/* Brand */}
          <div className="md:col-span-5">
            <Link
              to="/"
              className="inline-flex items-center gap-2 font-display text-[20px] font-semibold tracking-[-0.02em] text-[#F8F1E4]"
            >
              <RibbonMark className="h-7 w-7" />
              PawPrint Song
            </Link>
            <p className="mt-3 max-w-[360px] text-[13.5px] leading-[1.6] text-[rgba(246,240,230,0.55)]">
              Custom songs for the dogs you loved — written from your stories,
              recorded in studio, with their name in every chorus.
            </p>
            <p className="mt-4 text-[12.5px] leading-[1.6] text-[rgba(246,240,230,0.5)]">
              PawPrint Song · Delaware
              <br />
              <a
                href="mailto:hello@getpawprintsong.com"
                className="hover:text-[#F5E6D8]"
              >
                hello@getpawprintsong.com
              </a>
            </p>
          </div>

          {/* Explore */}
          <div className="md:col-span-3">
            <h4 className="mb-3 font-display text-[13px] font-semibold uppercase tracking-[0.12em] text-[#F8F1E4]">
              Explore
            </h4>
            <ul className="space-y-2 text-[13.5px]">
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
                <Link
                  to="/login"
                  search={{ redirect: undefined }}
                  className="hover:text-[#F5E6D8]"
                >
                  Track your order
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-[#F5E6D8]">
                  Contact us
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div className="md:col-span-4">
            <h4 className="mb-3 font-display text-[13px] font-semibold uppercase tracking-[0.12em] text-[#F8F1E4]">
              Legal
            </h4>
            <ul className="space-y-2 text-[13.5px]">
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
                  Refunds &amp; 30-day guarantee
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-[rgba(246,240,230,0.08)] pt-6 text-[12.5px] text-[rgba(246,240,230,0.5)] md:flex-row">
          <div>© {new Date().getFullYear()} PawPrint Song. All rights reserved.</div>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
            <span>Made with care for the dogs we miss.</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
