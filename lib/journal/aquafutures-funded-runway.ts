import type { ApexFundedRunway } from "@/lib/journal/apex-funded-progress";
import {
  INSTANT_PRO_FUNDED,
  INSTANT_STANDARD_FUNDED,
  ONE_STEP_BEGINNER_FUNDED,
  ONE_STEP_STANDARD_FUNDED,
  type AquaFundedDef,
} from "@/lib/journal/aquafutures-compare-funded-rules";
import { getSimplePayoutProgress } from "@/lib/journal/simple-payout-progress";
import type { JournalAccount, JournalDataV1, JournalId } from "@/lib/journal/types";
import type { PropFirm } from "@/lib/prop-firms";
import { formatUsdWholeGrouped } from "@/lib/prop-firms";
import { sumNonRejectedJournalPayoutGrossCents } from "@/lib/journal/tradeday-journal-rules";

export type AquaFuturesFundedRunway = ApexFundedRunway;

/** Seuil issu des colonnes Notes / Profit Split du CSV (« 90% after $15,000 »). */
export const AQUA_FUTURES_CUMULATIVE_SPLIT_THRESHOLD_USD = 15_000;

export const AQUA_FUTURES_CUMULATIVE_SPLIT_THRESHOLD_CENTS =
  AQUA_FUTURES_CUMULATIVE_SPLIT_THRESHOLD_USD * 100;

export const AQUA_FUTURES_FUNDED_PAYOUT_DASHBOARD_REMINDER =
  "Eligibility subject to Aqua Futures rules on your dashboard.";

export type AquaFuturesPayoutModelType = "buffer" | "fifty_percent" | "profit";

