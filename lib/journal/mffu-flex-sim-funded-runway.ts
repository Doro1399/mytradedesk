import type { ApexFundedRunway } from "@/lib/journal/apex-funded-progress";
import {
  MFFU_FLEX_SIM_FUNDED_FROM_CSV,
  type MffuFlexSimFundedCsvSize,
} from "@/lib/journal/mffu-flex-sim-funded-csv.generated";
import { getSimplePayoutProgress } from "@/lib/journal/simple-payout-progress";
import {
  isMffuFlexSimFundedJournalAccount,
  mffuFlexSimFundedCsvSizeOrNull,
} from "@/lib/journal/mffu-flex-sim-funded-journal-rules";
import type { JournalAccount, JournalDataV1 } from "@/lib/journal/types";
import { formatUsdWholeGrouped } from "@/lib/prop-firms";

export type MffuFlexSimFundedRunway = ApexFundedRunway;

export const MFFU_FLEX_PAYOUT_DASHBOARD_REMINDER =
  "Eligibility subject to MyFundedFutures rules on your dashboard.";

function fmtCents(c: number): string {
  return formatUsdWholeGrouped(Math.max(0, Math.round(c)) / 100);
}

/**
 * My Funded Futures Flex funded : 50 % du profit vs start, mini/maxi CSV — indicatif uniquement
 * (pas de winning days, pas de net profit minimum entre payouts).
 */
export function tryBuildMffuFlexSimFundedRunway(
  _state: JournalDataV1,
  account: JournalAccount,
  p: { startCents: number; currentCents: number }
): MffuFlexSimFundedRunway | null {
  if (!isMffuFlexSimFundedJournalAccount(account)) return null;
  if (account.accountType !== "funded" && account.accountType !== "live") return null;

  const sk = mffuFlexSimFundedCsvSizeOrNull(account);
  if (sk == null) return null;
  const csv = MFFU_FLEX_SIM_FUNDED_FROM_CSV[sk as MffuFlexSimFundedCsvSize];
  if (!csv) return null;

  const start = p.startCents;
  const balanceNow = p.currentCents;

  const payoutMinCents = Math.max(0, Math.round(csv.payoutMiniUsd * 100));
  const payoutMaxCents = Math.max(
    payoutMinCents,
    Math.round(csv.payoutMaxUsd * 100)
  );

  const minSpanCents = 2 * payoutMinCents;
  const maxSpanCents = 2 * payoutMaxCents;

  const simple = getSimplePayoutProgress({
    startingBalanceCents: start,
    balanceNowCents: balanceNow,
    bufferDistanceCents: 0,
    payoutMinDistanceCents: minSpanCents,
    payoutMaxDistanceCents: maxSpanCents,
  });

  const tMin = start + minSpanCents;
  const tMax = start + maxSpanCents;
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

  const goalLineLabel =
    simple.currentPhase === "payout_min"
      ? "Payout min"
      : payoutMaxCents > 0
        ? "Payout max"
        : "Payout min";
  const goalLineCents = simple.currentTargetCents;

  const profitCents = balanceNow - start;
  const halfProfitCents = Math.round(Math.max(0, profitCents) / 2);
  const displayedPayoutCents = Math.min(halfProfitCents, payoutMaxCents);
  const showAddPayoutButton = displayedPayoutCents >= payoutMinCents;

  const implicitBufferCents = halfProfitCents;

  const atOrPastPayoutMax = balanceNow >= tMax;

  const suggestedMaxPayoutUsd =
    showAddPayoutButton && displayedPayoutCents > 0 ? displayedPayoutCents / 100 : null;

  const payoutCardCallout = showAddPayoutButton
    ? `You can request a payout of ${fmtCents(displayedPayoutCents)}.\n${MFFU_FLEX_PAYOUT_DASHBOARD_REMINDER}\nIf you withdraw now, ${fmtCents(implicitBufferCents)} remains as buffer.`
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
    mffuFlexSimplePayoutUi: true,
    mffuFlexSimplePayoutMinBalanceCents: tMin,
  };
}
