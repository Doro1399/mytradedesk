import type { ApexFundedRunway } from "@/lib/journal/apex-funded-progress";
import {
  APPRENTICE_FUNDED,
  ELITE_FUNDED,
  type LegendsTradingFundedDef,
} from "@/lib/journal/legends-trading-compare-funded-rules";
import { getSimplePayoutProgress } from "@/lib/journal/simple-payout-progress";
import type { JournalAccount, JournalDataV1 } from "@/lib/journal/types";
import { tradeifyProfitSplitRatioFromLabel } from "@/lib/journal/tradeify-journal-rules";
import type { PropFirm } from "@/lib/prop-firms";
import { formatUsdWholeGrouped } from "@/lib/prop-firms";

export type LegendsTradingFundedRunway = ApexFundedRunway;

export const LEGENDS_TRADING_FUNDED_PAYOUT_DASHBOARD_REMINDER =
  "Eligibility subject to Legends Trading rules on your dashboard.";

export type LegendsTradingPayoutModelType = "buffer";

export type LegendsTradingSimplePayoutState = {
  modelType: LegendsTradingPayoutModelType;
  startingBalance: number;
  balanceNow: number;
  buffer: number | null;
  payoutMin: number;
  payoutMax: number;
  profitSplit: string;
  profitSplitRatio: number | null;
  availablePayout: number;
  displayedPayout: number;
  showAddPayout: boolean;
  showGoodNews: boolean;
  headlineMessage: string | null;
  subMessage: string;
  infoMessage: string | null;
};

function fmtCents(c: number): string {
  return formatUsdWholeGrouped(Math.max(0, Math.round(c)) / 100);
}

function sizeKey(account: JournalAccount): PropFirm["size"] | null {
  const s = account.sizeLabel.trim().toLowerCase();
  if (!/^\d+k$/.test(s)) return null;
  return s as PropFirm["size"];
}

function resolveLegendsTradingCompareProgramName(account: JournalAccount): string {
  const raw = account.compareProgramName?.trim() || "";
  const full = ["Legends Trading Apprentice", "Legends Trading Elite"] as const;
  if ((full as readonly string[]).includes(raw)) return raw;
  if (account.propFirm.name.trim() !== "Legends Trading") return raw;
  if (raw === "Apprentice") return "Legends Trading Apprentice";
  if (raw === "Elite") return "Legends Trading Elite";
  return raw;
}

export function getLegendsTradingFundedBlockForJournalAccount(
  account: JournalAccount
): { def: LegendsTradingFundedDef } | null {
  if (account.propFirm.name.trim() !== "Legends Trading") return null;
  if (account.accountType !== "funded" && account.accountType !== "live") return null;
  const program = resolveLegendsTradingCompareProgramName(account);
  const sk = sizeKey(account);
  if (!sk) return null;

  if (program === "Legends Trading Apprentice") {
    if (sk !== "50k" && sk !== "100k" && sk !== "150k") return null;
    return { def: APPRENTICE_FUNDED[sk] };
  }
  if (program === "Legends Trading Elite") {
    if (sk !== "25k" && sk !== "50k" && sk !== "100k" && sk !== "150k") return null;
    return { def: ELITE_FUNDED[sk] };
  }
  return null;
}

export function isLegendsTradingFundedJournalAccount(account: JournalAccount): boolean {
  return getLegendsTradingFundedBlockForJournalAccount(account) != null;
}

