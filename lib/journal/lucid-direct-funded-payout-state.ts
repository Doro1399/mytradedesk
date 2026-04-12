import { fundedProgressPnlBaselineDate } from "@/lib/journal/funded-phase-pnl";
import {
  getLucidDirectFundedBlockForAccount,
  isLucidDirectFundedJournalAccount,
} from "@/lib/journal/lucid-journal-rules";
import {
  countLucidProNonRejectedPayouts,
  lucidProFundedCycleTotals,
} from "@/lib/journal/lucid-pro-funded-payout-state";
import type { JournalAccount, JournalDataV1, JournalId } from "@/lib/journal/types";
import type { StoredTrade } from "@/lib/journal/trades-storage";
import { hasTptJournalActivityAfterTimestamp } from "@/lib/journal/tpt-funded-runway";
import { formatUsdWholeGrouped } from "@/lib/prop-firms";

/** Mini brut demandable (règles Lucid Direct funded). */
export const LUCID_DIRECT_FUNDED_MIN_PAYOUT_CENTS = 500 * 100;

function lastNonRejectedPayoutCreatedAt(
  state: JournalDataV1,
  accountId: JournalId
): string | null {
  let best: string | null = null;
  for (const p of Object.values(state.payoutEntries)) {
    if (p.accountId !== accountId) continue;
    if (p.status === "rejected") continue;
    const c = p.createdAt;
    if (best == null || c > best) best = c;
  }
  return best;
}

function profitGoalCentsForNextPayout(
  block: { profitGoal1stUsd: number; profitGoalAfter1stUsd: number },
  nextPayoutOrdinal: number
): number {
  const tierUsd =
    nextPayoutOrdinal >= 1 && nextPayoutOrdinal <= 3
      ? block.profitGoal1stUsd
      : block.profitGoalAfter1stUsd;
  return Math.round(tierUsd * 100);
}

function payoutCapCentsForNextPayout(
  payouts1stTo6thUsd: readonly number[],
  nextPayoutOrdinal: number
): number {
  if (payouts1stTo6thUsd.length === 0) return 0;
  const idx = Math.min(Math.max(nextPayoutOrdinal - 1, 0), payouts1stTo6thUsd.length - 1);
  return Math.round((payouts1stTo6thUsd[idx] ?? 0) * 100);
}

/**
 * Cible cycle Lucid Direct : max(profit goal palier, mini $500, **5 × best day**).
 * Consistance 20 % = **meilleur jour ≤ 20 % du profit de cycle total** ⇔ `5 × best_day ≤ total_cycle`
 * (équiv. à `total ≥ best / 0,20`). Ex. best $302 → il faut au moins **$1 510** de P/L de cycle, pas seulement le goal $1 500.
 */
export function lucidDirectFundedEffectiveTargetCents(
  profitGoalCents: number,
  bestDayCents: number
): {
  profitGoalCents: number;
  /** Minimum de P/L cycle pour respecter 20 % avec ce best day (`5 × best`). */
  consistencyMinCycleTotalCents: number;
  minPayoutMarginCents: number;
  effectiveTargetCents: number;
} {
  const minPayoutMarginCents = LUCID_DIRECT_FUNDED_MIN_PAYOUT_CENTS;
  const consistencyMinCycleTotalCents = bestDayCents > 0 ? bestDayCents * 5 : 0;
  const effectiveTargetCents = Math.max(
    profitGoalCents,
    consistencyMinCycleTotalCents,
    minPayoutMarginCents
  );
  return {
    profitGoalCents,
    consistencyMinCycleTotalCents,
    minPayoutMarginCents,
    effectiveTargetCents,
  };
}

export type LucidDirectPayoutState = {
  /** Objectif profit de cycle (palier payouts 1–3 vs 4–6+). */
  programProfitGoalCents: number;
  /** Avec le P/L cycle actuel, plafond implicite du meilleur jour (⌊total / 5⌋ = 20 % × total). */
  maxBestDayAllowedCents: number;
  /** P/L cycle minimum pour que ce best day soit ≤ 20 % du total (`5 × best`). */
  consistencyMinCycleTotalCents: number;
  minPayoutMarginCents: number;
  effectiveTargetCents: number;
  cycleTotalCents: number;
  cycleBestDayCents: number;
  /** Cycle ≥ objectif programme seul (sans consistance / mini). */
  cycleMeetsProgramGoal: boolean;
  /** Cycle ≥ max(goal, 5× best day, mini $500). */
  cycleMeetsEffectiveTarget: boolean;
  /** best_day ≤ 20 % × profit de cycle total (5 × best ≤ total). */
  consistencyOk: boolean;
  payoutCapCents: number;
  /** min(profit de cycle, plafond brut ordinal). */
  availablePayoutCents: number;
  payoutMinCents: number;
  isEligible: boolean;
  eligibilityReason: string | null;
  hasActivityAfterLastPayout: boolean;
  showAddPayout: boolean;
  payoutCountNonRejected: number;
  /** Prochain payout attendu (1-based), pour caps / goals. */
  nextPayoutOrdinal: number;
};