export type AquaFuturesSimplePayoutState = {
  modelType: AquaFuturesPayoutModelType;
  startingBalance: number;
  balanceNow: number;
  buffer: number | null;
  payoutMin: number;
  payoutMax: number;
  cumulativeGrossPayouts: number;
  effectiveProfitSplit: number;
  availablePayout: number;
  displayedPayout: number;
  netPayoutEstimate: number;
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

function resolveAquaCompareProgramName(account: JournalAccount): string {
  const raw = account.compareProgramName?.trim() || "";
  const full = [
    "One Step Beginner",
    "One Step Standard",
    "Instant Standard",
    "Instant Pro",
  ] as const;
  if ((full as readonly string[]).includes(raw)) return raw;
  if (account.propFirm.name.trim() !== "AquaFutures") return raw;
  if (raw === "Beginner") return "One Step Beginner";
  return raw;
}

export function aquaFuturesEffectiveProfitSplitFromPriorCumulativeGrossCents(
  priorCumulativeGrossCents: number
): number {
  return priorCumulativeGrossCents < AQUA_FUTURES_CUMULATIVE_SPLIT_THRESHOLD_CENTS ? 1 : 0.9;
}

/**
 * Somme des bruts des payouts non rejetés enregistrés **avant** cette ligne (ordre date → création).
 */
export function aquaFuturesPriorCumulativeGrossCentsForPayoutLine(
  state: JournalDataV1,
  accountId: JournalId,
  payout: { id: string; requestedDate: string; createdAt: string }
): number {
  const list = Object.values(state.payoutEntries)
    .filter((x) => x.accountId === accountId && x.status !== "rejected")
    .sort((a, b) => {
      const d = a.requestedDate.localeCompare(b.requestedDate);
      if (d !== 0) return d;
      const c = a.createdAt.localeCompare(b.createdAt);
      if (c !== 0) return c;
      return a.id.localeCompare(b.id);
    });
  let s = 0;
  for (const x of list) {
    if (x.id === payout.id) break;
    s += x.grossAmountCents;
  }
  return s;
}

export function getAquaFuturesFundedBlockForJournalAccount(
  account: JournalAccount
): { def: AquaFundedDef; modelType: "buffer" | "profit" } | null {
  if (account.propFirm.name.trim() !== "AquaFutures") return null;
  if (account.accountType !== "funded" && account.accountType !== "live") return null;
  const program = resolveAquaCompareProgramName(account);
  const sk = sizeKey(account);
  if (!sk) return null;

  if (program === "One Step Beginner") {
    if (sk !== "25k" && sk !== "50k" && sk !== "100k" && sk !== "150k") return null;
    const def = ONE_STEP_BEGINNER_FUNDED[sk];
    return {
      def,
      modelType: def.bufferUsd != null && def.bufferUsd > 0 ? "buffer" : "profit",
    };
  }
  if (program === "One Step Standard") {
    if (sk !== "25k" && sk !== "50k" && sk !== "100k" && sk !== "150k") return null;
    const def = ONE_STEP_STANDARD_FUNDED[sk];
    return {
      def,
      modelType: def.bufferUsd != null && def.bufferUsd > 0 ? "buffer" : "profit",
    };
  }
  if (program === "Instant Standard") {
    if (sk !== "50k" && sk !== "100k") return null;
    const def = INSTANT_STANDARD_FUNDED[sk];
    return { def, modelType: "profit" };
  }
  if (program === "Instant Pro") {
    if (sk !== "50k" && sk !== "100k") return null;
    const def = INSTANT_PRO_FUNDED[sk];
    return { def, modelType: "profit" };
  }
  return null;
}

export function isAquaFuturesFundedJournalAccount(account: JournalAccount): boolean {
  return getAquaFuturesFundedBlockForJournalAccount(account) != null;
}

export function getAquaFuturesSimplePayoutState(p: {
  def: AquaFundedDef;
  modelType: "buffer" | "profit";
  startingBalanceCents: number;
  balanceNowCents: number;
  cumulativeGrossPayoutsUsd: number;
}): AquaFuturesSimplePayoutState {
  const S = p.startingBalanceCents;
  const bal = p.balanceNowCents;
  const priorUsd = p.cumulativeGrossPayoutsUsd;
  const priorCents = Math.round(priorUsd * 100);
  const effectiveProfitSplit =
    aquaFuturesEffectiveProfitSplitFromPriorCumulativeGrossCents(priorCents);

  const payoutMinUsd = p.def.payoutMiniUsd;
  const payoutMaxUsd = p.def.payoutMaxUsd;
  const bufferUsd = p.def.bufferUsd;

  const subMessage = AQUA_FUTURES_FUNDED_PAYOUT_DASHBOARD_REMINDER;

  if (p.modelType === "buffer" && bufferUsd != null && bufferUsd > 0) {
    const bufferCents = Math.round(bufferUsd * 100);
    const payoutMinCents = Math.round(payoutMinUsd * 100);
    const payoutMaxCents = Math.round(payoutMaxUsd * 100);
    const tBufferEnd = S + bufferCents;
    const surplus = Math.max(0, bal - tBufferEnd);
    const displayedCents = Math.min(surplus, payoutMaxCents);
    const show = displayedCents >= payoutMinCents && displayedCents > 0;
    const displayedUsd = displayedCents / 100;
    const netPayoutEstimate = displayedUsd * effectiveProfitSplit;

    return {
      modelType: "buffer",
      startingBalance: S / 100,
      balanceNow: bal / 100,
      buffer: bufferUsd,
      payoutMin: payoutMinUsd,
      payoutMax: payoutMaxUsd,
      cumulativeGrossPayouts: priorUsd,
      effectiveProfitSplit,
      availablePayout: surplus / 100,
      displayedPayout: displayedUsd,
      netPayoutEstimate,
      showAddPayout: show,
      showGoodNews: show,
      headlineMessage: show
        ? `You can request a payout of ${fmtCents(displayedCents)}.`
        : null,
      subMessage,
      infoMessage: show ? "Payout is based on profits above your buffer." : null,
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
  const netPayoutEstimate = displayedUsd * effectiveProfitSplit;

  return {
    modelType: "profit",
    startingBalance: S / 100,
    balanceNow: bal / 100,
    buffer: bufferUsd,
    payoutMin: payoutMinUsd,
    payoutMax: payoutMaxUsd,
    cumulativeGrossPayouts: priorUsd,
    effectiveProfitSplit,
    availablePayout: profitUsd,
    displayedPayout: displayedUsd,
    netPayoutEstimate,
    showAddPayout: show,
    showGoodNews: show,
    headlineMessage: show
      ? `You can request a payout of ${fmtCents(displayedCents)}.`
      : null,
    subMessage,
    infoMessage: null,
  };
}

export function tryBuildAquaFuturesFundedRunway(
  state: JournalDataV1,
  account: JournalAccount,
  p: { startCents: number; currentCents: number }
): AquaFuturesFundedRunway | null {
  const block = getAquaFuturesFundedBlockForJournalAccount(account);
  if (!block) return null;

  const start = p.startCents;
  const balanceNow = p.currentCents;
  const { def, modelType } = block;

  const cumulativeGrossCents = sumNonRejectedJournalPayoutGrossCents(state, account.id);
  const cumulativeGrossUsd = cumulativeGrossCents / 100;

  const simpleState = getAquaFuturesSimplePayoutState({
    def,
    modelType,
    startingBalanceCents: start,
    balanceNowCents: balanceNow,
    cumulativeGrossPayoutsUsd: cumulativeGrossUsd,
  });

  const payoutMinCents = Math.max(0, Math.round(def.payoutMiniUsd * 100));
  const payoutMaxCents = Math.max(
    payoutMinCents,
    Math.round(def.payoutMaxUsd * 100)
  );

  if (modelType === "buffer" && def.bufferUsd != null && def.bufferUsd > 0) {
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
      ? `${simpleState.headlineMessage ?? ""}\n${AQUA_FUTURES_FUNDED_PAYOUT_DASHBOARD_REMINDER}\nPayout is based on profits above your buffer.`
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
      aquaFuturesSimplePayoutUi: true,
      aquaFuturesSimplePayoutMinBalanceCents: tBufferEnd + payoutMinCents,
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
    ? `${simpleState.headlineMessage ?? ""}\n${AQUA_FUTURES_FUNDED_PAYOUT_DASHBOARD_REMINDER}`
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
    aquaFuturesSimplePayoutUi: true,
    aquaFuturesSimplePayoutMinBalanceCents: tMin,
  };
}
