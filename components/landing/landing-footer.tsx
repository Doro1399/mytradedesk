import Link from "next/link";
import { LANDING_SECTION_BLEED } from "./landing-layout";

export function LandingFooter() {
  return (
    <footer className="border-t border-cyan-950/25 bg-[#010204]">
      <div
        className={`flex flex-col gap-8 py-14 sm:flex-row sm:items-center sm:justify-between ${LANDING_SECTION_BLEED}`}
      >
        <div>
          <p className="text-base font-semibold tracking-tight text-white">MyTradeDesk</p>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-slate-300/65">
            Prop firm capital, progress, and program comparison in one workspace.
          </p>
        </div>
        <nav className="flex flex-wrap gap-x-10 gap-y-3 text-sm text-white/50">
          <Link
            href="/journal"
            className="transition-colors duration-200 ease-out hover:text-white/85"
          >
            Workspace
          </Link>
          <Link
            href="/journal/progress"
            className="transition-colors duration-200 ease-out hover:text-white/85"
          >
            Progress
          </Link>
          <Link
            href="/compare"
            className="transition-colors duration-200 ease-out hover:text-white/85"
          >
            Comparator
          </Link>
          <Link
            href="/#control-center"
            className="transition-colors duration-200 ease-out hover:text-white/85"
          >
            Control center
          </Link>
        </nav>
      </div>
      <div className="border-t border-white/[0.05] py-6 text-center text-xs text-white/28">
        © {new Date().getFullYear()} MyTradeDesk
      </div>
    </footer>
  );
}
