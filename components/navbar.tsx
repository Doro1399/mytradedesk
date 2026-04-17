import Link from "next/link";
import { LANDING_SECTION_BLEED } from "@/components/landing/landing-layout";
import { LANDING_MICRO } from "@/components/landing/tokens";

const linkGhost =
  "rounded-lg px-2 py-1 text-sm text-white/60 transition hover:bg-white/[0.05] hover:text-white/90";

const linkGhostLanding =
  "text-[13px] font-normal tracking-wide text-slate-200/90 transition hover:text-white sm:text-sm";

const explorePropFirmsLanding =
  "rounded-lg border border-sky-400/40 bg-sky-500/[0.12] px-3 py-1.5 text-[13px] font-medium tracking-wide text-sky-50 shadow-[0_0_20px_rgba(34,211,238,0.12)] transition hover:border-sky-300/55 hover:bg-sky-500/[0.18] hover:text-white sm:px-3.5 sm:text-sm";

/** Glass / blur premium — léger satinage + bord haut pour la lisibilité. */
const NAV_GLASS_LANDING =
  "sticky top-0 z-50 w-full border-b border-white/[0.07] bg-[#070a10]/62 shadow-[inset_0_1px_0_rgba(255,255,255,0.09),0_12px_40px_rgba(0,0,0,0.28)] backdrop-blur-2xl backdrop-saturate-150 supports-[backdrop-filter]:bg-[#070a10]/42";

const NAV_GLASS_DEFAULT =
  "sticky top-0 z-50 w-full border-b border-white/[0.08] bg-[#070b14]/65 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_12px_44px_rgba(0,0,0,0.34)] backdrop-blur-2xl backdrop-saturate-150 supports-[backdrop-filter]:bg-[#070b14]/45";

const NAV_GLASS_COMPARE =
  "relative z-50 w-full border-b border-white/[0.08] bg-[#070b14]/65 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_12px_44px_rgba(0,0,0,0.34)] backdrop-blur-2xl backdrop-saturate-150 supports-[backdrop-filter]:bg-[#070b14]/45";

/**
 * Compare: même gouttière horizontale que les cartes Comparator / Results
 * (`app/compare/page.tsx` → `px-4 md:px-6` sur le conteneur de section).
 */
const COMPARE_NAV_BLEED = "mx-0 w-full max-w-none px-4 md:px-6";

type NavbarProps = {
  /** Landing hero: logo + Explore prop firms left; Sign in + Open workspace right. */
  /** Auth pages: same bar as landing but only logo + Explore prop firms. */
  variant?: "default" | "landing" | "compare" | "auth";
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

export default function Navbar({ variant = "default" }: NavbarProps) {
  const isLanding = variant === "landing";
  const isAuth = variant === "auth";
  const isLandingBar = isLanding || isAuth;
  const isCompare = variant === "compare";

  const landingBrandRow = (
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
  );

  return (
    <header
      className={`${isLandingBar ? "shrink-0" : ""} ${
        isLandingBar
          ? NAV_GLASS_LANDING
          : isCompare
            ? NAV_GLASS_COMPARE
            : NAV_GLASS_DEFAULT
      }`}
    >
      <div
        className={`${
          isLandingBar
            ? "flex flex-col gap-3 py-3 min-[520px]:flex-row min-[520px]:items-center min-[520px]:justify-between min-[520px]:gap-0"
            : "flex items-center justify-between py-4"
        } ${
          isLandingBar
            ? "mx-auto w-full max-w-[min(92rem,calc(100vw-1rem))] px-3 min-[400px]:px-4 min-[480px]:px-5 sm:px-6 md:px-8 lg:px-10"
            : isCompare
              ? COMPARE_NAV_BLEED
              : LANDING_SECTION_BLEED
        }`}
      >
        {isLanding ? (
          <>
            {landingBrandRow}
            <nav
              className={`flex w-full min-w-0 items-center justify-stretch gap-2 min-[520px]:w-auto min-[520px]:shrink-0 min-[520px]:justify-end min-[520px]:gap-x-6 sm:gap-x-9 lg:gap-x-12 ${LANDING_MICRO}`}
              aria-label="Primary"
            >
              <Link
                href="/login?next=/desk/dashboard"
                className={`${linkGhostLanding} flex-1 text-center min-[520px]:flex-none min-[520px]:whitespace-nowrap`}
              >
                Sign in
              </Link>
              <Link
                href="/register?next=/desk/dashboard"
                className="flex-1 rounded-lg border border-white/18 bg-white/[0.11] px-3 py-2.5 text-center text-[13px] font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.14)] transition hover:border-white/26 hover:bg-white/[0.15] active:translate-y-px min-[520px]:flex-none min-[520px]:px-3.5 min-[520px]:py-2 sm:px-4 sm:text-sm"
              >
                <span className="min-[520px]:hidden">Desk</span>
                <span className="hidden min-[520px]:inline">Open my Desk</span>
              </Link>
            </nav>
          </>
        ) : isAuth ? (
          landingBrandRow
        ) : (
          <>
            <Link
              href="/"
              className="shrink-0 text-2xl font-semibold tracking-[-0.03em] text-white"
            >
              MyTradeDesk
            </Link>
            {!isCompare ? (
              <nav className="hidden items-center gap-8 md:flex">
                <Link href="/compare" className={linkGhost}>
                  Compare
                </Link>
                <Link href="/desk/dashboard" className={linkGhost}>
                  TradeDesk
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
            ) : null}

            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
              <Link href="/login?next=/desk/dashboard" className={linkGhost}>
                Login
              </Link>
              <Link
                href="/register?next=/desk/dashboard"
                className="inline-flex min-w-0 items-center justify-center gap-1.5 rounded-lg border border-white/15 bg-gradient-to-b from-white to-white/90 px-2.5 py-2 text-xs font-semibold text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_4px_16px_rgba(0,0,0,0.22)] transition active:translate-y-px hover:border-sky-400/40 hover:from-sky-50 hover:to-white sm:gap-2 sm:rounded-xl sm:px-4 sm:py-2.5 sm:text-sm md:px-5"
              >
                <WorkspaceNavIcon className="shrink-0 opacity-95 md:hidden" />
                <span className="max-md:truncate md:hidden">Desk</span>
                <span className="hidden md:inline">Open my Desk</span>
              </Link>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
