import { journalPayoutDisplayCents } from "@/lib/journal/payout-display";
import type { StoredTrade, TradesStoreV1 } from "@/lib/journal/trades-storage";
import { isCommissionNoiseTrade } from "@/lib/journal/trade-metrics";
import type { AccountType, ISODate, JournalAccount, JournalDataV1, JournalPayoutEntry } from "@/lib/journal/types";

export type CalendarMode = "trades" | "payouts";

export type CalendarFilters = {
  firmKey: string;
  accountType: AccountType | "all";
  /** Account ids to include. Empty = none. */
  selectedAccountIds: string[];
};

export function firmKeyOf(acc: JournalAccount): string {
  return acc.propFirm.id.trim() || acc.propFirm.name.trim().toLowerCase();
}

export function matchesCalendarFilters(acc: JournalAccount | undefined, f: CalendarFilters): boolean {
  if (!acc || acc.isArchived) return false;
  if (f.accountType !== "all" && acc.accountType !== f.accountType) return false;
  if (f.firmKey !== "all" && firmKeyOf(acc) !== f.firmKey) return false;
  if (f.selectedAccountIds.length === 0) return false;
  if (!f.selectedAccountIds.includes(acc.id)) return false;
  return true;
}

export type DayAggregate = {
  cents: number;
  /** Journal P&L rows for this day (after filters). */
  count: number;
  /** Rows on the Trades page for this day (after filters). */
  storedTradeCount?: number;
};

export function dayHasCalendarActivity(agg: DayAggregate): boolean {
  return agg.cents !== 0 || agg.count > 0 || (agg.storedTradeCount ?? 0) > 0;
}

