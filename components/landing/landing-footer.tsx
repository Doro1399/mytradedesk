import Link from "next/link";
import { LANDING_SECTION_BLEED } from "./landing-layout";

export function LandingFooter() {
  return (
    <footer className="border-t border-white/[0.06] bg-black">
      <div
        className={`flex flex-col gap-8 py-14 sm:flex-row sm:items-center sm:justify-between ${LANDING_SECTION_BLEED}`}
      >
        <div>
          <p className="text-base font-semibold tracking-tight text-white">MyTradeDesk</p>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-white/40">
            Workspace for prop firm capital, progress, and program comparison.
          </p>
        </div>
        <nav className="flex flex-wrap gap-x-10 gap-y-3 text-sm text-white/45">
          <Link href="/journal" className="transition hover:text-white/80">
            Workspace
          </Link>
          <Link href="/journal/progress" className="transition hover:text-white/80">
            Progress
          </Link>
          <Link href="/compare" className="transition hover:text-white/80">
            Comparator
          </Link>
          <Link href="/#why" className="transition hover:text-white/80">
            Why
          </Link>
        </nav>
      </div>
      <div className="border-t border-white/[0.05] py-6 text-center text-xs text-white/28">
        © {new Date().getFullYear()} MyTradeDesk
      </div>
    </footer>
  );
}
