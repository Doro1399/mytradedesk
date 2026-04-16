import type { ApexFundedRunway } from "@/lib/journal/apex-funded-progress";
import { getSimplePayoutProgress } from "@/lib/journal/simple-payout-progress";
import { getTradeDayFundedPayoutRowForAccount } from "@/lib/journal/tradeday-journal-rules";
import type { JournalAccount, JournalDataV1 } from "@/lib/journal/types";
import { formatUsdWholeGrouped } from "@/lib/prop-firms";

export type TradeDayFundedRunway = ApexFundedRunway;

export const TRADEDAY_FUNDED_PAYOUT_DASHBOARD_REMINDER =
  "Eligibility is subject to TradeDay rules on your dashboard.";

function fmtCents(c: number): string {
  return formatUsdWholeGrouped(Math.max(0, Math.round(c)) / 100);
}

/** TradeDay funded (CSV): buffer, surplus, payout mini; no payout max cap in CSV. */
export function tryBuildTradeDayFundedRunway(
  _state: JournalDataV1,
  account: JournalAccount,
  p: { startCents: number; currentCents: number }
): TradeDayFundedRunway | null {
  const csv = getTradeDayFundedPayoutRowForAccount(account);
  if (!csv) return null;

  const start = p.startCents;
  const balanceNow = p.currentCents;
  const bufferDist = Math.max(0, Math.round(csv.bufferUsd * 100));
  const tBufferEnd = start + bufferDist;
  const payoutMinCents = Math.max(0, Math.round(csv.payoutMiniUsd * 100));

  const payoutMaxCents = 0;

  const simple = getSimplePayoutProgress({
    startingBalanceCents: start,
    balanceNowCents: balanceNow,
    bufferDistanceCents: bufferDist,
    payoutMinDistanceCents: 0,
    payoutMaxDistanceCents: Math.max(0, payoutMaxCents),
  });

  const tMax = tBufferEnd + payoutMaxCents;
  const span = Math.max(1, tMax - start);
  const barProgress01 =
    payoutMaxCents > 0
      ? Math.min(1, Math.max(0, (balanceNow - start) / span))
      : balanceNow >= tBufferEnd
        ? 1
        : Math.min(1, Math.max(0, (balanceNow - start) / Math.max(1, tBufferEnd - start)));

  const ringPctDisplay = Math.round(Math.max(-999, Math.min(999, simple.progressPercentage)));

  const phaseLabel =
    simple.currentPhase === "buffer"
      ? "Buffer"
      : simple.currentPhase === "payout_min"
        ? "Payout min"
        : payoutMaxCents > 0
          ? "Payout max"
          : "Surplus";

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
  const displayedPayoutCents = surplusCents;
  const showAddPayoutButton = displayedPayoutCents >= payoutMinCents;
  const atOrPastPayoutMax = surplusCents > 0;

  const suggestedMaxPayoutUsd =
    showAddPayoutButton && displayedPayoutCents > 0 ? displayedPayoutCents / 100 : null;

  const payoutCardCallout = showAddPayoutButton
    ? `You can request a payout of ${fmtCents(displayedPayoutCents)}.\n${TRADEDAY_FUNDED_PAYOUT_DASHBOARD_REMINDER}`
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
    tradeDayFundedSimplePayoutUi: true,
    tradeDayFundedSimplePayoutMinBalanceCents: tBufferEnd,
  };
}
