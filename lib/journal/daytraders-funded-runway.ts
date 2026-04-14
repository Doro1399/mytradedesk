import type { ApexFundedRunway } from "@/lib/journal/apex-funded-progress";
import {
  getDaytradersFundedPayoutRowForAccount,
  isDaytradersFundedJournalAccount,
} from "@/lib/journal/daytraders-journal-rules";
import { getSimplePayoutProgress } from "@/lib/journal/simple-payout-progress";
import type { JournalAccount, JournalDataV1 } from "@/lib/journal/types";
import { formatUsdWholeGrouped } from "@/lib/prop-firms";

export type DaytradersFundedRunway = ApexFundedRunway;

export const DAYTRADERS_FUNDED_PAYOUT_DASHBOARD_REMINDER =
  "Eligibility subject to DayTraders rules on your dashboard.";

/** Barre visuelle quand pas de plafond payout explicite dans le CSV. */
const PAYOUT_MAX_SPAN_FALLBACK_CENTS = 500_000_000;

function fmtCents(c: number): string {
  return formatUsdWholeGrouped(Math.max(0, Math.round(c)) / 100);
}

function secondaryCalloutLine(row: {
  bufferUsd: number | null;
  profitSplitFraction: number;
}): string | null {
  const hasBuffer = row.bufferUsd != null && row.bufferUsd > 0;
  if (hasBuffer) return null;
  if (row.profitSplitFraction < 1 - 1e-9) {
    return "Payout is based on a percentage of your total profit.";
  }
  return "Payout is based on your current profit.";
}

/**
 * DayTraders funded / live — montants et buffer issus du CSV uniquement (indicatif).
 */
export function tryBuildDaytradersFundedRunway(
  _state: JournalDataV1,
  account: JournalAccount,
  p: { startCents: number; currentCents: number }
): DaytradersFundedRunway | null {
  if (!isDaytradersFundedJournalAccount(account)) return null;
  const row = getDaytradersFundedPayoutRowForAccount(account);
  if (!row) return null;

  const start = p.startCents;
  const balanceNow = p.currentCents;
  const payoutMinCents = Math.max(0, Math.round(row.payoutMiniUsd * 100));
  const bufferDistanceCents =
    row.bufferUsd != null && row.bufferUsd > 0 ? Math.round(row.bufferUsd * 100) : 0;

  const payoutMaxDistanceCents =
    row.payoutMaxUsd == null
      ? Math.max(payoutMinCents + 1, PAYOUT_MAX_SPAN_FALLBACK_CENTS)
      : Math.max(payoutMinCents, Math.round(row.payoutMaxUsd * 100));

  const simple = getSimplePayoutProgress({
    startingBalanceCents: start,
    balanceNowCents: balanceNow,
    bufferDistanceCents: bufferDistanceCents,
    payoutMinDistanceCents: payoutMinCents,
    payoutMaxDistanceCents,
  });

  const tBufferEnd = start + bufferDistanceCents;
  const rawBaseCents =
    bufferDistanceCents > 0
      ? Math.max(0, balanceNow - tBufferEnd)
      : Math.max(0, balanceNow - start);

  const afterSplitCents = Math.round(rawBaseCents * row.profitSplitFraction);
  const maxCapCents =
    row.payoutMaxUsd == null ? Number.MAX_SAFE_INTEGER : Math.round(row.payoutMaxUsd * 100);
  const displayedPayoutCents = Math.min(afterSplitCents, maxCapCents);

  const showAddPayoutButton =
    displayedPayoutCents > 0 && displayedPayoutCents >= payoutMinCents && balanceNow > start;

  const tMin = start + bufferDistanceCents + payoutMinCents;
  const tMax = start + bufferDistanceCents + payoutMaxDistanceCents;
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

  const goalLineLabel = phaseLabel;
  const goalLineCents = simple.currentTargetCents;

  const atOrPastPayoutMax =
    row.payoutMaxUsd != null && afterSplitCents >= maxCapCents && balanceNow >= tMax;
  const suggestedMaxPayoutUsd =
    showAddPayoutButton && displayedPayoutCents > 0 ? displayedPayoutCents / 100 : null;

  const line2 = secondaryCalloutLine(row);
  const payoutCardCallout = showAddPayoutButton
    ? [
        `You can request a payout of ${fmtCents(displayedPayoutCents)}.`,
        line2,
        DAYTRADERS_FUNDED_PAYOUT_DASHBOARD_REMINDER,
      ]
        .filter((x): x is string => x != null && x !== "")
        .join("\n")
    : null;

  const bufferReached = bufferDistanceCents === 0 || balanceNow >= tBufferEnd;

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
    cycleNetPnlCents: Math.max(0, rawBaseCents),
    bufferReached,
    daytradersFundedSimplePayoutUi: true,
    daytradersFundedSimplePayoutMinBalanceCents: tMin,
  };
}