function monthPrefix(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

/** P&amp;L lines grouped by trade date (YYYY-MM-DD). */
export function aggregateDailyTrades(
  state: JournalDataV1,
  year: number,
  month: number,
  filters: CalendarFilters
): Map<ISODate, DayAggregate> {
  const prefix = monthPrefix(year, month);
  const map = new Map<ISODate, DayAggregate>();
  for (const e of Object.values(state.pnlEntries)) {
    if (!e.date.startsWith(prefix)) continue;
    const acc = state.accounts[e.accountId];
    if (!matchesCalendarFilters(acc, filters)) continue;
    const cur = map.get(e.date) ?? { cents: 0, count: 0 };
    cur.cents += e.pnlCents;
    cur.count += 1;
    map.set(e.date, cur);
  }
  return map;
}

/**
 * Adds per-day counts from persisted trades so calendar cells can show real trade count
 * (journal may only have one P&L line per account per day).
 */
export function mergeStoredTradeCountsIntoDaily(
  daily: Map<ISODate, DayAggregate>,
  trades: StoredTrade[],
  year: number,
  month: number,
  filters: CalendarFilters,
  state: JournalDataV1
): Map<ISODate, DayAggregate> {
  const prefix = monthPrefix(year, month);
  const out = new Map<ISODate, DayAggregate>();
  for (const [date, agg] of daily) {
    out.set(date, { ...agg, storedTradeCount: 0 });
  }
  for (const t of trades) {
    if (!t.date.startsWith(prefix)) continue;
    if (isCommissionNoiseTrade(t)) continue;
    const acc = state.accounts[t.accountId];
    if (!matchesCalendarFilters(acc, filters)) continue;
    const existing = out.get(t.date) ?? { cents: 0, count: 0, storedTradeCount: 0 };
    out.set(t.date, {
      ...existing,
      storedTradeCount: (existing.storedTradeCount ?? 0) + 1,
    });
  }
  return out;
}

function payoutEffectiveDate(p: JournalPayoutEntry): ISODate {
  return p.paidDate ?? p.requestedDate;
}

/** Payouts grouped by calendar day (paid date, else requested date). */
export function aggregateDailyPayouts(
  state: JournalDataV1,
  year: number,
  month: number,
  filters: CalendarFilters
): Map<ISODate, DayAggregate> {
  const prefix = monthPrefix(year, month);
  const map = new Map<ISODate, DayAggregate>();
  for (const p of Object.values(state.payoutEntries)) {
    const d = payoutEffectiveDate(p);
    if (!d.startsWith(prefix)) continue;
    const acc = state.accounts[p.accountId];
    if (!matchesCalendarFilters(acc, filters)) continue;
    const cents = journalPayoutDisplayCents(p, acc);
    const cur = map.get(d) ?? { cents: 0, count: 0 };
    cur.cents += cents;
    cur.count += 1;
    map.set(d, cur);
  }
  return map;
}

export type CalendarCellModel = {
  inMonth: boolean;
  /** ISO date for this cell (including padding days for prev/next month). */
  dateIso: ISODate;
  /** Day-of-month number to display. */
  dayNum: number;
};

export type CalendarWeekRow = { cells: CalendarCellModel[] };

function toIsoDate(d: Date): ISODate {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Monday-first, 6 rows × 7 columns. */
export function buildMonthGrid(year: number, month: number): CalendarWeekRow[] {
  const first = new Date(year, month - 1, 1);
  const startOffset = (first.getDay() + 6) % 7;
  let dayIndex = 1 - startOffset;
  const weeks: CalendarWeekRow[] = [];

  for (let w = 0; w < 6; w++) {
    const cells: CalendarCellModel[] = [];
    for (let c = 0; c < 7; c++) {
      const d = new Date(year, month - 1, dayIndex);
      const inMonth = d.getFullYear() === year && d.getMonth() === month - 1;
      cells.push({
        inMonth,
        dateIso: toIsoDate(d),
        dayNum: d.getDate(),
      });
      dayIndex += 1;
    }
    weeks.push({ cells });
  }

  return weeks;
}

const TRADE_CELL_SEP = "\x1e";

/** All ISO dates shown in the 6×7 grid (includes previous/next month padding). */
export function collectVisibleDatesFromGrid(weeks: CalendarWeekRow[]): Set<ISODate> {
  const s = new Set<ISODate>();
  for (const w of weeks) {
    for (const c of w.cells) s.add(c.dateIso);
  }
  return s;
}

/**
 * Trades-mode calendar P&amp;L: one source of truth from the trades store (rows + CSV modal daily)
 * plus manual journal lines only — avoids double-counting &quot;Synced from Trades&quot; journal rows.
 */
export function aggregateDailyTradesForDateSet(
  state: JournalDataV1,
  store: TradesStoreV1,
  dates: Set<ISODate>,
  filters: CalendarFilters
): Map<ISODate, DayAggregate> {
  const cell = new Map<string, number>();
  for (const t of store.trades) {
    if (!dates.has(t.date)) continue;
    const acc = state.accounts[t.accountId];
    if (!matchesCalendarFilters(acc, filters)) continue;
    const k = `${t.accountId}${TRADE_CELL_SEP}${t.date}`;
    cell.set(k, (cell.get(k) ?? 0) + t.pnlCents);
  }
  for (const [accId, dm] of Object.entries(store.csvModalDailyByAccount ?? {})) {
    const acc = state.accounts[accId];
    if (!matchesCalendarFilters(acc, filters)) continue;
    for (const [date, cents] of Object.entries(dm)) {
      if (!dates.has(date)) continue;
      cell.set(`${accId}${TRADE_CELL_SEP}${date}`, cents);
    }
  }
  const byDate = new Map<ISODate, { cents: number; storedTradeCount: number }>();
  for (const [k, cents] of cell) {
    const idx = k.indexOf(TRADE_CELL_SEP);
    const date = k.slice(idx + TRADE_CELL_SEP.length) as ISODate;
    const cur = byDate.get(date) ?? { cents: 0, storedTradeCount: 0 };
    cur.cents += cents;
    byDate.set(date, cur);
  }
  for (const t of store.trades) {
    if (!dates.has(t.date)) continue;
    if (isCommissionNoiseTrade(t)) continue;
    const acc = state.accounts[t.accountId];
    if (!matchesCalendarFilters(acc, filters)) continue;
    const cur = byDate.get(t.date) ?? { cents: 0, storedTradeCount: 0 };
    cur.storedTradeCount += 1;
    byDate.set(t.date, cur);
  }
  const out = new Map<ISODate, DayAggregate>();
  for (const [date, v] of byDate) {
    out.set(date, {
      cents: v.cents,
      count: 0,
      storedTradeCount: v.storedTradeCount,
    });
  }
  for (const e of Object.values(state.pnlEntries)) {
    if (e.source !== "manual") continue;
    if (!dates.has(e.date)) continue;
    const acc = state.accounts[e.accountId];
    if (!matchesCalendarFilters(acc, filters)) continue;
    const cur = out.get(e.date) ?? { cents: 0, count: 0, storedTradeCount: 0 };
    cur.cents += e.pnlCents;
    cur.count += 1;
    out.set(e.date, cur);
  }
  return out;
}

export function aggregateDailyPayoutsForDateSet(
  state: JournalDataV1,
  dates: Set<ISODate>,
  filters: CalendarFilters
): Map<ISODate, DayAggregate> {
  const map = new Map<ISODate, DayAggregate>();
  for (const p of Object.values(state.payoutEntries)) {
    const d = payoutEffectiveDate(p);
    if (!dates.has(d)) continue;
    const acc = state.accounts[p.accountId];
    if (!matchesCalendarFilters(acc, filters)) continue;
    const cents = journalPayoutDisplayCents(p, acc);
    const cur = map.get(d) ?? { cents: 0, count: 0 };
    cur.cents += cents;
    cur.count += 1;
    map.set(d, cur);
  }
  return map;
}

export function monthlyTotalsFromDaily(daily: Map<ISODate, DayAggregate>, year: number, month: number): {
  totalCents: number;
  activeDays: number;
} {
  const prefix = monthPrefix(year, month);
  let totalCents = 0;
  let activeDays = 0;
  for (const [date, agg] of daily) {
    if (!date.startsWith(prefix)) continue;
    if (!dayHasCalendarActivity(agg)) continue;
    totalCents += agg.cents;
    activeDays += 1;
  }
  return { totalCents, activeDays };
}

/**
 * Sums each week row. By default includes padding days (prev/next month) so week totals match the grid.
 * Set `onlyInMonthCells` to true to restrict to the viewed month only.
 */
export function weeklyRollupsFromGrid(
  weeks: CalendarWeekRow[],
  daily: Map<ISODate, DayAggregate>,
  options?: { onlyInMonthCells?: boolean }
): { cents: number; activeDays: number }[] {
  const onlyInMonth = options?.onlyInMonthCells ?? false;
  return weeks.map((week) => {
    let cents = 0;
    let activeDays = 0;
    for (const cell of week.cells) {
      if (onlyInMonth && !cell.inMonth) continue;
      const agg = daily.get(cell.dateIso);
      if (!agg || !dayHasCalendarActivity(agg)) continue;
      cents += agg.cents;
      activeDays += 1;
    }
    return { cents, activeDays };
  });
}

export function collectFirmOptions(state: JournalDataV1): { key: string; name: string }[] {
  const seen = new Map<string, string>();
  for (const acc of Object.values(state.accounts)) {
    if (acc.isArchived) continue;
    const k = firmKeyOf(acc);
    if (!seen.has(k)) seen.set(k, acc.propFirm.name.trim() || k);
  }
  return [...seen.entries()]
    .map(([key, name]) => ({ key, name }))
    .sort((a, b) => a.name.localeCompare(b.name, "en"));
}

/** Eligible account ids for firm + type filters (sorted). */
export function collectEligibleAccountIds(
  state: JournalDataV1,
  filters: Pick<CalendarFilters, "firmKey" | "accountType">
): string[] {
  const ids: string[] = [];
  for (const acc of Object.values(state.accounts)) {
    if (acc.isArchived) continue;
    if (filters.firmKey !== "all" && firmKeyOf(acc) !== filters.firmKey) continue;
    if (filters.accountType !== "all" && acc.accountType !== filters.accountType) continue;
    ids.push(acc.id);
  }
  ids.sort();
  return ids;
}
