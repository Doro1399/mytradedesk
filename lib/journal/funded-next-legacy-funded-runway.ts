import type { ApexFundedRunway } from "@/lib/journal/apex-funded-progress";
import { FUNDED_NEXT_LEGACY_FUNDED_FROM_CSV } from "@/lib/journal/funded-next-legacy-funded-csv.generated";
import { getSimplePayoutProgress } from "@/lib/journal/simple-payout-progress";
import { isFundedNextLegacyFundedJournalAccount } from "@/lib/journal/funded-next-journal-rules";
import type { JournalAccount, JournalDataV1 } from "@/lib/journal/types";
import { formatUsdWholeGrouped } from "@/lib/prop-firms";

export type FundedNextLegacyFundedRunway = ApexFundedRunway;

export const FUNDED_NEXT_LEGACY_PAYOUT_DASHBOARD_REMINDER =
  "Eligibility subject to FundedNext rules on your dashboard.";

function fmtCents(c: number): string {
  return formatUsdWholeGrouped(Math.max(0, Math.round(c)) / 100);
}

/**
 * Funded Next Futures Legacy funded : 50 % du profit vs start, mini `payoutMiniUsd` / maxi `payoutCapStandardUsd` CSV — indicatif uniquement
 * (pas de benchmark days, pas de consistency, pas de fréquence 5 jours).
 */
export function tryBuildFundedNextLegacyFundedRunway(
  _state: JournalDataV1,
  account: JournalAccount,
  p: { startCents: number; currentCents: number }
): FundedNextLegacyFundedRunway | null {
  if (!isFundedNextLegacyFundedJournalAccount(account)) return null;
  if (account.accountType !== "funded" && account.accountType !== "live") return null;

  const sk = account.sizeLabel.trim().toLowerCase().replace(/\s+/g, "") as keyof typeof FUNDED_NEXT_LEGACY_FUNDED_FROM_CSV;
  const csv = FUNDED_NEXT_LEGACY_FUNDED_FROM_CSV[sk];
  if (!csv) return null;

  const start = p.startCents;
  const balanceNow = p.currentCents;

  const payoutMinCents = Math.max(0, Math.round(csv.payoutMiniUsd * 100));
  const payoutMaxCents = Math.max(
    payoutMinCents,
    Math.round(csv.payoutCapStandardUsd * 100)
  );

  /** Half of profit must reach mini/maxi thresholds → balance spans 2× mini / 2× maxi. */
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
    ? `You can request a payout of ${fmtCents(displayedPayoutCents)}.\n${FUNDED_NEXT_LEGACY_PAYOUT_DASHBOARD_REMINDER}\nIf you withdraw now, ${fmtCents(implicitBufferCents)} remains as buffer.`
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
    fundedNextLegacySimplePayoutUi: true,
    fundedNextLegacySimplePayoutMinBalanceCents: tMin,
  };
}
