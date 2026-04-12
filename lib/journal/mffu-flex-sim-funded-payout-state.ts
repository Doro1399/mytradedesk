import { parseFundedNextRewardSplitRatio } from "@/lib/journal/funded-next-journal-rules";
import {
  MFFU_FLEX_SIM_FUNDED_FROM_CSV,
  type MffuFlexSimFundedCsvSize,
} from "@/lib/journal/mffu-flex-sim-funded-csv.generated";
import {
  isMffuFlexSimFundedJournalAccount,
  mffuFlexSimFundedCsvSizeOrNull,
} from "@/lib/journal/mffu-flex-sim-funded-journal-rules";
import type { TopStepFundedBlock } from "@/lib/journal/topstep-journal-rules";
import {
  aggregateTopStepFundedPayoutCycle,
  countTopStepPayoutEntries,
} from "@/lib/journal/topstep-funded-payout-cycle";
import type { JournalAccount, JournalDataV1 } from "@/lib/journal/types";

/** Notes Flex CSV : 50 % du solde en payout, 50 % reste buffer — même modèle de déduction solde que Topstep funded. */
export const MFFU_FLEX_SIM_FUNDED_PAYOUT_WITHDRAWAL_SHARE = 0.5;

/**
 * MLL statique **100 $** après le **premier** payout Flex Sim (règle produit ; pas une cellule numérique du CSV).
 */
export const MFFU_FLEX_SIM_FUNDED_MLL_STATIC_USD_AFTER_FIRST_PAYOUT = 100;

export type MffuFlexSimFundedPayoutState = {
  isEligible: boolean;
  eligibilityReason: string | null;
  winningDays: number;
  requiredWinningDays: number;
  winningDayThreshold: number;
  cycleProfit: number;
  requiredCycleProfit: number;
  payoutMin: number;
  payoutCap: number;
  availablePayout: number;
  rewardSplit: number;
  grossPayoutEstimate: number;
  netPayoutEstimate: number;
  /** `100` après au moins un payout enregistré (hors rejet) ; `null` avant le 1er payout. */
  mllAfterFirstPayout: number | null;
  showAddPayout: boolean;
  showGoodNews: boolean;
  availablePayoutCents: number;
  cycleProfitCents: number;
  requiredCycleProfitCents: number;
  /** Solde modèle après dernier payout (replay 50 % du brut), ou nominal si aucun payout valide. */
  baselineAfterPaidPayoutCents: number;
  withdrawalCount: number;
};

export type GetMffuFlexSimFundedPayoutStateParams = {
  startCents: number;
  currentCents: number;
};

function minTopStepBlockForAggregation(minProfitPerDayUsd: number): TopStepFundedBlock {
  return { minProfitPerDayUsd } as TopStepFundedBlock;
}

type ReplayEv =
  | { kind: "pnl"; day: string; sortKey: string; tie: number; pnlCents: number }
  | { kind: "payout"; day: string; sortKey: string; tie: number; grossAmountCents: number };

function canonYmd(raw: string): string {
  const s = raw.trim().slice(0, 10);
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s);
  if (m) {
    return `${m[1]}-${m[2]!.padStart(2, "0")}-${m[3]!.padStart(2, "0")}`;
  }
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : s;
}

/**
 * Replay PnL + payouts (hors rejet) : solde après le **dernier** payout du flux, avec **50 %** du brut retiré du solde.
 * `null` si aucun payout n’a pu être daté (même logique que Topstep `balanceAfterLastPaidPayoutCents`).
 */
export function mffuFlexBaselineAfterLastPaidPayoutCents(
  state: JournalDataV1,
  accountId: string,
  startCents: number
): number | null {
  const events: ReplayEv[] = [];

  for (const e of Object.values(state.pnlEntries)) {
    if (e.accountId !== accountId) continue;
    events.push({
      kind: "pnl",
      day: canonYmd(e.date),
      sortKey: e.createdAt || e.id,
      tie: 0,
      pnlCents: e.pnlCents,
    });
  }

  for (const p of Object.values(state.payoutEntries)) {
    if (p.accountId !== accountId) continue;
    if (p.status === "rejected") continue;
    const raw = (p.requestedDate?.trim() || p.paidDate?.trim() || "").slice(0, 10);
    const day = canonYmd(raw);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) continue;
    events.push({
      kind: "payout",
      day,
      sortKey: p.createdAt || p.id,
      tie: 1,
      grossAmountCents: p.grossAmountCents,
    });
  }

  if (events.length === 0) return null;

  events.sort((a, b) => {
    if (a.day !== b.day) return a.day < b.day ? -1 : 1;
    if (a.sortKey !== b.sortKey) return a.sortKey < b.sortKey ? -1 : 1;
    return a.tie - b.tie;
  });

  let balance = startCents;
  let lastAfterPaid: number | null = null;

  for (const ev of events) {
    if (ev.kind === "pnl") {
      balance += ev.pnlCents;
    } else {
      balance -= Math.round(ev.grossAmountCents * MFFU_FLEX_SIM_FUNDED_PAYOUT_WITHDRAWAL_SHARE);
      lastAfterPaid = balance;
    }
  }

  return lastAfterPaid;
}

