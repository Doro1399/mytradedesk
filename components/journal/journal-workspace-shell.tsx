"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

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

function TrendingIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="m4 15 6-6 4 4 6-6" />
      <path d="M16 7h4v4" />
    </svg>
  );
}

function SettingsIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <circle cx="12" cy="12" r="3.3" />
      <path d="M19.4 15a1 1 0 0 0 .2 1.1l.1.1a1 1 0 0 1 0 1.4l-1 1a1 1 0 0 1-1.4 0l-.1-.1a1 1 0 0 0-1.1-.2 1 1 0 0 0-.6.9V20a1 1 0 0 1-1 1h-1.4a1 1 0 0 1-1-1v-.1a1 1 0 0 0-.6-.9 1 1 0 0 0-1.1.2l-.1.1a1 1 0 0 1-1.4 0l-1-1a1 1 0 0 1 0-1.4l.1-.1a1 1 0 0 0 .2-1.1 1 1 0 0 0-.9-.6H4a1 1 0 0 1-1-1v-1.4a1 1 0 0 1 1-1h.1a1 1 0 0 0 .9-.6 1 1 0 0 0-.2-1.1l-.1-.1a1 1 0 0 1 0-1.4l1-1a1 1 0 0 1 1.4 0l.1.1a1 1 0 0 0 1.1.2 1 1 0 0 0 .6-.9V4a1 1 0 0 1 1-1h1.4a1 1 0 0 1 1 1v.1a1 1 0 0 0 .6.9 1 1 0 0 0 1.1-.2l.1-.1a1 1 0 0 1 1.4 0l1 1a1 1 0 0 1 0 1.4l-.1.1a1 1 0 0 0-.2 1.1 1 1 0 0 0 .9.6H20a1 1 0 0 1 1 1v1.4a1 1 0 0 1-1 1h-.1a1 1 0 0 0-.9.6Z" />
    </svg>
  );
}

function ExportIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="M12 3v11" />
      <path d="m7.5 9.5 4.5 4.5 4.5-4.5" />
      <path d="M4 20h16" />
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

const NAV_MAIN: {
  label: string;
  href: string;
  activeWhen: JournalNavActive | null;
  icon: (p: IconProps) => React.ReactNode;
}[] = [
  { label: "Dashboard", href: "/journal", activeWhen: "dashboard", icon: (p) => <GridIcon {...p} /> },
  { label: "Accounts", href: "/journal/accounts", activeWhen: "accounts", icon: (p) => <WalletIcon {...p} /> },
  { label: "Progress", href: "/journal/progress", activeWhen: "progress", icon: (p) => <TargetIcon {...p} /> },
  { label: "Trades", href: "/journal/trades", activeWhen: "trades", icon: (p) => <ChartIcon {...p} /> },
  { label: "Calendar", href: "/journal/calendar", activeWhen: "calendar", icon: (p) => <CalendarIcon {...p} /> },
  { label: "Analytics", href: "/journal/analytics", activeWhen: "analytics", icon: (p) => <TrendingIcon {...p} /> },
];

export function JournalWorkspaceShell({
  active,
  children,
}: {
  active: JournalNavActive;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const settingsActive = pathname === "/journal/settings";

  return (
    <div className="journal-app flex h-dvh max-h-dvh flex-col overflow-hidden bg-black text-white">
      <nav
        className="flex shrink-0 flex-wrap gap-1 border-b border-white/10 bg-[#0a0f18] px-3 py-2.5 xl:hidden"
        aria-label="Journal navigation"
      >
        <Link
          href="/journal"
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
            active === "dashboard"
              ? "bg-white/10 text-white"
              : "text-white/55 hover:bg-white/[0.06] hover:text-white"
          }`}
        >
          Dashboard
        </Link>
        <Link
          href="/journal/accounts"
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
            active === "accounts"
              ? "bg-white/10 text-white"
              : "text-white/55 hover:bg-white/[0.06] hover:text-white"
          }`}
        >
          Accounts
        </Link>
        <Link
          href="/journal/trades"
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
            active === "trades"
              ? "bg-white/10 text-white"
              : "text-white/55 hover:bg-white/[0.06] hover:text-white"
          }`}
        >
          Trades
        </Link>
        <Link
          href="/journal/calendar"
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
            active === "calendar"
              ? "bg-white/10 text-white"
              : "text-white/55 hover:bg-white/[0.06] hover:text-white"
          }`}
        >
          Calendar
        </Link>
        <Link
          href="/journal/settings"
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
            settingsActive ? "bg-white/10 text-white" : "text-white/55 hover:bg-white/[0.06] hover:text-white"
          }`}
        >
          Settings
        </Link>
      </nav>
      <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden xl:flex-row">
        <aside className="hidden min-h-0 w-[clamp(230px,18vw,290px)] shrink-0 border-r border-white/10 bg-[#070b13] xl:flex xl:flex-col xl:overflow-y-auto">
          <div className="border-b border-white/10 px-6 py-5">
            <Link href="/" className="inline-flex items-center gap-3">
              <span className="rounded-xl bg-blue-500/20 px-2 py-1 text-xs font-semibold text-blue-200">
                MTD
              </span>
              <span className="text-sm font-semibold tracking-wide">MyTradeDesk</span>
            </Link>
          </div>

          <nav className="flex-1 space-y-1 px-3 py-5 text-sm">
            {NAV_MAIN.map((item) => {
              const isActive = item.activeWhen === active;
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`block rounded-xl px-3 py-2.5 transition ${
                    isActive
                      ? "bg-white/10 text-white"
                      : "text-white/60 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <span className="inline-flex items-center gap-3">
                    <span className="inline-flex">{item.icon({ className: "h-4 w-4" })}</span>
                    <span>{item.label}</span>
                  </span>
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-white/10 p-4">
            <div className="space-y-1 text-sm">
              {[
                { label: "Settings", href: "/journal/settings", icon: SettingsIcon, active: settingsActive },
                { label: "Export", href: "/journal", icon: ExportIcon, active: false },
                { label: "Feedback", href: "/journal", icon: ChatIcon, active: false },
                { label: "Sign out", href: "/journal", icon: LogoutIcon, active: false },
              ].map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2 transition ${
                    item.active
                      ? "bg-white/10 text-white"
                      : "text-white/70 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </aside>

        <main className="relative flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-y-auto overflow-x-hidden overscroll-contain">
          <div className="pointer-events-none absolute inset-x-0 top-0 min-h-full">
            <div className="absolute left-16 top-10 h-56 w-56 rounded-full bg-blue-700/15 blur-3xl" />
            <div className="absolute right-10 top-40 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl" />
          </div>
          <div className="relative z-[1] flex min-h-full w-full flex-1 flex-col">{children}</div>
        </main>
      </div>
    </div>
  );
}
