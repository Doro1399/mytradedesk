import type { ApexFundedRunway } from "@/lib/journal/apex-funded-progress";
import { getSimplePayoutProgress } from "@/lib/journal/simple-payout-progress";
import type { JournalAccount, JournalDataV1 } from "@/lib/journal/types";
import {
  getTradeifyLightningFundedRowForAccount,
  isTradeifyLightningFundedJournalAccount,
} from "@/lib/journal/tradeify-journal-rules";
import { formatUsdWholeGrouped } from "@/lib/prop-firms";

export type TradeifyLightningFundedRunway = ApexFundedRunway;

export const TRADEIFY_LIGHTNING_FUNDED_PAYOUT_DASHBOARD_REMINDER =
  "Eligibility subject to Tradeify rules on your dashboard.";

function fmtCents(c: number): string {
  return formatUsdWholeGrouped(Math.max(0, Math.round(c)) / 100);
}

/**
 * Tradeify Lightning funded / live — **indicatif uniquement** : pas de buffer, pas de consistency / goals cycles CSV.
 * Profit = solde − start (journal) ; `available = min(profit, payout_max)` avec mini/maxi lus depuis le CSV généré
 * (`payoutMiniUsd`, `payoutMax1stUsd` comme plafond unique simplifié).
 */
export function tryBuildTradeifyLightningFundedRunway(
  _state: JournalDataV1,
  account: JournalAccount,
  p: { startCents: number; currentCents: number }
): TradeifyLightningFundedRunway | null {
  if (!isTradeifyLightningFundedJournalAccount(account)) return null;
  const row = getTradeifyLightningFundedRowForAccount(account);
  if (!row) return null;

  const start = p.startCents;
  const balanceNow = p.currentCents;
  const payoutMinCents = Math.max(0, Math.round(row.payoutMiniUsd * 100));
  /** Version simple : un seul plafond = 1er palier CSV (pas de simulation 2e/3e retrait). */
  const payoutMaxCents = Math.max(payoutMinCents, Math.round(row.payoutMax1stUsd * 100));

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

  const phaseLabel =
    simple.currentPhase === "payout_min" ? "Payout min" : "Payout max";

  const runwayPartA = phaseLabel;
  const toNext = Math.max(0, simple.currentTargetCents - balanceNow);
  const runwayPartB =
    balanceNow >= simple.currentTargetCents
      ? `Target ${fmtCents(simple.currentTargetCents)} reached`
      : `${fmtCents(toNext)} to ${phaseLabel.toLowerCase()}`;

  const goalLineLabel = simple.currentPhase === "payout_min" ? "Payout min" : "Payout max";
  const goalLineCents = simple.currentTargetCents;

  const profitCents = balanceNow - start;
  const displayedPayoutCents = Math.min(Math.max(0, profitCents), payoutMaxCents);
  const showAddPayoutButton = displayedPayoutCents >= payoutMinCents;

  const atOrPastPayoutMax = balanceNow >= tMax;

  const suggestedMaxPayoutUsd =
    showAddPayoutButton && displayedPayoutCents > 0 ? displayedPayoutCents / 100 : null;

  const payoutCardCallout = showAddPayoutButton
    ? `You can request a payout of ${fmtCents(displayedPayoutCents)}.\n${TRADEIFY_LIGHTNING_FUNDED_PAYOUT_DASHBOARD_REMINDER}`
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
    cycleNetPnlCents: Math.max(0, profitCents),
    bufferReached: true,
    tradeifyLightningSimplePayoutUi: true,
    tradeifyLightningSimplePayoutMinBalanceCents: tMin,
  };
}
