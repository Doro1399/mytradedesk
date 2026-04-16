import type { ApexFundedRunway } from "@/lib/journal/apex-funded-progress";
import { getPhidiasFundedPayoutRowForAccount } from "@/lib/journal/phidias-journal-rules";
import { getSimplePayoutProgress } from "@/lib/journal/simple-payout-progress";
import { countLucidProNonRejectedPayouts } from "@/lib/journal/lucid-pro-funded-payout-state";
import type { JournalAccount, JournalDataV1 } from "@/lib/journal/types";
import { formatUsdWholeGrouped } from "@/lib/prop-firms";

export type PhidiasFundedRunway = ApexFundedRunway;

export const PHIDIAS_FUNDED_PAYOUT_DASHBOARD_REMINDER =
  "Eligibility is subject to Phidias rules on your dashboard.";

function fmtCents(c: number): string {
  return formatUsdWholeGrouped(Math.max(0, Math.round(c)) / 100);
}

/**
 * Phidias funded (CSV) : buffer, surplus, mini, plafonds par retrait (indicatif).
 */
export function tryBuildPhidiasFundedRunway(
  state: JournalDataV1,
  account: JournalAccount,
  p: { startCents: number; currentCents: number }
): PhidiasFundedRunway | null {
  const csv = getPhidiasFundedPayoutRowForAccount(account);
  if (!csv) return null;

  const start = p.startCents;
  const balanceNow = p.currentCents;
  const bufferDist = Math.max(0, Math.round(csv.bufferUsd * 100));
  const tBufferEnd = start + bufferDist;
  const payoutMinCents = Math.max(0, Math.round(csv.payoutMiniUsd * 100));

  const payoutsDone = countLucidProNonRejectedPayouts(state, account.id);
  const capUsdThisCycle =
    payoutsDone === 0
      ? csv.payoutMax1stUsd
      : payoutsDone === 1
        ? csv.payoutMax2ndUsd
        : payoutsDone === 2
          ? csv.payoutMax3rdUsd
          : csv.payoutMax4thPlusUsd;

  const surplusCents = Math.max(0, balanceNow - tBufferEnd);
  const capCents = Math.max(payoutMinCents, Math.round(capUsdThisCycle * 100));

  const simple = getSimplePayoutProgress({
    startingBalanceCents: start,
    balanceNowCents: balanceNow,
    bufferDistanceCents: bufferDist,
    payoutMinDistanceCents: 0,
    payoutMaxDistanceCents: capCents,
  });

  const tMax = tBufferEnd + capCents;
  const span = Math.max(1, tMax - start);
  const barProgress01 = Math.min(1, Math.max(0, (balanceNow - start) / span));
  const ringPctDisplay = Math.round(
    Math.max(-999, Math.min(999, simple.progressPercentage))
  );

  const phaseLabel = simple.currentPhase === "buffer" ? "Buffer" : "Payout max";
  const runwayPartA = phaseLabel;
  const toNext = Math.max(0, simple.currentTargetCents - balanceNow);
  const runwayPartB =
    balanceNow >= simple.currentTargetCents
      ? `Target ${fmtCents(simple.currentTargetCents)} reached`
      : `${fmtCents(toNext)} to ${phaseLabel.toLowerCase()}`;

  const goalLineLabel = simple.currentPhase === "buffer" ? "Buffer" : "Payout max";
  const goalLineCents = simple.currentTargetCents;

  const displayedPayoutCents = Math.min(surplusCents, Math.round(capUsdThisCycle * 100));
  const showAddPayoutButton = displayedPayoutCents >= payoutMinCents;

  const atOrPastPayoutMax = balanceNow >= tMax;

  const suggestedMaxPayoutUsd =
    showAddPayoutButton && displayedPayoutCents > 0 ? displayedPayoutCents / 100 : null;

  const payoutCardCallout = showAddPayoutButton
    ? `You can request a payout of ${fmtCents(displayedPayoutCents)}.\n${PHIDIAS_FUNDED_PAYOUT_DASHBOARD_REMINDER}`
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
    bufferReached: bufferDist === 0 || balanceNow >= tBufferEnd,
    showPayoutGatePanel: false,
    cycleNetPnlCents: surplusCents,
    phidiasFundedSimplePayoutUi: true,
    phidiasFundedSimplePayoutMinBalanceCents: tBufferEnd,
  };
}
