import { getAccountPayoutTotalDisplayCents } from "@/lib/journal/payout-display";
import type { ISODate, JournalAccount, JournalDataV1, JournalId } from "@/lib/journal/types";

/** YYYY-MM-DD ou préfixe d’une chaîne ISO datetime. */
function calendarDateKey(raw: string): string {
  const t = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  const slice = t.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(slice) ? slice : t;
}

/** Comparaison par jour civil local (aligne P&L manuel et jalons compte). */
export function isOnOrAfterCalendarDay(entryDate: string, sinceInclusive: string): boolean {
  const a = calendarDateKey(entryDate);
  const b = calendarDateKey(sinceInclusive);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(a) || !/^\d{4}-\d{2}-\d{2}$/.test(b)) {
    return entryDate >= sinceInclusive;
  }
  const [ay, am, ad] = a.split("-").map((x) => Number.parseInt(x, 10));
  const [by, bm, bd] = b.split("-").map((x) => Number.parseInt(x, 10));
  const ta = new Date(ay, am - 1, ad).setHours(0, 0, 0, 0);
  const tb = new Date(by, bm - 1, bd).setHours(0, 0, 0, 0);
  return ta >= tb;
}

export type AccountFinancialMetrics = {
  accountId: JournalId;
  totalPnlCents: number;
  totalFeesCents: number;
  totalPayoutsCents: number;
  netCashCents: number; // payouts - fees
};

export type DashboardFinancialMetrics = {
  totalInvestedCents: number;
  totalPayoutsCents: number;
  netProfitCents: number;
  totalAccounts: number;
  activeAccounts: number;
};

export function sumByAccount<T extends { accountId: JournalId }>(
  entries: Record<JournalId, T>,
  accountId: JournalId,
  amountGetter: (item: T) => number
): number {
  let sum = 0;
  for (const entry of Object.values(entries)) {
    if (entry.accountId !== accountId) continue;
    sum += amountGetter(entry);
  }
  return sum;
}

/** Somme des P&L à partir d’une date calendaire incluse ; sans date = tout l’historique du compte. */
/**
 * Solde théorique **au matin du premier jour** `cycleFirstDayInclusive` (avant PnL de ce jour) :
 * nominal + PnL daté **strictement avant** ce jour (optionnellement seulement depuis `fundedPnlSinceInclusive`
 * pour coller au « Now » funded post-conversion) − retraits qui impactent « Now »
 * ({@link getAccountBalancePayoutDeductionGrossCents} : hors rejetés et **requested**), date de payout &lt; ce jour.
 * Aligné avec le début de cycle passé par l’appelant (Legacy : {@link fundedNextLegacyPayoutCycleStartIso}).
 */
export function accountNominalBalanceCentsAtFundedPayoutCycleStart(
  state: JournalDataV1,
  accountId: JournalId,
  nominalStartCents: number,
  cycleFirstDayInclusive: string,
  options?: { fundedPnlSinceInclusive?: string | null }
): number {
  const cs = calendarDateKey(cycleFirstDayInclusive.trim());
  if (!/^\d{4}-\d{2}-\d{2}$/.test(cs)) return nominalStartCents;
  const fundedSinceRaw = options?.fundedPnlSinceInclusive?.trim();
  const fundedSince =
    fundedSinceRaw && /^\d{4}-\d{2}-\d{2}$/.test(calendarDateKey(fundedSinceRaw))
      ? calendarDateKey(fundedSinceRaw)
      : null;
  let bal = nominalStartCents;
  for (const e of Object.values(state.pnlEntries)) {
    if (e.accountId !== accountId) continue;
    if (isOnOrAfterCalendarDay(e.date, cs)) continue;
    if (fundedSince != null && !isOnOrAfterCalendarDay(e.date, fundedSince)) continue;
    bal += e.pnlCents;
  }
  for (const p of Object.values(state.payoutEntries)) {
    if (p.accountId !== accountId) continue;
    if (p.status === "rejected" || p.status === "requested") continue;
    const raw = (p.requestedDate?.trim() || p.paidDate?.trim() || "").slice(0, 10);
    const pd = calendarDateKey(raw);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(pd)) continue;
    if (isOnOrAfterCalendarDay(pd, cs)) continue;
    bal -= p.grossAmountCents;
  }
  return bal;
}

export function getAccountPnlCentsSinceDate(
  state: JournalDataV1,
  accountId: JournalId,
  sinceInclusive: ISODate | null | undefined
): number {
  if (sinceInclusive == null || sinceInclusive === "") {
    return sumByAccount(state.pnlEntries, accountId, (e) => e.pnlCents);
  }
  let sum = 0;
  for (const e of Object.values(state.pnlEntries)) {
    if (e.accountId !== accountId) continue;
    if (isOnOrAfterCalendarDay(e.date, sinceInclusive)) sum += e.pnlCents;
  }
  return sum;
}

/**
 * Retraits qui ont quitté le compte (solde « Now ») : gross, hors rejetés et demandes non payées.
 */
export function getAccountBalancePayoutDeductionGrossCents(
  state: JournalDataV1,
  accountId: JournalId
): number {
  let s = 0;
  for (const p of Object.values(state.payoutEntries)) {
    if (p.accountId !== accountId) continue;
    if (p.status === "rejected" || p.status === "requested") continue;
    s += p.grossAmountCents;
  }
  return s;
}

export function getAccountFinancialMetrics(
  state: JournalDataV1,
  accountId: JournalId
): AccountFinancialMetrics {
  const totalPnlCents = sumByAccount(state.pnlEntries, accountId, (e) => e.pnlCents);
  const totalFeesCents = sumByAccount(state.feeEntries, accountId, (e) => e.amountCents);
  const totalPayoutsCents = sumByAccount(state.payoutEntries, accountId, (e) => e.grossAmountCents);
  return {
    accountId,
    totalPnlCents,
    totalFeesCents,
    totalPayoutsCents,
    netCashCents: totalPayoutsCents - totalFeesCents,
  };
}

export function getAllAccountFinancialMetrics(state: JournalDataV1): AccountFinancialMetrics[] {
  return Object.keys(state.accounts).map((accountId) =>
    getAccountFinancialMetrics(state, accountId)
  );
}

export function getDashboardFinancialMetrics(state: JournalDataV1): DashboardFinancialMetrics {
  const perAccount = getAllAccountFinancialMetrics(state);
  const totalInvestedCents = perAccount.reduce((acc, v) => acc + v.totalFeesCents, 0);
  const totalPayoutsCents = Object.keys(state.accounts).reduce(
    (acc, id) => acc + getAccountPayoutTotalDisplayCents(state, id),
    0
  );
  const totalAccounts = Object.keys(state.accounts).length;
  const activeAccounts = Object.values(state.accounts).filter(
    (a) => a.status === "active" && !a.isArchived
  ).length;
  return {
    totalInvestedCents,
    totalPayoutsCents,
    netProfitCents: totalPayoutsCents - totalInvestedCents,
    totalAccounts,
    activeAccounts,
  };
}

export function getAccountsByType(
  state: JournalDataV1,
  accountType: JournalAccount["accountType"]
): JournalAccount[] {
  return Object.values(state.accounts).filter((a) => a.accountType === accountType);
}

