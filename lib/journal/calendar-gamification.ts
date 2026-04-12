import { matchesCalendarFilters, type CalendarFilters, type CalendarWeekRow } from "@/lib/journal/calendar-aggregates";
import { journalPayoutDisplayCents } from "@/lib/journal/payout-display";
import type { TradesStoreV1 } from "@/lib/journal/trades-storage";
import { isCommissionNoiseTrade } from "@/lib/journal/trade-metrics";
import type { ISODate, JournalDataV1 } from "@/lib/journal/types";

const TRADE_CELL_SEP = "\x1e";

export function toIsoDateLocal(d: Date): ISODate {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function payoutEffectiveDate(p: { paidDate?: ISODate; requestedDate: ISODate }): ISODate {
  return p.paidDate ?? p.requestedDate;
}

/** All calendar days with trades-mode activity (imports + manual P&amp;L lines), after filters. */
export function buildTradesModeActivityDates(
  state: JournalDataV1,
  store: TradesStoreV1,
  filters: CalendarFilters
): Set<ISODate> {
  const dates = new Set<ISODate>();
  for (const t of store.trades) {
    if (isCommissionNoiseTrade(t)) continue;
    const acc = state.accounts[t.accountId];
    if (!matchesCalendarFilters(acc, filters)) continue;
    dates.add(t.date);
  }
  for (const [accId, dm] of Object.entries(store.csvModalDailyByAccount ?? {})) {
    const acc = state.accounts[accId];
    if (!matchesCalendarFilters(acc, filters)) continue;
    for (const date of Object.keys(dm)) {
      dates.add(date as ISODate);
    }
  }
  for (const e of Object.values(state.pnlEntries)) {
    if (e.source !== "manual") continue;
    const acc = state.accounts[e.accountId];
    if (!matchesCalendarFilters(acc, filters)) continue;
    dates.add(e.date);
  }
  return dates;
}

/** Days with at least one payout (paid or requested date), after filters. */
export function buildPayoutsModeActivityDates(state: JournalDataV1, filters: CalendarFilters): Set<ISODate> {
  const dates = new Set<ISODate>();
  for (const p of Object.values(state.payoutEntries)) {
    const acc = state.accounts[p.accountId];
    if (!matchesCalendarFilters(acc, filters)) continue;
    dates.add(payoutEffectiveDate(p));
  }
  return dates;
}

/** Consecutive calendar days with activity ending at `today` (strict: today must be logged for streak &gt; 0 after first day). */
export function computeLoggingStreak(activityDates: Set<ISODate>, today: Date): number {
  let streak = 0;
  const d = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  for (let i = 0; i < 800; i++) {
    const iso = toIsoDateLocal(d);
    if (activityDates.has(iso)) {
      streak++;
      d.setDate(d.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

/** Net P&amp;L per day (trades + CSV daily + manual lines), filtered — same basis as trades calendar. */
export function buildDailyNetCentsTradesMode(
  state: JournalDataV1,
  store: TradesStoreV1,
  filters: CalendarFilters
): Map<ISODate, number> {
  const cell = new Map<string, number>();
  for (const t of store.trades) {
    if (isCommissionNoiseTrade(t)) continue;
    const acc = state.accounts[t.accountId];
    if (!matchesCalendarFilters(acc, filters)) continue;
    const k = `${t.accountId}${TRADE_CELL_SEP}${t.date}`;
    cell.set(k, (cell.get(k) ?? 0) + t.pnlCents);
  }
  for (const [accId, dm] of Object.entries(store.csvModalDailyByAccount ?? {})) {
    const acc = state.accounts[accId];
    if (!matchesCalendarFilters(acc, filters)) continue;
    for (const [date, cents] of Object.entries(dm)) {
      cell.set(`${accId}${TRADE_CELL_SEP}${date}`, cents);
    }
  }
  const byDate = new Map<ISODate, number>();
  for (const [k, cents] of cell) {
    const idx = k.indexOf(TRADE_CELL_SEP);
    const date = k.slice(idx + TRADE_CELL_SEP.length) as ISODate;
    byDate.set(date, (byDate.get(date) ?? 0) + cents);
  }
  for (const e of Object.values(state.pnlEntries)) {
    if (e.source !== "manual") continue;
    const acc = state.accounts[e.accountId];
    if (!matchesCalendarFilters(acc, filters)) continue;
    byDate.set(e.date, (byDate.get(e.date) ?? 0) + e.pnlCents);
  }
  return byDate;
}

/** Consecutive calendar days with strictly positive net, ending at `today`. */
export function computePositiveDayStreakEndingToday(netByDate: Map<ISODate, number>, today: Date): number {
  let streak = 0;
  const d = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  for (let i = 0; i < 800; i++) {
    const iso = toIsoDateLocal(d);
    const net = netByDate.get(iso);
    if (net === undefined || net <= 0) break;
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

/** Longest run of consecutive calendar days with positive net (within min–max date present). */
export function computeBestPositiveDayStreak(netByDate: Map<ISODate, number>): number {
  if (netByDate.size === 0) return 0;
  const sorted = [...netByDate.keys()].sort();
  const minIso = sorted[0]!;
  const maxIso = sorted[sorted.length - 1]!;
  const parse = (iso: ISODate) => {
    const [y, m, day] = iso.split("-").map(Number);
    return new Date(y!, m! - 1, day!);
  };
  let best = 0;
  let cur = 0;
  const end = parse(maxIso);
  for (let d = parse(minIso); d <= end; d.setDate(d.getDate() + 1)) {
    const iso = toIsoDateLocal(d);
    const net = netByDate.get(iso);
    if (net !== undefined && net > 0) {
      cur++;
      if (cur > best) best = cur;
    } else {
      cur = 0;
    }
  }
  return best;
}

export function countPositiveDaysInMonthPrefix(
  netByDate: Map<ISODate, number>,
  year: number,
  month: number
): number {
  const prefix = `${year}-${String(month).padStart(2, "0")}`;
  let n = 0;
  for (const [d, net] of netByDate) {
    if (!d.startsWith(prefix)) continue;
    if (net > 0) n++;
  }
  return n;
}

/** Highest net P&amp;L day in the calendar month (prefix match on ISO dates). */
export function bestTradingDayInMonth(
  netByDate: Map<ISODate, number>,
  year: number,
  month: number
): { iso: ISODate | null; cents: number } {
  const prefix = `${year}-${String(month).padStart(2, "0")}`;
  let bestIso: ISODate | null = null;
  let bestNet = -Infinity;
  for (const [d, net] of netByDate) {
    if (!d.startsWith(prefix)) continue;
    if (net > bestNet) {
      bestNet = net;
      bestIso = d;
    }
  }
  if (bestIso == null || bestNet === -Infinity) return { iso: null, cents: 0 };
  return { iso: bestIso, cents: bestNet };
}

/** Largest single payout (affichage : TopStep 90 % brut, TPT 80 % brut) after filters. */
export function largestPayoutCentsFiltered(state: JournalDataV1, filters: CalendarFilters): number {
  let max = 0;
  for (const p of Object.values(state.payoutEntries)) {
    const acc = state.accounts[p.accountId];
    if (!matchesCalendarFilters(acc, filters)) continue;
    const c = journalPayoutDisplayCents(p, acc);
    if (c > max) max = c;
  }
  return max;
}

/** Payout lines with effective date in month. */
export function countPayoutsInMonthFiltered(
  state: JournalDataV1,
  filters: CalendarFilters,
  year: number,
  month: number
): number {
  const prefix = `${year}-${String(month).padStart(2, "0")}`;
  let n = 0;
  for (const p of Object.values(state.payoutEntries)) {
    const acc = state.accounts[p.accountId];
    if (!matchesCalendarFilters(acc, filters)) continue;
    const d = p.paidDate ?? p.requestedDate;
    if (!d.startsWith(prefix)) continue;
    n++;
  }
  return n;
}

/** Sum of payouts for the calendar year of `year` (effective date), after filters. */
export function yearlyPayoutTotalsFiltered(
  state: JournalDataV1,
  filters: CalendarFilters,
  year: number
): number {
  const prefix = `${year}-`;
  let totalCents = 0;
  for (const p of Object.values(state.payoutEntries)) {
    const acc = state.accounts[p.accountId];
    if (!matchesCalendarFilters(acc, filters)) continue;
    const d = payoutEffectiveDate(p);
    if (!d.startsWith(prefix)) continue;
    totalCents += journalPayoutDisplayCents(p, acc);
  }
  return totalCents;
}

/** All-time payout event count after filters. */
export function countPayoutEventsFiltered(state: JournalDataV1, filters: CalendarFilters): number {
  let n = 0;
  for (const p of Object.values(state.payoutEntries)) {
    const acc = state.accounts[p.accountId];
    if (!matchesCalendarFilters(acc, filters)) continue;
    n++;
  }
  return n;
}

/**
 * Consecutive calendar days ending at `today` with **no** payout on that day.
 * Returns `null` if no payout was ever logged (undefined dry spell).
 */
export function computeConsecutiveDaysWithoutPayout(
  payoutDates: Set<ISODate>,
  today: Date
): number | null {
  if (payoutDates.size === 0) return null;
  let streak = 0;
  const d = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  for (let i = 0; i < 4000; i++) {
    const iso = toIsoDateLocal(d);
    if (payoutDates.has(iso)) break;
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

export function daysInCalendarMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export function weekIndexContainingDate(grid: CalendarWeekRow[], dateIso: ISODate): number {
  for (let i = 0; i < grid.length; i++) {
    for (const c of grid[i]!.cells) {
      if (c.dateIso === dateIso) return i;
    }
  }
  return -1;
}

export function thisWeekRollupCents(
  grid: CalendarWeekRow[],
  weekRollups: { cents: number }[],
  todayIso: ISODate
): number | null {
  const idx = weekIndexContainingDate(grid, todayIso);
  if (idx < 0 || idx >= weekRollups.length) return null;
  return weekRollups[idx]!.cents;
}
