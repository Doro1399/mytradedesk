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
  /** Compare page below `lg`: hamburger opens filter drawer; `activeCount` shows a dot badge. */
  compareMobileFilters?: {
    open: boolean;
    onToggle: () => void;
    activeCount: number;
  };
};

function WorkspaceNavIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="3" y="3" width="7" height="9" rx="1.2" />
      <rect x="14" y="3" width="7" height="5" rx="1.2" />
      <rect x="14" y="12" width="7" height="9" rx="1.2" />
      <rect x="3" y="16" width="7" height="5" rx="1.2" />
    </svg>
  );
}

function MenuIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

function CloseNavIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

export default function Navbar({
  variant = "default",
  compareMobileFilters,
}: NavbarProps) {
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
        className={`${
          isLanding
            ? "flex flex-col gap-3 py-3 min-[520px]:flex-row min-[520px]:items-center min-[520px]:justify-between min-[520px]:gap-0"
            : "flex items-center justify-between py-4"
        } ${
          isLanding
            ? "mx-auto w-full max-w-[min(92rem,calc(100vw-1rem))] px-3 min-[400px]:px-4 min-[480px]:px-5 sm:px-6 md:px-8 lg:px-10"
            : LANDING_SECTION_BLEED
        }`}
      >
        {isLanding ? (
          <>
            <div className="flex min-w-0 items-center justify-between gap-3 min-[520px]:justify-start min-[520px]:gap-x-9 lg:gap-x-14">
              <Link
                href="/"
                className="shrink-0 text-base font-semibold tracking-[-0.03em] text-white min-[400px]:text-lg sm:text-xl"
              >
                MyTradeDesk
              </Link>
              <Link
                href="/compare"
                className={`${explorePropFirmsLanding} ${LANDING_MICRO} min-w-0 shrink px-2.5 text-center min-[520px]:px-3`}
              >
                <span className="min-[520px]:hidden">Compare</span>
                <span className="hidden min-[520px]:inline">Explore prop firms</span>
              </Link>
            </div>
            <nav
              className={`flex w-full min-w-0 items-center justify-stretch gap-2 min-[520px]:w-auto min-[520px]:shrink-0 min-[520px]:justify-end min-[520px]:gap-x-6 sm:gap-x-9 lg:gap-x-12 ${LANDING_MICRO}`}
              aria-label="Primary"
            >
              <Link
                href="/journal"
                className={`${linkGhostLanding} flex-1 text-center min-[520px]:flex-none min-[520px]:whitespace-nowrap`}
              >
                Sign in
              </Link>
              <Link
                href="/journal"
                className="flex-1 rounded-lg border border-white/18 bg-white/[0.11] px-3 py-2.5 text-center text-[13px] font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.14)] transition hover:border-white/26 hover:bg-white/[0.15] active:translate-y-px min-[520px]:flex-none min-[520px]:px-3.5 min-[520px]:py-2 sm:px-4 sm:text-sm"
              >
                <span className="min-[520px]:hidden">Workspace</span>
                <span className="hidden min-[520px]:inline">Open workspace</span>
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

            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
              {compareMobileFilters ? (
                <button
                  type="button"
                  onClick={compareMobileFilters.onToggle}
                  aria-expanded={compareMobileFilters.open}
                  aria-controls="compare-filters-drawer"
                  className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/12 bg-white/[0.05] text-white/90 shadow-sm shadow-black/20 transition hover:border-sky-500/35 hover:bg-sky-500/10 hover:text-white lg:hidden"
                  aria-label={
                    compareMobileFilters.open
                      ? "Close filters"
                      : "Open filters"
                  }
                >
                  {compareMobileFilters.open ? (
                    <CloseNavIcon />
                  ) : (
                    <MenuIcon />
                  )}
                  {compareMobileFilters.activeCount > 0 &&
                  !compareMobileFilters.open ? (
                    <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-sky-400 shadow-[0_0_0_2px_rgba(7,11,20,0.9)]" />
                  ) : null}
                </button>
              ) : null}
              <button type="button" className={linkGhost}>
                Login
              </button>
              <Link
                href="/journal"
                className="inline-flex min-w-0 items-center justify-center gap-1.5 rounded-lg border border-white/15 bg-gradient-to-b from-white to-white/90 px-2.5 py-2 text-xs font-semibold text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_4px_16px_rgba(0,0,0,0.22)] transition active:translate-y-px hover:border-sky-400/40 hover:from-sky-50 hover:to-white sm:gap-2 sm:rounded-xl sm:px-4 sm:py-2.5 sm:text-sm md:px-5"
              >
                <WorkspaceNavIcon className="shrink-0 opacity-95 md:hidden" />
                <span className="max-md:truncate md:hidden">Workspace</span>
                <span className="hidden md:inline">Open workspace</span>
              </Link>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
