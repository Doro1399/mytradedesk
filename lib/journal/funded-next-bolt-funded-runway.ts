import type { ApexFundedRunway } from "@/lib/journal/apex-funded-progress";
import { getFundedNextBoltPayoutState } from "@/lib/journal/funded-next-bolt-funded-payout-state";
import { FUNDED_NEXT_BOLT_FUNDED_FROM_CSV } from "@/lib/journal/funded-next-bolt-funded-csv.generated";
import { isFundedNextBoltFundedJournalAccount } from "@/lib/journal/funded-next-journal-rules";
import type { JournalAccount, JournalDataV1 } from "@/lib/journal/types";
import type { StoredTrade } from "@/lib/journal/trades-storage";
import { formatUsdWholeGrouped } from "@/lib/prop-firms";

export type FundedNextBoltFundedRunway = ApexFundedRunway;

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
 * Funded Next Futures Bolt funded — simple “$X to go” vs one target (EOD floor + standard max, or final cap path).
 * When {@link FundedNextBoltPayoutState.isConcluded} is true, a future **Hall of Fame** feature can surface these accounts.
 */
export function tryBuildFundedNextBoltFundedRunway(
  state: JournalDataV1,
  account: JournalAccount,
  p: { startCents: number; currentCents: number },
  options?: { storedTrades?: readonly StoredTrade[] }
): FundedNextBoltFundedRunway | null {
  if (!isFundedNextBoltFundedJournalAccount(account)) return null;
  const sk = account.sizeLabel.trim().toLowerCase().replace(/\s+/g, "") as keyof typeof FUNDED_NEXT_BOLT_FUNDED_FROM_CSV;
  const csv = FUNDED_NEXT_BOLT_FUNDED_FROM_CSV[sk as "50k"];
  if (!csv) return null;

  const st = getFundedNextBoltPayoutState(state, account, {
    startCents: p.startCents,
    currentCents: p.currentCents,
    storedTrades: options?.storedTrades,
  });
  if (!st) return null;

  const bufferCents = Math.round(csv.bufferUsd * 100);
  const floorCents = p.startCents + bufferCents;
  const isFinal = st.isFinalWithdrawal;

  const effectiveTargetCents = isFinal
    ? p.startCents + Math.round(csv.payoutMaxFinalUsd * 100)
    : floorCents + Math.round(csv.payoutMaxStandardUsd * 100);

  const spanCents = Math.max(1, effectiveTargetCents - p.startCents);
  const traveledCents = Math.max(0, p.currentCents - p.startCents);
  const barProgress01 = Math.max(0, Math.min(1, traveledCents / spanCents));
  const ringArc01 = barProgress01;
  const ringPctDisplay = Math.round(barProgress01 * 100);

  const remainingCents = Math.max(0, effectiveTargetCents - p.currentCents);
  const runwayPartA = `${fmtUsdFromCents(remainingCents)} to go`;
  const runwayPartB = "";

  const atOrPastPayoutMax =
    !isFinal && st.availablePayoutCents >= Math.round(csv.payoutMaxStandardUsd * 100) - 1;

  let payoutCardCallout: string | null = null;
  let suggestedMaxPayoutUsd: number | null = null;
  if (st.isEligible) {
    const g = fmtUsdFromCentsBuffer(st.availablePayoutCents);
    payoutCardCallout = `You can payout up to ${g}.`;
    suggestedMaxPayoutUsd = st.availablePayout > 0 ? st.availablePayout : null;
  }

  const milestoneForPanel =
    st.withdrawalCount > 0 || st.cycleProfit !== 0 || p.currentCents > p.startCents;

  const payoutGateHint =
    !st.isEligible && !st.isConcluded && milestoneForPanel && st.eligibilityReason
      ? st.eligibilityReason
      : null;

  const showPayoutGatePanel = !st.isEligible && !st.isConcluded && milestoneForPanel && payoutGateHint != null;

  return {
    barProgress01,
    ringArc01,
    ringPctDisplay,
    showAddPayoutButton: st.showAddPayout,
    atOrPastPayoutMax,
    runwayPartA,
    runwayPartB,
    goalLineLabel: "Target",
    goalLineCents: effectiveTargetCents,
    phasePctLabel: String(ringPctDisplay),
    payoutCardCallout,
    suggestedMaxPayoutUsd,
    goodNewsTitle: st.isEligible ? "Good News" : null,
    payoutGateHint,
    showPayoutGatePanel,
    cycleNetPnlCents: Math.round(st.cycleProfit * 100),
  };
}
