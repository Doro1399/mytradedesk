import type { ApexFundedRunway } from "@/lib/journal/apex-funded-progress";
import { getSimplePayoutProgress } from "@/lib/journal/simple-payout-progress";
import {
  getLucidFlexFundedBlockForAccount,
  isLucidFlexFundedJournalAccount,
} from "@/lib/journal/lucid-journal-rules";
import type { JournalAccount, JournalDataV1 } from "@/lib/journal/types";
import { formatUsdWholeGrouped } from "@/lib/prop-firms";

export const LUCID_FLEX_FUNDED_PAYOUT_DASHBOARD_REMINDER =
  "Eligibility subject to Lucid Trading rules on your dashboard.";

function fmtCents(c: number): string {
  return formatUsdWholeGrouped(Math.max(0, Math.round(c)) / 100);
}

/**
 * Lucid Flex funded / live : profit = balance − start, retrait indicatif = 50 % du profit (plafonné au max CSV).
 * Progression visuelle sans buffer CSV : paliers équivalents ×2 pour aligner solde ↔ demi-profit (mini puis max).
 */
export function tryBuildLucidFlexFundedRunway(
  _state: JournalDataV1,
  account: JournalAccount,
  p: { startCents: number; currentCents: number }
): ApexFundedRunway | null {
  if (!isLucidFlexFundedJournalAccount(account)) return null;
  const block = getLucidFlexFundedBlockForAccount(account);
  if (!block) return null;

  const start = p.startCents;
  const balanceNow = p.currentCents;
  const profitCents = Math.max(0, balanceNow - start);
  const halfProfitCents = Math.floor(profitCents / 2);

  const payoutMinCents = Math.max(0, Math.round(block.payoutMiniUsd * 100));
  const payoutMaxCents = Math.max(payoutMinCents, Math.round(block.payoutMaxUsd * 100));

  const availablePayoutCents = Math.min(halfProfitCents, payoutMaxCents);
  const showAddPayoutButton = availablePayoutCents >= payoutMinCents;

  const minBalanceGainCents = 2 * payoutMinCents;
  const maxBalanceGainCents = 2 * payoutMaxCents;

  const simple = getSimplePayoutProgress({
    startingBalanceCents: start,
    balanceNowCents: balanceNow,
    bufferDistanceCents: 0,
    payoutMinDistanceCents: minBalanceGainCents,
    payoutMaxDistanceCents: maxBalanceGainCents,
  });

  const tMin = start + minBalanceGainCents;
  const tMax = start + maxBalanceGainCents;
  const span = Math.max(1, tMax - start);
  const barProgress01 = Math.min(1, Math.max(0, (balanceNow - start) / span));
  const ringPctDisplay = Math.round(
    Math.max(-999, Math.min(999, simple.progressPercentage))
  );

  const phaseLabel =
    simple.currentPhase === "payout_min"
      ? "Payout min"
      : simple.currentPhase === "payout_max"
        ? "Payout max"
        : "Buffer";

  const runwayPartA = phaseLabel;
  const toNext = Math.max(0, simple.currentTargetCents - balanceNow);
  const runwayPartB =
    balanceNow >= simple.currentTargetCents
      ? `Target ${fmtCents(simple.currentTargetCents)} reached`
      : `${fmtCents(toNext)} to ${phaseLabel.toLowerCase()}`;

  const goalLineLabel =
    simple.currentPhase === "payout_min"
      ? "Payout min"
      : simple.currentPhase === "payout_max"
        ? "Payout max"
        : "Start";
  const goalLineCents = simple.currentTargetCents;

  const atOrPastPayoutMax = balanceNow >= tMax;

  const suggestedMaxPayoutUsd = showAddPayoutButton && availablePayoutCents > 0 ? availablePayoutCents / 100 : null;

  const bufferLineCents = halfProfitCents;
  const payoutCardCallout = showAddPayoutButton
    ? `You can request a payout of ${fmtCents(availablePayoutCents)}.\nIf you withdraw now, ${fmtCents(bufferLineCents)} remains as buffer.`
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
    availablePayoutUsd: showAddPayoutButton ? availablePayoutCents / 100 : null,
    goodNewsTitle: showAddPayoutButton ? "Good News" : null,
    payoutGateHint: null,
    showPayoutGatePanel: false,
    lucidFlexSimplePayoutUi: true,
    lucidFlexSimplePayoutMinBalanceCents: tMin,
  };
}
