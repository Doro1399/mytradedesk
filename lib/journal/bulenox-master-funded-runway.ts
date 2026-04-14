import type { ApexFundedRunway } from "@/lib/journal/apex-funded-progress";
import { getBulenoxFundedSimplePayoutKeyOrNull } from "@/lib/journal/bulenox-journal-rules";
import { BULENOX_FUNDED_SIMPLE_FROM_CSV } from "@/lib/journal/bulenox-funded-simple-csv.generated";
import { getSimplePayoutProgress } from "@/lib/journal/simple-payout-progress";
import type { JournalAccount, JournalDataV1 } from "@/lib/journal/types";
import { countLucidProNonRejectedPayouts } from "@/lib/journal/lucid-pro-funded-payout-state";
import { formatUsdWholeGrouped } from "@/lib/prop-firms";

/**
 * Runway payout **indicative** Bulenox funded.
 * Les comptes **funded Opt 1 et Opt 2** sont des **master accounts** (mêmes règles buffer / mini / max que la ligne compare « Master Account »).
 * L’éval diffère (Trailing vs EOD) ; une fois funded, la clé CSV `Programme|taille` pilote les montants.
 */
export type BulenoxMasterFundedRunway = ApexFundedRunway;

export const BULENOX_FUNDED_PAYOUT_DASHBOARD_REMINDER =
  "Eligibility subject to Bulenox rules on your dashboard.";

/** @deprecated Utiliser {@link BULENOX_FUNDED_PAYOUT_DASHBOARD_REMINDER}. */
export const BULENOX_MASTER_FUNDED_PAYOUT_DASHBOARD_REMINDER = BULENOX_FUNDED_PAYOUT_DASHBOARD_REMINDER;

function fmtCents(c: number): string {
  return formatUsdWholeGrouped(Math.max(0, Math.round(c)) / 100);
}

export function isBulenoxFundedSimplePayoutJournalAccount(account: JournalAccount): boolean {
  return getBulenoxFundedSimplePayoutKeyOrNull(account) != null;
}

/** @deprecated Préférer {@link isBulenoxFundedSimplePayoutJournalAccount} — couvre Opt 1/2 et Master. */
export const isBulenoxMasterAccountFundedJournalAccount = isBulenoxFundedSimplePayoutJournalAccount;

/**
 * Bulenox funded (Opt 1, Opt 2 ou compare « Master Account ») : buffer CSV, surplus, paliers max 1er–3e retrait puis illimité.
 * Indicatif uniquement.
 */
export function tryBuildBulenoxFundedSimpleRunway(
  state: JournalDataV1,
  account: JournalAccount,
  p: { startCents: number; currentCents: number }
): BulenoxMasterFundedRunway | null {
  const key = getBulenoxFundedSimplePayoutKeyOrNull(account);
  if (!key) return null;
  const csv = BULENOX_FUNDED_SIMPLE_FROM_CSV[key]!;

  const start = p.startCents;
  const balanceNow = p.currentCents;
  const bufferDist = Math.max(0, Math.round(csv.bufferUsd * 100));
  const tBufferEnd = start + bufferDist;
  const payoutMinCents = Math.max(0, Math.round(csv.payoutMiniUsd * 100));

  const payoutsDone = countLucidProNonRejectedPayouts(state, account.id);
  const capUsdThisCycle =
    payoutsDone >= 3
      ? null
      : payoutsDone === 0
        ? csv.payoutMax1stUsd
        : payoutsDone === 1
          ? csv.payoutMax2ndPlusUsd
          : csv.payoutMax3rdUsd;

  const surplusCents = Math.max(0, balanceNow - tBufferEnd);
  const capCents =
    capUsdThisCycle != null
      ? Math.max(payoutMinCents, Math.round(capUsdThisCycle * 100))
      : Math.max(payoutMinCents, surplusCents);

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

  const phaseLabel =
    simple.currentPhase === "buffer" ? "Buffer" : "Payout max";

  const runwayPartA = phaseLabel;
  const toNext = Math.max(0, simple.currentTargetCents - balanceNow);
  const runwayPartB =
    balanceNow >= simple.currentTargetCents
      ? `Target ${fmtCents(simple.currentTargetCents)} reached`
      : `${fmtCents(toNext)} to ${phaseLabel.toLowerCase()}`;

  const goalLineLabel = simple.currentPhase === "buffer" ? "Buffer" : "Payout max";
  const goalLineCents = simple.currentTargetCents;

  const displayedPayoutCents =
    capUsdThisCycle != null
      ? Math.min(surplusCents, Math.round(capUsdThisCycle * 100))
      : surplusCents;
  const showAddPayoutButton = displayedPayoutCents >= payoutMinCents;

  const atOrPastPayoutMax = balanceNow >= tMax;

  const suggestedMaxPayoutUsd =
    showAddPayoutButton && displayedPayoutCents > 0 ? displayedPayoutCents / 100 : null;

  const payoutCardCallout = showAddPayoutButton
    ? `You can request a payout of ${fmtCents(displayedPayoutCents)}.\n${BULENOX_FUNDED_PAYOUT_DASHBOARD_REMINDER}\nPayout is based on profits above your safety threshold.`
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
    bulenoxFundedSimplePayoutUi: true,
    bulenoxFundedSimplePayoutMinBalanceCents: tBufferEnd,
  };
}

/** Alias historique (même implémentation que {@link tryBuildBulenoxFundedSimpleRunway}). */
export const tryBuildBulenoxMasterFundedRunway = tryBuildBulenoxFundedSimpleRunway;
