import {
  aggregateFundedNextLegacyBenchmarkCycle,
  fundedNextLegacyPayoutCycleStartIso,
} from "@/lib/journal/funded-next-legacy-cycle";
import {
  FUNDED_NEXT_LEGACY_FUNDED_FROM_CSV,
  type FundedNextLegacyCsvSize,
} from "@/lib/journal/funded-next-legacy-funded-csv.generated";
import {
  isFundedNextLegacyFundedJournalAccount,
  parseFundedNextRewardSplitRatio,
} from "@/lib/journal/funded-next-journal-rules";
import { fundedProgressPnlBaselineDate } from "@/lib/journal/funded-phase-pnl";
import { accountNominalBalanceCentsAtFundedPayoutCycleStart } from "@/lib/journal/selectors";
import type { JournalAccount, JournalDataV1 } from "@/lib/journal/types";
import type { StoredTrade } from "@/lib/journal/trades-storage";

const HARD_BREACH_WARNING =
  "Warning: withdrawing all profits may trigger a hard breach.";

function fmtUsdFromCentsBufferLine(cents: number): string {
  const n = Math.max(0, Math.round(cents)) / 100;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n);
}

function countLegacyWithdrawals(state: JournalDataV1, accountId: string): number {
  let n = 0;
  for (const p of Object.values(state.payoutEntries)) {
    if (p.accountId !== accountId) continue;
    if (p.status === "approved" || p.status === "paid") n += 1;
  }
  return n;
}

export type FundedNextLegacyPayoutState = {
  isEligible: boolean;
  eligibilityReason: string | null;
  benchmarkDays: number;
  requiredBenchmarkDays: number;
  uncapBenchmarkDays: number;
  cycleProfit: number;
  cycleProfitMin: number;
  /** Best calendar-day net P/L this cycle (USD); informational only — not a gate. */
  bestDayProfit: number;
  payoutMin: number;
  payoutMax: number | null;
  payoutCapRemoved: boolean;
  availablePayout: number;
  rewardSplit: number;
  grossPayoutEstimate: number;
  netPayoutEstimate: number;
  withdrawalCount: number;
  showAddPayout: boolean;
  showGoodNews: boolean;
  showHardBreachWarning: boolean;
  hardBreachWarningMessage: string | null;
  cycleProfitCents: number;
  availablePayoutCents: number;
  /** Marge de gain cycle (1er retrait) ou profit total (2e+) après un max brut en phase 50 % + plafond. */
  cycleBufferRemainderCents: number;
  /** Gain **dans le cycle payout** (Now − solde théorique au 1er jour du cycle). Inchangé après le 1er retrait. */
  balanceGainCents: number;
  effectiveTargetCents: number;
  effectiveTarget: number;
};

export type GetFundedNextLegacyPayoutStateParams = {
  startCents: number;
  currentCents: number;
  storedTrades?: readonly StoredTrade[];
};

/**
 * Funded Next Futures Legacy funded: benchmark days from journal cycle (Lucid-style aggregate).
 * **1er retrait** : brut = **50% × gain du cycle** (Now − baseline au 1er jour du cycle), plafonné ; après **30** jours benchmark = 100% du gain du cycle.
 * **À partir du 2e retrait** : brut = **50% × profit total** `max(0, Now − Start nominal)` (pas 50% du solde), plafonné ; après uncap = **100%** de ce profit.
 */
