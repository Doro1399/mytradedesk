import { normalizedCalendarKey } from "@/lib/journal/apex-funded-payout-cycle";
import { fundedProgressPnlBaselineDate } from "@/lib/journal/funded-phase-pnl";
import {
  getLucidProFundedCsvRow,
  isLucidProFundedJournalAccount,
  parseLucidProFundedConsistencyRatio,
} from "@/lib/journal/lucid-journal-rules";
import type { ISODate, JournalAccount, JournalDataV1, JournalId } from "@/lib/journal/types";
import type { StoredTrade } from "@/lib/journal/trades-storage";
import { hasTptJournalActivityAfterTimestamp } from "@/lib/journal/tpt-funded-runway";
import { isPnlEntrySyncedFromTradesTable } from "@/lib/journal/trades-journal-sync";
import { formatUsdWholeGrouped } from "@/lib/prop-firms";

/** Mini brut demandable (CSV Lucid Pro funded). */
export const LUCID_PRO_FUNDED_MIN_PAYOUT_CENTS = 500 * 100;

function lastNonRejectedPayoutCreatedAt(
  state: JournalDataV1,
  accountId: JournalId
): string | null {
  let best: string | null = null;
  for (const p of Object.values(state.payoutEntries)) {
    if (p.accountId !== accountId) continue;
    if (p.status === "rejected") continue;
    const c = p.createdAt;
    if (best == null || c > best) best = c;
  }
  return best;
}

export function countLucidProNonRejectedPayouts(
  state: JournalDataV1,
  accountId: JournalId
): number {
  let n = 0;
  for (const p of Object.values(state.payoutEntries)) {
    if (p.accountId !== accountId) continue;
    if (p.status === "rejected") continue;
    n += 1;
  }
  return n;
}

function sumPnlCentsCreatedAfterLastPayout(
  state: JournalDataV1,
  accountId: string,
  lastPayoutCreatedAtIso: string
): number {
  let s = 0;
  for (const e of Object.values(state.pnlEntries)) {
    if (e.accountId !== accountId) continue;
    if (e.createdAt > lastPayoutCreatedAtIso) s += e.pnlCents;
  }
  return s;
}

/**
 * P&L du cycle courant par jour calendaire : journal + trades optionnels.
 * Réinitialisé après chaque payout (non rejeté) : `createdAt` / `importedAt` strictement après.
 */
function pnlEventInFundedCycleWindow(
  isoDate: string,
  eventTimeIso: string,
  lastPayAt: string | null,
  fundedBaseline: ISODate | undefined
): boolean {
  if (lastPayAt != null) {
    if (eventTimeIso <= lastPayAt) return false;
  } else if (fundedBaseline) {
    if (normalizedCalendarKey(isoDate) < normalizedCalendarKey(fundedBaseline)) return false;
  }
  return true;
}

export function lucidProFundedCycleTotals(
  state: JournalDataV1,
  accountId: string,
  lastPayAt: string | null,
  fundedBaseline: ISODate | undefined,
  trades?: readonly StoredTrade[]
): { totalCents: number; bestDayCents: number } {
  /** Toujours `YYYY-MM-DD` — aligné journal / trades / clés skip double comptage. */
  const byDay = new Map<string, number>();

  /**
   * Jours (dans la fenêtre cycle) déjà couverts par une ligne « sync Trades » ou import CSV agrégé.
   * Les trades stockés pour ces jours sont ignorés pour éviter le double comptage avec le journal.
   */
  const tradeSyncDayKeys = new Set<string>();
  for (const e of Object.values(state.pnlEntries)) {
    if (e.accountId !== accountId) continue;
    if (!pnlEventInFundedCycleWindow(e.date, e.createdAt, lastPayAt, fundedBaseline)) continue;
    if (isPnlEntrySyncedFromTradesTable(e)) {
      tradeSyncDayKeys.add(`${accountId}::${normalizedCalendarKey(e.date)}`);
    }
  }

  const include = (isoDate: string, eventTimeIso: string, pnlCents: number) => {
    if (!pnlEventInFundedCycleWindow(isoDate, eventTimeIso, lastPayAt, fundedBaseline)) return;
    const dk = normalizedCalendarKey(isoDate);
    byDay.set(dk, (byDay.get(dk) ?? 0) + pnlCents);
  };

  for (const e of Object.values(state.pnlEntries)) {
    if (e.accountId !== accountId) continue;
    include(e.date, e.createdAt, e.pnlCents);
  }
  if (trades) {
    for (const t of trades) {
      if (t.accountId !== accountId) continue;
      if (tradeSyncDayKeys.has(`${accountId}::${normalizedCalendarKey(t.date)}`)) continue;
      include(t.date, t.importedAt, t.pnlCents);
    }
  }

  let totalCents = 0;
  let bestDayCents = 0;
  for (const v of byDay.values()) {
    totalCents += v;
    if (v > bestDayCents) bestDayCents = v;
  }
  return { totalCents, bestDayCents };
}

