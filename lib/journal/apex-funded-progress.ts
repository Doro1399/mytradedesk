import { getApexFundedBlockForAccount } from "@/lib/journal/apex-journal-rules";
import { countLucidProNonRejectedPayouts } from "@/lib/journal/lucid-pro-funded-payout-state";
import { getSimplePayoutProgress } from "@/lib/journal/simple-payout-progress";
import type { JournalAccount, JournalDataV1 } from "@/lib/journal/types";
import { formatUsdWholeGrouped } from "@/lib/prop-firms";

/** Part visuelle du track (funded / autres firmes partageant ce type). */
export type ApexFundedRunway = {
  barProgress01: number;
  ringArc01: number;
  ringPctDisplay: number;
  showAddPayoutButton: boolean;
  atOrPastPayoutMax: boolean;
  runwayPartA: string;
  runwayPartB: string;
  goalLineLabel: string;
  goalLineCents: number | null;
  /** @deprecated Utiliser `ringPctDisplay`. */
  phasePctLabel: string;
  payoutCardCallout: string | null;
  suggestedMaxPayoutUsd: number | null;
  /** Brut indicatif (USD) — plafond CSV vs surplus au-dessus du buffer. */
  availablePayoutUsd?: number | null;
  goodNewsTitle?: string | null;
  payoutGateHint?: string | null;
  qualifiedTradingDays?: number;
  requiredQualifiedTradingDays?: number;
  effectivePayoutTargetCents?: number;
  applyConsistencyRule?: boolean;
  bufferReached?: boolean;
  showPayoutGatePanel?: boolean;
  progressTradingDaysLabel?: string;
  cycleNetPnlCents?: number;
  showHardBreachWarning?: boolean;
  hardBreachWarningMessage?: string | null;
  /** Runway Apex « simple » : panneau payout / reset seuil min. */
  apexSimplePayoutUi?: boolean;
  apexSimplePayoutMinBalanceCents?: number;
  /** Lucid Pro — même schéma simple (Progress / modale). */
  lucidProSimplePayoutUi?: boolean;
  lucidProSimplePayoutMinBalanceCents?: number;
  /** Lucid Flex funded — 50 % profit, pas de phase buffer CSV. */
  lucidFlexSimplePayoutUi?: boolean;
  lucidFlexSimplePayoutMinBalanceCents?: number;
  /** Lucid Direct funded — min(profit, max 1er palier), mini CSV. */
  lucidDirectSimplePayoutUi?: boolean;
  lucidDirectSimplePayoutMinBalanceCents?: number;
  /** Take Profit Trader funded — buffer CSV puis surplus (max CSV si défini). */
  tptSimplePayoutUi?: boolean;
  tptSimplePayoutMinBalanceCents?: number;
  /** TopStep funded — 50 % profit, mini/maxi Standard path CSV. */
  topstepSimplePayoutUi?: boolean;
  topstepSimplePayoutMinBalanceCents?: number;
  /** Funded Next Futures Bolt — buffer CSV, surplus, mini/maxi Standard. */
  fundedNextBoltSimplePayoutUi?: boolean;
  fundedNextBoltSimplePayoutMinBalanceCents?: number;
  /** Funded Next Futures Rapid — profit vs start, mini/maxi Standard (pas de buffer). */
  fundedNextRapidSimplePayoutUi?: boolean;
  fundedNextRapidSimplePayoutMinBalanceCents?: number;
  /** Funded Next Futures Legacy — 50 % du profit, mini/maxi CSV. */
  fundedNextLegacySimplePayoutUi?: boolean;
  fundedNextLegacySimplePayoutMinBalanceCents?: number;
  /** My Funded Futures Rapid — buffer CSV, surplus, mini/maxi. */
  mffuRapidSimplePayoutUi?: boolean;
  mffuRapidSimplePayoutMinBalanceCents?: number;
  /** My Funded Futures Flex — 50 % du profit, mini/maxi CSV. */
  mffuFlexSimplePayoutUi?: boolean;
  mffuFlexSimplePayoutMinBalanceCents?: number;
  /** My Funded Futures Pro — buffer CSV, surplus, mini/maxi. */
  mffuProSimplePayoutUi?: boolean;
  mffuProSimplePayoutMinBalanceCents?: number;
  /** Funded Futures Network funded — buffer optionnel ou profit direct, mini ≥ 500 $ + CSV. */
  ffnFundedSimplePayoutUi?: boolean;
  ffnFundedSimplePayoutMinBalanceCents?: number;
  /** Bulenox funded (Opt 1 / Opt 2 / libellé compare Master) — même logique master : buffer CSV, surplus, paliers max puis illimité (indicatif). */
  bulenoxFundedSimplePayoutUi?: boolean;
  bulenoxFundedSimplePayoutMinBalanceCents?: number;
  /** Tradeify Lightning funded — profit journal vs mini/maxi CSV (indicatif). */
  tradeifyLightningSimplePayoutUi?: boolean;
  tradeifyLightningSimplePayoutMinBalanceCents?: number;
  /** Tradeify Growth funded — buffer CSV puis surplus, ou profit direct (indicatif). */
  tradeifyGrowthSimplePayoutUi?: boolean;
  tradeifyGrowthSimplePayoutMinBalanceCents?: number;
  /** Tradeify Select Flex funded — 50 % du profit journal vs mini/maxi CSV (indicatif). */
  tradeifySelectFlexSimplePayoutUi?: boolean;
  tradeifySelectFlexSimplePayoutMinBalanceCents?: number;
  /** Tradeify Select Daily funded — buffer CSV puis surplus, mini/maxi (indicatif). */
  tradeifySelectDailySimplePayoutUi?: boolean;
  tradeifySelectDailySimplePayoutMinBalanceCents?: number;
  /** Blusky funded — profit vs mini/maxi CSV (indicatif). */
  bluskyFundedSimplePayoutUi?: boolean;
  bluskyFundedSimplePayoutMinBalanceCents?: number;
  /** DayTraders funded — buffer / profit / split / mini-maxi depuis CSV Day Traders Rules (indicatif). */
  daytradersFundedSimplePayoutUi?: boolean;
  daytradersFundedSimplePayoutMinBalanceCents?: number;
  /** Elite Trader Funding funded — buffer CSV, surplus, paliers max 1er–4e+ (indicatif). */
  etfFundedSimplePayoutUi?: boolean;
  etfFundedSimplePayoutMinBalanceCents?: number;
  /** Phidias funded — buffer CSV, surplus, paliers max (indicatif). */
  phidiasFundedSimplePayoutUi?: boolean;
  phidiasFundedSimplePayoutMinBalanceCents?: number;
  /** Taurus Arena funded/direct funded — buffer CSV, surplus, paliers max (indicatif). */
  taurusArenaFundedSimplePayoutUi?: boolean;
  taurusArenaFundedSimplePayoutMinBalanceCents?: number;
  /** TradeDay funded — buffer CSV, surplus, mini, no max cap in CSV (indicatif). */
  tradeDayFundedSimplePayoutUi?: boolean;
  tradeDayFundedSimplePayoutMinBalanceCents?: number;
  /** YRM Prop Prime (50 % CSV notes) / Instant Prime (profit vs mini-maxi) — indicatif. */
  yrmPropSimplePayoutUi?: boolean;
  yrmPropSimplePayoutMinBalanceCents?: number;
  /** AquaFutures funded — buffer (Standard) ou profit (Beginner / Instant), split cumulatif CSV. */
  aquaFuturesSimplePayoutUi?: boolean;
  aquaFuturesSimplePayoutMinBalanceCents?: number;
  /** FuturesElite funded — Prime 50 % (notes CSV), Elite buffer, Instant profit (indicatif). */
  futuresEliteSimplePayoutUi?: boolean;
  futuresEliteSimplePayoutMinBalanceCents?: number;
  /** Alpha Futures funded — Zero / Advanced 50 % (notes CSV), Standard profit + split marginal (indicatif). */
  alphaFuturesSimplePayoutUi?: boolean;
  alphaFuturesSimplePayoutMinBalanceCents?: number;
  /** Legends Trading funded — buffer CSV puis surplus (mini/maxi), split 90 % (indicatif). */
  legendsTradingSimplePayoutUi?: boolean;
  legendsTradingSimplePayoutMinBalanceCents?: number;
};

