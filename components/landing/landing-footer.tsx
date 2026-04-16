"use client";

import Link from "next/link";
import { LANDING_SECTION_BLEED } from "./landing-layout";
import { LANDING_MICRO } from "./tokens";

/** Premium low-emphasis nav — discrete default, clean hover (no underline noise). */
const footerNavLink = `${LANDING_MICRO} text-[13px] text-white/28 transition-colors duration-200 ease-out hover:text-white/65`;

export function LandingFooter({ variant = "default" }: { variant?: "default" | "workspace" }) {
  const workspace = variant === "workspace";
  return (
    <footer className="border-t border-white/[0.06] bg-[#05060a]">
      <div
        className={
          workspace
            ? `flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between ${LANDING_SECTION_BLEED}`
            : `flex flex-col gap-8 py-14 sm:flex-row sm:items-start sm:justify-between ${LANDING_SECTION_BLEED}`
        }
      >
        <div>
          <p className="text-base font-semibold tracking-tight text-white">MyTradeDesk</p>
          <p
            className={
              workspace
                ? "mt-0.5 max-w-sm text-xs leading-snug text-slate-400/80"
                : "mt-2 max-w-sm text-sm leading-relaxed text-slate-400/80"
            }
          >
            Know your numbers. Run your desk.
          </p>
        </div>
        <nav
          className="flex flex-wrap items-center gap-x-6 gap-y-1.5 sm:justify-end"
          aria-label="Footer"
        >
          <Link href="/compare" className={footerNavLink}>
            Compare
          </Link>
          <Link href="/terms" className={footerNavLink}>
            Terms
          </Link>
          <Link href="/privacy" className={footerNavLink}>
            Privacy
          </Link>
        </nav>
      </div>
      <div
        className={
          workspace
            ? "border-t border-white/[0.05] py-2 text-center text-[11px] text-white/22"
            : "border-t border-white/[0.05] py-6 text-center text-xs text-white/22"
        }
      >
        © {new Date().getFullYear()} MyTradeDesk
      </div>
    </footer>
  );
}
