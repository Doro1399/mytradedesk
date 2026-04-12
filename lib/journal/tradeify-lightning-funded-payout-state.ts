import { fundedProgressPnlBaselineDate } from "@/lib/journal/funded-phase-pnl";
import {
  countLucidProNonRejectedPayouts,
  lucidProFundedCycleTotals,
} from "@/lib/journal/lucid-pro-funded-payout-state";
import {
  getTradeifyLightningFundedRowForAccount,
  isTradeifyLightningFundedJournalAccount,
} from "@/lib/journal/tradeify-journal-rules";
import type { TradeifyLightningFundedCsvRow } from "@/lib/journal/tradeify-lightning-funded-csv.generated";
import type { JournalAccount, JournalDataV1, JournalId } from "@/lib/journal/types";
import type { StoredTrade } from "@/lib/journal/trades-storage";
import { formatUsdWholeGrouped } from "@/lib/prop-firms";

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

function lightningPayoutMaxUsd(row: TradeifyLightningFundedCsvRow, payoutsCompleted: number): number {
  if (payoutsCompleted <= 0) return row.payoutMax1stUsd;
  if (payoutsCompleted === 1) return row.payoutMax2ndUsd;
  if (payoutsCompleted === 2) return row.payoutMax3rdUsd;
  return row.payoutMax4thPlusUsd;
}

function lightningProfitGoalUsdForCycle(row: TradeifyLightningFundedCsvRow, payoutsCompleted: number): number {
  return payoutsCompleted === 0 ? row.profitGoal1stCycleUsd : row.profitGoal2PlusCycleUsd;
}

function fmtCents(cents: number): string {
  return formatUsdWholeGrouped(Math.max(0, Math.round(cents)) / 100);
}

export type TradeifyLightningPayoutBlockKind =
  | "profit_goal"
  | "consistency"
  | "payout_min"
  | null;

export type TradeifyLightningPayoutState = {
  isEligible: boolean;
  eligibilityReason: string | null;
  blockingKind: TradeifyLightningPayoutBlockKind;
  cycleProfit: number;
  bestDayProfit: number;
  /** Ratio décimal CSV (ex. 0.2). */
  consistency: number;
  consistencyValid: boolean;
  requiredProfitForConsistency: number;
  profitGoal: number;
  payoutMin: number;
  payoutMax: number;
  availablePayout: number;
  effectiveTarget: number;
  showAddPayout: boolean;
  showGoodNews: boolean;
  /** Cents (interne). */
  cycleProfitCents: number;
  effectiveTargetCents: number;
  availablePayoutCents: number;
  payoutMaxCents: number;
  payoutMiniCents: number;
};

export type GetTradeifyLightningPayoutStateParams = {
  storedTrades?: readonly StoredTrade[];
};

/**
 * Tradeify Lightning funded : pas de buffer ; cycle reset après payout non rejeté ;
 * consistance CSV obligatoire ; pas de minimum de jours pour l’éligibilité.
 */
export function getTradeifyLightningPayoutState(
  state: JournalDataV1,
  account: JournalAccount,
  params: GetTradeifyLightningPayoutStateParams = {}
): TradeifyLightningPayoutState | null {
  if (!isTradeifyLightningFundedJournalAccount(account)) return null;
  const row = getTradeifyLightningFundedRowForAccount(account);
  if (!row) return null;

  const ratio = row.payoutConsistencyRatio;
  const ratioTicks = Math.round(ratio * 10000);

  const payoutsCompleted = countLucidProNonRejectedPayouts(state, account.id);
  const profitGoalUsd = lightningProfitGoalUsdForCycle(row, payoutsCompleted);
  const profitGoalCents = Math.round(profitGoalUsd * 100);
  const payoutMiniCents = Math.round(row.payoutMiniUsd * 100);
  const payoutMaxCents = Math.round(lightningPayoutMaxUsd(row, payoutsCompleted) * 100);

  const lastPayAt = lastNonRejectedPayoutCreatedAt(state, account.id);
  const fundedBaseline = fundedProgressPnlBaselineDate(account);
  const cycle = lucidProFundedCycleTotals(
    state,
    account.id,
    lastPayAt,
    fundedBaseline,
    params.storedTrades
  );

  const cycleProfitCents = cycle.totalCents;
  const bestDayProfitCents = cycle.bestDayCents;
  const bestPos = Math.max(0, bestDayProfitCents);

  const requiredProfitForConsistencyCents =
    ratio > 0 && bestPos > 0 ? Math.ceil(bestPos / ratio) : 0;
  const effectiveTargetCents = Math.max(
    profitGoalCents,
    requiredProfitForConsistencyCents,
    payoutMiniCents
  );

  const consistencyValid =
    ratio <= 0 ||
    (cycleProfitCents <= 0
      ? bestDayProfitCents <= 0
      : bestDayProfitCents * 10000 <= cycleProfitCents * ratioTicks);

  const profitGoalMet = cycleProfitCents >= profitGoalCents;

  const availablePayoutCents = Math.min(Math.max(0, cycleProfitCents), payoutMaxCents);
  const payoutMinOk = availablePayoutCents >= payoutMiniCents;

  const isEligible = profitGoalMet && consistencyValid && payoutMinOk;

  let blockingKind: TradeifyLightningPayoutBlockKind = null;
  if (!profitGoalMet) blockingKind = "profit_goal";
  else if (!consistencyValid) blockingKind = "consistency";
  else if (!payoutMinOk) blockingKind = "payout_min";

  let eligibilityReason: string | null = null;
  if (!isEligible) {
    if (blockingKind === "profit_goal") {
      const short = Math.max(0, profitGoalCents - cycleProfitCents);
      eligibilityReason = `Need ${fmtCents(short)} more cycle P/L to reach profit goal ${fmtCents(profitGoalCents)} (this cycle).`;
    } else if (blockingKind === "consistency") {
      const toConsistency = Math.max(0, requiredProfitForConsistencyCents - cycleProfitCents);
      eligibilityReason = `Consistency: your best day ${fmtCents(bestDayProfitCents)} exceeds ${row.payoutConsistencyDisplay} of cycle P/L. ${fmtCents(toConsistency)} to go.`;
    } else if (blockingKind === "payout_min") {
      eligibilityReason = `Withdrawable this cycle (${fmtCents(availablePayoutCents)}) is below the ${fmtCents(payoutMiniCents)} payout minimum (max ${fmtCents(payoutMaxCents)} this request).`;
    }
  }

  const showAddPayout = isEligible;
  const showGoodNews = isEligible;

  return {
    isEligible,
    eligibilityReason,
    blockingKind,
    cycleProfit: cycleProfitCents / 100,
    bestDayProfit: bestDayProfitCents / 100,
    consistency: ratio,
    consistencyValid,
    requiredProfitForConsistency: requiredProfitForConsistencyCents / 100,
    profitGoal: profitGoalUsd,
    payoutMin: row.payoutMiniUsd,
    payoutMax: payoutMaxCents / 100,
    availablePayout: availablePayoutCents / 100,
    effectiveTarget: effectiveTargetCents / 100,
    showAddPayout,
    showGoodNews,
    cycleProfitCents,
    effectiveTargetCents,
    availablePayoutCents,
    payoutMaxCents,
    payoutMiniCents,
  };
}