/** Modale Add Payout (Apex) : même phrase d’éligibilité que sous le callout carte. */
export const APEX_FUNDED_PAYOUT_DASHBOARD_REMINDER =
  "Eligibility is subject to Apex Trader Funding rules on your dashboard.";

function fmtCents(c: number): string {
  return formatUsdWholeGrouped(Math.max(0, Math.round(c)) / 100);
}

/**
 * Apex Trader Funding — comptes **funded / live** : suivi visuel uniquement
 * (start + buffer + payout min + payout max). Le **max** suit le palier CSV 1ʳᵉ–6ᵉ
 * selon le prochain payout (payouts non rejetés dans le journal) ; au-delà du 6ᵉ on garde le palier 6ᵉ.
 */
export function tryBuildApexFundedRunway(
  state: JournalDataV1,
  account: JournalAccount,
  p: {
    startCents: number;
    bufferStrideCents: number;
    rawFundedPnlCents: number;
    lifetimePnlCents: number;
    currentCents: number;
  }
): ApexFundedRunway | null {
  if (account.accountType !== "funded" && account.accountType !== "live") {
    return null;
  }
  const fd = getApexFundedBlockForAccount(account);
  if (!fd) return null;

  const start = p.startCents;
  const balanceNow = p.currentCents;
  const bufferDist = Math.max(0, Math.round(fd.bufferUsd * 100));
  const payoutMinDist = Math.max(0, Math.round(fd.payoutMiniUsd * 100));
  const caps = fd.payouts1stTo6thUsd;
  const nextPayoutOrdinal = countLucidProNonRejectedPayouts(state, account.id) + 1;
  const capIdx = Math.min(
    Math.max(nextPayoutOrdinal - 1, 0),
    Math.max(0, caps.length - 1)
  );
  const payoutMaxUsd = caps[capIdx] ?? fd.payoutMaxiUsd;
  const payoutMaxDistCents = Math.max(payoutMinDist, Math.round(payoutMaxUsd * 100));

  const simple = getSimplePayoutProgress({
    startingBalanceCents: start,
    balanceNowCents: balanceNow,
    bufferDistanceCents: bufferDist,
    payoutMinDistanceCents: payoutMinDist,
    payoutMaxDistanceCents: payoutMaxDistCents,
  });

  const tBufferEnd = start + bufferDist;
  const tMin = tBufferEnd + payoutMinDist;
  const tMax = tBufferEnd + payoutMaxDistCents;

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

  const atOrPastPayoutMax = balanceNow >= tMax;
  const bufferReached = bufferDist === 0 || balanceNow >= tBufferEnd;

  const showAddPayoutButton = simple.showPayoutButton;
  const goodNewsTitle = showAddPayoutButton ? "Good News" : null;

  const surplusAboveBufferCents = Math.max(0, balanceNow - tBufferEnd);
  const availablePayoutCents =
    balanceNow >= tMin
      ? Math.min(surplusAboveBufferCents, payoutMaxDistCents)
      : 0;
  const availablePayoutUsd = availablePayoutCents / 100;
  const suggestedMaxPayoutUsd = showAddPayoutButton && availablePayoutUsd > 0 ? availablePayoutUsd : null;

  const payoutCardCallout = simple.showGoodNewsMessage
    ? `You can request a payout : ${fmtCents(availablePayoutCents)}.\n${APEX_FUNDED_PAYOUT_DASHBOARD_REMINDER}`
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
    availablePayoutUsd: showAddPayoutButton ? availablePayoutUsd : null,
    goodNewsTitle,
    payoutGateHint: null,
    bufferReached,
    showPayoutGatePanel: false,
    apexSimplePayoutUi: true,
    apexSimplePayoutMinBalanceCents: tMin,
  };
}

/**
 * Barre / anneau Progress : funded générique = remplissage jusqu’au buffer (plafonné à 100 %).
 * Challenge : progression brute (peut dépasser 1 avant objectif).
 */
export function effectiveProgress01(m: { lane: "challenge" | "funded"; progress01: number }): number {
  const pr = Math.max(0, m.progress01);
  if (m.lane === "funded") return Math.min(1, pr);
  return pr;
}
