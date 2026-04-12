import { aggregateTradeifyGrowthFundedPayoutCycle } from "@/lib/journal/apex-funded-payout-cycle";
import type { JournalAccount, JournalDataV1 } from "@/lib/journal/types";
import type { GrowthFunded } from "@/lib/journal/tradeify-journal-rules";
import {
  getTradeifyGrowthFundedBlockForAccount,
  isTradeifyGrowthFundedJournalAccount,
} from "@/lib/journal/tradeify-journal-rules";
import { formatUsdWholeGrouped } from "@/lib/prop-firms";

function countApprovedOrPaidPayouts(state: JournalDataV1, accountId: string): number {
  let n = 0;
  for (const p of Object.values(state.payoutEntries)) {
    if (p.accountId !== accountId) continue;
    if (p.status === "approved" || p.status === "paid") n += 1;
  }
  return n;
}

function growthNextPayoutMaxUsd(completedApprovedCount: number, g: GrowthFunded): number {
  if (completedApprovedCount <= 0) return g.payout1st;
  if (completedApprovedCount === 1) return g.payout2nd;
  if (completedApprovedCount === 2) return g.payout3rd;
  return g.payout4th;
}

function fmtCents(cents: number): string {
  return formatUsdWholeGrouped(Math.max(0, Math.round(cents)) / 100);
}

/** Premier verrou encore actif (messages UI séparés : consistance ≠ jours qualifiés). */
export type TradeifyGrowthPayoutBlockKind =
  | "balance"
  | "qualified_days"
  | "consistency"
  | "cycle_target"
  | "payout_min"
  | null;

export type TradeifyGrowthPayoutState = {
  isEligible: boolean;
  eligibilityReason: string | null;
  blockingKind: TradeifyGrowthPayoutBlockKind;
  cycleProfit: number;
  bestDayProfit: number;
  /** Cible cycle liée à la consistance : ceil(best / ratio). 0 si consistance inactive (1er payout ou &lt; 2 jours). */
  requiredProfitForConsistency: number;
  /** True dès le **2e** payout ; le 1er ignore la règle 35 %. */
  applyConsistencyRule: boolean;
  consistencyValid: boolean;
  qualifiedDays: number;
  requiredQualifiedDays: number;
  minimumBalanceNeeded: number;
  payoutMin: number;
  payoutMax: number;
  availablePayout: number;
  effectiveTarget: number;
  showAddPayout: boolean;
  showGoodNews: boolean;
  minimumBalanceNeededCents: number;
  effectiveCycleTargetCents: number;
  payoutMaxCents: number;
  payoutMinCents: number;
  availablePayoutCents: number;
  cycleProfitCents: number;
  bestDayProfitCents: number;
  requiredProfitForConsistencyCents: number;
};

/**
 * Tradeify Growth funded — CSV via `getTradeifyGrowthFundedBlockForAccount`.
 *
 * **Consistance 35 %** : `meilleur jour ≤ ratio × P&L du cycle` — **uniquement à partir du 2e** payout
 * (au moins un payout `approved`/`paid` déjà enregistré). Premier payout : pas de consistance, seulement
 * solde min, jours qualifiés, payout mini, cap palier.
 *
 * Avec ≥ 2 jours de P&L dans la fenêtre quand la consistance s’applique ; sinon on évite le cas dégénéré
 * « un seul jour » (best = cycle).
 */
