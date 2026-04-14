import type { ApexFundedRunway } from "@/lib/journal/apex-funded-progress";
import { getSimplePayoutProgress } from "@/lib/journal/simple-payout-progress";
import { getLucidProFundedCsvRow, isLucidProFundedJournalAccount } from "@/lib/journal/lucid-journal-rules";
import type { JournalAccount, JournalDataV1 } from "@/lib/journal/types";
import { formatUsdWholeGrouped } from "@/lib/prop-firms";

export type LucidProFundedRunway = ApexFundedRunway;

export { isLucidProFundedJournalAccount } from "@/lib/journal/lucid-journal-rules";

export const LUCID_PRO_FUNDED_PAYOUT_DASHBOARD_REMINDER =
  "Eligibility subject to Lucid Trading rules on your dashboard.";

function fmtCents(c: number): string {
  return formatUsdWholeGrouped(Math.max(0, Math.round(c)) / 100);
}

/**
 * Lucid Pro funded / live : suivi visuel (buffer, payout mini, payout max 1er palier CSV) — pas de simulation des règles Lucid.
 */
export function tryBuildLucidProFundedRunway(
  _state: JournalDataV1,
  account: JournalAccount,
  p: {
    startCents: number;
    bufferStrideCents: number;
    bufferPhaseProgress01: number;
    currentCents: number;
  }
): LucidProFundedRunway | null {
  if (!isLucidProFundedJournalAccount(account)) return null;
  const csv = getLucidProFundedCsvRow(account);
  if (!csv) return null;

  const start = p.startCents;
  const balanceNow = p.currentCents;
  const bufferDist = Math.max(0, Math.round(csv.bufferUsd * 100));
  const payoutMinDist = Math.max(0, Math.round(csv.payoutMiniUsd * 100));
  const payoutMaxDistCents = Math.max(
    payoutMinDist,
    Math.round(csv.payoutMax1stUsd * 100)
  );

  const simple = getSimplePayoutProgress({
    startingBalanceCents: start,
    balanceNowCents: balanceNow,
    bufferDistanceCents: bufferDist,
    payoutMinDistanceCents: payoutMinDist,
    payoutMaxDistanceCents: payoutMaxDistCents,
  });

  const tBufferEnd = start + bufferDist;
  const tMin = tBufferEnd + payoutMinDist;
  const tMax = tBufferEnd + payoutMaxDistCents;

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

  const atOrPastPayoutMax = balanceNow >= tMax;
  const bufferReached = bufferDist === 0 || balanceNow >= tBufferEnd;

  const showAddPayoutButton = simple.showPayoutButton;
  const goodNewsTitle = showAddPayoutButton ? "Good News" : null;

  const surplusAboveBufferCents = Math.max(0, balanceNow - tBufferEnd);
  const availablePayoutCents =
    balanceNow >= tMin
      ? Math.min(surplusAboveBufferCents, payoutMaxDistCents)
      : 0;
  const availablePayoutUsd = availablePayoutCents / 100;
  const suggestedMaxPayoutUsd = showAddPayoutButton && availablePayoutUsd > 0 ? availablePayoutUsd : null;

  const payoutCardCallout = simple.showGoodNewsMessage
    ? `You can request a payout of ${fmtCents(availablePayoutCents)}.\n${LUCID_PRO_FUNDED_PAYOUT_DASHBOARD_REMINDER}`
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
    availablePayoutUsd: showAddPayoutButton ? availablePayoutUsd : null,
    goodNewsTitle,
    payoutGateHint: null,
    bufferReached,
    showPayoutGatePanel: false,
    lucidProSimplePayoutUi: true,
    lucidProSimplePayoutMinBalanceCents: tMin,
  };
}
