import { fundedProgressPnlBaselineDate } from "@/lib/journal/funded-phase-pnl";
import type {
  ISODate,
  JournalAccount,
  JournalDataV1,
  JournalId,
  JournalPayoutEntry,
} from "@/lib/journal/types";
import type { TopStepFundedBlock } from "@/lib/journal/topstep-journal-rules";

/** YYYY-MM-DD ou préfixe ISO (même idée que `apex-funded-payout-cycle`, module séparé). */
function calendarDateKey(raw: string): string {
  const t = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  const slice = t.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(slice) ? slice : t;
}

function normalizedCalendarKey(raw: string): string {
  const k = calendarDateKey(raw);
  if (/^\d{4}-\d{2}-\d{2}$/.test(k)) return k;
  const t = Date.parse(raw.trim());
  if (!Number.isNaN(t)) {
    const d = new Date(t);
    const yy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yy}-${mm}-${dd}`;
  }
  const parts = k.split("-").map((p) => p.trim());
  if (parts.length === 3) {
    const y = Number.parseInt(parts[0]!, 10);
    const mo = Number.parseInt(parts[1]!, 10);
    const da = Number.parseInt(parts[2]!, 10);
    if (Number.isFinite(y) && Number.isFinite(mo) && Number.isFinite(da)) {
      return `${y}-${String(mo).padStart(2, "0")}-${String(da).padStart(2, "0")}`;
    }
  }
  return k;
}

function nextCalendarDayIso(iso: ISODate): ISODate {
  const key = normalizedCalendarKey(iso);
  const [y, m, d] = key.split("-").map((x) => Number.parseInt(x, 10));
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) {
    return calendarDateKey(iso);
  }
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + 1);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

function addCalendarDaysIso(iso: ISODate, extraDays: number): ISODate {
  let cur = iso;
  for (let i = 0; i < extraDays; i++) cur = nextCalendarDayIso(cur);
  return cur;
}

/** Jour civil du payout pour tri / frontière (date demandée, sinon payée, sinon jour de `createdAt`). */
function payoutSortCalendarDay(p: JournalPayoutEntry): string {
  const raw = p.requestedDate?.trim() || p.paidDate?.trim() || "";
  let nk = normalizedCalendarKey(raw);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(nk)) {
    nk = normalizedCalendarKey(p.createdAt.trim());
  }
  return nk;
}

function isOnOrAfterCalendarDay(entryDate: string, sinceInclusive: string): boolean {
  const a = normalizedCalendarKey(entryDate);
  const b = normalizedCalendarKey(sinceInclusive);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(a) || !/^\d{4}-\d{2}-\d{2}$/.test(b)) {
    return entryDate >= sinceInclusive;
  }
  const [ay, am, ad] = a.split("-").map((x) => Number.parseInt(x, 10));
  const [by, bm, bd] = b.split("-").map((x) => Number.parseInt(x, 10));
  const ta = new Date(ay, am - 1, ad).setHours(0, 0, 0, 0);
  const tb = new Date(by, bm - 1, bd).setHours(0, 0, 0, 0);
  return ta >= tb;
}

function buildPayoutCycleRows(
  state: JournalDataV1,
  accountId: JournalId,
  include: (p: JournalPayoutEntry) => boolean
): { p: JournalPayoutEntry; day: string }[] {
  const rows: { p: JournalPayoutEntry; day: string }[] = [];
  for (const p of Object.values(state.payoutEntries)) {
    if (p.accountId !== accountId) continue;
    if (!include(p)) continue;
    const day = payoutSortCalendarDay(p);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) continue;
    rows.push({ p, day });
  }
  return rows;
}

function computePayoutCycleStartFromRows(
  rows: { p: JournalPayoutEntry; day: string }[],
  account: JournalAccount
): ISODate | null {
  if (rows.length === 0) {
    return fundedProgressPnlBaselineDate(account) ?? account.startDate;
  }
  const sorted = [...rows].sort((a, b) => {
    if (a.day !== b.day) return a.day < b.day ? -1 : 1;
    return a.p.createdAt.localeCompare(b.p.createdAt);
  });
  const lastDay = sorted[sorted.length - 1]!.day;
  const sameLastDayCount = sorted.filter((r) => r.day === lastDay).length;
  const firstOpenDay = nextCalendarDayIso(lastDay);
  return addCalendarDaysIso(firstOpenDay, Math.max(0, sameLastDayCount - 1));
}

/**
 * Début **inclusif** du cycle payout (Topstep, Lucid Flex, Tradeify Select Flex) :
 * le jour où le **nouveau** cycle commence pour benchmark / PnL « depuis dernier retrait ».
 *
 * - Sans payout (hors rejetés) avec jour civil connu → baseline funded ou `startDate`.
 * - Sinon : lendemain du **dernier** jour de payout (tri date puis `createdAt`), **plus** un jour de plus
 *   par payout **supplémentaire** partageant ce même dernier jour calendaire.
 *
 * On n’exclut que `rejected` (les `requested` font avancer le front, utile import / brouillon).
 */
export function topStepFundedPayoutCycleStartInclusive(
  state: JournalDataV1,
  account: JournalAccount
): ISODate | null {
  return computePayoutCycleStartFromRows(
    buildPayoutCycleRows(state, account.id, (p) => p.status !== "rejected"),
    account
  );
}

export type TopStepFundedCycleAgg = {
  dailyProfitCents: Record<string, number>;
  /** Jours avec net du jour ≥ `minProfitPerDayUsd` (winning day Topstep). */
  winningDaysCount: number;
  /** Identique à `winningDaysCount` pour Topstep (spec : qualified = ≥ $150). */
  qualifiedDaysCount: number;
  profitSinceLastPayoutCents: number;
  bestDayProfitCents: number;
};

export function aggregateTopStepFundedPayoutCycle(
  state: JournalDataV1,
  account: JournalAccount,
  fd: TopStepFundedBlock
): TopStepFundedCycleAgg {
  const start = topStepFundedPayoutCycleStartInclusive(state, account);
  if (start == null || start === "") {
    return {
      dailyProfitCents: {},
      winningDaysCount: 0,
      qualifiedDaysCount: 0,
      profitSinceLastPayoutCents: 0,
      bestDayProfitCents: 0,
    };
  }
  const minProfitCents = Math.round(fd.minProfitPerDayUsd * 100);
  const daily: Record<string, number> = {};
  for (const e of Object.values(state.pnlEntries)) {
    if (e.accountId !== account.id) continue;
    if (!isOnOrAfterCalendarDay(e.date, start)) continue;
    const dk = normalizedCalendarKey(e.date);
    daily[dk] = (daily[dk] ?? 0) + e.pnlCents;
  }
  let winning = 0;
  let total = 0;
  let best = Number.NEGATIVE_INFINITY;
  for (const v of Object.values(daily)) {
    total += v;
    if (v > best) best = v;
    if (v >= minProfitCents) winning += 1;
  }
  if (best === Number.NEGATIVE_INFINITY) best = 0;
  return {
    dailyProfitCents: daily,
    winningDaysCount: winning,
    qualifiedDaysCount: winning,
    profitSinceLastPayoutCents: total,
    bestDayProfitCents: best,
  };
}

export function countTopStepPayoutEntries(state: JournalDataV1, accountId: JournalId): number {
  let n = 0;
  for (const p of Object.values(state.payoutEntries)) {
    if (p.accountId !== accountId) continue;
    if (p.status === "rejected") continue;
    n += 1;
  }
  return n;
}
