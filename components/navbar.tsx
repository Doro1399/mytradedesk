import Link from "next/link";
import { LANDING_SECTION_BLEED } from "@/components/landing/landing-layout";
import { LANDING_MICRO } from "@/components/landing/tokens";

const linkGhost =
  "rounded-lg px-2 py-1 text-sm text-white/60 transition hover:bg-white/[0.05] hover:text-white/90";

const linkGhostLanding =
  "text-[13px] font-normal tracking-wide text-slate-200/90 transition hover:text-white sm:text-sm";

const explorePropFirmsLanding =
  "rounded-lg border border-sky-400/40 bg-sky-500/[0.12] px-3 py-1.5 text-[13px] font-medium tracking-wide text-sky-50 shadow-[0_0_20px_rgba(34,211,238,0.12)] transition hover:border-sky-300/55 hover:bg-sky-500/[0.18] hover:text-white sm:px-3.5 sm:text-sm";

type NavbarProps = {
  /** Landing hero: logo + Explore prop firms left; Sign in + Open workspace right. */
  variant?: "default" | "landing";
};

export default function Navbar({ variant = "default" }: NavbarProps) {
  const isLanding = variant === "landing";

  return (
    <header
      className={
        isLanding
          ? "sticky top-0 z-50 w-full border-b border-white/[0.06] bg-[#070a10]/78 shadow-[0_4px_24px_rgba(0,0,0,0.22)] backdrop-blur-xl supports-[backdrop-filter]:bg-[#070a10]/65"
          : "sticky top-0 z-50 w-full border-b border-white/[0.09] bg-[#070b14]/80 shadow-[0_8px_32px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-2xl supports-[backdrop-filter]:bg-[#070b14]/72"
      }
    >
      <div
        className={`flex items-center justify-between ${isLanding ? "py-3" : "py-4"} ${
          isLanding
            ? "mx-auto w-full max-w-[min(92rem,calc(100vw-1rem))] px-2 min-[480px]:px-3 sm:px-4 md:px-5 lg:px-6 xl:px-8 2xl:px-10"
            : LANDING_SECTION_BLEED
        }`}
      >
        {isLanding ? (
          <>
            <div className="flex min-w-0 flex-wrap items-center gap-x-5 gap-y-2 sm:gap-x-9 lg:gap-x-14">
              <Link
                href="/"
                className="shrink-0 text-lg font-semibold tracking-[-0.03em] text-white sm:text-xl"
              >
                MyTradeDesk
              </Link>
              <Link href="/compare" className={`${explorePropFirmsLanding} ${LANDING_MICRO} shrink-0`}>
                Explore prop firms
              </Link>
            </div>
            <nav
              className={`flex shrink-0 flex-wrap items-center justify-end gap-x-6 gap-y-2 sm:gap-x-9 lg:gap-x-12 ${LANDING_MICRO}`}
              aria-label="Primary"
            >
              <Link href="/journal" className={`${linkGhostLanding} whitespace-nowrap`}>
                Sign in
              </Link>
              <Link
                href="/journal"
                className="rounded-lg border border-white/18 bg-white/[0.11] px-3.5 py-2 text-[13px] font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.14)] transition hover:border-white/26 hover:bg-white/[0.15] active:translate-y-px sm:px-4 sm:text-sm"
              >
                Open workspace
              </Link>
            </nav>
          </>
        ) : (
          <>
            <Link href="/" className="text-2xl font-semibold tracking-[-0.03em] text-white">
              MyTradeDesk
            </Link>
            <nav className="hidden items-center gap-8 md:flex">
              <Link href="/compare" className={linkGhost}>
                Compare
              </Link>
              <Link href="/journal" className={linkGhost}>
                Workspace
              </Link>
              <a href="#" className={linkGhost}>
                Discord
              </a>
              <Link href="/#control-center" className={linkGhost}>
                Control center
              </Link>
              <a href="#" className={linkGhost}>
                Blog
              </a>
            </nav>

            <div className="flex items-center gap-3">
              <button type="button" className={linkGhost}>
                Login
              </button>
              <Link
                href="/journal"
                className="rounded-xl border border-white/15 bg-gradient-to-b from-white to-white/90 px-5 py-2.5 text-sm font-semibold text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_4px_20px_rgba(0,0,0,0.25)] transition active:translate-y-px hover:border-sky-400/40 hover:from-sky-50 hover:to-white"
              >
                Open workspace
              </Link>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
