import type { ApexFundedRunway } from "@/lib/journal/apex-funded-progress";
import {
  ELITE_FUNDED,
  INSTANT_FUNDED,
  PRIME_FUNDED,
  type FuturesEliteFundedDef,
} from "@/lib/journal/futures-elite-compare-funded-rules";
import { getSimplePayoutProgress } from "@/lib/journal/simple-payout-progress";
import type { JournalAccount, JournalDataV1 } from "@/lib/journal/types";
import { tradeifyProfitSplitRatioFromLabel } from "@/lib/journal/tradeify-journal-rules";
import type { PropFirm } from "@/lib/prop-firms";
import { formatUsdWholeGrouped } from "@/lib/prop-firms";

export type FuturesEliteFundedRunway = ApexFundedRunway;

export const FUTURES_ELITE_FUNDED_PAYOUT_DASHBOARD_REMINDER =
  "Eligibility subject to Futures Elite rules on your dashboard.";

export type FuturesElitePayoutModelType = "buffer" | "fifty_percent" | "profit";

export type FuturesEliteSimplePayoutState = {
  modelType: FuturesElitePayoutModelType;
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

function resolveFuturesEliteCompareProgramName(account: JournalAccount): string {
  const raw = account.compareProgramName?.trim() || "";
  const full = [
    "FuturesElite Prime",
    "FuturesElite Elite",
    "FuturesElite Instant",
  ] as const;
  if ((full as readonly string[]).includes(raw)) return raw;
  if (account.propFirm.name.trim() !== "FuturesElite") return raw;
  if (raw === "Prime") return "FuturesElite Prime";
  if (raw === "Elite") return "FuturesElite Elite";
  if (raw === "Instant") return "FuturesElite Instant";
  return raw;
}

export function getFuturesEliteFundedBlockForJournalAccount(
  account: JournalAccount
): { def: FuturesEliteFundedDef } | null {
  if (account.propFirm.name.trim() !== "FuturesElite") return null;
  if (account.accountType !== "funded" && account.accountType !== "live") return null;
  const program = resolveFuturesEliteCompareProgramName(account);
  const sk = sizeKey(account);
  if (!sk) return null;

  if (program === "FuturesElite Prime") {
    if (sk !== "50k" && sk !== "100k" && sk !== "150k") return null;
    return { def: PRIME_FUNDED[sk] };
  }
  if (program === "FuturesElite Elite") {
    if (sk !== "50k" && sk !== "100k" && sk !== "150k") return null;
    return { def: ELITE_FUNDED[sk] };
  }
  if (program === "FuturesElite Instant") {
    if (sk !== "25k" && sk !== "50k" && sk !== "100k" && sk !== "150k") return null;
    return { def: INSTANT_FUNDED[sk] };
  }
  return null;
}

export function isFuturesEliteFundedJournalAccount(account: JournalAccount): boolean {
  return getFuturesEliteFundedBlockForJournalAccount(account) != null;
}

export function getFuturesEliteSimplePayoutState(p: {
  def: FuturesEliteFundedDef;
  startingBalanceCents: number;
  balanceNowCents: number;
}): FuturesEliteSimplePayoutState {
  const S = p.startingBalanceCents;
  const bal = p.balanceNowCents;
  const def = p.def;
  const model = def.simplePayoutModel;
  const payoutMinUsd = def.payoutMiniUsd;
  const payoutMaxUsd = def.payoutMaxFirstUsd;
  const splitLabel = def.profitSplit;
  const ratio = tradeifyProfitSplitRatioFromLabel(splitLabel);
  const subMessage = FUTURES_ELITE_FUNDED_PAYOUT_DASHBOARD_REMINDER;

  if (model === "fifty_percent") {
    const profitCents = bal - S;
    const halfProfitCents = Math.round(Math.max(0, profitCents) / 2);
    const payoutMaxCents = Math.round(payoutMaxUsd * 100);
    const payoutMinCents = Math.round(payoutMinUsd * 100);
    const displayedCents = Math.min(halfProfitCents, payoutMaxCents);
    const displayedUsd = displayedCents / 100;
    const show = displayedCents >= payoutMinCents && displayedUsd > 0;
    return {
      modelType: "fifty_percent",
      startingBalance: S / 100,
      balanceNow: bal / 100,
      buffer: def.bufferUsd,
      payoutMin: payoutMinUsd,
      payoutMax: payoutMaxUsd,
      profitSplit: splitLabel,
      profitSplitRatio: ratio,
      availablePayout: Math.max(0, halfProfitCents) / 100,
      displayedPayout: displayedUsd,
      showAddPayout: show,
      showGoodNews: show,
      headlineMessage: show ? `You can request a payout of ${fmtCents(displayedCents)}.` : null,
      subMessage,
      infoMessage: show
        ? `If you withdraw now, ${fmtCents(halfProfitCents)} remains as buffer.`
        : null,
    };
  }

  if (model === "buffer" && def.bufferUsd != null && def.bufferUsd > 0) {
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

  const profitCents = bal - S;
  const payoutMaxCents = Math.round(payoutMaxUsd * 100);
  const payoutMinCents = Math.round(payoutMinUsd * 100);
  const displayedCents = Math.min(Math.max(0, profitCents), payoutMaxCents);
  const show =
    bal !== S && displayedCents > 0 && displayedCents >= payoutMinCents;
  const displayedUsd = displayedCents / 100;
  const profitUsd = Math.max(0, profitCents) / 100;
  return {
    modelType: "profit",
    startingBalance: S / 100,
    balanceNow: bal / 100,
    buffer: def.bufferUsd,
    payoutMin: payoutMinUsd,
    payoutMax: payoutMaxUsd,
    profitSplit: splitLabel,
    profitSplitRatio: ratio,
    availablePayout: profitUsd,
    displayedPayout: displayedUsd,
    showAddPayout: show,
    showGoodNews: show,
    headlineMessage: show ? `You can request a payout of ${fmtCents(displayedCents)}.` : null,
    subMessage,
    infoMessage: null,
  };
}

export function tryBuildFuturesEliteFundedRunway(
  _state: JournalDataV1,
  account: JournalAccount,
  p: { startCents: number; currentCents: number }
): FuturesEliteFundedRunway | null {
  const block = getFuturesEliteFundedBlockForJournalAccount(account);
  if (!block) return null;

  const start = p.startCents;
  const balanceNow = p.currentCents;
  const { def } = block;
  const model = def.simplePayoutModel;

  const simpleState = getFuturesEliteSimplePayoutState({
    def,
    startingBalanceCents: start,
    balanceNowCents: balanceNow,
  });

  const payoutMinCents = Math.max(0, Math.round(def.payoutMiniUsd * 100));
  const payoutMaxCents = Math.max(
    payoutMinCents,
    Math.round(def.payoutMaxFirstUsd * 100)
  );

  if (model === "fifty_percent") {
    const minSpanCents = Math.max(1, 2 * payoutMinCents);
    const maxSpanCents = Math.max(minSpanCents, 2 * payoutMaxCents);

    const simple = getSimplePayoutProgress({
      startingBalanceCents: start,
      balanceNowCents: balanceNow,
      bufferDistanceCents: 0,
      payoutMinDistanceCents: minSpanCents,
      payoutMaxDistanceCents: maxSpanCents,
    });

    const tMin = start + minSpanCents;
    const tMax = start + maxSpanCents;
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

    const profitCents = balanceNow - start;
    const halfProfitCents = Math.round(Math.max(0, profitCents) / 2);
    const displayedPayoutCents = Math.min(halfProfitCents, payoutMaxCents);
    const showAddPayoutButton =
      displayedPayoutCents >= payoutMinCents && displayedPayoutCents > 0;

    const atOrPastPayoutMax = balanceNow >= tMax;
    const suggestedMaxPayoutUsd =
      showAddPayoutButton && displayedPayoutCents > 0
        ? displayedPayoutCents / 100
        : null;

    const payoutCardCallout = showAddPayoutButton
      ? `You can request a payout of ${fmtCents(displayedPayoutCents)}.\n${FUTURES_ELITE_FUNDED_PAYOUT_DASHBOARD_REMINDER}\nIf you withdraw now, ${fmtCents(halfProfitCents)} remains as buffer.`
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
      cycleNetPnlCents: profitCents,
      bufferReached: true,
      futuresEliteSimplePayoutUi: true,
      futuresEliteSimplePayoutMinBalanceCents: tMin,
    };
  }

  if (model === "buffer" && def.bufferUsd != null && def.bufferUsd > 0) {
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
      ? `${simpleState.headlineMessage ?? ""}\n${FUTURES_ELITE_FUNDED_PAYOUT_DASHBOARD_REMINDER}`
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
      futuresEliteSimplePayoutUi: true,
      futuresEliteSimplePayoutMinBalanceCents: tBufferEnd + payoutMinCents,
    };
  }

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

  const phaseLabel = simple.currentPhase === "payout_min" ? "Payout min" : "Payout max";
  const runwayPartA = phaseLabel;
  const toNext = Math.max(0, simple.currentTargetCents - balanceNow);
  const runwayPartB =
    balanceNow >= simple.currentTargetCents
      ? `Target ${fmtCents(simple.currentTargetCents)} reached`
      : `${fmtCents(toNext)} to ${phaseLabel.toLowerCase()}`;

  const goalLineLabel = simple.currentPhase === "payout_min" ? "Payout min" : "Payout max";
  const goalLineCents = simple.currentTargetCents;

  const profitCents = balanceNow - start;
  const displayedPayoutCents = Math.min(Math.max(0, profitCents), payoutMaxCents);
  const showAddPayoutButton =
    balanceNow !== start &&
    displayedPayoutCents > 0 &&
    displayedPayoutCents >= payoutMinCents;

  const atOrPastPayoutMax = balanceNow >= tMax;
  const suggestedMaxPayoutUsd =
    showAddPayoutButton && displayedPayoutCents > 0
      ? displayedPayoutCents / 100
      : null;

  const payoutCardCallout = showAddPayoutButton
    ? `${simpleState.headlineMessage ?? ""}\n${FUTURES_ELITE_FUNDED_PAYOUT_DASHBOARD_REMINDER}`
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
    cycleNetPnlCents: Math.max(0, profitCents),
    bufferReached: true,
    futuresEliteSimplePayoutUi: true,
    futuresEliteSimplePayoutMinBalanceCents: tMin,
  };
}
