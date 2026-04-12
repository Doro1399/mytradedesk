import type { ApexFundedRunway } from "@/lib/journal/apex-funded-progress";
import { getTradeifySelectFlexPayoutState } from "@/lib/journal/tradeify-select-flex-funded-payout-state";
import {
  getTradeifySelectFlexFundedBlockForAccount,
  isTradeifySelectFlexFundedJournalAccount,
} from "@/lib/journal/tradeify-journal-rules";
import type { JournalAccount, JournalDataV1 } from "@/lib/journal/types";
import type { StoredTrade } from "@/lib/journal/trades-storage";
import { formatUsdWholeGrouped } from "@/lib/prop-firms";

export type TradeifySelectFlexFundedRunway = ApexFundedRunway;

function fmtUsdFromCents(cents: number): string {
  return formatUsdWholeGrouped(Math.max(0, Math.round(cents)) / 100);
}

function fmtUsdFromCentsBuffer(cents: number): string {
  const n = Math.max(0, Math.round(cents)) / 100;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n);
}

/**
 * Progress — Tradeify Select Flex funded / live: winning days from CSV; payout path uses 50% of summed cycle P/L (Lucid-style) vs cap.
 */
export function tryBuildTradeifySelectFlexFundedRunway(
  state: JournalDataV1,
  account: JournalAccount,
  _p: { startCents: number; currentCents: number },
  options?: { storedTrades?: readonly StoredTrade[] }
): TradeifySelectFlexFundedRunway | null {
  if (!isTradeifySelectFlexFundedJournalAccount(account)) return null;
  const block = getTradeifySelectFlexFundedBlockForAccount(account);
  if (!block) return null;

  const st = getTradeifySelectFlexPayoutState(state, account, options);
  if (!st) return null;

  const { winningDays, cycleProfitCents } = st;
  const required = block.minDays;
  /** Cycle P/L sum needed so min(50%×cycle, cap) = cap ⇒ cycle ≥ 2×cap. */
  const cyclePnlNeededForMaxCapCents = Math.max(1, 2 * st.payoutMaxCents);
  /** Progress card « Now » target: Start + 2×(cycle P/L needed to hit cap). Cap $1,250 → +$2,500 cycle → +$5,000 vs Start ($25k→$30k). */
  const balanceTargetForMaxPayoutCents = _p.startCents + 2 * cyclePnlNeededForMaxCapCents;

  const G = Math.max(0, cycleProfitCents);

  const cycleToMax01 = Math.min(1, G / Math.max(1, cyclePnlNeededForMaxCapCents));
  const daysToRequired01 = Math.min(1, winningDays / Math.max(1, required));
  const pathToPayoutMax01 = (cycleToMax01 + daysToRequired01) / 2;
  const barProgress01 = pathToPayoutMax01;
  const ringArc01 = pathToPayoutMax01;

  const ringPctDisplay = Math.round(pathToPayoutMax01 * 100);

  const atOrPastPayoutMax = G >= cyclePnlNeededForMaxCapCents;

  const maxGrossLabel = formatUsdWholeGrouped(block.payoutMaxUsd);
  const pathPct = Math.round(pathToPayoutMax01 * 100);
  const toMaxCycleCents = Math.max(0, cyclePnlNeededForMaxCapCents - G);

  let runwayPartA = "";
  let runwayPartB = "";
  const goalLineLabel = "Target to max payout";
  const goalLineCents: number | null = balanceTargetForMaxPayoutCents;

  if (G <= 0) {
    runwayPartA = `To payout max (${maxGrossLabel} gross) · ${pathPct}%`;
    runwayPartB = `${winningDays}/${required} winning days (≥ ${formatUsdWholeGrouped(block.minProfitPerDayUsd)} / day) · ${fmtUsdFromCents(toMaxCycleCents)} cycle profit to max gross cap`;
  } else if (!atOrPastPayoutMax) {
    runwayPartA = `To payout max (${maxGrossLabel} gross) · ${pathPct}%`;
    runwayPartB = `${winningDays}/${required} winning days · ${fmtUsdFromCents(toMaxCycleCents)} cycle profit left to max gross cap`;
  } else {
    runwayPartA = `Payout max path complete (${maxGrossLabel} gross)`;
    runwayPartB = `${winningDays}/${required} winning days · up to ${fmtUsdFromCentsBuffer(st.payoutMaxCents)} gross this cycle`;
  }

  let payoutCardCallout: string | null = null;
  let suggestedMaxPayoutUsd: number | null = null;
  if (st.isEligible) {
    const g = fmtUsdFromCentsBuffer(st.availablePayoutCents);
    payoutCardCallout = `You can payout ${g}.\nIf you payout now, ${g} remains as buffer.`;
    suggestedMaxPayoutUsd =
      st.availablePayoutCents > 0 ? st.availablePayoutCents / 100 : null;
  }

  const milestoneForPanel = winningDays >= 1 || cycleProfitCents !== 0;

  const payoutGateHint =
    !st.isEligible && milestoneForPanel && st.eligibilityReason ? st.eligibilityReason : null;

  const showPayoutGatePanel = !st.isEligible && milestoneForPanel && payoutGateHint != null;

  return {
    barProgress01,
    ringArc01,
    ringPctDisplay,
    showAddPayoutButton: st.showAddPayout,
    atOrPastPayoutMax,
    runwayPartA,
    runwayPartB,
    goalLineLabel,
    goalLineCents,
    phasePctLabel: String(ringPctDisplay),
    payoutCardCallout,
    suggestedMaxPayoutUsd,
    goodNewsTitle: st.isEligible ? "Good News" : null,
    payoutGateHint,
    showPayoutGatePanel,
    qualifiedTradingDays: winningDays,
    requiredQualifiedTradingDays: required,
    progressTradingDaysLabel: "winning days",
    cycleNetPnlCents: st.cycleProfitCents,
  };
}