export function getTradeifyGrowthPayoutState(
  state: JournalDataV1,
  account: JournalAccount,
  p: { startCents: number; currentCents: number }
): TradeifyGrowthPayoutState | null {
  if (!isTradeifyGrowthFundedJournalAccount(account)) return null;
  const g = getTradeifyGrowthFundedBlockForAccount(account);
  if (!g) return null;

  const bufferCents = Math.round(g.bufferUsd * 100);
  const minimumBalanceNeededCents = p.startCents + bufferCents;
  const ratio = g.payoutConsistencyRatio;
  const ratioPermille = Math.round(ratio * 10000);

  const payoutMiniCents = Math.round(g.payoutMiniUsd * 100);

  const nApproved = countApprovedOrPaidPayouts(state, account.id);
  const applyConsistencyRule = nApproved >= 1;

  const cycle = aggregateTradeifyGrowthFundedPayoutCycle(state, account, g.minProfitPerDayUsd);
  const cycleProfitCents = cycle.totalCycleProfitCents;
  const bestDayProfitCents = cycle.bestDayProfitCents;
  const bestPos = Math.max(0, bestDayProfitCents);

  const distinctPnlDayCount = Object.values(cycle.dailyProfitCents).filter((v) => v !== 0).length;
  const consistencyRuleApplies =
    applyConsistencyRule && distinctPnlDayCount >= 2;

  const minMCents =
    ratio > 0 && consistencyRuleApplies ? Math.ceil(bestPos / ratio) : 0;
  const effectiveCycleTargetCents = Math.max(
    payoutMiniCents,
    consistencyRuleApplies ? minMCents : 0
  );

  const consistencyValid =
    !consistencyRuleApplies ||
    ratioPermille <= 0 ||
    bestDayProfitCents * 10000 <= cycleProfitCents * ratioPermille;

  const requiredQualifiedDays = g.minDays;
  const qualifiedDays = cycle.qualifiedTradingDaysCount;
  const qualifiedOk = qualifiedDays >= requiredQualifiedDays;

  const balanceOk = p.currentCents >= minimumBalanceNeededCents;

  const payoutMaxUsd = growthNextPayoutMaxUsd(nApproved, g);
  const payoutMaxCents = Math.round(payoutMaxUsd * 100);

  const surplusCents = Math.max(0, p.currentCents - minimumBalanceNeededCents);
  const availablePayoutCents = Math.min(surplusCents, payoutMaxCents);

  const cycleMeetsTarget = cycleProfitCents >= effectiveCycleTargetCents;
  const payoutMinOk = availablePayoutCents >= payoutMiniCents;

  const isEligible =
    balanceOk &&
    qualifiedOk &&
    consistencyValid &&
    cycleMeetsTarget &&
    payoutMinOk;

  let blockingKind: TradeifyGrowthPayoutBlockKind = null;
  if (!balanceOk) blockingKind = "balance";
  else if (!qualifiedOk) blockingKind = "qualified_days";
  else if (!consistencyValid) blockingKind = "consistency";
  else if (!cycleMeetsTarget) blockingKind = "cycle_target";
  else if (!payoutMinOk) blockingKind = "payout_min";

  let eligibilityReason: string | null = null;
  if (blockingKind === "balance") {
    const short = minimumBalanceNeededCents - p.currentCents;
    eligibilityReason = `Balance must reach at least ${fmtCents(minimumBalanceNeededCents)} (start + buffer). Need ${fmtCents(short)} more.`;
  } else if (blockingKind === "qualified_days") {
    const need = requiredQualifiedDays - qualifiedDays;
    eligibilityReason =
      need === 1
        ? `Need 1 more qualified winning day (net ≥ ${formatUsdWholeGrouped(g.minProfitPerDayUsd)} / day, ${requiredQualifiedDays} required).`
        : `Need ${need} more qualified winning days (net ≥ ${formatUsdWholeGrouped(g.minProfitPerDayUsd)} / day, ${requiredQualifiedDays} required).`;
  } else if (blockingKind === "consistency") {
    const consistencyToGoCents = Math.max(0, minMCents - cycleProfitCents);
    eligibilityReason = `Consistency: your best day ${fmtCents(bestDayProfitCents)} exceeds ${g.payoutConsistency}. ${fmtCents(consistencyToGoCents)} to go.`;
  } else if (blockingKind === "cycle_target") {
    const short = effectiveCycleTargetCents - cycleProfitCents;
    eligibilityReason = applyConsistencyRule
      ? `Cycle P/L needs ${fmtCents(short)} more to reach target ${fmtCents(effectiveCycleTargetCents)} (payout minimum and consistency).`
      : `Cycle P/L needs ${fmtCents(short)} more to reach the ${fmtCents(payoutMiniCents)} payout minimum.`;
  } else if (blockingKind === "payout_min") {
    eligibilityReason = `Withdrawable this cycle (${fmtCents(availablePayoutCents)}) is below the ${fmtCents(payoutMiniCents)} payout minimum (after cap ${fmtCents(payoutMaxCents)}).`;
  }

  const showAddPayout = isEligible;
  const showGoodNews = isEligible;

  const effectiveTarget =
    !balanceOk
      ? minimumBalanceNeededCents / 100
      : effectiveCycleTargetCents / 100;

  return {
    isEligible,
    eligibilityReason,
    blockingKind,
    cycleProfit: cycleProfitCents / 100,
    bestDayProfit: bestDayProfitCents / 100,
    requiredProfitForConsistency: minMCents / 100,
    applyConsistencyRule,
    consistencyValid,
    qualifiedDays,
    requiredQualifiedDays,
    minimumBalanceNeeded: minimumBalanceNeededCents / 100,
    payoutMin: g.payoutMiniUsd,
    payoutMax: payoutMaxUsd,
    availablePayout: availablePayoutCents / 100,
    effectiveTarget,
    showAddPayout,
    showGoodNews,
    minimumBalanceNeededCents,
    effectiveCycleTargetCents,
    payoutMaxCents,
    payoutMinCents: payoutMiniCents,
    availablePayoutCents,
    cycleProfitCents,
    bestDayProfitCents,
    requiredProfitForConsistencyCents: minMCents,
  };
}
