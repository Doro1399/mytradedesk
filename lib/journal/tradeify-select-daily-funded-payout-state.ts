import {
  aggregateTradeifySelectFundedPnlCentsSince,
  tradeifySelectFundedPayoutCycleStartInclusive,
} from "@/lib/journal/tradeify-select-flex-funded-payout-state";
import {
  getTradeifySelectDailyFundedBlockForAccount,
  isTradeifySelectDailyFundedJournalAccount,
  type SelectDailyFunded,
} from "@/lib/journal/tradeify-journal-rules";
import type { JournalAccount, JournalDataV1 } from "@/lib/journal/types";
import type { StoredTrade } from "@/lib/journal/trades-storage";
import { formatUsdWholeGrouped } from "@/lib/prop-firms";

export type TradeifySelectDailyPayoutState = {
  isEligible: boolean;
  eligibilityReason: string | null;
  /** Cycle net P/L since last payout (USD). */
  cycleProfit: number;
  payoutMin: number;
  payoutMax: number;
  /** min(2 × cycle profit, cap) in USD before buffer capping. */
  payoutFormulaValue: number;
  /** Gross requestable this cycle (USD). */
  availablePayout: number;
  availablePayoutCents: number;
  /** Buffer above account start (USD), from CSV. */
  buffer: number;
  /** Current balance minus buffer floor (USD). */
  balanceAboveBuffer: number;
  /** Single progression goal: start + buffer + payout max (cents). */
  effectiveTargetCents: number;
  /** Same as `effectiveTargetCents / 100` for convenience. */
  effectiveTarget: number;
  showAddPayout: boolean;
  showGoodNews: boolean;
};

export type GetTradeifySelectDailyPayoutStateParams = {
  startCents: number;
  currentCents: number;
  storedTrades?: readonly StoredTrade[];
};

function buildFrom(
  block: SelectDailyFunded,
  params: {
    cycleProfitCents: number;
    bufferFloorCents: number;
    surplusCents: number;
    continuityCents: number;
    availablePayoutCents: number;
    payoutMaxCents: number;
    payoutMinCents: number;
    effectiveTargetCents: number;
  }
): TradeifySelectDailyPayoutState {
  const cycleProfit = params.cycleProfitCents / 100;
  const payoutFormulaValue = params.continuityCents / 100;
  const balanceAboveBuffer = params.surplusCents / 100;
  const buffer = block.bufferUsd;
  const payoutMin = block.payoutMiniUsd;
  const payoutMax = block.payoutMaxUsd;

  const profitOk = params.cycleProfitCents > 0;
  const minOk = params.availablePayoutCents >= params.payoutMinCents;
  const bufferOk = params.surplusCents > 0;
  const isEligible = profitOk && minOk && bufferOk;
  const showAddPayout = isEligible;
  const showGoodNews = isEligible;

  const reasons: string[] = [];
  if (!profitOk) {
    reasons.push("Cycle profit is not positive");
  } else if (!bufferOk) {
    reasons.push(`Balance must stay above ${formatUsdWholeGrouped(buffer)} above start`);
  } else if (!minOk) {
    reasons.push(`Minimum gross payout is ${formatUsdWholeGrouped(payoutMin)}`);
  }

  return {
    isEligible,
    eligibilityReason: isEligible ? null : reasons.join(" · ") || "Not eligible",
    cycleProfit,
    payoutMin,
    payoutMax,
    payoutFormulaValue,
    availablePayout: params.availablePayoutCents / 100,
    availablePayoutCents: params.availablePayoutCents,
    buffer,
    balanceAboveBuffer,
    effectiveTargetCents: params.effectiveTargetCents,
    effectiveTarget: params.effectiveTargetCents / 100,
    showAddPayout,
    showGoodNews,
  };
}

/**
 * Tradeify Select Daily funded: cycle P/L since last payout (same boundary as Select Flex / Topstep),
 * gross = min(2×cycle, cap) capped by balance above buffer; min gross from CSV. No consistency / best-day.
 */
export function getTradeifySelectDailyPayoutState(
  state: JournalDataV1,
  account: JournalAccount,
  params: GetTradeifySelectDailyPayoutStateParams
): TradeifySelectDailyPayoutState | null {
  if (!isTradeifySelectDailyFundedJournalAccount(account)) return null;
  const block = getTradeifySelectDailyFundedBlockForAccount(account);
  if (!block) return null;

  const bufferFloorCents = Math.round(params.startCents + block.bufferUsd * 100);
  const surplusCents = Math.max(0, Math.round(params.currentCents - bufferFloorCents));
  const payoutMaxCents = Math.round(block.payoutMaxUsd * 100);
  const payoutMinCents = Math.round(block.payoutMiniUsd * 100);
  const effectiveTargetCents = bufferFloorCents + payoutMaxCents;

  const start = tradeifySelectFundedPayoutCycleStartInclusive(state, account).trim();
  if (!start) {
    return buildFrom(block, {
      cycleProfitCents: 0,
      bufferFloorCents,
      surplusCents,
      continuityCents: 0,
      availablePayoutCents: 0,
      payoutMaxCents,
      payoutMinCents,
      effectiveTargetCents,
    });
  }

  const cycleProfitCents = aggregateTradeifySelectFundedPnlCentsSince(
    state,
    account,
    start,
    params.storedTrades
  );
  const continuityCents =
    cycleProfitCents > 0 ? Math.min(Math.round(2 * cycleProfitCents), payoutMaxCents) : 0;
  const availablePayoutCents = Math.min(continuityCents, surplusCents);

  return buildFrom(block, {
    cycleProfitCents,
    bufferFloorCents,
    surplusCents,
    continuityCents,
    availablePayoutCents,
    payoutMaxCents,
    payoutMinCents,
    effectiveTargetCents,
  });
}