/**
 * Target cycle (balance au-dessus de la base retirable) :
 * max(profit goal inter-cycles, ⌈best_day / 40 %⌉, marge mini pour payout $500).
 * La part consistance n’entre en jeu qu’à partir du **2ᵉ** cycle (après au moins 1 payout), comme Apex.
 */
export function lucidProFundedEffectiveTargetCents(
  profitGoalCents: number,
  bestDayCents: number,
  sigma: number,
  applyConsistency: boolean
): {
  profitGoalCents: number;
  consistencyRequiredCents: number;
  minPayoutMarginCents: number;
  effectiveTargetCents: number;
} {
  const s = Number.isFinite(sigma) && sigma > 0 ? sigma : 0.4;
  const consistencyRequiredCents =
    applyConsistency && bestDayCents > 0 ? Math.ceil(bestDayCents / s) : 0;
  const minPayoutMarginCents = LUCID_PRO_FUNDED_MIN_PAYOUT_CENTS;
  const effectiveTargetCents = Math.max(
    profitGoalCents,
    consistencyRequiredCents,
    minPayoutMarginCents
  );
  return {
    profitGoalCents,
    consistencyRequiredCents,
    minPayoutMarginCents,
    effectiveTargetCents,
  };
}

export type LucidProPayoutState = {
  /** Profit goal minimum entre cycles (CSV : 250 / 500 / 750 / 1 000 selon taille). */
  profitGoalCents: number;
  /** ⌈best_day / 40 %⌉ (ou σ CSV si parsable). */
  consistencyRequiredCents: number;
  /** 500 $ — troisième terme du max(target). */
  minPayoutMarginCents: number;
  /** max(profit goal, consistance, 500 $). */
  effectiveTargetCents: number;
  cycleTotalCents: number;
  cycleBestDayCents: number;
  profitGoalMet: boolean;
  consistencyOk: boolean;
  balanceCents: number;
  bufferAbsCents: number;
  pastBuffer: boolean;
  withdrawableBaseCents: number;
  withdrawableRawCents: number;
  payoutCapCents: number;
  availablePayoutCents: number;
  payoutMinCents: number;
  /** Les 4 règles (goal, consistance, buffer, payout ≥ 500) — sans activité post-payout. */
  isEligible: boolean;
  eligibilityReason: string | null;
  hasActivityAfterLastPayout: boolean;
  /** Éligible + nouvelle ligne P&L / trade après le dernier payout. */
  showAddPayout: boolean;
  payoutCountNonRejected: number;
  firstPayoutCycle: boolean;
  /** True dès qu’au moins un payout non rejeté : règle 40 % active (comme Apex 2ᵉ+). */
  applyConsistencyRule: boolean;
  sigmaUsed: number;
};

export type GetLucidProPayoutStateParams = {
  startCents: number;
  bufferStrideCents: number;
  balanceCents: number;
  storedTrades?: readonly StoredTrade[];
};

/**
 * État payout Lucid Pro funded : goal inter-cycles, consistance 40 % **après le 1ᵉʳ payout**,
 * buffer, mini $500 brut, plafond 1ʳᵉ / suivants selon CSV. Montants en cents.
 */
