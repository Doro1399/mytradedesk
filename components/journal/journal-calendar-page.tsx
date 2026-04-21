"use client";

import { toPng } from "html-to-image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { useJournal } from "@/components/journal/journal-provider";
import { useJournalStorageUserId } from "@/components/journal/journal-storage-context";
import { resolveAccountDisplayName, useAutoAccountLabelById } from "@/components/journal/account-auto-labels";
import type { AccountType, JournalAccount } from "@/lib/journal/types";
import {
  aggregateDailyPayoutsForDateSet,
  aggregateDailyTradesForDateSet,
  buildMonthGrid,
  collectEligibleAccountIds,
  collectFirmOptions,
  collectVisibleDatesFromGrid,
  dayHasCalendarActivity,
  monthlyTotalsFromDaily,
  type CalendarFilters,
  type CalendarMode,
  weeklyRollupsFromGrid,
} from "@/lib/journal/calendar-aggregates";
import {
  calendarLossAmountStyle,
  calendarLossCellStyle,
  calendarProfitAmountStyle,
  calendarProfitCellStyle,
  computeMonthPnlExtents,
  lossIntensityT,
  profitIntensityT,
} from "@/lib/journal/calendar-visual-styles";
import {
  bestTradingDayInMonth,
  buildDailyNetCentsTradesMode,
  buildPayoutsModeActivityDates,
  computeBestPositiveDayStreak,
  computeConsecutiveDaysWithoutPayout,
  computePositiveDayStreakEndingToday,
  countPayoutEventsFiltered,
  countPayoutsInMonthFiltered,
  largestPayoutCentsFiltered,
  thisWeekRollupCents,
  toIsoDateLocal,
  yearlyPayoutTotalsFiltered,
} from "@/lib/journal/calendar-gamification";
import {
  loadTradesStore,
  tradesStorageKeyForUser,
  TRADES_STORE_CHANGED_EVENT,
} from "@/lib/journal/trades-storage";

const SECTION_LABEL = "text-[10px] font-semibold uppercase tracking-[0.2em] text-sky-400/90";

const CARD =
  "rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.07] to-white/[0.02] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-sm";

const SELECT_CLASS =
  "rounded-xl border border-white/12 bg-black/40 px-3 py-2 text-[13px] text-white/85 outline-none transition focus:border-sky-400/40 focus:ring-1 focus:ring-sky-400/25";

const FILTER_MENU_PANEL =
  "absolute left-0 top-[calc(100%+6px)] z-[100] min-w-full max-w-[min(calc(100vw-2rem),22rem)] rounded-xl border border-white/12 bg-[#0c1018] py-1 shadow-[0_18px_50px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.05)]";

/** Day cells — compact $1.2k when large. */
function formatUsdCalendarCents(cents: number): string {
  const n = cents / 100;
  const abs = Math.abs(n);
  if (abs >= 1000) {
    const k = abs / 1000;
    const t = k >= 10 ? k.toFixed(0) : (Math.round(k * 10) / 10).toFixed(1).replace(/\.0$/, "");
    const sign = n < 0 ? "-" : "";
    return `${sign}$${t}k`;
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

/** Narrow cells (mobile): single-line compact currency, avoids wrap/clipping. */
function formatUsdCalendarCentsTight(cents: number): string {
  const n = cents / 100;
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
    signDisplay: "always",
  }).format(n);
}

/** Month / week summaries — full amount (e.g. $1,200), no compact notation. */
function formatUsdCalendarSummaryCents(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

/** Plain-text fallback (native `title`) for calendar day hover. */
function calendarCellAccountBreakdownTitle(
  byAccountCents: Record<string, number> | undefined,
  accountById: Map<string, JournalAccount>,
  autoById: Map<string, string>
): string | undefined {
  if (!byAccountCents || Object.keys(byAccountCents).length === 0) return undefined;
  const parts: string[] = [];
  for (const [id, cents] of Object.entries(byAccountCents)) {
    const acc = accountById.get(id);
    const label = acc ? resolveAccountDisplayName(acc, autoById) : id;
    parts.push(`${label}: ${formatUsdCalendarCents(cents)}`);
  }
  return parts.join(" · ");
}

function LightningIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z" fill="currentColor" />
    </svg>
  );
}

function WalletMiniIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className={className} aria-hidden>
      <rect x="3" y="6" width="18" height="13" rx="2.5" />
      <path d="M16 12h4v3h-4a1.5 1.5 0 0 1 0-3Z" />
    </svg>
  );
}

/** Camera-style icon for screenshot capture */
function ScreenshotIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M4 7a2 2 0 0 1 2-2h2.5l1.6-1.6a1 1 0 0 1 .7-.3h4.4a1 1 0 0 1 .7.3L17.5 5H20a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7z" />
      <circle cx="12" cy="12" r="3.25" />
    </svg>
  );
}

function ChartPulseIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className={className} aria-hidden>
      <path d="M4 19V5" />
      <path d="M4 19h16" />
      <path d="M7 16l4-5 3 3 5-8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden>
      <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function JournalCalendarPage() {
  const { state, hydrated } = useJournal();
  const storageUserId = useJournalStorageUserId();
  const captureRef = useRef<HTMLDivElement>(null);
  const filterBarRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);
  const [activeFilterMenu, setActiveFilterMenu] = useState<null | "firm" | "type" | "accounts">(null);
  const [tradesStoreRev, setTradesStoreRev] = useState(0);

  const accounts = useMemo(
    () => Object.values(state.accounts).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [state.accounts]
  );
  const autoById = useAutoAccountLabelById(accounts);
  const accountById = useMemo(() => {
    const m = new Map<string, JournalAccount>();
    for (const a of accounts) m.set(a.id, a);
    return m;
  }, [accounts]);

  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth() + 1);
  const [mode, setMode] = useState<CalendarMode>("trades");
  const [firmKey, setFirmKey] = useState<string>("all");
  const [accountType, setAccountType] = useState<AccountType | "all">("all");
  /** null = use all eligible ids; explicit array = user override */
  const [accountSelection, setAccountSelection] = useState<string[] | null>(null);

  const eligibleAccountIds = useMemo(
    () => collectEligibleAccountIds(state, { firmKey, accountType }),
    [state, firmKey, accountType]
  );

  const eligibleKey = eligibleAccountIds.join("\0");

  useEffect(() => {
    setAccountSelection(null);
  }, [firmKey, accountType, eligibleKey]);

  useEffect(() => {
    setActiveFilterMenu(null);
  }, [firmKey, accountType]);

  const selectedAccountIds = accountSelection ?? eligibleAccountIds;

  const accountFilterSummary = useMemo(() => {
    if (eligibleAccountIds.length === 0) return "No accounts";
    if (selectedAccountIds.length === 0) return "None selected";
    if (selectedAccountIds.length === eligibleAccountIds.length) return "All accounts";
    return `${selectedAccountIds.length} of ${eligibleAccountIds.length}`;
  }, [eligibleAccountIds.length, selectedAccountIds.length]);

  useEffect(() => {
    if (!storageUserId) return;
    const tradesKey = tradesStorageKeyForUser(storageUserId);
    const bump = () => setTradesStoreRev((n) => n + 1);
    window.addEventListener(TRADES_STORE_CHANGED_EVENT, bump);
    const onStorage = (e: StorageEvent) => {
      if (e.key === tradesKey) bump();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(TRADES_STORE_CHANGED_EVENT, bump);
      window.removeEventListener("storage", onStorage);
    };
  }, [storageUserId]);

  useEffect(() => {
    if (!activeFilterMenu) return;
    const onPointerDown = (e: PointerEvent) => {
      const el = filterBarRef.current;
      if (el && !el.contains(e.target as Node)) setActiveFilterMenu(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActiveFilterMenu(null);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [activeFilterMenu]);

  const filters: CalendarFilters = useMemo(
    () => ({ firmKey, accountType, selectedAccountIds }),
    [firmKey, accountType, selectedAccountIds]
  );

  const firmOptions = useMemo(() => collectFirmOptions(state), [state.accounts]);

  const firmDisplayLabel = useMemo(() => {
    if (firmKey === "all") return "All prop firms";
    return firmOptions.find((o) => o.key === firmKey)?.name ?? firmKey;
  }, [firmKey, firmOptions]);

  const typeDisplayLabel = useMemo(() => {
    if (accountType === "all") return "All types";
    const map: Record<AccountType, string> = {
      challenge: "Challenge",
      funded: "Funded",
      live: "Live",
    };
    return map[accountType];
  }, [accountType]);

  const grid = useMemo(() => buildMonthGrid(viewYear, viewMonth), [viewYear, viewMonth]);

  const daily = useMemo(() => {
    const visible = collectVisibleDatesFromGrid(grid);
    if (mode === "payouts") {
      return aggregateDailyPayoutsForDateSet(state, visible, filters);
    }
    return aggregateDailyTradesForDateSet(state, loadTradesStore(storageUserId), visible, filters);
  }, [state, grid, mode, filters, tradesStoreRev, storageUserId]);

  const monthPnlExtents = useMemo(
    () => computeMonthPnlExtents(daily, viewYear, viewMonth),
    [daily, viewYear, viewMonth]
  );

  const { totalCents, activeDays } = useMemo(
    () => monthlyTotalsFromDaily(daily, viewYear, viewMonth),
    [daily, viewYear, viewMonth]
  );
  const weekRollups = useMemo(
    () => weeklyRollupsFromGrid(grid, daily, { onlyInMonthCells: true }),
    [grid, daily]
  );

  const dailyNetByDate = useMemo(
    () => buildDailyNetCentsTradesMode(state, loadTradesStore(storageUserId), filters),
    [state, filters, tradesStoreRev, storageUserId]
  );

  const positiveDayStreak = useMemo(
    () => computePositiveDayStreakEndingToday(dailyNetByDate, new Date()),
    [dailyNetByDate]
  );

  const bestPositiveStreak = useMemo(() => computeBestPositiveDayStreak(dailyNetByDate), [dailyNetByDate]);

  const bestDayInMonth = useMemo(
    () => bestTradingDayInMonth(dailyNetByDate, viewYear, viewMonth),
    [dailyNetByDate, viewYear, viewMonth]
  );

  const bestDayInMonthLabel = useMemo(() => {
    if (!bestDayInMonth.iso) return null;
    return new Date(`${bestDayInMonth.iso}T12:00:00`).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  }, [bestDayInMonth.iso]);

  const payoutDatesFiltered = useMemo(() => buildPayoutsModeActivityDates(state, filters), [state, filters]);

  const dryDaysWithoutPayout = useMemo(
    () => computeConsecutiveDaysWithoutPayout(payoutDatesFiltered, new Date()),
    [payoutDatesFiltered]
  );

  const bestPayoutCents = useMemo(() => largestPayoutCentsFiltered(state, filters), [state, filters]);

  const payoutEventsAllTime = useMemo(() => countPayoutEventsFiltered(state, filters), [state, filters]);

  const payoutEventsThisMonth = useMemo(
    () => countPayoutsInMonthFiltered(state, filters, viewYear, viewMonth),
    [state, filters, viewYear, viewMonth]
  );

  const yearlyPayoutTotalCents = useMemo(
    () => yearlyPayoutTotalsFiltered(state, filters, viewYear),
    [state, filters, viewYear]
  );

  const todayIso = toIsoDateLocal(new Date());
  const thisWeekCents = useMemo(
    () => thisWeekRollupCents(grid, weekRollups, todayIso),
    [grid, weekRollups, todayIso]
  );
  const todayInViewMonth = useMemo(() => {
    const [y, m] = todayIso.split("-").map(Number);
    return y === viewYear && m === viewMonth;
  }, [todayIso, viewYear, viewMonth]);

  const monthTitle = useMemo(
    () =>
      new Date(viewYear, viewMonth - 1, 1).toLocaleString("en-US", {
        month: "long",
        year: "numeric",
      }),
    [viewYear, viewMonth]
  );

  const toggleAccount = useCallback(
    (id: string) => {
      setAccountSelection((prev) => {
        const base = prev ?? [...eligibleAccountIds];
        if (base.includes(id)) {
          const next = base.filter((x) => x !== id);
          return next;
        }
        return [...base, id];
      });
    },
    [eligibleAccountIds]
  );

  const selectAllAccounts = useCallback(() => {
    setAccountSelection(null);
  }, []);

  const selectNoAccounts = useCallback(() => {
    setAccountSelection([]);
  }, []);

  const goToday = useCallback(() => {
    const d = new Date();
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth() + 1);
  }, []);

  const goPrev = useCallback(() => {
    setViewMonth((m) => {
      if (m <= 1) {
        setViewYear((y) => y - 1);
        return 12;
      }
      return m - 1;
    });
  }, []);

  const goNext = useCallback(() => {
    setViewMonth((m) => {
      if (m >= 12) {
        setViewYear((y) => y + 1);
        return 1;
      }
      return m + 1;
    });
  }, []);

  const onExportScreenshot = useCallback(async () => {
    const node = captureRef.current;
    if (!node) return;
    setExporting(true);
    try {
      const dataUrl = await toPng(node, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: "#070b13",
      });
      const filename = `mytradedesk-calendar-${viewYear}-${String(viewMonth).padStart(2, "0")}.png`;
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], filename, { type: "image/png" });

      const nav = typeof navigator !== "undefined" ? navigator : undefined;
      if (nav?.share) {
        const payload: ShareData = {
          files: [file],
          title: "MyTradeDesk",
          text: `Calendar ${viewYear}-${String(viewMonth).padStart(2, "0")}`,
        };
        const canShareFiles =
          typeof nav.canShare !== "function" ? true : nav.canShare({ files: [file] });
        if (canShareFiles) {
          try {
            await nav.share(payload);
            return;
          } catch (err) {
            const name =
              err instanceof DOMException ? err.name : err instanceof Error ? err.name : "";
            if (name === "AbortError") return;
          }
        }
      }

      const a = document.createElement("a");
      a.download = filename;
      a.href = dataUrl;
      a.click();
    } catch (e) {
      console.error(e);
    } finally {
      setExporting(false);
    }
  }, [viewYear, viewMonth]);

  if (!hydrated) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center px-6">
        <div className={`${CARD} max-w-md px-6 py-10 text-center text-sm text-white/55`}>Loading calendar…</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="shrink-0 border-b border-white/10 bg-black/55 px-[clamp(16px,2.5vw,40px)] py-[clamp(14px,1.8vw,24px)] backdrop-blur-xl">
        <p className={SECTION_LABEL}>TradeDesk</p>
        <h1 className="mt-1 text-[clamp(1.35rem,2.2vw,1.9rem)] font-semibold tracking-tight text-white">Calendar</h1>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-auto px-[clamp(12px,2.5vw,40px)] py-6">
        {/* Toolbar */}
        <div className="flex flex-col gap-4 xl:flex-row xl:flex-wrap xl:items-center xl:justify-between">
          <div className="flex min-w-0 flex-wrap items-center gap-3 sm:gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={goPrev}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/12 bg-white/[0.04] text-white/80 transition hover:border-white/20 hover:bg-white/[0.08]"
                aria-label="Previous month"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={goToday}
                className="rounded-xl border border-sky-400/35 bg-gradient-to-b from-sky-500/15 to-sky-950/25 px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-sky-200/95 transition hover:border-sky-400/55"
              >
                Today
              </button>
              <button
                type="button"
                onClick={goNext}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/12 bg-white/[0.04] text-white/80 transition hover:border-white/20 hover:bg-white/[0.08]"
                aria-label="Next month"
              >
                ›
              </button>
              <span className="ml-1 text-lg font-semibold tracking-tight text-white">{monthTitle}</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex rounded-xl border border-white/10 bg-black/30 p-0.5">
                <button
                  type="button"
                  onClick={() => setMode("trades")}
                  className={`inline-flex items-center gap-1.5 rounded-[10px] px-3 py-2 text-xs font-semibold transition ${
                    mode === "trades"
                      ? "bg-white/12 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                      : "text-white/45 hover:text-white/75"
                  }`}
                >
                  <LightningIcon className="h-3.5 w-3.5" />
                  Trades
                </button>
                <button
                  type="button"
                  onClick={() => setMode("payouts")}
                  className={`inline-flex items-center gap-1.5 rounded-[10px] px-3 py-2 text-xs font-semibold transition ${
                    mode === "payouts"
                      ? "bg-white/12 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                      : "text-white/45 hover:text-white/75"
                  }`}
                >
                  <WalletMiniIcon className="h-3.5 w-3.5" />
                  Payouts
                </button>
              </div>
            </div>
          </div>

          {mode === "trades" ? (
            <div className="xl:ml-auto">
              <div
                className={`relative overflow-hidden rounded-2xl border border-white/12 bg-gradient-to-br from-sky-500/[0.12] via-[#0c1420] to-emerald-500/[0.08] p-[1px] shadow-[0_12px_40px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.06)]`}
              >
                <div className="flex flex-wrap items-stretch gap-4 rounded-[15px] bg-[#070b13]/90 px-5 py-4 backdrop-blur-sm">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-sky-400/25 bg-gradient-to-b from-sky-500/20 to-sky-950/40 text-sky-300/90 shadow-[0_0_24px_rgba(56,189,248,0.12)]">
                    <ChartPulseIcon className="h-6 w-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`${SECTION_LABEL} text-sky-300/75 [letter-spacing:0.16em]`}>Monthly stats</p>
                    <div className="mt-2 flex flex-wrap items-end gap-3">
                      <span
                        className={`text-2xl font-semibold tabular-nums tracking-tight sm:text-[1.75rem] ${
                          totalCents >= 0 ? "text-emerald-300/[0.98]" : "text-rose-300/[0.98]"
                        }`}
                      >
                        {formatUsdCalendarSummaryCents(totalCents)}
                      </span>
                      <span className="mb-0.5 inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-0.5 text-xs font-medium tabular-nums text-white/55">
                        {activeDays} active {activeDays === 1 ? "day" : "days"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="xl:ml-auto">
              <div
                className={`relative overflow-hidden rounded-2xl border border-white/12 bg-gradient-to-br from-sky-500/[0.12] via-[#0c1420] to-emerald-500/[0.08] p-[1px] shadow-[0_12px_40px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.06)]`}
              >
                <div className="flex flex-wrap items-stretch gap-4 rounded-[15px] bg-[#070b13]/90 px-5 py-4 backdrop-blur-sm">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-sky-400/25 bg-gradient-to-b from-sky-500/20 to-sky-950/40 text-sky-300/90 shadow-[0_0_24px_rgba(56,189,248,0.12)]">
                    <ChartPulseIcon className="h-6 w-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`${SECTION_LABEL} text-sky-300/75 [letter-spacing:0.16em]`}>Yearly Payouts</p>
                    <div className="mt-2">
                      <span
                        className={`text-2xl font-semibold tabular-nums tracking-tight sm:text-[1.75rem] ${
                          yearlyPayoutTotalCents >= 0 ? "text-emerald-300/[0.98]" : "text-rose-300/[0.98]"
                        }`}
                      >
                        {formatUsdCalendarSummaryCents(yearlyPayoutTotalCents)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Gamification — trades: green streaks + week; payouts: cash ladder + month */}
        {mode === "trades" ? (
          <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="relative overflow-hidden rounded-2xl border border-orange-400/20 bg-gradient-to-br from-orange-500/[0.1] via-[#120d0a] to-[#070604] p-4 shadow-[0_16px_48px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.05)] ring-1 ring-inset ring-white/[0.04]">
              <div
                className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-orange-500/15 blur-2xl"
                aria-hidden
              />
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-orange-200/65">Hot streak</p>
              <p className="mt-2 text-2xl font-bold tabular-nums text-white">{positiveDayStreak}</p>
              <p className="mt-1 text-xs text-white/45">Consecutive calendar days with positive net P&amp;L</p>
            </div>
            <div className="relative overflow-hidden rounded-2xl border border-violet-400/20 bg-gradient-to-br from-violet-500/[0.1] via-[#0e0a12] to-[#060508] p-4 shadow-[0_16px_48px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.05)] ring-1 ring-inset ring-white/[0.04]">
              <div
                className="pointer-events-none absolute -bottom-6 -left-6 h-20 w-20 rounded-full bg-fuchsia-500/12 blur-2xl"
                aria-hidden
              />
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-violet-300/70">Best streak</p>
              <p className="mt-2 text-2xl font-bold tabular-nums text-violet-200/95">{bestPositiveStreak}</p>
              <p className="mt-1 text-xs text-white/42">Longest run of back-to-back green days</p>
            </div>
            <div className="relative overflow-hidden rounded-2xl border border-cyan-400/18 bg-gradient-to-br from-cyan-500/[0.09] via-[#0a1214] to-[#050a0c] p-4 shadow-[0_16px_48px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.05)] ring-1 ring-inset ring-white/[0.04]">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-300/70">Best day</p>
              {bestDayInMonth.iso == null ? (
                <p className="mt-3 text-sm leading-snug text-white/45">No P&amp;L days in this month yet.</p>
              ) : (
                <>
                  <p
                    className={`mt-2 text-xl font-bold tabular-nums sm:text-2xl ${
                      bestDayInMonth.cents >= 0 ? "text-emerald-300/95" : "text-rose-300/90"
                    }`}
                  >
                    {formatUsdCalendarSummaryCents(bestDayInMonth.cents)}
                  </p>
                  <p className="mt-1 text-sm font-medium text-white/55">{bestDayInMonthLabel}</p>
                  <p className="mt-1 text-[11px] text-white/40">Highest net P&amp;L day in the viewed month</p>
                </>
              )}
            </div>
            <div className="relative overflow-hidden rounded-2xl border border-emerald-400/18 bg-gradient-to-br from-emerald-500/[0.09] via-[#0a1410] to-[#050a08] p-4 shadow-[0_16px_48px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.05)] ring-1 ring-inset ring-white/[0.04]">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-300/70">This week</p>
              {!todayInViewMonth || thisWeekCents == null ? (
                <p className="mt-3 text-sm leading-snug text-white/45">
                  Open the current month to see the week that contains today.
                </p>
              ) : (
                <>
                  <p
                    className={`mt-2 text-xl font-bold tabular-nums ${
                      thisWeekCents > 0
                        ? "text-emerald-300/95"
                        : thisWeekCents < 0
                          ? "text-rose-300/90"
                          : "text-white/55"
                    }`}
                  >
                    {formatUsdCalendarSummaryCents(thisWeekCents)}
                  </p>
                  {thisWeekCents > 0 ? (
                    <span className="mt-2 inline-flex rounded-full border border-emerald-400/35 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-200/90">
                      Green week
                    </span>
                  ) : thisWeekCents < 0 ? (
                    <span className="mt-2 inline-flex rounded-full border border-rose-400/30 bg-rose-500/12 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-rose-200/85">
                      Red week
                    </span>
                  ) : (
                    <p className="mt-2 text-xs text-white/40">Flat for calendar week</p>
                  )}
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="relative overflow-hidden rounded-2xl border border-amber-400/22 bg-gradient-to-br from-amber-500/[0.11] via-[#120f0a] to-[#070604] p-4 shadow-[0_16px_48px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.05)] ring-1 ring-inset ring-white/[0.04]">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-200/70">Best payout</p>
              <p className="mt-2 text-xl font-bold tabular-nums text-amber-300/95 sm:text-2xl">
                {bestPayoutCents > 0 ? formatUsdCalendarSummaryCents(bestPayoutCents) : "—"}
              </p>
              <p className="mt-1 text-xs text-white/42">Largest single withdrawal on your filters</p>
            </div>
            <div className="relative overflow-hidden rounded-2xl border border-sky-400/20 bg-gradient-to-br from-sky-500/[0.09] via-[#0a1018] to-[#06080e] p-4 shadow-[0_16px_48px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.05)] ring-1 ring-inset ring-white/[0.04]">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-sky-300/70">Dry spell</p>
              {dryDaysWithoutPayout == null ? (
                <p className="mt-3 text-sm leading-snug text-white/45">Log at least one payout to measure gaps.</p>
              ) : (
                <>
                  <p className="mt-2 text-2xl font-bold tabular-nums text-white">{dryDaysWithoutPayout}</p>
                  <p className="mt-1 text-xs text-white/42">Consecutive days up to today with no payout line</p>
                </>
              )}
            </div>
            <div className="relative overflow-hidden rounded-2xl border border-fuchsia-400/18 bg-gradient-to-br from-fuchsia-500/[0.08] via-[#100a12] to-[#060508] p-4 shadow-[0_16px_48px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.05)] ring-1 ring-inset ring-white/[0.04]">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-fuchsia-300/70">Lifetime hits</p>
              <p className="mt-2 text-2xl font-bold tabular-nums text-fuchsia-200/95">{payoutEventsAllTime}</p>
              <p className="mt-1 text-xs text-white/42">All payout lines on your current filters</p>
            </div>
            <div className="relative overflow-hidden rounded-2xl border border-emerald-400/18 bg-gradient-to-br from-emerald-500/[0.09] via-[#0a1410] to-[#050a08] p-4 shadow-[0_16px_48px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.05)] ring-1 ring-inset ring-white/[0.04]">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-300/70">This month</p>
              <p className="mt-2 text-xl font-bold tabular-nums text-emerald-300/95 sm:text-2xl">
                {formatUsdCalendarSummaryCents(totalCents)}
              </p>
              <p className="mt-1 text-xs text-white/42">
                {monthTitle} · {payoutEventsThisMonth} line{payoutEventsThisMonth === 1 ? "" : "s"} · {activeDays} day
                {activeDays === 1 ? "" : "s"}
              </p>
            </div>
          </div>
        )}

        <div ref={filterBarRef} className="flex flex-wrap items-center gap-2">
          {/* Prop firms — custom menu (same shell as accounts) */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setActiveFilterMenu((m) => (m === "firm" ? null : "firm"))}
              aria-expanded={activeFilterMenu === "firm"}
              aria-haspopup="listbox"
              className={`${SELECT_CLASS} inline-flex min-w-[10rem] max-w-[min(100vw-8rem,18rem)] items-center justify-between gap-2 text-left`}
            >
              <span className="min-w-0 flex-1 truncate">{firmDisplayLabel}</span>
              <ChevronDownIcon
                className={`h-4 w-4 shrink-0 text-white/45 transition ${activeFilterMenu === "firm" ? "rotate-180" : ""}`}
              />
            </button>
            {activeFilterMenu === "firm" ? (
              <div className={`${FILTER_MENU_PANEL} max-h-[min(50vh,16rem)] overflow-y-auto py-1 [scrollbar-width:thin]`} role="listbox" aria-label="Prop firm">
                <button
                  type="button"
                  onClick={() => {
                    setFirmKey("all");
                    setActiveFilterMenu(null);
                  }}
                  className={`w-full rounded-lg px-3 py-2 text-left text-[13px] transition ${
                    firmKey === "all"
                      ? "bg-sky-500/15 text-sky-200/95"
                      : "text-white/88 hover:bg-white/[0.06]"
                  }`}
                >
                  All prop firms
                </button>
                {firmOptions.map((o) => (
                  <button
                    key={o.key}
                    type="button"
                    onClick={() => {
                      setFirmKey(o.key);
                      setActiveFilterMenu(null);
                    }}
                    className={`w-full rounded-lg px-3 py-2 text-left text-[13px] transition ${
                      firmKey === o.key
                        ? "bg-sky-500/15 text-sky-200/95"
                        : "text-white/88 hover:bg-white/[0.06]"
                    }`}
                  >
                    {o.name}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          {/* Account type — custom menu */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setActiveFilterMenu((m) => (m === "type" ? null : "type"))}
              aria-expanded={activeFilterMenu === "type"}
              aria-haspopup="listbox"
              className={`${SELECT_CLASS} inline-flex min-w-[8rem] items-center justify-between gap-2 text-left`}
            >
              <span className="min-w-0 flex-1 truncate">{typeDisplayLabel}</span>
              <ChevronDownIcon
                className={`h-4 w-4 shrink-0 text-white/45 transition ${activeFilterMenu === "type" ? "rotate-180" : ""}`}
              />
            </button>
            {activeFilterMenu === "type" ? (
              <div className={`${FILTER_MENU_PANEL} py-1`} role="listbox" aria-label="Account type">
                {(
                  [
                    { v: "all" as const, label: "All types" },
                    { v: "challenge" as const, label: "Challenge" },
                    { v: "funded" as const, label: "Funded" },
                    { v: "live" as const, label: "Live" },
                  ] as const
                ).map(({ v, label }) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => {
                      setAccountType(v);
                      setActiveFilterMenu(null);
                    }}
                    className={`w-full rounded-lg px-3 py-2 text-left text-[13px] transition ${
                      accountType === v
                        ? "bg-sky-500/15 text-sky-200/95"
                        : "text-white/88 hover:bg-white/[0.06]"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => setActiveFilterMenu((m) => (m === "accounts" ? null : "accounts"))}
              aria-expanded={activeFilterMenu === "accounts"}
              aria-haspopup="listbox"
              className={`${SELECT_CLASS} inline-flex min-w-[12rem] max-w-[min(100vw-8rem,18rem)] items-center justify-between gap-2 text-left`}
            >
              <span className="min-w-0 flex-1 truncate">{accountFilterSummary}</span>
              <ChevronDownIcon
                className={`h-4 w-4 shrink-0 text-white/45 transition ${activeFilterMenu === "accounts" ? "rotate-180" : ""}`}
              />
            </button>
            {activeFilterMenu === "accounts" ? (
              <div
                className={`${FILTER_MENU_PANEL} py-2`}
                role="listbox"
                aria-label="Accounts"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.06] px-3 pb-2">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-white/45">Accounts</span>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        selectAllAccounts();
                      }}
                      className="rounded-lg border border-white/10 bg-white/[0.05] px-2 py-1 text-[11px] font-medium text-sky-300/90 transition hover:border-sky-400/35"
                    >
                      All
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        selectNoAccounts();
                      }}
                      className="rounded-lg border border-white/10 bg-white/[0.05] px-2 py-1 text-[11px] font-medium text-white/45 transition hover:border-white/20 hover:text-white/75"
                    >
                      Clear
                    </button>
                  </div>
                </div>
                {eligibleAccountIds.length === 0 ? (
                  <p className="px-3 py-3 text-sm text-white/40">No accounts for these filters.</p>
                ) : (
                  <ul className="max-h-[min(50vh,16rem)] space-y-0.5 overflow-y-auto px-1 py-1 [scrollbar-width:thin]">
                    {eligibleAccountIds.map((id) => {
                      const acc = accountById.get(id);
                      if (!acc) return null;
                      const label = resolveAccountDisplayName(acc, autoById);
                      const checked = selectedAccountIds.includes(id);
                      return (
                        <li key={id}>
                          <label className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 transition hover:bg-white/[0.06]">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleAccount(id)}
                              onClick={(e) => e.stopPropagation()}
                              className="h-4 w-4 shrink-0 rounded border-white/25 bg-black/50 text-sky-500 focus:ring-sky-400/40"
                            />
                            <span className="min-w-0 flex-1 text-[13px] leading-snug text-white/88">{label}</span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            ) : null}
          </div>

          <button
            type="button"
            onClick={onExportScreenshot}
            disabled={exporting}
            className="inline-flex items-center gap-2 rounded-xl border border-white/14 bg-gradient-to-b from-white/[0.08] to-white/[0.02] px-4 py-2 text-sm font-semibold text-white/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition hover:border-sky-400/35 disabled:opacity-50"
          >
            <ScreenshotIcon className="h-4 w-4 text-white/85" />
            {exporting ? "Saving…" : "Screenshot"}
          </button>
        </div>

        {/* Screenshot capture: calendar + weeks + header strip */}
        <div ref={captureRef} className="rounded-2xl bg-[#070b13] p-4 sm:p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40">MyTradeDesk</p>
              <p className="text-lg font-semibold text-white">{monthTitle}</p>
              <p className="text-xs text-white/45">{mode === "trades" ? "Trades (P&L)" : "Payouts"}</p>
            </div>
            <div className="text-right">
              <p className={`text-xl font-semibold tabular-nums ${totalCents >= 0 ? "text-emerald-300/95" : "text-rose-300/95"}`}>
                {formatUsdCalendarSummaryCents(totalCents)}
              </p>
              <p className="text-[11px] text-white/40">{activeDays} days · snapshot</p>
              {mode === "trades" ? (
                <p className="mt-1 text-[10px] text-white/35">
                  Hot {positiveDayStreak} · best {bestPositiveStreak}
                  {bestDayInMonthLabel
                    ? ` · best day ${bestDayInMonthLabel} (${formatUsdCalendarSummaryCents(bestDayInMonth.cents)})`
                    : ""}
                </p>
              ) : (
                <p className="mt-1 text-[10px] text-white/35">
                  Best {bestPayoutCents > 0 ? formatUsdCalendarSummaryCents(bestPayoutCents) : "—"} · {payoutEventsAllTime}{" "}
                  lifetime
                </p>
              )}
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-6 lg:flex-row lg:items-start">
            <div
              className={`${CARD} min-w-0 flex-1 overflow-visible p-0 max-md:overflow-hidden max-md:rounded-2xl max-md:border-white/[0.12]`}
            >
              <div className="grid grid-cols-7 border-b border-white/10 bg-white/[0.04] text-center text-[11px] font-semibold uppercase tracking-[0.1em] text-white/45 max-md:gap-1 max-md:border-0 max-md:bg-[#0b0b0d] max-md:px-1 max-md:pb-1.5 max-md:pt-1 max-md:text-[10px] max-md:tracking-[0.14em] md:border-b md:border-white/10">
                {(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const).map((d) => (
                  <div
                    key={d}
                    className="py-2.5 text-center max-md:flex max-md:h-7 max-md:items-center max-md:justify-center max-md:rounded-sm max-md:border max-md:border-white/[0.08] max-md:bg-black/35 max-md:text-[9px] max-md:font-semibold max-md:leading-none max-md:text-white/42 md:border-r md:border-white/[0.06] md:py-2.5 md:last:border-r-0"
                  >
                    {d}
                  </div>
                ))}
              </div>
              <div className="divide-y divide-white/[0.06] max-md:divide-y-0 max-md:gap-1 max-md:bg-[#060608] max-md:p-1">
                {grid.map((week, wi) => (
                  <div
                    key={wi}
                    className="grid grid-cols-7 divide-x divide-white/[0.06] overflow-visible max-md:gap-1 max-md:divide-x-0"
                  >
                    {week.cells.map((cell, ci) => {
                      const agg = daily.get(cell.dateIso);
                      const has = agg != null && dayHasCalendarActivity(agg);
                      const profit = has && agg!.cents > 0;
                      const loss = has && agg!.cents < 0;
                      const tradesShown =
                        has && mode === "trades" ? (agg!.storedTradeCount ?? 0) : 0;
                      const isPadding = !cell.inMonth;
                      const baseCell =
                        "relative min-h-[5.5rem] border p-2 transition-colors max-md:aspect-square max-md:min-h-0 max-md:w-full max-md:min-w-0 max-md:overflow-hidden max-md:rounded-sm max-md:border-solid max-md:p-0 max-md:flex max-md:flex-col max-md:items-center max-md:justify-center sm:min-h-[6.25rem] sm:p-2.5";
                      let cellClass = `${baseCell} bg-[#0a0f16]/90 border-transparent`;
                      let cellStyle: CSSProperties | undefined;

                      if (cell.inMonth && !has) {
                        cellClass = `${baseCell} border border-white/[0.08] bg-black/35 max-md:bg-[#161618]`;
                      } else if (cell.inMonth && has && profit) {
                        cellClass = `${baseCell} border max-md:border max-md:border-emerald-400/45`;
                        cellStyle = calendarProfitCellStyle(agg!.cents, monthPnlExtents, false);
                      } else if (cell.inMonth && has && loss) {
                        cellClass = `${baseCell} border max-md:border max-md:border-rose-400/45`;
                        cellStyle = calendarLossCellStyle(-agg!.cents, monthPnlExtents, false);
                      } else if (isPadding && !has) {
                        cellClass = `${baseCell} border border-transparent bg-black/55 opacity-[0.45] max-md:bg-[#101012]`;
                      } else if (isPadding && has && profit) {
                        cellClass = `${baseCell} border opacity-[0.95] max-md:border-emerald-400/35`;
                        cellStyle = calendarProfitCellStyle(agg!.cents, monthPnlExtents, true);
                      } else if (isPadding && has && loss) {
                        cellClass = `${baseCell} border opacity-[0.95] max-md:border-rose-400/35`;
                        cellStyle = calendarLossCellStyle(-agg!.cents, monthPnlExtents, true);
                      } else if (isPadding && has && !profit && !loss) {
                        cellClass = `${baseCell} border border-white/[0.08] bg-white/[0.03] opacity-[0.48]`;
                      }

                      const tProf = profit
                        ? profitIntensityT(agg!.cents, monthPnlExtents.minProfit, monthPnlExtents.maxProfit)
                        : 0;
                      const tLoss = loss
                        ? lossIntensityT(-agg!.cents, monthPnlExtents.minLossAbs, monthPnlExtents.maxLossAbs)
                        : 0;
                      const amountStyle: CSSProperties | undefined = profit
                        ? calendarProfitAmountStyle(tProf)
                        : loss
                          ? calendarLossAmountStyle(tLoss)
                          : undefined;

                      const accountBreakdownTitle = has
                        ? calendarCellAccountBreakdownTitle(agg!.byAccountCents, accountById, autoById)
                        : undefined;
                      const cellTitle =
                        has && accountBreakdownTitle
                          ? accountBreakdownTitle
                          : has
                            ? formatUsdCalendarCents(agg!.cents)
                            : undefined;
                      const byAccount = has && agg!.byAccountCents && Object.keys(agg!.byAccountCents).length > 0;

                      return (
                        <div
                          key={`${wi}-${ci}`}
                          className={`${cellClass} group relative z-0 overflow-visible hover:z-[30]`}
                          style={cellStyle}
                          title={cellTitle}
                        >
                          {byAccount ? (
                            <div
                              role="tooltip"
                              className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1.5 w-[min(17rem,calc(100vw-3rem))] max-h-40 -translate-x-1/2 overflow-y-auto overscroll-contain rounded-lg border border-white/12 bg-[rgba(16,23,34,0.98)] px-2.5 py-2 opacity-0 shadow-[0_14px_44px_rgba(0,0,0,0.55)] backdrop-blur-sm transition-opacity duration-150 ease-out [scrollbar-width:thin] group-hover:opacity-100"
                            >
                              <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-white/40">
                                By account
                              </p>
                              <ul className="space-y-1">
                                {Object.entries(agg!.byAccountCents!).map(([accountId, cents]) => {
                                  const acc = accountById.get(accountId);
                                  const label = acc ? resolveAccountDisplayName(acc, autoById) : accountId;
                                  const lineProfit = cents > 0;
                                  const lineLoss = cents < 0;
                                  return (
                                    <li key={accountId} className="flex items-baseline justify-between gap-2 text-[11px] leading-snug">
                                      <span className="min-w-0 flex-1 truncate text-white/78">{label}</span>
                                      <span
                                        className={`shrink-0 tabular-nums font-semibold ${
                                          lineProfit
                                            ? "text-emerald-300/95"
                                            : lineLoss
                                              ? "text-rose-300/95"
                                              : "text-white/55"
                                        }`}
                                      >
                                        {formatUsdCalendarSummaryCents(cents)}
                                      </span>
                                    </li>
                                  );
                                })}
                              </ul>
                            </div>
                          ) : null}
                          <div
                            className={`text-left text-xs font-medium tabular-nums max-md:pointer-events-none max-md:absolute max-md:left-1 max-md:top-1 max-md:z-[1] max-md:text-[9px] max-md:leading-none ${
                              cell.inMonth ? "text-white/75" : "text-white/40"
                            }`}
                          >
                            {cell.dayNum}
                          </div>
                          {has ? (
                            <div
                              className={`mt-1 flex min-h-0 w-full flex-col items-center justify-center gap-1 text-center max-md:mt-0 max-md:flex-1 max-md:justify-center max-md:gap-0 max-md:px-0.5 max-md:pb-0.5 max-md:pt-3 ${
                                isPadding ? "opacity-90" : ""
                              }`}
                            >
                              <span
                                className={`max-w-full whitespace-nowrap text-sm font-semibold tabular-nums max-md:text-center max-md:text-[9px] max-md:leading-none max-md:tracking-tight sm:text-[15px] ${
                                  amountStyle ? "" : "text-white/70"
                                }`}
                                style={amountStyle}
                              >
                                <span className="md:hidden">{formatUsdCalendarCentsTight(agg!.cents)}</span>
                                <span className="hidden md:inline">{formatUsdCalendarCents(agg!.cents)}</span>
                              </span>
                              {mode === "trades" && tradesShown > 0 && !isPadding ? (
                                <span className="hidden items-center gap-1 rounded-full border border-white/10 bg-black/30 px-1.5 py-0.5 text-[10px] font-medium text-white/55 sm:inline-flex">
                                  <span className="text-white/35">●</span>
                                  <span className="tabular-nums">
                                    {tradesShown} {tradesShown === 1 ? "trade" : "trades"}
                                  </span>
                                </span>
                              ) : mode === "payouts" && !isPadding ? (
                                <span className="hidden text-[10px] text-white/40 sm:inline">payout</span>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap items-center justify-center gap-4 border-t border-white/10 px-4 py-3 text-[11px] text-white/45">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm bg-rose-700" />
                  Loss
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm bg-[#3d6b3a]" />
                  Profit
                </span>
              </div>
            </div>

            <aside className="flex w-full shrink-0 flex-col gap-2 lg:w-[220px] xl:w-[240px]">
              <p className={`${SECTION_LABEL} px-1`}>Weeks</p>
              {weekRollups.map((w, i) => (
                <div key={i} className={`${CARD} flex flex-col gap-1 px-4 py-3`}>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/40">Week {i + 1}</p>
                  <p
                    className={`text-lg font-semibold tabular-nums ${
                      w.cents >= 0 ? "text-emerald-300/95" : "text-rose-300/95"
                    }`}
                  >
                    {formatUsdCalendarSummaryCents(w.cents)}
                  </p>
                  <p className="text-xs text-white/38">{w.activeDays} days</p>
                </div>
              ))}
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}
