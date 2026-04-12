import type { ApexFundedRunway } from "@/lib/journal/apex-funded-progress";
import type { JournalAccount, JournalDataV1 } from "@/lib/journal/types";
import type { StoredTrade } from "@/lib/journal/trades-storage";
import { getTradeifyLightningPayoutState } from "@/lib/journal/tradeify-lightning-funded-payout-state";
import { isTradeifyLightningFundedJournalAccount } from "@/lib/journal/tradeify-journal-rules";
import { formatUsdCompact } from "@/lib/prop-firms";

export type TradeifyLightningFundedRunway = ApexFundedRunway;

/**
 * Progress — Tradeify Lightning funded / live (pas de buffer ; cible cycle = effective target).
 */
export function tryBuildTradeifyLightningFundedRunway(
  state: JournalDataV1,
  account: JournalAccount,
  p: { startCents: number; currentCents: number },
  options?: { storedTrades?: readonly StoredTrade[] }
): TradeifyLightningFundedRunway | null {
  void p.startCents;
  void p.currentCents;
  if (!isTradeifyLightningFundedJournalAccount(account)) return null;

  const st = getTradeifyLightningPayoutState(state, account, {
    storedTrades: options?.storedTrades,
  });
  if (!st) return null;

  const cycleTarget = Math.max(1, st.effectiveTargetCents);
  const cycleSeg = Math.min(1, Math.max(0, st.cycleProfitCents / cycleTarget));
  const barProgress01 = cycleSeg;
  const ringArc01 = barProgress01;
  const ringPctDisplay = Math.round(barProgress01 * 100);

  let runwayPartA = "Cycle toward payout target";
  let runwayPartB = `${formatUsdCompact(Math.max(0, st.effectiveTargetCents - st.cycleProfitCents) / 100)} cycle P/L to go`;

  if (st.isEligible) {
    runwayPartA = `${formatUsdCompact(st.availablePayout)} withdrawable (max ${formatUsdCompact(st.payoutMax)})`;
    runwayPartB = "";
  } else if (!st.isEligible) {
    runwayPartA = "Almost there";
    runwayPartB = st.eligibilityReason ?? "—";
  }

  const showAddPayoutButton = st.showAddPayout;

  let goodNewsTitle: string | null = null;
  if (st.isEligible) {
    goodNewsTitle = "Good News";
  } else if (st.blockingKind === "consistency") {
    goodNewsTitle = "Consistency rule breached";
  } else if (st.blockingKind === "profit_goal" || st.blockingKind === "payout_min") {
    goodNewsTitle = "Good News";
  }

  const showPayoutGatePanel = !st.isEligible;
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
    goalLineLabel: "Cycle profit target",
    goalLineCents: null,
    phasePctLabel: String(ringPctDisplay),
    payoutCardCallout,
    suggestedMaxPayoutUsd,
    goodNewsTitle,
    payoutGateHint,
    showPayoutGatePanel,
    effectivePayoutTargetCents: st.effectiveTargetCents,
    cycleNetPnlCents: st.cycleProfitCents,
    applyConsistencyRule: true,
    bufferReached: true,
  };
}