export type GetLucidDirectPayoutStateParams = {
  storedTrades?: readonly StoredTrade[];
};

/**
 * État payout Lucid Direct funded : consistance 20 % **du total cycle** (best ≤ 20 % × total),
 * profit goal palier, mini $500 brut, plafonds 1ʳᵉ–6ᵉ payout, reset après payout non rejeté. Montants en cents.
 */
export function getLucidDirectPayoutState(
  state: JournalDataV1,
  account: JournalAccount,
  params: GetLucidDirectPayoutStateParams = {}
): LucidDirectPayoutState | null {
  if (!isLucidDirectFundedJournalAccount(account)) return null;
  const block = getLucidDirectFundedBlockForAccount(account);
  if (!block) return null;

  const payoutCountNonRejected = countLucidProNonRejectedPayouts(state, account.id);
  const nextPayoutOrdinal = payoutCountNonRejected + 1;
  const programProfitGoalCents = profitGoalCentsForNextPayout(block, nextPayoutOrdinal);
  const payoutCapCents = payoutCapCentsForNextPayout(block.payouts1stTo6thUsd, nextPayoutOrdinal);

  const lastPayAt = lastNonRejectedPayoutCreatedAt(state, account.id);
  const fundedBaseline = fundedProgressPnlBaselineDate(account);
  const cycle = lucidProFundedCycleTotals(
    state,
    account.id,
    lastPayAt,
    fundedBaseline,
    params.storedTrades
  );

  const targets = lucidDirectFundedEffectiveTargetCents(programProfitGoalCents, cycle.bestDayCents);

  const impliedMaxBestDayCents =
    cycle.totalCents > 0 ? Math.floor(cycle.totalCents / 5) : 0;

  const cycleMeetsProgramGoal = cycle.totalCents >= programProfitGoalCents;
  const consistencyOk =
    cycle.totalCents <= 0
      ? cycle.bestDayCents <= 0
      : cycle.bestDayCents * 5 <= cycle.totalCents;

  const availablePayoutCents = Math.min(
    Math.max(0, cycle.totalCents),
    Math.max(0, payoutCapCents)
  );
  const payoutMinCents = LUCID_DIRECT_FUNDED_MIN_PAYOUT_CENTS;

  const cycleMeetsEffectiveTarget = cycle.totalCents >= targets.effectiveTargetCents;
  const payoutAtLeastMin = availablePayoutCents >= payoutMinCents;

  const isEligible = cycleMeetsEffectiveTarget && consistencyOk && payoutAtLeastMin;

  let eligibilityReason: string | null = null;
  if (!isEligible) {
    if (cycleMeetsEffectiveTarget && consistencyOk && !payoutAtLeastMin) {
      eligibilityReason = null;
    } else if (!cycleMeetsEffectiveTarget || !consistencyOk) {
      const short = Math.max(0, targets.effectiveTargetCents - cycle.totalCents);
      eligibilityReason = `Consistency: your best day ${formatUsdWholeGrouped(cycle.bestDayCents / 100)}. New cycle target ${formatUsdWholeGrouped(targets.effectiveTargetCents / 100)}. ${formatUsdWholeGrouped(short / 100)} to go.`;
    } else {
      eligibilityReason = "Not eligible";
    }
  }

  const hasActivityAfterLastPayout =
    lastPayAt == null ||
    hasTptJournalActivityAfterTimestamp(state, account.id, lastPayAt, params.storedTrades);

  const showAddPayout = isEligible && hasActivityAfterLastPayout;

  return {
    programProfitGoalCents,
    maxBestDayAllowedCents: impliedMaxBestDayCents,
    consistencyMinCycleTotalCents: targets.consistencyMinCycleTotalCents,
    minPayoutMarginCents: targets.minPayoutMarginCents,
    effectiveTargetCents: targets.effectiveTargetCents,
    cycleTotalCents: cycle.totalCents,
    cycleBestDayCents: cycle.bestDayCents,
    cycleMeetsProgramGoal,
    cycleMeetsEffectiveTarget,
    consistencyOk,
    payoutCapCents,
    availablePayoutCents,
    payoutMinCents,
    isEligible,
    eligibilityReason,
    hasActivityAfterLastPayout,
    showAddPayout,
    payoutCountNonRejected,
    nextPayoutOrdinal,
  };
}
