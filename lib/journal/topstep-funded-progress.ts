import { fundedProgressPnlBaselineDate } from "@/lib/journal/funded-phase-pnl";
import { getTopStepFundedBlockForAccount } from "@/lib/journal/topstep-journal-rules";
import type { ISODate, JournalAccount, JournalDataV1 } from "@/lib/journal/types";

/**
 * Plus tôt entre `startDate` et la date la plus ancienne d’une ligne P&L du compte.
 */
function topStepStandardPathPnlBaselineDate(state: JournalDataV1, account: JournalAccount): string {
  let baseline = account.startDate;
  for (const e of Object.values(state.pnlEntries)) {
    if (e.accountId !== account.id) continue;
    if (e.date < baseline) baseline = e.date;
  }
  return baseline;
}

/** Normalise YYYY-M-D → YYYY-MM-DD pour comparaisons lexicographiques fiables. */
function canonYmd(raw: string): string {
  const s = raw.trim().slice(0, 10);
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s);
  if (m) {
    return `${m[1]}-${m[2]!.padStart(2, "0")}-${m[3]!.padStart(2, "0")}`;
  }
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : s;
}

function maxIsoDate(a: string, b: string): string {
  const ca = canonYmd(a);
  const cb = canonYmd(b);
  return ca >= cb ? ca : cb;
}

/**
 * Dernière date calendaire d’un payout **payé** uniquement.
 * Les entrées `requested` / `approved` ne réinitialisent pas le cycle Standard path (sinon 0 jour qualifiant tant que la date demandée est dans le futur ou après les trades).
 */
export function getLastPaidPayoutCalendarIso(
  state: JournalDataV1,
  accountId: string
): ISODate | null {
  let best: string | null = null;
  for (const p of Object.values(state.payoutEntries)) {
    if (p.accountId !== accountId) continue;
    if (p.status !== "paid") continue;
    const raw = (p.paidDate ?? p.requestedDate).trim().slice(0, 10);
    const c = canonYmd(raw);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(c)) continue;
    if (best == null || c > best) best = c;
  }
  return best;
}

/** @deprecated Utiliser {@link getLastPaidPayoutCalendarIso}. */
export function getLastPayoutCalendarIso(
  state: JournalDataV1,
  accountId: string
): ISODate | null {
  return getLastPaidPayoutCalendarIso(state, accountId);
}

export type TopStepImportQualifyingSummary = {
  qualifyingDays: number;
  requiredDays: number;
  minProfitPerDayUsd: number;
  /** Dernier payout **payé** après lequel on compte (null si aucun). */
  countedAfterPayoutDate: ISODate | null;
  /** Somme des lignes P&L journal dans la même fenêtre. */
  journalPnlCentsInWindow: number;
};

/**
 * Jours distincts avec P&L journal ≥ min / jour (CSV), depuis le début **phase funded** aligné sur la carte Progress,
 * et strictement après le dernier payout **payé** s’il existe.
 */
export function countTopStepStandardPathQualifyingImportDays(
  state: JournalDataV1,
  account: JournalAccount
): TopStepImportQualifyingSummary | null {
  const fd = getTopStepFundedBlockForAccount(account);
  if (!fd) return null;

  const acctMin = topStepStandardPathPnlBaselineDate(state, account);
  const fundedStart = fundedProgressPnlBaselineDate(account);
  /**
   * Avec snapshot P&L funded (`fundedProgressBaselinePnlCents`), le profit affiché peut inclure des lignes
   * datées avant `fundedConvertedDate` : on garde la baseline « plus tôt P&L / start » pour ne pas zéroter les jours.
   * Sans snapshot, on aligne sur le début de phase funded comme le P&L `sinceDate` de la carte.
   */
  const effectiveBaseline =
    account.fundedProgressBaselinePnlCents == null && fundedStart != null
      ? maxIsoDate(acctMin, canonYmd(fundedStart))
      : acctMin;

  const lastPaidIso = getLastPaidPayoutCalendarIso(state, account.id);
  const lastPaidCanon = lastPaidIso != null ? canonYmd(lastPaidIso) : null;

  const minCents = Math.round(fd.minProfitPerDayUsd * 100);

  const byDay = new Map<string, number>();
  let journalPnlCentsInWindow = 0;
  for (const e of Object.values(state.pnlEntries)) {
    if (e.accountId !== account.id) continue;
    const d = canonYmd(e.date);
    if (d < canonYmd(effectiveBaseline)) continue;
    if (lastPaidCanon != null && d <= lastPaidCanon) continue;
    journalPnlCentsInWindow += e.pnlCents;
    byDay.set(d, (byDay.get(d) ?? 0) + e.pnlCents);
  }

  let qualifyingDays = 0;
  for (const cents of byDay.values()) {
    if (cents >= minCents) qualifyingDays += 1;
  }

  return {
    qualifyingDays,
    requiredDays: fd.minTradingDays,
    minProfitPerDayUsd: fd.minProfitPerDayUsd,
    countedAfterPayoutDate: lastPaidIso,
    journalPnlCentsInWindow,
  };
}
