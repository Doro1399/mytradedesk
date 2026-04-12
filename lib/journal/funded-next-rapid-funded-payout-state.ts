import {
  aggregateTradeifySelectFundedMaxSingleDayPnlCentsSince,
  aggregateTradeifySelectFundedPnlCentsSince,
  tradeifySelectFundedPayoutCycleStartInclusive,
} from "@/lib/journal/tradeify-select-flex-funded-payout-state";
import {
  FUNDED_NEXT_RAPID_FUNDED_FROM_CSV,
  type FundedNextRapidCsvSize,
} from "@/lib/journal/funded-next-rapid-funded-csv.generated";
import {
  isFundedNextRapidFundedJournalAccount,
  parseFundedNextRewardSplitRatio,
} from "@/lib/journal/funded-next-journal-rules";
import type { JournalAccount, JournalDataV1 } from "@/lib/journal/types";
import type { StoredTrade } from "@/lib/journal/trades-storage";

const HARD_BREACH_WARNING =
  "Warning: withdrawing all available profit may trigger a hard breach.";

function countRapidWithdrawals(state: JournalDataV1, accountId: string): number {
  let n = 0;
  for (const p of Object.values(state.payoutEntries)) {
    if (p.accountId !== accountId) continue;
    if (p.status === "approved" || p.status === "paid") n += 1;
  }
  return n;
}

export type FundedNextRapidPayoutState = {
  isEligible: boolean;
  eligibilityReason: string | null;
  cycleProfit: number;
  cycleProfitMin: number;
  bestDayProfit: number;
  consistency: number;
  consistencyValid: boolean;
  requiredProfitForConsistency: number;
  payoutMin: number;
  payoutMax: number | null;
  payoutCapRemoved: boolean;
  capRemovalThreshold: number;
  withdrawalCount: number;
  availablePayout: number;
  /** Minimum cycle profit (cents) implied by max(cycle min, consistency floor, payout min). */
  effectiveTargetCents: number;
  /** Same as `effectiveTargetCents / 100`. */
  effectiveTarget: number;
  rewardSplit: number;
  grossPayoutEstimate: number;
  netPayoutEstimate: number;
  showAddPayout: boolean;
  showGoodNews: boolean;
  showHardBreachWarning: boolean;
  hardBreachWarningMessage: string | null;
  availablePayoutCents: number;
  cycleProfitCents: number;
  /** After first paid/approved withdrawal, MLL anchors to initial balance (CSV note); for future drawdown UI. */
  mllAnchoredToInitialAfterFirstWithdrawal: boolean;
};

export type GetFundedNextRapidPayoutStateParams = {
  startCents: number;
  currentCents: number;
  storedTrades?: readonly StoredTrade[];
};

/**
 * Funded Next Futures Rapid funded: 40 % consistency (CSV), cycle min profit, payout min/max,
 * cap removed after `capRemovalWithdrawalCount` withdrawals when tier 2 is « No limit ».
 */
