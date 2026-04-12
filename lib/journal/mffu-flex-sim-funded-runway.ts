import type { ApexFundedRunway } from "@/lib/journal/apex-funded-progress";
import {
  MFFU_FLEX_SIM_FUNDED_FROM_CSV,
  type MffuFlexSimFundedCsvSize,
} from "@/lib/journal/mffu-flex-sim-funded-csv.generated";
import { getMffuFlexPayoutState } from "@/lib/journal/mffu-flex-sim-funded-payout-state";
import { isMffuFlexSimFundedJournalAccount, mffuFlexSimFundedCsvSizeOrNull } from "@/lib/journal/mffu-flex-sim-funded-journal-rules";
import type { JournalAccount, JournalDataV1 } from "@/lib/journal/types";
import { formatUsdWholeGrouped } from "@/lib/prop-firms";

export type MffuFlexSimFundedRunway = ApexFundedRunway;

const PHASE_WIN_SHARE = 0.55;
const PHASE_CYCLE_SHARE = 0.45;

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
 * MFFU **Flex** Sim funded : phase 1 winning days (CSV) → phase 2 profit net de cycle (somme des jours ≥ seuil implicite) →
 * phase 3 `min(50 % × base, cap)` avec base = profit de cycle avant le 1er payout, puis `(Now − Start)` ensuite (Topstep-like).
 */
export function tryBuildMffuFlexSimFundedRunway(
  state: JournalDataV1,
  account: JournalAccount,
  p: { startCents: number; currentCents: number }
): MffuFlexSimFundedRunway | null {
  if (!isMffuFlexSimFundedJournalAccount(account)) return null;
  const sk = mffuFlexSimFundedCsvSizeOrNull(account);
  if (sk == null) return null;
  const csv = MFFU_FLEX_SIM_FUNDED_FROM_CSV[sk as MffuFlexSimFundedCsvSize];
  if (!csv) return null;

  const st = getMffuFlexPayoutState(state, account, {
    startCents: p.startCents,
    currentCents: p.currentCents,
  });
  if (!st) return null;

  const reqW = st.requiredWinningDays;
  const reqCycle = Math.max(1, st.requiredCycleProfitCents);
  const payoutCapCents = Math.round(csv.payoutMaxUsd * 100);

  const wd01 = Math.min(1, st.winningDays / Math.max(1, reqW));
  const cy01 = Math.min(1, Math.max(0, st.cycleProfitCents) / reqCycle);
  const barProgress01 = Math.max(0, Math.min(1, PHASE_WIN_SHARE * wd01 + PHASE_CYCLE_SHARE * cy01));
  const ringArc01 = barProgress01;
  const ringPctDisplay = Math.round(barProgress01 * 100);

  const G = Math.round(p.currentCents - st.baselineAfterPaidPayoutCents);

  let runwayPartA = "";
  let runwayPartB = "";
  let goalLineLabel = "Winning days";
  let goalLineCents: number | null = null;

  if (st.winningDays < reqW) {
    const pct = Math.round(wd01 * 100);
    runwayPartA = `Winning days ${pct}%`;
    runwayPartB = `${st.winningDays}/${reqW} days (net ≥ ${formatUsdWholeGrouped(csv.winningDayThresholdUsd)} / day) · ${fmtUsdFromCents(reqCycle)} cycle net required`;
    goalLineLabel = "Winning days";
    goalLineCents = null;
  } else if (st.cycleProfitCents < st.requiredCycleProfitCents) {
    const pct = Math.round(cy01 * 100);
    runwayPartA = `Cycle net ${pct}%`;
    runwayPartB = `${fmtUsdFromCents(st.cycleProfitCents)} of ${fmtUsdFromCents(st.requiredCycleProfitCents)} · ${st.winningDays}/${reqW} winning days done`;
    goalLineLabel = "Cycle net (min)";
    goalLineCents = st.baselineAfterPaidPayoutCents + st.requiredCycleProfitCents;
  } else {
    runwayPartA = `Payout track · ${fmtUsdFromCents(G)} vs baseline`;
    runwayPartB = `Up to ${fmtUsdFromCentsBuffer(st.availablePayoutCents)} gross (cap ${formatUsdWholeGrouped(csv.payoutMaxUsd)})`;
    goalLineLabel = `Payout max ${formatUsdWholeGrouped(csv.payoutMaxUsd)}`;
    goalLineCents = null;
  }

  const atOrPastPayoutMax = st.availablePayoutCents >= payoutCapCents - 1;

  let payoutCardCallout: string | null = null;
  let suggestedMaxPayoutUsd: number | null = null;
  if (st.isEligible) {
    payoutCardCallout = `You can payout ${fmtUsdFromCentsBuffer(st.availablePayoutCents)}.\nIf you payout now, ${fmtUsdFromCentsBuffer(st.availablePayoutCents)} remains as buffer.`;
    suggestedMaxPayoutUsd = st.availablePayout > 0 ? st.availablePayout : null;
  }

  const milestoneForPanel = st.winningDays > 0 || st.cycleProfitCents !== 0 || G !== 0;

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
    qualifiedTradingDays: st.winningDays,
    requiredQualifiedTradingDays: st.requiredWinningDays,
    cycleNetPnlCents: st.cycleProfitCents,
    progressTradingDaysLabel: "winning days",
  };
}
