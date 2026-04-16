import type { ApexFundedRunway } from "@/lib/journal/apex-funded-progress";
import { getSimplePayoutProgress } from "@/lib/journal/simple-payout-progress";
import type { JournalAccount, JournalDataV1 } from "@/lib/journal/types";
import {
  INSTANT_FUNDED,
  PRIME_FUNDED,
  type YrmFundedDef,
} from "@/lib/journal/yrm-prop-compare-funded-rules";
import { tradeifyProfitSplitRatioFromLabel } from "@/lib/journal/tradeify-journal-rules";
import type { PropFirm } from "@/lib/prop-firms";
import { formatUsdWholeGrouped } from "@/lib/prop-firms";

export type YrmPropFundedRunway = ApexFundedRunway;

export const YRM_PROP_FUNDED_PAYOUT_DASHBOARD_REMINDER =
  "Eligibility subject to YRM Prop rules on your dashboard.";

/** Modèle indicatif dérivé du CSV (Prime = notes 50/50 ; Instant = pas de buffer ni 50 % en notes). */
export type YrmPropPayoutModelType = "buffer" | "fifty_percent" | "profit";

export type YrmPropSimplePayoutState = {
  modelType: YrmPropPayoutModelType;
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

/** Aligné sur `canonicalCompareProgramForLookup` (compare) pour YRM uniquement. */
function resolveYrmCompareProgramName(account: JournalAccount): string {
  const raw = account.compareProgramName?.trim() || "";
  if (raw === "YRM Prop Prime" || raw === "YRM Prop Instant Prime") return raw;
  if (account.propFirm.name.trim() !== "YRM Prop") return raw;
  if (raw === "Prime") return "YRM Prop Prime";
  if (raw === "Instant Prime") return "YRM Prop Instant Prime";
  return raw;
}

export type YrmJournalFundedKind = "prime" | "instant";

/**
 * Bloc CSV funded pour un compte journal YRM Prop funded/live, ou null.
 */
export function getYrmPropFundedBlockForJournalAccount(
  account: JournalAccount
): { kind: YrmJournalFundedKind; def: YrmFundedDef } | null {
  if (account.propFirm.name.trim() !== "YRM Prop") return null;
  if (account.accountType !== "funded" && account.accountType !== "live") return null;
  const program = resolveYrmCompareProgramName(account);
  const sk = sizeKey(account);
  if (!sk) return null;
  if (program === "YRM Prop Prime") {
    if (sk !== "50k" && sk !== "100k" && sk !== "150k") return null;
    return { kind: "prime", def: PRIME_FUNDED[sk] };
  }
  if (program === "YRM Prop Instant Prime") {
    if (sk !== "25k" && sk !== "50k" && sk !== "100k" && sk !== "150k") return null;
    return { kind: "instant", def: INSTANT_FUNDED[sk] };
  }
  return null;
}

export function isYrmPropFundedJournalAccount(account: JournalAccount): boolean {
  return getYrmPropFundedBlockForJournalAccount(account) != null;
}

/**
 * État payout simplifié (CSV uniquement) — Prime : 50 % du profit vs mini / 1er max ;
 * Instant : profit vs mini / 1er max.
 */
export function getYrmPropSimplePayoutState(p: {
  kind: YrmJournalFundedKind;
  def: YrmFundedDef;
  startingBalanceCents: number;
  balanceNowCents: number;
}): YrmPropSimplePayoutState {
  const S = p.startingBalanceCents;
  const bal = p.balanceNowCents;
  const profitCents = bal - S;

  const payoutMinUsd = p.def.payoutMiniUsd;
  const payoutMaxUsd = p.def.payoutMaxUsd[0];
  const splitLabel = p.def.profitSplit;
  const ratio = tradeifyProfitSplitRatioFromLabel(splitLabel);

  const subMessage = YRM_PROP_FUNDED_PAYOUT_DASHBOARD_REMINDER;

  if (p.kind === "prime") {
    const halfProfitCents = Math.round(Math.max(0, profitCents) / 2);
    const displayedCents = Math.min(halfProfitCents, Math.round(payoutMaxUsd * 100));
    const availableUsd = Math.max(0, halfProfitCents) / 100;
    const displayedUsd = Math.max(0, displayedCents) / 100;
    const show = displayedUsd >= payoutMinUsd && displayedUsd > 0;

    return {
      modelType: "fifty_percent",
      startingBalance: S / 100,
      balanceNow: bal / 100,
      buffer: p.def.bufferUsd,
      payoutMin: payoutMinUsd,
      payoutMax: payoutMaxUsd,
      profitSplit: splitLabel,
      profitSplitRatio: ratio,
      availablePayout: availableUsd,
      displayedPayout: displayedUsd,
      showAddPayout: show,
      showGoodNews: show,
      headlineMessage: show
        ? `You can request a payout of ${fmtCents(displayedCents)}.`
        : null,
      subMessage,
      infoMessage: show
        ? `If you withdraw now, ${fmtCents(halfProfitCents)} remains as buffer.`
        : null,
    };
  }

  const profitUsd = Math.max(0, profitCents) / 100;
  const displayedUsd = Math.min(profitUsd, payoutMaxUsd);
  const show =
    bal !== S && displayedUsd > 0 && displayedUsd >= payoutMinUsd;

  return {
    modelType: "profit",
    startingBalance: S / 100,
    balanceNow: bal / 100,
    buffer: p.def.bufferUsd,
    payoutMin: payoutMinUsd,
    payoutMax: payoutMaxUsd,
    profitSplit: splitLabel,
    profitSplitRatio: ratio,
    availablePayout: profitUsd,
    displayedPayout: displayedUsd,
    showAddPayout: show,
    showGoodNews: show,
    headlineMessage: show
      ? `You can request a payout of ${fmtCents(Math.round(displayedUsd * 100))}.`
      : null,
    subMessage,
    infoMessage: null,
  };
}

/**
 * YRM Prop funded / live — indicatif : Prime = 50 % (notes CSV) ; Instant = profit vs paliers CSV.
 */
export function tryBuildYrmPropFundedRunway(
  _state: JournalDataV1,
  account: JournalAccount,
  p: { startCents: number; currentCents: number }
): YrmPropFundedRunway | null {
  const block = getYrmPropFundedBlockForJournalAccount(account);
  if (!block) return null;

  const start = p.startCents;
  const balanceNow = p.currentCents;
  const { kind, def } = block;

  const payoutMinCents = Math.max(0, Math.round(def.payoutMiniUsd * 100));
  const payoutMaxCents = Math.max(
    payoutMinCents,
    Math.round(def.payoutMaxUsd[0] * 100)
  );

  if (kind === "prime") {
    const minSpanCents = 2 * payoutMinCents;
    const maxSpanCents = 2 * payoutMaxCents;

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
    const showAddPayoutButton = displayedPayoutCents >= payoutMinCents && displayedPayoutCents > 0;

    const atOrPastPayoutMax = balanceNow >= tMax;
    const suggestedMaxPayoutUsd =
      showAddPayoutButton && displayedPayoutCents > 0 ? displayedPayoutCents / 100 : null;

    const payoutCardCallout = showAddPayoutButton
      ? `You can request a payout of ${fmtCents(displayedPayoutCents)}.\n${YRM_PROP_FUNDED_PAYOUT_DASHBOARD_REMINDER}\nIf you withdraw now, ${fmtCents(halfProfitCents)} remains as buffer.`
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
      yrmPropSimplePayoutUi: true,
      yrmPropSimplePayoutMinBalanceCents: tMin,
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
    balanceNow !== start && displayedPayoutCents > 0 && displayedPayoutCents >= payoutMinCents;

  const atOrPastPayoutMax = balanceNow >= tMax;
  const suggestedMaxPayoutUsd =
    showAddPayoutButton && displayedPayoutCents > 0 ? displayedPayoutCents / 100 : null;

  const payoutCardCallout = showAddPayoutButton
    ? `You can request a payout of ${fmtCents(displayedPayoutCents)}.\n${YRM_PROP_FUNDED_PAYOUT_DASHBOARD_REMINDER}`
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
    yrmPropSimplePayoutUi: true,
    yrmPropSimplePayoutMinBalanceCents: tMin,
  };
}
