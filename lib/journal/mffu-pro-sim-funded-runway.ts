import type { ApexFundedRunway } from "@/lib/journal/apex-funded-progress";
import {
  MFFU_PRO_SIM_FUNDED_FROM_CSV,
  type MffuProSimFundedCsvSize,
} from "@/lib/journal/mffu-pro-sim-funded-csv.generated";
import { getSimplePayoutProgress } from "@/lib/journal/simple-payout-progress";
import {
  isMffuProSimFundedJournalAccount,
  mffuProSimFundedCsvSizeOrNull,
} from "@/lib/journal/mffu-pro-sim-funded-journal-rules";
import type { JournalAccount, JournalDataV1 } from "@/lib/journal/types";
import { formatUsdWholeGrouped } from "@/lib/prop-firms";

export type MffuProSimFundedRunway = ApexFundedRunway;

export const MFFU_PRO_PAYOUT_DASHBOARD_REMINDER =
  "Eligibility subject to MyFundedFutures rules on your dashboard.";

function fmtCents(c: number): string {
  return formatUsdWholeGrouped(Math.max(0, Math.round(c)) / 100);
}

/**
 * My Funded Futures Pro funded : buffer CSV, surplus au-dessus, plafond `payoutMaxUsd`,
 * seuil `payoutMiniUsd` — indicatif uniquement (pas de 14 jours civils, pas de retrait unique avant buffer).
 */
export function tryBuildMffuProSimFundedRunway(
  _state: JournalDataV1,
  account: JournalAccount,
  p: { startCents: number; currentCents: number }
): MffuProSimFundedRunway | null {
  if (!isMffuProSimFundedJournalAccount(account)) return null;
  if (account.accountType !== "funded" && account.accountType !== "live") return null;

  const sk = mffuProSimFundedCsvSizeOrNull(account);
  if (sk == null) return null;
  const csv = MFFU_PRO_SIM_FUNDED_FROM_CSV[sk as MffuProSimFundedCsvSize];
  if (!csv) return null;

  const start = p.startCents;
  const balanceNow = p.currentCents;
  const bufferDist = Math.max(0, Math.round(csv.bufferUsd * 100));
  const tBufferEnd = start + bufferDist;

  const payoutMinCents = Math.max(0, Math.round(csv.payoutMiniUsd * 100));
  const payoutMaxCents = Math.max(
    payoutMinCents,
    Math.round(csv.payoutMaxUsd * 100)
  );

  const simple = getSimplePayoutProgress({
    startingBalanceCents: start,
    balanceNowCents: balanceNow,
    bufferDistanceCents: bufferDist,
    payoutMinDistanceCents: 0,
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
      : payoutMaxCents > 0
        ? "Payout max"
        : "Buffer";
  const goalLineCents = simple.currentTargetCents;

  const surplusCents = Math.max(0, balanceNow - tBufferEnd);
  const displayedPayoutCents = Math.min(surplusCents, payoutMaxCents);
  const showAddPayoutButton = displayedPayoutCents >= payoutMinCents;

  const atOrPastPayoutMax = balanceNow >= tMax;

  const suggestedMaxPayoutUsd =
    showAddPayoutButton && displayedPayoutCents > 0 ? displayedPayoutCents / 100 : null;

  const payoutCardCallout = showAddPayoutButton
    ? `You can request a payout of ${fmtCents(displayedPayoutCents)}.\n${MFFU_PRO_PAYOUT_DASHBOARD_REMINDER}`
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
    mffuProSimplePayoutUi: true,
    mffuProSimplePayoutMinBalanceCents: tBufferEnd,
  };
}
