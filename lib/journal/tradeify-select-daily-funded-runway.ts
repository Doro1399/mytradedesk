import type { ApexFundedRunway } from "@/lib/journal/apex-funded-progress";
import { getSimplePayoutProgress } from "@/lib/journal/simple-payout-progress";
import type { JournalAccount, JournalDataV1 } from "@/lib/journal/types";
import {
  getTradeifySelectDailyFundedBlockForAccount,
  isTradeifySelectDailyFundedJournalAccount,
} from "@/lib/journal/tradeify-journal-rules";
import { formatUsdWholeGrouped } from "@/lib/prop-firms";

export type TradeifySelectDailyFundedRunway = ApexFundedRunway;

export const TRADEIFY_SELECT_DAILY_FUNDED_PAYOUT_DASHBOARD_REMINDER =
  "Eligibility subject to Tradeify rules on your dashboard.";

function fmtCents(c: number): string {
  return formatUsdWholeGrouped(Math.max(0, Math.round(c)) / 100);
}

/**
 * Tradeify Select Daily funded / live — indicatif : buffer + mini/maxi CSV (`getTradeifySelectDailyFundedBlockForAccount`).
 * Surplus au-dessus de `start + buffer` ; pas de cycle P&L, pas de règle 2×.
 */
export function tryBuildTradeifySelectDailyFundedRunway(
  _state: JournalDataV1,
  account: JournalAccount,
  p: { startCents: number; currentCents: number }
): TradeifySelectDailyFundedRunway | null {
  if (!isTradeifySelectDailyFundedJournalAccount(account)) return null;
  const block = getTradeifySelectDailyFundedBlockForAccount(account);
  if (!block) return null;

  const start = p.startCents;
  const balanceNow = p.currentCents;
  const payoutMinCents = Math.max(0, Math.round(block.payoutMiniUsd * 100));
  const payoutMaxCents = Math.max(payoutMinCents, Math.round(block.payoutMaxUsd * 100));
  const bufferDist = Math.max(0, Math.round(block.bufferUsd * 100));

  if (bufferDist > 0) {
    const tBufferEnd = start + bufferDist;
    const simple = getSimplePayoutProgress({
      startingBalanceCents: start,
      balanceNowCents: balanceNow,
      bufferDistanceCents: bufferDist,
      payoutMinDistanceCents: payoutMinCents,
      payoutMaxDistanceCents: payoutMaxCents,
    });

    const tMax = tBufferEnd + payoutMaxCents;
    const span = Math.max(1, tMax - start);
    const barProgress01 = Math.min(1, Math.max(0, (balanceNow - start) / span));
    const ringPctDisplay = Math.round(
      Math.max(-999, Math.min(999, simple.progressPercentage))
    );

    const phaseLabel =
      simple.currentPhase === "buffer"
        ? "Buffer"
        : simple.currentPhase === "payout_min"
          ? "Payout min"
          : "Payout max";

    const runwayPartA = phaseLabel;
    const toNext = Math.max(0, simple.currentTargetCents - balanceNow);
    const runwayPartB =
      balanceNow >= simple.currentTargetCents
        ? `Target ${fmtCents(simple.currentTargetCents)} reached`
        : `${fmtCents(toNext)} to ${phaseLabel.toLowerCase()}`;

    const goalLineLabel =
      simple.currentPhase === "buffer"
        ? "Buffer"
        : simple.currentPhase === "payout_min"
          ? "Payout min"
          : "Payout max";
    const goalLineCents = simple.currentTargetCents;

    const surplusCents = Math.max(0, balanceNow - tBufferEnd);
    const displayedPayoutCents = Math.min(surplusCents, payoutMaxCents);
    const showAddPayoutButton =
      balanceNow !== start &&
      displayedPayoutCents > 0 &&
      displayedPayoutCents >= payoutMinCents;

    const atOrPastPayoutMax = balanceNow >= tMax;
    const suggestedMaxPayoutUsd =
      showAddPayoutButton && displayedPayoutCents > 0 ? displayedPayoutCents / 100 : null;

    const payoutCardCallout = showAddPayoutButton
      ? `You can request a payout of ${fmtCents(displayedPayoutCents)}.\n${TRADEIFY_SELECT_DAILY_FUNDED_PAYOUT_DASHBOARD_REMINDER}`
      : null;

    return {
      barProgress01,
      ringArc01: barProgress01,
      ringPctDisplay,
      showAddPayoutButton,
      atOrPastPayoutMax,
      runwayPartA,
      runwayPartB,
      goalLineLabel,
      goalLineCents,
      phasePctLabel: String(ringPctDisplay),
      payoutCardCallout,
      suggestedMaxPayoutUsd,
      availablePayoutUsd: showAddPayoutButton ? displayedPayoutCents / 100 : null,
      goodNewsTitle: showAddPayoutButton ? "Good News" : null,
      payoutGateHint: null,
      bufferReached: balanceNow >= tBufferEnd,
      showPayoutGatePanel: false,
      cycleNetPnlCents: surplusCents,
      tradeifySelectDailySimplePayoutUi: true,
      tradeifySelectDailySimplePayoutMinBalanceCents: tBufferEnd,
    };
  }

  const simple = getSimplePayoutProgress({
    startingBalanceCents: start,
    balanceNowCents: balanceNow,
    bufferDistanceCents: 0,
    payoutMinDistanceCents: payoutMinCents,
    payoutMaxDistanceCents: payoutMaxCents,
  });

  const tMin = start + payoutMinCents;
  const tMax = start + payoutMaxCents;
  const span = Math.max(1, tMax - start);
  const barProgress01 = Math.min(1, Math.max(0, (balanceNow - start) / span));
  const ringPctDisplay = Math.round(
    Math.max(-999, Math.min(999, simple.progressPercentage))
  );

  const phaseLabel = simple.currentPhase === "payout_min" ? "Payout min" : "Payout max";
  const runwayPartA = phaseLabel;
  const toNext = Math.max(0, simple.currentTargetCents - balanceNow);
  const runwayPartB =
    balanceNow >= simple.currentTargetCents
      ? `Target ${fmtCents(simple.currentTargetCents)} reached`
      : `${fmtCents(toNext)} to ${phaseLabel.toLowerCase()}`;

  const goalLineLabel = simple.currentPhase === "payout_min" ? "Payout min" : "Payout max";
  const goalLineCents = simple.currentTargetCents;

  const profitCents = balanceNow - start;
  const availableCents = Math.max(0, profitCents);
  const displayedPayoutCents = Math.min(availableCents, payoutMaxCents);
  const showAddPayoutButton =
    balanceNow !== start &&
    displayedPayoutCents > 0 &&
    displayedPayoutCents >= payoutMinCents;

  const atOrPastPayoutMax = balanceNow >= tMax;
  const suggestedMaxPayoutUsd =
    showAddPayoutButton && displayedPayoutCents > 0 ? displayedPayoutCents / 100 : null;

  const payoutCardCallout = showAddPayoutButton
    ? `You can request a payout of ${fmtCents(displayedPayoutCents)}.\n${TRADEIFY_SELECT_DAILY_FUNDED_PAYOUT_DASHBOARD_REMINDER}`
    : null;

  return {
    barProgress01,
    ringArc01: barProgress01,
    ringPctDisplay,
    showAddPayoutButton,
    atOrPastPayoutMax,
    runwayPartA,
    runwayPartB,
    goalLineLabel,
    goalLineCents,
    phasePctLabel: String(ringPctDisplay),
    payoutCardCallout,
    suggestedMaxPayoutUsd,
    availablePayoutUsd: showAddPayoutButton ? displayedPayoutCents / 100 : null,
    goodNewsTitle: showAddPayoutButton ? "Good News" : null,
    payoutGateHint: null,
    showPayoutGatePanel: false,
    cycleNetPnlCents: profitCents,
    bufferReached: true,
    tradeifySelectDailySimplePayoutUi: true,
    tradeifySelectDailySimplePayoutMinBalanceCents: tMin,
  };
}
