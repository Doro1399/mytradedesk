import type { ApexFundedRunway } from "@/lib/journal/apex-funded-progress";
import { countLucidProNonRejectedPayouts } from "@/lib/journal/lucid-pro-funded-payout-state";
import { getSimplePayoutProgress } from "@/lib/journal/simple-payout-progress";
import {
  getLucidDirectFundedBlockForAccount,
  isLucidDirectFundedJournalAccount,
} from "@/lib/journal/lucid-journal-rules";
import type { JournalAccount, JournalDataV1 } from "@/lib/journal/types";
import { formatUsdWholeGrouped } from "@/lib/prop-firms";

export type LucidDirectFundedRunway = ApexFundedRunway;

export { isLucidDirectFundedJournalAccount } from "@/lib/journal/lucid-journal-rules";

export const LUCID_DIRECT_FUNDED_PAYOUT_DASHBOARD_REMINDER =
  "Eligibility subject to Lucid Trading rules on your dashboard.";

function fmtCents(c: number): string {
  return formatUsdWholeGrouped(Math.max(0, Math.round(c)) / 100);
}

/**
 * Lucid Direct funded / live : profit = balance − start, retrait indicatif = min(profit, max palier CSV),
 * selon le **prochain** payout (1ʳᵉ–6ᵉ colonne ; au-delà du 6ᵉ on réutilise le max du 6ᵉ). Mini CSV.
 * Pas de consistance / jours — suivi visuel uniquement.
 */
export function tryBuildLucidDirectFundedRunway(
  state: JournalDataV1,
  account: JournalAccount,
  p: { startCents: number; currentCents: number }
): LucidDirectFundedRunway | null {
  if (!isLucidDirectFundedJournalAccount(account)) return null;
  const block = getLucidDirectFundedBlockForAccount(account);
  if (!block) return null;

  const start = p.startCents;
  const balanceNow = p.currentCents;
  const profitCents = Math.max(0, balanceNow - start);

  const payoutMinCents = Math.max(0, Math.round(block.payoutMiniUsd * 100));
  const caps = block.payouts1stTo6thUsd;
  const nextPayoutOrdinal = countLucidProNonRejectedPayouts(state, account.id) + 1;
  const capIdx = Math.min(Math.max(nextPayoutOrdinal - 1, 0), Math.max(0, caps.length - 1));
  const payoutMaxCents = Math.max(
    payoutMinCents,
    Math.round((caps[capIdx] ?? caps[0] ?? 0) * 100)
  );

  const availablePayoutCents = Math.min(profitCents, payoutMaxCents);
  const showAddPayoutButton = availablePayoutCents >= payoutMinCents;

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
    simple.currentPhase === "payout_min" ? "Payout min" : "Payout max";

  const runwayPartA = phaseLabel;
  const toNext = Math.max(0, simple.currentTargetCents - balanceNow);
  const runwayPartB =
    balanceNow >= simple.currentTargetCents
      ? `Target ${fmtCents(simple.currentTargetCents)} reached`
      : `${fmtCents(toNext)} to ${phaseLabel.toLowerCase()}`;

  const goalLineLabel =
    simple.currentPhase === "payout_min" ? "Payout min" : "Payout max";
  const goalLineCents = simple.currentTargetCents;
  const atOrPastPayoutMax = balanceNow >= tMax;

  const suggestedMaxPayoutUsd =
    showAddPayoutButton && availablePayoutCents > 0 ? availablePayoutCents / 100 : null;

  const payoutCardCallout = showAddPayoutButton
    ? `You can request a payout of ${fmtCents(availablePayoutCents)}.\n${LUCID_DIRECT_FUNDED_PAYOUT_DASHBOARD_REMINDER}`
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
    availablePayoutUsd: showAddPayoutButton ? availablePayoutCents / 100 : null,
    goodNewsTitle: showAddPayoutButton ? "Good News" : null,
    payoutGateHint: null,
    showPayoutGatePanel: false,
    cycleNetPnlCents: profitCents,
    lucidDirectSimplePayoutUi: true,
    lucidDirectSimplePayoutMinBalanceCents: tMin,
  };
}
