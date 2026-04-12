import type { ApexFundedRunway } from "@/lib/journal/apex-funded-progress";
import { getFundedNextRapidPayoutState } from "@/lib/journal/funded-next-rapid-funded-payout-state";
import { isFundedNextRapidFundedJournalAccount } from "@/lib/journal/funded-next-journal-rules";
import type { JournalAccount, JournalDataV1 } from "@/lib/journal/types";
import type { StoredTrade } from "@/lib/journal/trades-storage";
import { formatUsdWholeGrouped } from "@/lib/prop-firms";

export type FundedNextRapidFundedRunway = ApexFundedRunway;

function fmtUsdFromCents(cents: number): string {
  return formatUsdWholeGrouped(Math.max(0, Math.round(cents)) / 100);
}

function fmtUsdFromCentsBuffer(cents: number): string {
  const n = Math.max(0, Math.round(cents)) / 100;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n);
}

/**
 * Funded Next Futures Rapid funded — cycle target (consistency + mins), then cap / no cap; simple “$X to go”.
 */
export function tryBuildFundedNextRapidFundedRunway(
  state: JournalDataV1,
  account: JournalAccount,
  p: { startCents: number; currentCents: number },
  options?: { storedTrades?: readonly StoredTrade[] }
): FundedNextRapidFundedRunway | null {
  if (!isFundedNextRapidFundedJournalAccount(account)) return null;

  const st = getFundedNextRapidPayoutState(state, account, {
    startCents: p.startCents,
    currentCents: p.currentCents,
    storedTrades: options?.storedTrades,
  });
  if (!st) return null;

  const balanceTargetCents = p.startCents + st.effectiveTargetCents;
  const spanCents = Math.max(1, balanceTargetCents - p.startCents);
  const traveledCents = Math.max(0, p.currentCents - p.startCents);
  const barProgress01 = Math.max(0, Math.min(1, traveledCents / spanCents));
  const ringArc01 = barProgress01;
  const ringPctDisplay = Math.round(barProgress01 * 100);

  const remainingCents = Math.max(0, balanceTargetCents - p.currentCents);
  const runwayPartA = `${fmtUsdFromCents(remainingCents)} to go`;
  const runwayPartB = "";

  const atOrPastPayoutMax =
    st.cycleProfitCents >= st.effectiveTargetCents &&
    st.availablePayoutCents >= Math.round(st.payoutMin * 100) - 1;

  let payoutCardCallout: string | null = null;
  let suggestedMaxPayoutUsd: number | null = null;
  if (st.isEligible) {
    const g = fmtUsdFromCentsBuffer(st.availablePayoutCents);
    payoutCardCallout = `You can payout up to ${g}.`;
    suggestedMaxPayoutUsd = st.availablePayout > 0 ? st.availablePayout : null;
  }

  const milestoneForPanel = st.withdrawalCount > 0 || st.cycleProfitCents !== 0 || p.currentCents > p.startCents;

  const payoutGateHint =
    !st.isEligible && milestoneForPanel && st.eligibilityReason ? st.eligibilityReason : null;

  const showPayoutGatePanel = !st.isEligible && milestoneForPanel && payoutGateHint != null;

  return {
    barProgress01,
    ringArc01,
    ringPctDisplay,
    showAddPayoutButton: st.showAddPayout,
    atOrPastPayoutMax,
    runwayPartA,
    runwayPartB,
    goalLineLabel: "Target",
    goalLineCents: balanceTargetCents,
    phasePctLabel: String(ringPctDisplay),
    payoutCardCallout,
    suggestedMaxPayoutUsd,
    goodNewsTitle: st.isEligible ? "Good News" : null,
    payoutGateHint,
    showPayoutGatePanel,
    cycleNetPnlCents: st.cycleProfitCents,
    showHardBreachWarning: st.showHardBreachWarning,
    hardBreachWarningMessage: st.hardBreachWarningMessage,
  };
}
