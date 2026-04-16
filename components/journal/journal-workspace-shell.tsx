"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { LandingFooter } from "@/components/landing/landing-footer";
import { WorkspaceFeedbackModal } from "@/components/journal/workspace-feedback-modal";
import {
  WORKSPACE_XL_ASIDE_WIDTH_CLASS,
  WORKSPACE_XL_MAIN_COLUMN_PADDING_CLASS,
} from "@/components/journal/workspace-xl-sidebar";

export type JournalNavActive =
  | "dashboard"
  | "accounts"
  | "calendar"
  | "progress"
  | "analytics"
  | "trades"
  | "settings";

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

function routeActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function JournalWorkspaceShell({
  active,
  children,
  basePath = "/journal",
  entryOverride,
}: {
  active: JournalNavActive;
  children: ReactNode;
  /** Workspace section prefix (default `/journal`). */
  basePath?: string;
  /**
   * When set, the Dashboard nav item uses this href and is active when `pathname` matches it
   * (e.g. `/demo` preview with other items still under `basePath`).
   */
  entryOverride?: string | null;
}) {
  const pathname = usePathname();
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const base = (basePath.replace(/\/$/, "") || "/journal") as string;
  const entryNorm = entryOverride?.replace(/\/$/, "") ?? null;
  const dashboardHref = (entryNorm ?? base) as string;
  const p = {
    dashboard: dashboardHref,
    accounts: `${base}/accounts`,
    progress: `${base}/progress`,
    trades: `${base}/trades`,
    calendar: `${base}/calendar`,
  };
  const dashboardNavActive = entryNorm
    ? pathname === entryNorm || pathname.startsWith(`${entryNorm}/`)
    : active === "dashboard";

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

  return (
    <div className="journal-app flex h-full min-h-0 flex-1 flex-col overflow-x-hidden bg-black text-white">
      <nav
        className="flex shrink-0 flex-wrap gap-1 border-b border-white/10 bg-[#0a0f18] px-3 py-2.5 xl:hidden"
        aria-label="Workspace navigation"
      >
        {NAV_MAIN.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
              item.navActive
                ? "bg-white/10 text-white"
                : "text-white/55 hover:bg-white/[0.06] hover:text-white"
            }`}
          >
            {item.label}
          </Link>
        ))}
        <button
          type="button"
          onClick={() => setFeedbackOpen(true)}
          className="rounded-lg px-3 py-1.5 text-xs font-medium text-white/55 transition hover:bg-white/[0.06] hover:text-white"
        >
          Feedback
        </button>
      </nav>
      <div className="relative flex h-full min-h-0 w-full flex-1 flex-col">
        <aside
          className={`fixed left-0 top-0 z-[35] hidden h-dvh max-h-dvh flex-col overflow-y-auto border-r border-white/10 bg-[#070b13] xl:flex ${WORKSPACE_XL_ASIDE_WIDTH_CLASS}`}
          aria-label="Workspace"
        >
          <div className="border-b border-white/10 px-6 py-5">
            <Link href="/" className="inline-flex items-center gap-3">
              <span className="rounded-xl bg-blue-500/20 px-2 py-1 text-xs font-semibold text-blue-200">
                MTD
              </span>
              <span className="text-sm font-semibold tracking-wide">MyTradeDesk</span>
            </Link>
          </div>

          <nav className="flex-1 space-y-1 px-3 py-5 text-sm">
            {NAV_MAIN.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className={`block rounded-xl px-3 py-2.5 transition ${
                  item.navActive
                    ? "bg-white/10 text-white"
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
              <button
                type="button"
                onClick={() => setFeedbackOpen(true)}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-white/70 transition hover:bg-white/5 hover:text-white"
              >
                <ChatIcon className="h-4 w-4 shrink-0" />
                <span>Feedback</span>
              </button>
              <Link
                href={base}
                className="flex items-center gap-3 rounded-xl px-3 py-2 text-white/70 transition hover:bg-white/5 hover:text-white"
              >
                <LogoutIcon className="h-4 w-4 shrink-0" />
                <span>Sign out</span>
              </Link>
            </div>
          </div>
        </aside>

        <div
          className={`flex h-full min-h-0 w-full min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-hidden ${WORKSPACE_XL_MAIN_COLUMN_PADDING_CLASS}`}
        >
          {/* Block flow (not flex-col): flex+overflow on main can omit the last in-flow block from scrollHeight when nested pages use flex-1. */}
          <main className="relative isolate min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain">
            <div className="pointer-events-none absolute inset-x-0 top-0 min-h-full">
              <div className="absolute left-16 top-10 h-56 w-56 rounded-full bg-blue-700/15 blur-3xl" />
              <div className="absolute right-10 top-40 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl" />
            </div>
            <div className="relative z-[1] flex w-full min-w-0 flex-col min-h-0">
              {children}
            </div>
            <div className="relative z-[2] shrink-0">
              <LandingFooter variant="workspace" />
            </div>
          </main>
        </div>
      </div>
      <WorkspaceFeedbackModal open={feedbackOpen} onClose={() => setFeedbackOpen(false)} pagePath={pathname} />
    </div>
  );
}
