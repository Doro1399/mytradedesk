import type { ApexFundedRunway } from "@/lib/journal/apex-funded-progress";
import {
  getFundedFuturesNetworkFundedRowOrNull,
  isFundedFuturesNetworkJournalAccount,
} from "@/lib/journal/funded-futures-network-journal-rules";
import { getSimplePayoutProgress } from "@/lib/journal/simple-payout-progress";
import type { JournalAccount, JournalDataV1 } from "@/lib/journal/types";
import { formatUsdWholeGrouped } from "@/lib/prop-firms";

export type FfnFundedRunway = ApexFundedRunway;

export const FFN_FUNDED_PAYOUT_DASHBOARD_REMINDER =
  "Eligibility subject to Funded Futures Network rules on your dashboard.";

/** Plancher produit : le bouton payout n’apparaît qu’à partir de 500 $ (au-delà du mini CSV si plus élevé). */
const PAYOUT_MIN_FLOOR_CENTS = 50_000;

function fmtCents(c: number): string {
  return formatUsdWholeGrouped(Math.max(0, Math.round(c)) / 100);
}

/**
 * Funded Futures Network funded : données `FfnFundedRow` (CSV aligné journal-rules) — indicatif uniquement.
 * Avec buffer CSV : surplus au-dessus du buffer ; sans buffer (0) : profit vs start. Mini ≥ 500 $ et mini CSV.
 */
export function tryBuildFundedFuturesNetworkFundedRunway(
  _state: JournalDataV1,
  account: JournalAccount,
  p: { startCents: number; currentCents: number }
): FfnFundedRunway | null {
  if (!isFundedFuturesNetworkJournalAccount(account)) return null;
  if (account.accountType !== "funded" && account.accountType !== "live") return null;

  const csv = getFundedFuturesNetworkFundedRowOrNull(account);
  if (!csv) return null;

  const start = p.startCents;
  const balanceNow = p.currentCents;
  const payoutMinCents = Math.max(PAYOUT_MIN_FLOOR_CENTS, Math.round(csv.payoutMiniUsd * 100));
  const payoutMaxCents = Math.max(payoutMinCents, Math.round(csv.payoutMaxUsd * 100));
  const bufferDist = Math.max(0, Math.round(csv.bufferUsd * 100));

  if (bufferDist > 0) {
    const tBufferEnd = start + bufferDist;
    /** Après le buffer, segment jusqu’au solde où le surplus ≥ mini (500 $ + CSV), puis jusqu’au max. */
    const simple = getSimplePayoutProgress({
      startingBalanceCents: start,
      balanceNowCents: balanceNow,
      bufferDistanceCents: bufferDist,
      payoutMinDistanceCents: payoutMinCents,
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
          ? "Payout mini"
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
          ? "Payout mini"
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

    const infoLine = "Payout is based on profits above your buffer.";
    const payoutCardCallout = showAddPayoutButton
      ? `You can request a payout of ${fmtCents(displayedPayoutCents)}.\n${FFN_FUNDED_PAYOUT_DASHBOARD_REMINDER}\n${infoLine}`
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
      bufferReached: balanceNow >= tBufferEnd,
      showPayoutGatePanel: false,
      cycleNetPnlCents: surplusCents,
      ffnFundedSimplePayoutUi: true,
      ffnFundedSimplePayoutMinBalanceCents: tBufferEnd,
    };
  }

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
    simple.currentPhase === "payout_min" ? "Payout mini" : "Payout max";

  const runwayPartA = phaseLabel;
  const toNext = Math.max(0, simple.currentTargetCents - balanceNow);
  const runwayPartB =
    balanceNow >= simple.currentTargetCents
      ? `Target ${fmtCents(simple.currentTargetCents)} reached`
      : `${fmtCents(toNext)} to ${phaseLabel.toLowerCase()}`;

  const goalLineLabel =
    simple.currentPhase === "payout_min"
      ? "Payout mini"
      : payoutMaxCents > 0
        ? "Payout max"
        : "Payout mini";
  const goalLineCents = simple.currentTargetCents;

  const profitCents = balanceNow - start;
  const availableCents = Math.max(0, profitCents);
  const displayedPayoutCents = Math.min(availableCents, payoutMaxCents);
  const showAddPayoutButton = displayedPayoutCents >= payoutMinCents;

  const atOrPastPayoutMax = balanceNow >= tMax;
  const suggestedMaxPayoutUsd =
    showAddPayoutButton && displayedPayoutCents > 0 ? displayedPayoutCents / 100 : null;

  const infoLine = "Payout is based on your current journal profit.";
  const payoutCardCallout = showAddPayoutButton
    ? `You can request a payout of ${fmtCents(displayedPayoutCents)}.\n${FFN_FUNDED_PAYOUT_DASHBOARD_REMINDER}\n${infoLine}`
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
    ffnFundedSimplePayoutUi: true,
    ffnFundedSimplePayoutMinBalanceCents: tMin,
  };
}