export function getMffuFlexPayoutState(
  state: JournalDataV1,
  account: JournalAccount,
  params: GetMffuFlexSimFundedPayoutStateParams
): MffuFlexSimFundedPayoutState | null {
  if (!isMffuFlexSimFundedJournalAccount(account)) return null;
  const sk = mffuFlexSimFundedCsvSizeOrNull(account);
  if (sk == null) return null;
  const csv = MFFU_FLEX_SIM_FUNDED_FROM_CSV[sk as MffuFlexSimFundedCsvSize];
  if (!csv) return null;

  const requiredWinningDays = csv.fundedMinTradingDays;
  const winningDayThreshold = csv.winningDayThresholdUsd;
  const requiredCycleProfitCents = Math.round(csv.requiredCycleProfitUsd * 100);
  const payoutMinCents = Math.round(csv.payoutMiniUsd * 100);
  const payoutCapCents = Math.round(csv.payoutMaxUsd * 100);

  const withdrawalCount = countTopStepPayoutEntries(state, account.id);
  const agg = aggregateTopStepFundedPayoutCycle(
    state,
    account,
    minTopStepBlockForAggregation(csv.winningDayThresholdUsd)
  );

  const winningDays = agg.winningDaysCount;
  const cycleProfitCents = agg.profitSinceLastPayoutCents;

  const afterLast = mffuFlexBaselineAfterLastPaidPayoutCents(state, account.id, params.startCents);
  const baselineAfterPaidPayoutCents =
    afterLast != null ? afterLast : params.startCents;

  const lifetimeGainCents = Math.max(0, Math.round(params.currentCents - params.startCents));

  const baseForHalfCents =
    withdrawalCount === 0 ? Math.max(0, cycleProfitCents) : lifetimeGainCents;

  const halfCents = Math.round(baseForHalfCents * MFFU_FLEX_SIM_FUNDED_PAYOUT_WITHDRAWAL_SHARE);
  const availablePayoutCents = Math.min(Math.max(0, halfCents), payoutCapCents);

  const rewardSplit = parseFundedNextRewardSplitRatio(csv.profitSplitLabel) ?? 0;
  const grossUsd = availablePayoutCents / 100;
  const netUsd = Math.round(availablePayoutCents * rewardSplit) / 100;

  const winningOk = winningDays >= requiredWinningDays;
  const cycleOk = cycleProfitCents >= requiredCycleProfitCents;
  const minOk = availablePayoutCents >= payoutMinCents;
  const isEligible = winningOk && cycleOk && minOk && availablePayoutCents > 0;

  let eligibilityReason: string | null = null;
  if (!isEligible) {
    if (!winningOk) {
      const need = Math.max(0, requiredWinningDays - winningDays);
      eligibilityReason =
        need === 1
          ? "Need 1 more winning day"
          : `Need ${need} more winning days (${requiredWinningDays} required, net ≥ ${winningDayThreshold} / day)`;
    } else if (!cycleOk) {
      eligibilityReason = "Cycle net profit below required minimum";
    } else if (!minOk) {
      eligibilityReason = "Available payout below minimum";
    } else {
      eligibilityReason = "Not eligible";
    }
  }

  return {
    isEligible,
    eligibilityReason,
    winningDays,
    requiredWinningDays,
    winningDayThreshold,
    cycleProfit: cycleProfitCents / 100,
    requiredCycleProfit: csv.requiredCycleProfitUsd,
    payoutMin: csv.payoutMiniUsd,
    payoutCap: csv.payoutMaxUsd,
    availablePayout: grossUsd,
    rewardSplit,
    grossPayoutEstimate: grossUsd,
    netPayoutEstimate: netUsd,
    mllAfterFirstPayout:
      withdrawalCount >= 1 ? MFFU_FLEX_SIM_FUNDED_MLL_STATIC_USD_AFTER_FIRST_PAYOUT : null,
    showAddPayout: isEligible,
    showGoodNews: isEligible,
    availablePayoutCents,
    cycleProfitCents,
    requiredCycleProfitCents,
    baselineAfterPaidPayoutCents,
    withdrawalCount,
  };
}
