import type { ApexFundedRunway } from "@/lib/journal/apex-funded-progress";
import { getSimplePayoutProgress } from "@/lib/journal/simple-payout-progress";
import {
  getTptRuleBlockForAccount,
  isTakeProfitTraderJournalAccount,
} from "@/lib/journal/tpt-journal-rules";
import type { JournalAccount, JournalDataV1 } from "@/lib/journal/types";
import type { StoredTrade } from "@/lib/journal/trades-storage";
import { formatUsdWholeGrouped } from "@/lib/prop-firms";

export type TptFundedRunway = ApexFundedRunway;

/** Modale Add Payout : rappel aligné sur le callout carte. */
export const TPT_FUNDED_PAYOUT_DASHBOARD_REMINDER =
  "Payouts are based on the balance above your buffer.";

function fmtCents(c: number): string {
  return formatUsdWholeGrouped(Math.max(0, Math.round(c)) / 100);
}

function tptFundedLaneAccount(account: JournalAccount): boolean {
  return account.accountType === "funded" || account.accountType === "live";
}

/**
 * Nouvelle activité P&L après un payout : ligne journal ou trade stocké.
 * Partagé avec d’autres firmes (ex. Lucid Direct).
 */
export function hasTptJournalActivityAfterTimestamp(
  state: JournalDataV1,
  accountId: string,
  afterExclusive: string,
  trades?: readonly StoredTrade[]
): boolean {
  for (const e of Object.values(state.pnlEntries)) {
    if (e.accountId !== accountId) continue;
    if (e.createdAt > afterExclusive) return true;
  }
  if (trades) {
    for (const t of trades) {
      if (t.accountId !== accountId) continue;
      if (t.importedAt > afterExclusive) return true;
    }
  }
  return false;
}

/**
 * Take Profit Trader funded / live : buffer (CSV) puis surplus au-dessus ;
 * plafond indicatif seulement si `payoutMaxUsd` est défini dans le CSV.
 */
export function tryBuildTptFundedRunway(
  _state: JournalDataV1,
  account: JournalAccount,
  p: { startCents: number; currentCents: number }
): TptFundedRunway | null {
  if (!isTakeProfitTraderJournalAccount(account)) return null;
  const block = getTptRuleBlockForAccount(account);
  if (!block || !tptFundedLaneAccount(account)) return null;

  const start = p.startCents;
  const balanceNow = p.currentCents;
  const bufferDist = Math.max(0, Math.round(block.fundedBufferUsd * 100));
  const tBufferEnd = start + bufferDist;

  const maxUsd = block.fundedPayoutMaxUsd;
  const payoutMaxCents =
    maxUsd != null && Number.isFinite(maxUsd) && maxUsd > 0
      ? Math.round(maxUsd * 100)
      : 0;

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

  const ringPctDisplay = Math.round(
    Math.max(-999, Math.min(999, simple.progressPercentage))
  );

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
  const availablePayoutCents =
    payoutMaxCents > 0 ? Math.min(surplusCents, payoutMaxCents) : surplusCents;
  const showAddPayoutButton = availablePayoutCents > 0;
  const atOrPastPayoutMax =
    payoutMaxCents > 0 ? balanceNow >= tMax : surplusCents > 0;

  const miniUsd = block.payoutMiniUsd;
  const walletFeeWarn = `Warning: wallet withdrawals below ${formatUsdWholeGrouped(miniUsd)} may incur a $50 fee.`;

  const payoutCardCallout = showAddPayoutButton
    ? `You can request a payout of ${fmtCents(availablePayoutCents)}.\n${TPT_FUNDED_PAYOUT_DASHBOARD_REMINDER}\n${walletFeeWarn}`
    : null;

  const suggestedMaxPayoutUsd =
    showAddPayoutButton && availablePayoutCents > 0 ? availablePayoutCents / 100 : null;
  const availablePayoutUsd = showAddPayoutButton ? availablePayoutCents / 100 : null;

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
    availablePayoutUsd,
    goodNewsTitle: showAddPayoutButton ? "Good News" : null,
    payoutGateHint: null,
    bufferReached: bufferDist === 0 || balanceNow >= tBufferEnd,
    showPayoutGatePanel: false,
    cycleNetPnlCents: surplusCents,
    tptSimplePayoutUi: true,
    tptSimplePayoutMinBalanceCents: tBufferEnd,
  };
}
