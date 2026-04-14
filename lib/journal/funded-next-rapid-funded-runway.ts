import type { ApexFundedRunway } from "@/lib/journal/apex-funded-progress";
import { FUNDED_NEXT_RAPID_FUNDED_FROM_CSV } from "@/lib/journal/funded-next-rapid-funded-csv.generated";
import { getSimplePayoutProgress } from "@/lib/journal/simple-payout-progress";
import { isFundedNextRapidFundedJournalAccount } from "@/lib/journal/funded-next-journal-rules";
import type { JournalAccount, JournalDataV1 } from "@/lib/journal/types";
import { formatUsdWholeGrouped } from "@/lib/prop-firms";

export type FundedNextRapidFundedRunway = ApexFundedRunway;

export const FUNDED_NEXT_RAPID_PAYOUT_DASHBOARD_REMINDER =
  "Eligibility subject to FundedNext rules on your dashboard.";

function fmtCents(c: number): string {
  return formatUsdWholeGrouped(Math.max(0, Math.round(c)) / 100);
}

/**
 * Funded Next Futures Rapid funded : profit journal vs start, mini/maxi CSV (Standard path) — indicatif uniquement
 * (pas de consistance 40 %, pas de jours benchmark, pas de cycles).
 */
export function tryBuildFundedNextRapidFundedRunway(
  _state: JournalDataV1,
  account: JournalAccount,
  p: { startCents: number; currentCents: number }
): FundedNextRapidFundedRunway | null {
  if (!isFundedNextRapidFundedJournalAccount(account)) return null;
  if (account.accountType !== "funded" && account.accountType !== "live") return null;

  const sk = account.sizeLabel.trim().toLowerCase().replace(/\s+/g, "") as keyof typeof FUNDED_NEXT_RAPID_FUNDED_FROM_CSV;
  const csv = FUNDED_NEXT_RAPID_FUNDED_FROM_CSV[sk];
  if (!csv) return null;

  const start = p.startCents;
  const balanceNow = p.currentCents;

  const payoutMinCents = Math.max(0, Math.round(csv.payoutMiniUsd * 100));
  const payoutMaxCents = Math.max(
    payoutMinCents,
    Math.round(csv.payoutMaxStandardUsd * 100)
  );

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
    simple.currentPhase === "payout_min"
      ? "Payout min"
      : "Payout max";

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
  const displayedPayoutCents = Math.min(Math.max(0, profitCents), payoutMaxCents);
  const showAddPayoutButton = displayedPayoutCents >= payoutMinCents;

  const atOrPastPayoutMax = balanceNow >= tMax;

  const suggestedMaxPayoutUsd =
    showAddPayoutButton && displayedPayoutCents > 0 ? displayedPayoutCents / 100 : null;

  const payoutCardCallout = showAddPayoutButton
    ? `You can request a payout of ${fmtCents(displayedPayoutCents)}.\n${FUNDED_NEXT_RAPID_PAYOUT_DASHBOARD_REMINDER}`
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
    fundedNextRapidSimplePayoutUi: true,
    fundedNextRapidSimplePayoutMinBalanceCents: tMin,
  };
}