export function getLegendsTradingSimplePayoutState(p: {
  def: LegendsTradingFundedDef;
  startingBalanceCents: number;
  balanceNowCents: number;
}): LegendsTradingSimplePayoutState {
  const S = p.startingBalanceCents;
  const bal = p.balanceNowCents;
  const def = p.def;
  const payoutMinUsd = def.payoutMiniUsd;
  const payoutMaxUsd = def.payoutMaxFirstUsd;
  const splitLabel = def.profitSplit;
  const ratio = tradeifyProfitSplitRatioFromLabel(splitLabel);
  const subMessage = LEGENDS_TRADING_FUNDED_PAYOUT_DASHBOARD_REMINDER;

  if (def.bufferUsd == null || def.bufferUsd <= 0) {
    return {
      modelType: "buffer",
      startingBalance: S / 100,
      balanceNow: bal / 100,
      buffer: def.bufferUsd,
      payoutMin: payoutMinUsd,
      payoutMax: payoutMaxUsd,
      profitSplit: splitLabel,
      profitSplitRatio: ratio,
      availablePayout: 0,
      displayedPayout: 0,
      showAddPayout: false,
      showGoodNews: false,
      headlineMessage: null,
      subMessage,
      infoMessage: null,
    };
  }

  const bufferCents = Math.round(def.bufferUsd * 100);
  const payoutMinCents = Math.round(payoutMinUsd * 100);
  const payoutMaxCents = Math.round(payoutMaxUsd * 100);
  const tBufferEnd = S + bufferCents;
  const surplus = Math.max(0, bal - tBufferEnd);
  const displayedCents = Math.min(surplus, payoutMaxCents);
  const show = displayedCents >= payoutMinCents && displayedCents > 0;
  const displayedUsd = displayedCents / 100;
  return {
    modelType: "buffer",
    startingBalance: S / 100,
    balanceNow: bal / 100,
    buffer: def.bufferUsd,
    payoutMin: payoutMinUsd,
    payoutMax: payoutMaxUsd,
    profitSplit: splitLabel,
    profitSplitRatio: ratio,
    availablePayout: surplus / 100,
    displayedPayout: displayedUsd,
    showAddPayout: show,
    showGoodNews: show,
    headlineMessage: show ? `You can request a payout of ${fmtCents(displayedCents)}.` : null,
    subMessage,
    infoMessage: null,
  };
}

export function tryBuildLegendsTradingFundedRunway(
  _state: JournalDataV1,
  account: JournalAccount,
  p: { startCents: number; currentCents: number }
): LegendsTradingFundedRunway | null {
  const block = getLegendsTradingFundedBlockForJournalAccount(account);
  if (!block) return null;

  const start = p.startCents;
  const balanceNow = p.currentCents;
  const { def } = block;

  if (def.bufferUsd == null || def.bufferUsd <= 0) return null;

  const simpleState = getLegendsTradingSimplePayoutState({
    def,
    startingBalanceCents: start,
    balanceNowCents: balanceNow,
  });

  const payoutMinCents = Math.max(0, Math.round(def.payoutMiniUsd * 100));
  const payoutMaxCents = Math.max(
    payoutMinCents,
    Math.round(def.payoutMaxFirstUsd * 100)
  );
  const bufferDist = Math.max(0, Math.round(def.bufferUsd * 100));

  const simple = getSimplePayoutProgress({
    startingBalanceCents: start,
    balanceNowCents: balanceNow,
    bufferDistanceCents: bufferDist,
    payoutMinDistanceCents: payoutMinCents,
    payoutMaxDistanceCents: payoutMaxCents,
  });

  const tBufferEnd = start + bufferDist;
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
        ? "Payout min"
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
        ? "Payout min"
        : "Payout max";
  const goalLineCents = simple.currentTargetCents;

  const surplusCents = Math.max(0, balanceNow - tBufferEnd);
  const displayedPayoutCents = Math.min(surplusCents, payoutMaxCents);
  const showAddPayoutButton =
    displayedPayoutCents >= payoutMinCents && displayedPayoutCents > 0;

  const atOrPastPayoutMax = balanceNow >= tMax;
  const suggestedMaxPayoutUsd =
    showAddPayoutButton && displayedPayoutCents > 0
      ? displayedPayoutCents / 100
      : null;

  const payoutCardCallout = showAddPayoutButton
    ? `${simpleState.headlineMessage ?? ""}\n${LEGENDS_TRADING_FUNDED_PAYOUT_DASHBOARD_REMINDER}`
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
    cycleNetPnlCents: surplusCents,
    bufferReached: balanceNow >= tBufferEnd,
    legendsTradingSimplePayoutUi: true,
    legendsTradingSimplePayoutMinBalanceCents: tBufferEnd + payoutMinCents,
  };
}