export function getFundedNextRapidPayoutState(
  state: JournalDataV1,
  account: JournalAccount,
  params: GetFundedNextRapidPayoutStateParams
): FundedNextRapidPayoutState | null {
  if (!isFundedNextRapidFundedJournalAccount(account)) return null;
  const sk = account.sizeLabel.trim().toLowerCase().replace(/\s+/g, "") as FundedNextRapidCsvSize;
  const csv = FUNDED_NEXT_RAPID_FUNDED_FROM_CSV[sk];
  if (!csv) return null;

  const c = csv.consistencyRatio;
  const payoutMinCents = Math.round(csv.payoutMiniUsd * 100);
  const payoutMaxStandardCents = Math.round(csv.payoutMaxStandardUsd * 100);
  const cycleProfitMinCents = Math.round((csv.cycleProfitMinUsd ?? 0) * 100);

  const withdrawalCount = countRapidWithdrawals(state, account.id);
  const payoutCapRemoved =
    csv.capUnlimited && withdrawalCount >= csv.capRemovalWithdrawalCount;

  const rewardSplit = parseFundedNextRewardSplitRatio(csv.profitSplitLabel) ?? 0;

  const cycleStart = tradeifySelectFundedPayoutCycleStartInclusive(state, account).trim();
  const cycleProfitCents = cycleStart
    ? aggregateTradeifySelectFundedPnlCentsSince(state, account, cycleStart, params.storedTrades)
    : 0;

  const maxDayRaw = cycleStart
    ? aggregateTradeifySelectFundedMaxSingleDayPnlCentsSince(state, account, cycleStart, params.storedTrades)
    : Number.NEGATIVE_INFINITY;
  const bestDayPositiveCents = Number.isFinite(maxDayRaw) ? Math.max(0, maxDayRaw) : 0;

  const requiredProfitForConsistencyCents =
    c > 0 && bestDayPositiveCents > 0 ? Math.ceil(bestDayPositiveCents / c) : 0;

  const effectiveTargetCents = Math.max(
    cycleProfitMinCents,
    requiredProfitForConsistencyCents,
    payoutMinCents
  );

  /** CSV rule: best day ≤ consistency × cycle profit (no extra “cycle > 0” gate — avoids “Consistency not met” when cycle is $0 but min cycle is $0). */
  const consistencyValid =
    bestDayPositiveCents <= c * cycleProfitCents + 1e-6;

  let grossAvailableCents = 0;
  if (cycleProfitCents > 0) {
    if (payoutCapRemoved) {
      grossAvailableCents = cycleProfitCents;
    } else {
      grossAvailableCents = Math.min(cycleProfitCents, payoutMaxStandardCents);
    }
  }

  const cycleMinOk = cycleProfitCents >= cycleProfitMinCents;
  const consistencyGateOk = consistencyValid;
  const payoutMinOk = grossAvailableCents >= payoutMinCents;
  const isEligible = cycleMinOk && consistencyGateOk && payoutMinOk && cycleProfitCents > 0;
  const showAddPayout = isEligible;
  const showGoodNews = isEligible;

  const showHardBreachWarning =
    cycleProfitCents > 0 && grossAvailableCents >= cycleProfitCents - 100 && grossAvailableCents > 0;

  const reasons: string[] = [];
  if (!cycleMinOk) {
    reasons.push("Cycle profit too low");
  } else if (!consistencyGateOk) {
    reasons.push("Consistency not met");
  } else if (!payoutMinOk) {
    if (!payoutCapRemoved && cycleProfitCents > payoutMaxStandardCents) {
      reasons.push("Payout cap reached; available below minimum");
    } else {
      reasons.push("Payout minimum not reached");
    }
  } else if (grossAvailableCents <= 0) {
    reasons.push("No withdrawable amount this cycle");
  }

  const grossUsd = grossAvailableCents / 100;
  const netUsd = Math.round(grossAvailableCents * rewardSplit) / 100;

  const mllAnchored = withdrawalCount >= 1;

  return {
    isEligible,
    eligibilityReason: isEligible ? null : reasons.join(" · ") || "Not eligible",
    cycleProfit: cycleProfitCents / 100,
    cycleProfitMin: csv.cycleProfitMinUsd ?? 0,
    bestDayProfit: bestDayPositiveCents / 100,
    consistency: c,
    consistencyValid,
    requiredProfitForConsistency: requiredProfitForConsistencyCents / 100,
    payoutMin: csv.payoutMiniUsd,
    payoutMax: payoutCapRemoved ? null : csv.payoutMaxStandardUsd,
    payoutCapRemoved,
    capRemovalThreshold: csv.capRemovalWithdrawalCount,
    withdrawalCount,
    availablePayout: grossUsd,
    effectiveTargetCents,
    effectiveTarget: effectiveTargetCents / 100,
    rewardSplit,
    grossPayoutEstimate: grossUsd,
    netPayoutEstimate: netUsd,
    showAddPayout,
    showGoodNews,
    showHardBreachWarning,
    hardBreachWarningMessage: showHardBreachWarning ? HARD_BREACH_WARNING : null,
    availablePayoutCents: grossAvailableCents,
    cycleProfitCents,
    mllAnchoredToInitialAfterFirstWithdrawal: mllAnchored,
  };
}
