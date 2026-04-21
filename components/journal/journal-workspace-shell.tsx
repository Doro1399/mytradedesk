"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { WorkspaceSignOutButton } from "@/components/auth/workspace-sign-out-button";
import { PlanBanner } from "@/components/ui/plan-banner";
import { LandingFooter } from "@/components/landing/landing-footer";
import { WorkspaceFeedbackModal } from "@/components/journal/workspace-feedback-modal";
import {
  WORKSPACE_XL_ASIDE_WIDTH_CLASS,
  WORKSPACE_XL_MAIN_COLUMN_PADDING_CLASS,
} from "@/components/journal/workspace-xl-sidebar";
import { IS_DESK_SANDBOX_VISIBLE } from "@/lib/dev/desk-sandbox";

export type JournalNavActive =
  | "dashboard"
  | "accounts"
  | "calendar"
  | "progress"
  | "analytics"
  | "trades"
  | "settings"
  | "sandbox";

type IconProps = { className?: string };

function GridIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <rect x="4" y="4" width="7" height="7" rx="1.5" />
      <rect x="13" y="4" width="7" height="7" rx="1.5" />
      <rect x="4" y="13" width="7" height="7" rx="1.5" />
      <rect x="13" y="13" width="7" height="7" rx="1.5" />
    </svg>
  );
}

function WalletIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <rect x="3" y="6" width="18" height="12" rx="2.5" />
      <path d="M16 11h5v4h-5a2 2 0 0 1 0-4Z" />
    </svg>
  );
}

function TargetIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}

function ChartIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="M4 20V10" />
      <path d="M10 20V6" />
      <path d="M16 20v-8" />
      <path d="M22 20H2" />
    </svg>
  );
}

function CalendarIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <rect x="3" y="5" width="18" height="16" rx="2.5" />
      <path d="M3 10h18" />
      <path d="M8 3v4" />
      <path d="M16 3v4" />
    </svg>
  );
}

function BeakerIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="M9 3h6M10 3v7l-4 9h12l-4-9V3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 19h8" strokeLinecap="round" />
    </svg>
  );
}

function SettingsIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className={className}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1Z"
      />
    </svg>
  );
}

function ChatIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5c-1.6 0-3.2-.5-4.4-1.3L3 20l1.4-4.9A8.5 8.5 0 1 1 21 11.5Z" />
    </svg>
  );
}

function LogoutIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="M10 17H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h4" />
      <path d="M14 16l5-4-5-4" />
      <path d="M9 12h10" />
    </svg>
  );
}

function HamburgerIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={className}>
      <path d="M5 7h14M5 12h14M5 17h14" />
    </svg>
  );
}

function CloseIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={className}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

function routeActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function JournalWorkspaceShell({
  active,
  children,
  basePath = "/desk",
  entryOverride,
}: {
  active: JournalNavActive;
  children: ReactNode;
  /** Desk section prefix (default `/desk`). */
  basePath?: string;
  /**
   * When set, the Dashboard nav item uses this href and is active when `pathname` matches it
   * (e.g. `/demo` preview with other items still under `basePath`).
   */
  entryOverride?: string | null;
}) {
  const pathname = usePathname();
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const mobileNavWrapRef = useRef<HTMLDivElement>(null);
  const base = (basePath.replace(/\/$/, "") || "/desk") as string;
  const entryNorm = entryOverride?.replace(/\/$/, "") ?? null;
  const dashboardHref = (entryNorm ?? `${base}/dashboard`) as string;
  const p = {
    dashboard: dashboardHref,
    accounts: `${base}/accounts`,
    progress: `${base}/progress`,
    trades: `${base}/trades`,
    calendar: `${base}/calendar`,
    settings: `${base}/settings`,
  };
  const settingsNavActive = active === "settings" || routeActive(pathname, p.settings);
  const dashboardNavActive = entryNorm
    ? pathname === entryNorm || pathname.startsWith(`${entryNorm}/`)
    : active === "dashboard" || pathname === p.dashboard || pathname === base;

  const NAV_MAIN: {
    label: string;
    href: string;
    navActive: boolean;
    icon: (props: IconProps) => React.ReactNode;
  }[] = [
    {
      label: "Dashboard",
      href: p.dashboard,
      navActive: dashboardNavActive,
      icon: (props) => <GridIcon {...props} />,
    },
    {
      label: "Accounts",
      href: p.accounts,
      navActive: active === "accounts" || routeActive(pathname, p.accounts),
      icon: (props) => <WalletIcon {...props} />,
    },
    {
      label: "Progress",
      href: p.progress,
      navActive: active === "progress" || routeActive(pathname, p.progress),
      icon: (props) => <TargetIcon {...props} />,
    },
    {
      label: "Trades",
      href: p.trades,
      navActive: active === "trades" || routeActive(pathname, p.trades),
      icon: (props) => <ChartIcon {...props} />,
    },
    {
      label: "Calendar",
      href: p.calendar,
      navActive: active === "calendar" || routeActive(pathname, p.calendar),
      icon: (props) => <CalendarIcon {...props} />,
    },
  ];

  const sandboxHref = `${base}/sandbox`;
  const navMainWithOptionalSandbox = IS_DESK_SANDBOX_VISIBLE
    ? [
        ...NAV_MAIN,
        {
          label: "Sandbox",
          href: sandboxHref,
          navActive: active === "sandbox" || routeActive(pathname, sandboxHref),
          icon: (props: IconProps) => <BeakerIcon {...props} />,
        },
      ]
    : NAV_MAIN;

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileNavOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileNavOpen]);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      const el = mobileNavWrapRef.current;
      if (el && !el.contains(e.target as Node)) setMobileNavOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
  }, [mobileNavOpen]);

  const closeMobileNav = () => setMobileNavOpen(false);

  return (
    <div className="journal-app flex h-full min-h-0 flex-1 flex-col overflow-x-hidden bg-black text-white">
      <div className="relative z-[60] shrink-0 xl:hidden">
        {mobileNavOpen ? (
          <button
            type="button"
            className="fixed inset-0 z-[55] bg-black/45"
            aria-label="Close menu"
            onClick={closeMobileNav}
          />
        ) : null}
        <div ref={mobileNavWrapRef} className="relative z-[60]">
        <header className="relative z-[60] flex shrink-0 items-center gap-2 border-b border-white/10 bg-[#0a0f18] px-2 py-2">
          <button
            type="button"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white/85 transition hover:bg-white/[0.08] hover:text-white"
            aria-expanded={mobileNavOpen}
            aria-controls="desk-mobile-nav-dropdown"
            onClick={() => setMobileNavOpen((o) => !o)}
          >
            {mobileNavOpen ? <CloseIcon className="h-5 w-5" /> : <HamburgerIcon className="h-5 w-5" />}
            <span className="sr-only">{mobileNavOpen ? "Close menu" : "Open menu"}</span>
          </button>
          <Link
            href={p.dashboard}
            className="inline-flex min-w-0 flex-1 items-center gap-2 py-1"
            onClick={closeMobileNav}
          >
            <Image
              src="/mtd-logo.png"
              alt=""
              width={128}
              height={128}
              className="h-7 w-auto shrink-0 object-contain object-left"
            />
            <span className="truncate text-sm font-semibold tracking-wide text-white/90">MyTradeDesk</span>
          </Link>
        </header>
        {mobileNavOpen ? (
          <div
            id="desk-mobile-nav-dropdown"
            role="menu"
            aria-label="Desk navigation"
            className="absolute left-0 right-0 top-full z-[60] max-h-[min(72vh,calc(100dvh-3.5rem))] overflow-y-auto overscroll-y-contain border-b border-white/10 bg-[#070b13] px-3 py-3 shadow-[0_14px_36px_rgba(0,0,0,0.55)]"
          >
            <nav className="space-y-1 text-sm" role="none">
              {navMainWithOptionalSandbox.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  role="menuitem"
                  onClick={closeMobileNav}
                  className={`flex items-center gap-3 rounded-xl px-3 py-3 transition ${
                    item.navActive
                      ? "bg-white/10 text-white"
                      : item.label === "Sandbox"
                        ? "border border-dashed border-amber-500/30 text-amber-200/80 hover:bg-amber-500/10 hover:text-amber-100"
                        : "text-white/70 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <span className="inline-flex shrink-0">{item.icon({ className: "h-5 w-5" })}</span>
                  <span>{item.label}</span>
                </Link>
              ))}
            </nav>
            <div className="mt-2 space-y-1 border-t border-white/10 pt-2 text-sm">
              <Link
                href={p.settings}
                role="menuitem"
                onClick={closeMobileNav}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 transition ${
                  settingsNavActive
                    ? "bg-white/10 text-white"
                    : "text-white/70 hover:bg-white/5 hover:text-white"
                }`}
              >
                <SettingsIcon className="h-5 w-5 shrink-0" />
                <span>Settings</span>
              </Link>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  closeMobileNav();
                  setFeedbackOpen(true);
                }}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-white/70 transition hover:bg-white/5 hover:text-white"
              >
                <ChatIcon className="h-5 w-5 shrink-0" />
                <span>Feedback</span>
              </button>
              <WorkspaceSignOutButton className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-white/70 transition hover:bg-white/5 hover:text-white">
                <LogoutIcon className="h-5 w-5 shrink-0" />
                <span>Sign out</span>
              </WorkspaceSignOutButton>
            </div>
          </div>
        ) : null}
        </div>
      </div>

      <div className="relative flex h-full min-h-0 w-full flex-1 flex-col">
        <aside
          className={`fixed left-0 top-0 z-[35] hidden h-dvh max-h-dvh flex-col overflow-y-auto border-r border-white/10 bg-[#070b13] xl:flex ${WORKSPACE_XL_ASIDE_WIDTH_CLASS}`}
          aria-label="MyTradeDesk"
        >
          <div className="border-b border-white/10 px-6 py-5">
            <Link href="/" className="inline-flex min-w-0 items-center gap-2.5">
              <Image
                src="/mtd-logo.png"
                alt=""
                width={160}
                height={160}
                className="h-8 w-auto shrink-0 object-contain object-left"
                priority
              />
              <span className="min-w-0 text-sm font-semibold tracking-wide">MyTradeDesk</span>
            </Link>
          </div>

          <nav className="flex-1 space-y-1 px-3 py-5 text-sm">
            {navMainWithOptionalSandbox.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className={`block rounded-xl px-3 py-2.5 transition ${
                  item.navActive
                    ? "bg-white/10 text-white"
                    : item.label === "Sandbox"
                      ? "border border-dashed border-amber-500/25 text-amber-200/75 hover:bg-amber-500/10 hover:text-amber-100"
                      : "text-white/60 hover:bg-white/5 hover:text-white"
                }`}
              >
                <span className="inline-flex items-center gap-3">
                  <span className="inline-flex">{item.icon({ className: "h-4 w-4" })}</span>
                  <span>{item.label}</span>
                </span>
              </Link>
            ))}
          </nav>

          <div className="border-t border-white/10 p-4">
            <div className="space-y-1 text-sm">
              <Link
                href={p.settings}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition ${
                  settingsNavActive
                    ? "bg-white/10 text-white"
                    : "text-white/70 hover:bg-white/5 hover:text-white"
                }`}
              >
                <SettingsIcon className="h-4 w-4 shrink-0" />
                <span>Settings</span>
              </Link>
              <button
                type="button"
                onClick={() => setFeedbackOpen(true)}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-white/70 transition hover:bg-white/5 hover:text-white"
              >
                <ChatIcon className="h-4 w-4 shrink-0" />
                <span>Feedback</span>
              </button>
              <WorkspaceSignOutButton className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-white/70 transition hover:bg-white/5 hover:text-white">
                <LogoutIcon className="h-4 w-4 shrink-0" />
                <span>Sign out</span>
              </WorkspaceSignOutButton>
            </div>
          </div>
        </aside>

        <div
          className={`flex h-full min-h-0 w-full min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-hidden ${WORKSPACE_XL_MAIN_COLUMN_PADDING_CLASS}`}
        >
          <PlanBanner />
          <main className="relative isolate flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              <div className="absolute left-16 top-10 h-56 w-56 rounded-full bg-blue-700/15 blur-3xl" />
              <div className="absolute right-10 top-40 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl" />
            </div>
            <div className="relative z-[1] flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
              <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain">
                {/* min-h-full + flex-1 body pins the footer to the bottom of the viewport on short pages (Accounts, Progress) */}
                <div className="flex min-h-full min-w-0 flex-col">
                  <div className="flex min-h-0 flex-1 flex-col">{children}</div>
                  <div className="relative z-[2] shrink-0">
                    <LandingFooter variant="workspace" />
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
      <WorkspaceFeedbackModal open={feedbackOpen} onClose={() => setFeedbackOpen(false)} pagePath={pathname} />
    </div>
  );
}