export function getLucidProPayoutState(
  state: JournalDataV1,
  account: JournalAccount,
  params: GetLucidProPayoutStateParams
): LucidProPayoutState | null {
  if (!isLucidProFundedJournalAccount(account)) return null;
  const csv = getLucidProFundedCsvRow(account);
  if (!csv) return null;

  const S = params.startCents;
  const B = Math.max(1, params.bufferStrideCents);
  const balance = params.balanceCents;
  const bufferAbs = S + B;

  const sigmaParsed = parseLucidProFundedConsistencyRatio(csv);
  const sigmaUsed =
    sigmaParsed != null && Number.isFinite(sigmaParsed) && sigmaParsed > 0
      ? sigmaParsed
      : 0.4;

  const profitGoalCents = Math.round(csv.payoutMiniUsd * 100);

  const payoutCountNonRejected = countLucidProNonRejectedPayouts(state, account.id);
  const firstPayoutCycle = payoutCountNonRejected === 0;
  const applyConsistencyRule = payoutCountNonRejected >= 1;
  const X1 = Math.round(csv.payoutMax1stUsd * 100);
  const X2 = Math.round(csv.payoutMaxSubsequentUsd * 100);
  const payoutCapCents = firstPayoutCycle ? X1 : X2;

  const lastPayAt = lastNonRejectedPayoutCreatedAt(state, account.id);
  const pnlSinceLastPayoutCents =
    lastPayAt != null
      ? sumPnlCentsCreatedAfterLastPayout(state, account.id, lastPayAt)
      : 0;
  const refAfterLastPayoutCents = balance - pnlSinceLastPayoutCents;

  let withdrawableBaseCents: number;
  if (firstPayoutCycle) {
    withdrawableBaseCents = bufferAbs;
  } else {
    withdrawableBaseCents = refAfterLastPayoutCents;
  }

  const fundedBaseline = fundedProgressPnlBaselineDate(account);
  const cycle = lucidProFundedCycleTotals(
    state,
    account.id,
    lastPayAt,
    fundedBaseline,
    params.storedTrades
  );

  const targets = lucidProFundedEffectiveTargetCents(
    profitGoalCents,
    cycle.bestDayCents,
    sigmaUsed,
    applyConsistencyRule
  );

  const profitGoalMet = cycle.totalCents >= profitGoalCents;
  const sigmaTicks = Math.round(sigmaUsed * 10000);
  const consistencyOk =
    !applyConsistencyRule ||
    (cycle.totalCents <= 0
      ? cycle.bestDayCents <= 0
      : cycle.bestDayCents * 10000 <= cycle.totalCents * sigmaTicks);

  const pastBuffer = balance >= bufferAbs;
  const withdrawableRawCents = Math.max(0, balance - withdrawableBaseCents);
  const availablePayoutCents = Math.min(withdrawableRawCents, payoutCapCents);
  const payoutMinCents = LUCID_PRO_FUNDED_MIN_PAYOUT_CENTS;

  const payoutAtLeastMin = availablePayoutCents >= payoutMinCents;

  const isEligible =
    profitGoalMet && consistencyOk && pastBuffer && payoutAtLeastMin;

  /**
   * Un seul message si utile : buffer → profit goal cycle → consistance.
   * Pas de copy sur le mini $500 retirable (l’utilisateur ne veut pas ce panneau).
   */
  let eligibilityReason: string | null = null;
  if (!isEligible) {
    if (!pastBuffer) {
      eligibilityReason = "Balance must be at or above buffer before payout";
    } else if (!profitGoalMet) {
      const short = Math.max(0, profitGoalCents - cycle.totalCents);
      eligibilityReason = `Need ${formatUsdWholeGrouped(short / 100)} more cycle profit (goal ${formatUsdWholeGrouped(profitGoalCents / 100)} this cycle)`;
    } else if (applyConsistencyRule && !consistencyOk && cycle.totalCents > 0) {
      eligibilityReason = `40% rule: need cycle profit ≥ ${formatUsdWholeGrouped(targets.consistencyRequiredCents / 100)} (best day ${formatUsdWholeGrouped(cycle.bestDayCents / 100)})`;
    } else if (!payoutAtLeastMin) {
      eligibilityReason = null;
    } else {
      eligibilityReason = "Not eligible";
    }
  }

  const hasActivityAfterLastPayout =
    lastPayAt == null ||
    hasTptJournalActivityAfterTimestamp(
      state,
      account.id,
      lastPayAt,
      params.storedTrades
    );

  const showAddPayout = isEligible && hasActivityAfterLastPayout;

  return {
    profitGoalCents: targets.profitGoalCents,
    consistencyRequiredCents: targets.consistencyRequiredCents,
    minPayoutMarginCents: targets.minPayoutMarginCents,
    effectiveTargetCents: targets.effectiveTargetCents,
    cycleTotalCents: cycle.totalCents,
    cycleBestDayCents: cycle.bestDayCents,
    profitGoalMet,
    consistencyOk,
    balanceCents: balance,
    bufferAbsCents: bufferAbs,
    pastBuffer,
    withdrawableBaseCents,
    withdrawableRawCents,
    payoutCapCents,
    availablePayoutCents,
    payoutMinCents,
    isEligible,
    eligibilityReason,
    hasActivityAfterLastPayout,
    showAddPayout,
    payoutCountNonRejected,
    firstPayoutCycle,
    applyConsistencyRule,
    sigmaUsed,
  };
}
