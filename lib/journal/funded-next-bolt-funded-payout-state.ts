import {
  aggregateTradeifySelectFundedPnlCentsSince,
  tradeifySelectFundedPayoutCycleStartInclusive,
} from "@/lib/journal/tradeify-select-flex-funded-payout-state";
import { FUNDED_NEXT_BOLT_FUNDED_FROM_CSV } from "@/lib/journal/funded-next-bolt-funded-csv.generated";
import {
  isFundedNextBoltFundedJournalAccount,
  parseFundedNextRewardSplitRatio,
} from "@/lib/journal/funded-next-journal-rules";
import type { JournalAccount, JournalDataV1 } from "@/lib/journal/types";
import type { StoredTrade } from "@/lib/journal/trades-storage";

function countBoltWithdrawals(state: JournalDataV1, accountId: string): number {
  let n = 0;
  for (const p of Object.values(state.payoutEntries)) {
    if (p.accountId !== accountId) continue;
    if (p.status === "approved" || p.status === "paid") n += 1;
  }
  return n;
}

export type FundedNextBoltPayoutState = {
  isEligible: boolean;
  eligibilityReason: string | null;
  cycleProfit: number;
  cycleProfitMin: number;
  buffer: number;
  requiredEodBalance: number;
  availablePayout: number;
  payoutMin: number;
  payoutMax: number;
  payoutMaxFinal: number;
  withdrawalCount: number;
  isFinalWithdrawal: boolean;
  rewardSplit: number;
  grossPayoutEstimate: number;
  netPayoutEstimate: number;
  /**
   * `true` when all program withdrawals are done (e.g. Bolt after 5th payout).
   * Future UI: **Hall of Fame** for accounts that completed the full payout path.
   */
  isConcluded: boolean;
  showAddPayout: boolean;
  showGoodNews: boolean;
  availablePayoutCents: number;
};

export type GetFundedNextBoltPayoutStateParams = {
  startCents: number;
  currentCents: number;
  storedTrades?: readonly StoredTrade[];
};

/**
 * Funded Next Futures Bolt funded: withdrawals 1–4 = surplus above (start+buffer), capped by standard max;
 * 5th = surplus above start, capped by final max; cycle P/L since last payout (Topstep-style boundary).
 */
export function getFundedNextBoltPayoutState(
  state: JournalDataV1,
  account: JournalAccount,
  params: GetFundedNextBoltPayoutStateParams
): FundedNextBoltPayoutState | null {
  if (!isFundedNextBoltFundedJournalAccount(account)) return null;
  const sk = account.sizeLabel.trim().toLowerCase().replace(/\s+/g, "") as keyof typeof FUNDED_NEXT_BOLT_FUNDED_FROM_CSV;
  const csv = FUNDED_NEXT_BOLT_FUNDED_FROM_CSV[sk as "50k"];
  if (!csv) return null;

  const bufferCents = Math.round(csv.bufferUsd * 100);
  const floorCents = params.startCents + bufferCents;
  const requiredEodBalanceUsd =
    csv.requiredEodBalanceUsd ?? csv.bufferUsd + params.startCents / 100;
  const requiredEodBalanceCents = Math.round(requiredEodBalanceUsd * 100);
  const cycleProfitMinCents = Math.round((csv.cycleProfitMinUsd ?? 0) * 100);

  const payoutMinCents = Math.round(csv.payoutMiniUsd * 100);
  const payoutMaxStandardCents = Math.round(csv.payoutMaxStandardUsd * 100);
  const payoutMaxFinalCents = Math.round(csv.payoutMaxFinalUsd * 100);

  const withdrawalCount = countBoltWithdrawals(state, account.id);
  const isConcluded = withdrawalCount >= csv.maxWithdrawals;
  const isFinalWithdrawal = !isConcluded && withdrawalCount === csv.maxWithdrawals - 1;

  const rewardSplit = parseFundedNextRewardSplitRatio(csv.profitSplitLabel) ?? 0;

  const cycleStart = tradeifySelectFundedPayoutCycleStartInclusive(state, account).trim();
  const cycleProfitCents = cycleStart
    ? aggregateTradeifySelectFundedPnlCentsSince(state, account, cycleStart, params.storedTrades)
    : 0;

  const surplusAboveBufferCents = Math.max(0, params.currentCents - floorCents);
  const surplusAboveInitialCents = Math.max(0, params.currentCents - params.startCents);

  let grossAvailableCents = 0;
  if (!isConcluded) {
    if (isFinalWithdrawal) {
      grossAvailableCents = Math.min(surplusAboveInitialCents, payoutMaxFinalCents);
    } else {
      grossAvailableCents = Math.min(surplusAboveBufferCents, payoutMaxStandardCents);
    }
  }

  const cycleOk = cycleProfitCents >= cycleProfitMinCents;
  const eodOk = params.currentCents >= requiredEodBalanceCents;
  const minOk = grossAvailableCents >= payoutMinCents;
  const isEligible = !isConcluded && cycleOk && eodOk && minOk;
  const showAddPayout = isEligible;
  const showGoodNews = isEligible;

  const reasons: string[] = [];
  if (isConcluded) {
    reasons.push("Hall of Fame — all payouts completed (no further withdrawals)");
  } else {
    if (!cycleOk) {
      reasons.push("Cycle profit below minimum");
    }
    if (!eodOk) {
      reasons.push("Balance below required EOD threshold");
    }
    if (cycleOk && eodOk && !minOk) {
      reasons.push("Available payout below minimum");
    }
  }

  const grossUsd = grossAvailableCents / 100;
  const netUsd = Math.round(grossAvailableCents * rewardSplit) / 100;

  return {
    isEligible,
    eligibilityReason: isEligible ? null : reasons.join(" · ") || "Not eligible",
    cycleProfit: cycleProfitCents / 100,
    cycleProfitMin: (csv.cycleProfitMinUsd ?? 0),
    buffer: csv.bufferUsd,
    requiredEodBalance: requiredEodBalanceUsd,
    availablePayout: grossUsd,
    payoutMin: csv.payoutMiniUsd,
    payoutMax: csv.payoutMaxStandardUsd,
    payoutMaxFinal: csv.payoutMaxFinalUsd,
    withdrawalCount,
    isFinalWithdrawal,
    rewardSplit,
    grossPayoutEstimate: grossUsd,
    netPayoutEstimate: netUsd,
    isConcluded,
    showAddPayout,
    showGoodNews,
    availablePayoutCents: grossAvailableCents,
  };
}
