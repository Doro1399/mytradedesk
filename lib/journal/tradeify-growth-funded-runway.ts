import type { ApexFundedRunway } from "@/lib/journal/apex-funded-progress";
import type { JournalAccount, JournalDataV1 } from "@/lib/journal/types";
import { getTradeifyGrowthPayoutState } from "@/lib/journal/tradeify-growth-funded-payout-state";
import { isTradeifyGrowthFundedJournalAccount } from "@/lib/journal/tradeify-journal-rules";
import { formatUsdCompact } from "@/lib/prop-firms";

export type TradeifyGrowthFundedRunway = ApexFundedRunway;

const VISUAL_TO_MIN_BAL = 0.62;
const VISUAL_CYCLE = 0.38;

/**
 * Runway Progress — Tradeify Growth funded / live uniquement.
 */
export function tryBuildTradeifyGrowthFundedRunway(
  state: JournalDataV1,
  account: JournalAccount,
  p: {
    startCents: number;
    currentCents: number;
    /** Conservé pour alignement avec les autres runways (buffer journal). */
    bufferStrideCents: number;
  }
): TradeifyGrowthFundedRunway | null {
  if (!isTradeifyGrowthFundedJournalAccount(account)) return null;
  void p.bufferStrideCents;

  const st = getTradeifyGrowthPayoutState(state, account, {
    startCents: p.startCents,
    currentCents: p.currentCents,
  });
  if (!st) return null;

  const profitFromStart = p.currentCents - p.startCents;

  const minBal = st.minimumBalanceNeededCents;
  const cycleTarget = Math.max(1, st.effectiveCycleTargetCents);

  let barProgress01: number;
  if (p.currentCents < minBal) {
    const toMin = Math.max(1, minBal - p.startCents);
    const seg = Math.min(1, Math.max(0, profitFromStart / toMin));
    barProgress01 = seg * VISUAL_TO_MIN_BAL;
  } else {
    const cycleSeg = Math.min(1, Math.max(0, st.cycleProfitCents / cycleTarget));
    barProgress01 = Math.min(1, VISUAL_TO_MIN_BAL + cycleSeg * VISUAL_CYCLE);
  }

  const ringArc01 = Math.min(1, barProgress01);
  const ringPctDisplay = Math.round(barProgress01 * 100);

  let runwayPartA = "";
  let runwayPartB = "";
  if (p.currentCents < minBal) {
    runwayPartA = `To min balance ${formatUsdCompact(minBal / 100)}`;
    runwayPartB = `${formatUsdCompact(Math.max(0, minBal - p.currentCents))} to go`;
  } else if (!st.consistencyValid || st.cycleProfitCents < st.effectiveCycleTargetCents) {
    runwayPartA = `Cycle toward payout target`;
    runwayPartB = `${formatUsdCompact(Math.max(0, st.effectiveCycleTargetCents - st.cycleProfitCents) / 100)} cycle P/L to go`;
  } else if (!st.isEligible) {
    if (st.blockingKind === "payout_min") {
      runwayPartA = `${formatUsdCompact(st.availablePayout)} withdrawable`;
      runwayPartB = `max ${formatUsdCompact(st.payoutMax)}`;
    } else {
      runwayPartA = "Almost there";
      runwayPartB = st.eligibilityReason ?? "—";
    }
  } else {
    runwayPartA = `${formatUsdCompact(st.availablePayout)} withdrawable (max ${formatUsdCompact(st.payoutMax)})`;
    runwayPartB = "";
  }

  const goalLineLabel =
    p.currentCents < minBal ? "Min balance (start + buffer)" : "Cycle profit target";
  const goalLineCents: number | null = p.currentCents < minBal ? minBal : null;

  const showAddPayoutButton = st.showAddPayout;

  /** Ne pas afficher le panneau Good News / gate pour « withdrawable < mini » (bruit inutile). */
  const suppressPayoutMinCallout = st.blockingKind === "payout_min";

  let goodNewsTitle: string | null = null;
  if (st.isEligible) {
    goodNewsTitle = "Good News";
  } else if (p.currentCents >= minBal && st.blockingKind === "consistency") {
    goodNewsTitle = "Consistency rule breached";
  } else if (p.currentCents >= minBal && !suppressPayoutMinCallout) {
    goodNewsTitle = "Good News";
  }

  const showPayoutGatePanel =
    !st.isEligible && p.currentCents >= minBal && !suppressPayoutMinCallout;
  const payoutGateHint = showPayoutGatePanel ? st.eligibilityReason : null;

  let payoutCardCallout: string | null = null;
  let suggestedMaxPayoutUsd: number | null = null;
  if (showAddPayoutButton) {
    payoutCardCallout = `You can payout up to ${formatUsdCompact(st.availablePayout)}`;
    suggestedMaxPayoutUsd = st.availablePayout > 0 ? st.availablePayout : null;
  }

  return {
    barProgress01,
    ringArc01,
    ringPctDisplay,
    showAddPayoutButton,
    atOrPastPayoutMax: st.availablePayoutCents >= st.payoutMaxCents,
    runwayPartA,
    runwayPartB,
    goalLineLabel,
    goalLineCents,
    phasePctLabel: String(ringPctDisplay),
    payoutCardCallout,
    suggestedMaxPayoutUsd,
    goodNewsTitle,
    payoutGateHint,
    showPayoutGatePanel,
    qualifiedTradingDays: st.qualifiedDays,
    requiredQualifiedTradingDays: st.requiredQualifiedDays,
    effectivePayoutTargetCents: st.effectiveCycleTargetCents,
    cycleNetPnlCents: st.cycleProfitCents,
    applyConsistencyRule: st.applyConsistencyRule,
    bufferReached: p.currentCents >= minBal,
    progressTradingDaysLabel: "qualified days",
  };
}