export function getFundedNextLegacyPayoutState(
  state: JournalDataV1,
  account: JournalAccount,
  params: GetFundedNextLegacyPayoutStateParams
): FundedNextLegacyPayoutState | null {
  if (!isFundedNextLegacyFundedJournalAccount(account)) return null;
  const sk = account.sizeLabel.trim().toLowerCase().replace(/\s+/g, "") as FundedNextLegacyCsvSize;
  const csv = FUNDED_NEXT_LEGACY_FUNDED_FROM_CSV[sk];
  if (!csv) return null;

  const cycleProfitMinCents = Math.round(csv.cycleProfitMinUsd * 100);
  const payoutMinCents = Math.round(csv.payoutMiniUsd * 100);
  const payoutCapCents = Math.round(csv.payoutCapStandardUsd * 100);
  const benchThresholdCents = Math.round(csv.benchmarkMinProfitPerDayUsd * 100);
  const early = csv.earlyPhaseWithdrawalFractionOfCycle;

  const withdrawalCount = countLegacyWithdrawals(state, account.id);

  const cycleStartRaw = fundedNextLegacyPayoutCycleStartIso(state, account);
  const cycleStart =
    cycleStartRaw != null && String(cycleStartRaw).trim() !== "" ? String(cycleStartRaw).trim() : "";

  let cycleProfitCents = 0;
  let benchmarkDays = 0;
  let bestDayPositiveCents = 0;
  if (cycleStart) {
    const agg = aggregateFundedNextLegacyBenchmarkCycle(
      state,
      account,
      cycleStart,
      benchThresholdCents
    );
    benchmarkDays = agg.qualifiedDays;
    cycleProfitCents = agg.cycleProfitCents;
    bestDayPositiveCents = Math.max(0, agg.bestDayProfitCents);
  }

  /** Gain depuis le début du cycle payout (après dernier payout **payé/approuvé** qui déduit le solde « Now »), pas depuis l’ouverture du compte. */
  const fundedPnlSince = fundedProgressPnlBaselineDate(account);
  const baselineAtCycleStartCents =
    cycleStart !== ""
      ? accountNominalBalanceCentsAtFundedPayoutCycleStart(
          state,
          account.id,
          params.startCents,
          cycleStart,
          fundedPnlSince != null && fundedPnlSince !== ""
            ? { fundedPnlSinceInclusive: fundedPnlSince }
            : undefined
        )
      : params.startCents;
  const cycleBalanceGainCents = Math.max(
    0,
    Math.round(params.currentCents - baselineAtCycleStartCents)
  );
  const firstWithdrawalCycle = withdrawalCount === 0;
  const lifetimeGainCents = Math.max(0, Math.round(params.currentCents - params.startCents));

  const payoutCapRemoved = benchmarkDays >= csv.uncapBenchmarkDays;

  let grossAvailableCents = 0;
  if (firstWithdrawalCycle) {
    if (cycleBalanceGainCents > 0) {
      if (payoutCapRemoved) {
        grossAvailableCents = cycleBalanceGainCents;
      } else {
        grossAvailableCents = Math.min(Math.round(early * cycleBalanceGainCents), payoutCapCents);
      }
    }
  } else {
    if (payoutCapRemoved) {
      grossAvailableCents = lifetimeGainCents;
    } else if (lifetimeGainCents > 0) {
      grossAvailableCents = Math.min(Math.round(early * lifetimeGainCents), payoutCapCents);
    }
  }

  const effectiveTargetCents = Math.max(
    cycleProfitMinCents,
    early > 0 ? Math.ceil(payoutMinCents / early) : payoutMinCents
  );

  const benchmarkOk = benchmarkDays >= csv.requiredBenchmarkDays;
  const cycleMinOk = cycleBalanceGainCents >= cycleProfitMinCents;
  const payoutMinOk = grossAvailableCents >= payoutMinCents;
  const isEligible =
    benchmarkOk &&
    cycleMinOk &&
    payoutMinOk &&
    grossAvailableCents > 0 &&
    (firstWithdrawalCycle ? cycleBalanceGainCents > 0 : lifetimeGainCents > 0);
  const showAddPayout = isEligible;
  const showGoodNews = isEligible;

  const rewardSplit = parseFundedNextRewardSplitRatio(csv.profitSplitLabel) ?? 0;
  const grossUsd = grossAvailableCents / 100;
  const netUsd = Math.round(grossAvailableCents * rewardSplit) / 100;
  const cycleBufferRemainderCents = firstWithdrawalCycle
    ? Math.max(0, cycleBalanceGainCents - grossAvailableCents)
    : Math.max(0, lifetimeGainCents - grossAvailableCents);

  const bufferRemainderMessage =
    !payoutCapRemoved && isEligible && cycleBufferRemainderCents > 0
      ? `If you payout the maximum now, ${fmtUsdFromCentsBufferLine(cycleBufferRemainderCents)} remains as buffer.`
      : null;

  let showHardBreachWarning = false;
  let hardBreachWarningMessage: string | null = null;
  if (bufferRemainderMessage) {
    showHardBreachWarning = true;
    hardBreachWarningMessage = bufferRemainderMessage;
  } else if (payoutCapRemoved && grossAvailableCents > 0) {
    const fullWithdrawableCents = firstWithdrawalCycle ? cycleBalanceGainCents : lifetimeGainCents;
    if (
      fullWithdrawableCents > 0 &&
      grossAvailableCents >= fullWithdrawableCents - 100
    ) {
      showHardBreachWarning = true;
      hardBreachWarningMessage = HARD_BREACH_WARNING;
    }
  }

  let eligibilityReason: string | null = null;
  if (!isEligible) {
    if (!benchmarkOk) {
      eligibilityReason = "Need more benchmark days";
    } else if (!cycleMinOk) {
      eligibilityReason = "Account gain too low";
    } else if (!payoutMinOk) {
      eligibilityReason = "Payout minimum not reached";
    } else {
      eligibilityReason = "Not eligible";
    }
  }

  return {
    isEligible,
    eligibilityReason,
    benchmarkDays,
    requiredBenchmarkDays: csv.requiredBenchmarkDays,
    uncapBenchmarkDays: csv.uncapBenchmarkDays,
    cycleProfit: cycleProfitCents / 100,
    cycleProfitMin: csv.cycleProfitMinUsd,
    bestDayProfit: bestDayPositiveCents / 100,
    payoutMin: csv.payoutMiniUsd,
    payoutMax: payoutCapRemoved ? null : csv.payoutCapStandardUsd,
    payoutCapRemoved,
    availablePayout: grossUsd,
    rewardSplit,
    grossPayoutEstimate: grossUsd,
    netPayoutEstimate: netUsd,
    withdrawalCount,
    showAddPayout,
    showGoodNews,
    showHardBreachWarning,
    hardBreachWarningMessage,
    cycleProfitCents,
    availablePayoutCents: grossAvailableCents,
    cycleBufferRemainderCents,
    balanceGainCents: cycleBalanceGainCents,
    effectiveTargetCents,
    effectiveTarget: effectiveTargetCents / 100,
  };
}
