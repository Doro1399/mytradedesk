import type { ApexFundedBlock } from "@/lib/journal/apex-journal-rules";
import { fundedProgressPnlBaselineDate } from "@/lib/journal/funded-phase-pnl";
import type {
  ISODate,
  JournalAccount,
  JournalDataV1,
  JournalId,
  JournalPayoutEntry,
} from "@/lib/journal/types";

/** YYYY-MM-DD ou préfixe ISO (aligné sur `selectors.ts`). */
function calendarDateKey(raw: string): string {
  const t = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  const slice = t.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(slice) ? slice : t;
}

/**
 * Clé calendaire **toujours** `YYYY-MM-DD` pour comparaisons lexicographiques fiables.
 * Sans ça, `2025-4-8` vs `2025-12-01` trie mal et le « dernier payout » / début de cycle sont faux
 * → les jours qualifiés ne se réinitialisent pas après un payout.
 * Exportée pour le cycle Lucid / Lightning (évite double comptage journal vs trades).
 */
export function normalizedCalendarKey(raw: string): string {
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

export function nextCalendarDayIso(iso: ISODate): ISODate {
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

/**
 * Payout le plus récent pour le compte : date demande **normalisée** max, puis `createdAt` si même jour
 * (évite de garder un vieux payout comme borne de cycle).
 */
function apexFundedLatestPayoutEntry(
  state: JournalDataV1,
  accountId: JournalId
): JournalPayoutEntry | null {
  let best: JournalPayoutEntry | null = null;
  let bestNorm = "";
  for (const p of Object.values(state.payoutEntries)) {
    if (p.accountId !== accountId) continue;
    const nk = normalizedCalendarKey(p.requestedDate);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(nk)) continue;
    if (
      best == null ||
      nk > bestNorm ||
      (nk === bestNorm && p.createdAt > best.createdAt)
    ) {
      best = p;
      bestNorm = nk;
    }
  }
  return best;
}

/** Dernière date de demande de payout (valeur brute, pour affichage) — logique de tri = `apexFundedLatestPayoutEntry`. */
export function apexFundedLastPayoutRequestedDate(
  state: JournalDataV1,
  accountId: JournalId
): ISODate | null {
  return apexFundedLatestPayoutEntry(state, accountId)?.requestedDate ?? null;
}

/**
 * Début **inclusif** du cycle payout courant : jour calendaire suivant le dernier payout,
 * ou entrée en phase funded (baseline) s’il n’y a aucun payout.
 */
export function apexFundedPayoutCycleStartInclusive(
  state: JournalDataV1,
  account: JournalAccount
): ISODate | null {
  const latest = apexFundedLatestPayoutEntry(state, account.id);
  if (latest == null) {
    return fundedProgressPnlBaselineDate(account) ?? account.startDate;
  }
  return nextCalendarDayIso(latest.requestedDate);
}

/** Dernier payout **approuvé ou payé** — borne de reset de cycle Tradeify Growth funded. */
function tradeifyGrowthFundedLatestApprovedPayoutEntry(
  state: JournalDataV1,
  accountId: JournalId
): JournalPayoutEntry | null {
  let best: JournalPayoutEntry | null = null;
  let bestNorm = "";
  for (const p of Object.values(state.payoutEntries)) {
    if (p.accountId !== accountId) continue;
    if (p.status !== "approved" && p.status !== "paid") continue;
    const nk = normalizedCalendarKey(p.requestedDate);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(nk)) continue;
    if (
      best == null ||
      nk > bestNorm ||
      (nk === bestNorm && p.createdAt > best.createdAt)
    ) {
      best = p;
      bestNorm = nk;
    }
  }
  return best;
}

/**
 * Début inclusif du cycle Growth : lendemain du dernier payout approuvé/payé,
 * ou baseline funded si aucun.
 */
export function tradeifyGrowthFundedPayoutCycleStartInclusive(
  state: JournalDataV1,
  account: JournalAccount
): ISODate | null {
  const latest = tradeifyGrowthFundedLatestApprovedPayoutEntry(state, account.id);
  if (latest == null) {
    return fundedProgressPnlBaselineDate(account) ?? account.startDate;
  }
  return nextCalendarDayIso(latest.requestedDate);
}

