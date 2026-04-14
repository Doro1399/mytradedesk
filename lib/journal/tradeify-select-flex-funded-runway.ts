import type { ApexFundedRunway } from "@/lib/journal/apex-funded-progress";
import { getSimplePayoutProgress } from "@/lib/journal/simple-payout-progress";
import type { JournalAccount, JournalDataV1 } from "@/lib/journal/types";
import {
  getTradeifySelectFlexFundedBlockForAccount,
  isTradeifySelectFlexFundedJournalAccount,
} from "@/lib/journal/tradeify-journal-rules";
import { formatUsdWholeGrouped } from "@/lib/prop-firms";

export type TradeifySelectFlexFundedRunway = ApexFundedRunway;

export const TRADEIFY_SELECT_FLEX_FUNDED_PAYOUT_DASHBOARD_REMINDER =
  "Eligibility subject to Tradeify rules on your dashboard.";

function fmtCents(c: number): string {
  return formatUsdWholeGrouped(Math.max(0, Math.round(c)) / 100);
}

/**
 * Tradeify Select Flex funded / live — **indicatif uniquement** : 50 % du profit journal vs start,
 * plafond / mini CSV ; barre = même idée que Lightning avec segments `2×mini` / `2×max` sur le solde
 * (lorsque la moitié du profit atteint le mini puis le max).
 */
export function tryBuildTradeifySelectFlexFundedRunway(
  _state: JournalDataV1,
  account: JournalAccount,
  p: { startCents: number; currentCents: number }
): TradeifySelectFlexFundedRunway | null {
  if (!isTradeifySelectFlexFundedJournalAccount(account)) return null;
  const block = getTradeifySelectFlexFundedBlockForAccount(account);
  if (!block) return null;

  const start = p.startCents;
  const balanceNow = p.currentCents;
  const payoutMinCents = Math.max(0, Math.round(block.payoutMiniUsd * 100));
  const payoutMaxCents = Math.max(payoutMinCents, Math.round(block.payoutMaxUsd * 100));

  /** Sur le solde : profit = balance − start ; withdrawable = min(profit/2, max) ≥ mini ⇔ profit ≥ 2×mini (tant que non plafonné). */
  const balanceDeltaMinCents = 2 * payoutMinCents;
  const balanceDeltaMaxCents = 2 * payoutMaxCents;

  const simple = getSimplePayoutProgress({
    startingBalanceCents: start,
    balanceNowCents: balanceNow,
    bufferDistanceCents: 0,
    payoutMinDistanceCents: balanceDeltaMinCents,
    payoutMaxDistanceCents: balanceDeltaMaxCents,
  });

  const tMin = start + balanceDeltaMinCents;
  const tMax = start + balanceDeltaMaxCents;
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
  const halfProfitCents = Math.round(Math.max(0, profitCents) * 0.5);
  const displayedPayoutCents = Math.min(halfProfitCents, payoutMaxCents);
  /** Pas de bouton / panneau si solde = start (mini CSV peut être 0 → sinon 0 $ ≥ 0 affichait le bouton). */
  const showAddPayoutButton =
    balanceNow !== start && displayedPayoutCents > 0 && displayedPayoutCents >= payoutMinCents;

  const atOrPastPayoutMax = balanceNow >= tMax;
  const suggestedMaxPayoutUsd =
    showAddPayoutButton && displayedPayoutCents > 0 ? displayedPayoutCents / 100 : null;

  const bufferRemainCents = Math.max(0, profitCents - displayedPayoutCents);

  const payoutCardCallout = showAddPayoutButton
    ? `You can payout ${fmtCents(displayedPayoutCents)}.\n${fmtCents(bufferRemainCents)} remains as buffer.\n${TRADEIFY_SELECT_FLEX_FUNDED_PAYOUT_DASHBOARD_REMINDER}`
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
    tradeifySelectFlexSimplePayoutUi: true,
    tradeifySelectFlexSimplePayoutMinBalanceCents: tMin,
  };
}
