import type { ApexFundedRunway } from "@/lib/journal/apex-funded-progress";
import {
  MFFU_PRO_SIM_FUNDED_FROM_CSV,
  type MffuProSimFundedCsvSize,
} from "@/lib/journal/mffu-pro-sim-funded-csv.generated";
import { getMffuProPayoutState } from "@/lib/journal/mffu-pro-sim-funded-payout-state";
import { isMffuProSimFundedJournalAccount, mffuProSimFundedCsvSizeOrNull } from "@/lib/journal/mffu-pro-sim-funded-journal-rules";
import type { JournalAccount, JournalDataV1 } from "@/lib/journal/types";
import type { StoredTrade } from "@/lib/journal/trades-storage";
import { formatUsdWholeGrouped } from "@/lib/prop-firms";

export type MffuProSimFundedRunway = ApexFundedRunway;

const PHASE_TIME_SHARE = 0.45;
const PHASE_BUFFER_SHARE = 0.55;

function fmtCents(cents: number): string {
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
 * MFFU **Pro** Sim funded : phase 1 jours civils depuis 1er trade (CSV) → phase 2 buffer → phase 3 payout standard.
 */
export function tryBuildMffuProSimFundedRunway(
  state: JournalDataV1,
  account: JournalAccount,
  p: { startCents: number; currentCents: number },
  options?: { storedTrades?: readonly StoredTrade[] }
): MffuProSimFundedRunway | null {
  if (!isMffuProSimFundedJournalAccount(account)) return null;
  const sk = mffuProSimFundedCsvSizeOrNull(account);
  if (sk == null) return null;
  const csv = MFFU_PRO_SIM_FUNDED_FROM_CSV[sk as MffuProSimFundedCsvSize];
  if (!csv) return null;

  const st = getMffuProPayoutState(state, account, {
    startCents: p.startCents,
    currentCents: p.currentCents,
    storedTrades: options?.storedTrades,
  });
  if (!st) return null;

  const bufferCents = Math.round(csv.bufferUsd * 100);
  const reqDays = Math.max(1, st.requiredDays);
  const t01 = Math.min(1, st.daysSinceFirstTrade / reqDays);
  const traveled = Math.max(0, p.currentCents - p.startCents);
  const buf01 = bufferCents > 0 ? Math.min(1, traveled / bufferCents) : 1;

  const barProgress01 = Math.max(
    0,
    Math.min(1, PHASE_TIME_SHARE * t01 + PHASE_BUFFER_SHARE * buf01)
  );
  const ringArc01 = barProgress01;
  const ringPctDisplay = Math.round(barProgress01 * 100);

  let runwayPartA = "";
  let runwayPartB = "";
  let goalLineLabel = "Calendar days";
  let goalLineCents: number | null = null;

  if (!st.timeRequirementMet) {
    const pct = Math.round(t01 * 100);
    runwayPartA = `Day count ${pct}%`;
    runwayPartB = `${st.daysSinceFirstTrade}/${reqDays} days since first funded trade · buffer ${formatUsdWholeGrouped(csv.bufferUsd)} to clear`;
    goalLineLabel = `${reqDays} days`;
    goalLineCents = null;
  } else if (p.currentCents < st.bufferFloorCents) {
    const pct = Math.round(buf01 * 100);
    runwayPartA = `Buffer ${pct}%`;
    runwayPartB = `${fmtCents(st.bufferFloorCents - p.currentCents)} to buffer floor · ${st.daysSinceFirstTrade}/${reqDays} days OK`;
    goalLineLabel = "Buffer";
    goalLineCents = st.bufferFloorCents;
  } else {
    runwayPartA = "Payout track";
    runwayPartB = `Up to ${fmtUsdFromCentsBuffer(st.availablePayoutCents)} gross (cap ${formatUsdWholeGrouped(csv.payoutMaxUsd)})`;
    goalLineLabel = `Payout max ${formatUsdWholeGrouped(csv.payoutMaxUsd)}`;
    goalLineCents = null;
  }

  const payoutCapCents = Math.round(csv.payoutMaxUsd * 100);
  const atOrPastPayoutMax = st.availablePayoutCents >= payoutCapCents - 1;

  let payoutCardCallout: string | null = null;
  let suggestedMaxPayoutUsd: number | null = null;
  if (st.isEligible) {
    payoutCardCallout = `You can payout up to ${fmtUsdFromCentsBuffer(st.availablePayoutCents)}.`;
    suggestedMaxPayoutUsd = st.availablePayout > 0 ? st.availablePayout : null;
  }

  const milestoneForPanel =
    st.firstTradeDate != null || p.currentCents > p.startCents || st.daysSinceFirstTrade > 0;

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
    goalLineLabel,
    goalLineCents,
    phasePctLabel: String(ringPctDisplay),
    payoutCardCallout,
    suggestedMaxPayoutUsd,
    goodNewsTitle: st.showGoodNews ? "Good News" : null,
    payoutGateHint,
    showPayoutGatePanel,
    cycleNetPnlCents: st.surplusCents,
    bufferReached: p.currentCents >= st.bufferFloorCents,
  };
}