export type ApexFundedCycleAgg = {
  /** P&L net par jour civil (somme des lignes journal ce jour-là). */
  dailyProfitCents: Record<string, number>;
  /** Jours avec au moins une ligne P&L et profit du jour ≥ minimum CSV. */
  qualifiedTradingDaysCount: number;
  /** Somme des P&L journal sur le cycle (même fenêtre que les jours agrégés). */
  totalCycleProfitCents: number;
  /** Max des profits journaliers sur le cycle (peut être négatif). */
  bestDayProfitCents: number;
};

const EMPTY_CYCLE_AGG: ApexFundedCycleAgg = {
  dailyProfitCents: {},
  qualifiedTradingDaysCount: 0,
  totalCycleProfitCents: 0,
  bestDayProfitCents: 0,
};

/**
 * Agrège une fenêtre cycle à partir des `pnlEntries` (1 ligne = contribution au jour civil).
 */
export function aggregateJournalFundedPayoutCycleFromStart(
  state: JournalDataV1,
  account: JournalAccount,
  start: ISODate | null | "",
  minProfitPerDayUsd: number
): ApexFundedCycleAgg {
  if (start == null || start === "") {
    return { ...EMPTY_CYCLE_AGG, dailyProfitCents: {} };
  }
  const minProfitCents = Math.round(minProfitPerDayUsd * 100);
  const daily: Record<string, number> = {};
  for (const e of Object.values(state.pnlEntries)) {
    if (e.accountId !== account.id) continue;
    if (!isOnOrAfterCalendarDay(e.date, start)) continue;
    const dk = normalizedCalendarKey(e.date);
    daily[dk] = (daily[dk] ?? 0) + e.pnlCents;
  }
  let qualified = 0;
  let total = 0;
  let best = Number.NEGATIVE_INFINITY;
  for (const v of Object.values(daily)) {
    total += v;
    if (v > best) best = v;
    if (v >= minProfitCents) qualified += 1;
  }
  if (best === Number.NEGATIVE_INFINITY) best = 0;
  return {
    dailyProfitCents: daily,
    qualifiedTradingDaysCount: qualified,
    totalCycleProfitCents: total,
    bestDayProfitCents: best,
  };
}

/**
 * Agrège le cycle payout courant à partir des `pnlEntries` (1 ligne = contribution au jour).
 * Jour qualifié : somme du jour ≥ `minProfitPerDayUsd` du bloc funded Apex (CSV).
 */
export function aggregateApexFundedPayoutCycle(
  state: JournalDataV1,
  account: JournalAccount,
  fd: ApexFundedBlock
): ApexFundedCycleAgg {
  const start = apexFundedPayoutCycleStartInclusive(state, account);
  return aggregateJournalFundedPayoutCycleFromStart(state, account, start, fd.minProfitPerDayUsd);
}

/** Cycle Tradeify Growth : reset après payout approuvé/payé uniquement. */
export function aggregateTradeifyGrowthFundedPayoutCycle(
  state: JournalDataV1,
  account: JournalAccount,
  minProfitPerDayUsd: number
): ApexFundedCycleAgg {
  const start = tradeifyGrowthFundedPayoutCycleStartInclusive(state, account);
  return aggregateJournalFundedPayoutCycleFromStart(state, account, start, minProfitPerDayUsd);
}

/** Seuil de jours qualifiés : valeur `Minimum trading days` du CSV funded Apex. */
export function apexFundedRequiredQualifiedDays(fd: ApexFundedBlock): number {
  return fd.minTradingDays;
}

/**
 * Cible payout en cents pour le cycle : à partir du 2e payout, `max(mini, ceil(bestDay+/0.5))`.
 * `bestDay+` = max(0, meilleur jour). Premier cycle : uniquement le mini ($500).
 */
export function apexFundedEffectivePayoutTargetCents(
  applyConsistency: boolean,
  fd: ApexFundedBlock,
  bestDayProfitCents: number
): number {
  const miniCents = Math.round(fd.payoutMiniUsd * 100);
  if (!applyConsistency) return miniCents;
  const bestPos = Math.max(0, bestDayProfitCents);
  const consistencyFloorCents = Math.ceil(bestPos / 0.5);
  return Math.max(miniCents, consistencyFloorCents);
}
