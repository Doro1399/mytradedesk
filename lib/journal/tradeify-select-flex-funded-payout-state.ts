import { fundedProgressPnlBaselineDate } from "@/lib/journal/funded-phase-pnl";
import { topStepFundedPayoutCycleStartInclusive } from "@/lib/journal/topstep-funded-payout-cycle";
import type { JournalAccount, JournalDataV1 } from "@/lib/journal/types";
import type { StoredTrade } from "@/lib/journal/trades-storage";
import { isPnlEntrySyncedFromTradesTable } from "@/lib/journal/trades-journal-sync";
import { getAccountFinancialMetrics } from "@/lib/journal/selectors";
import {
  getTradeifySelectFlexFundedBlockForAccount,
  isTradeifySelectFlexFundedJournalAccount,
  type SelectFlexFunded,
} from "@/lib/journal/tradeify-journal-rules";
import { formatUsdWholeGrouped } from "@/lib/prop-firms";

function calendarDateKey(raw: string): string {
  const t = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  const slice = t.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(slice) ? slice : t;
}

function normalizedCalendarKey(raw: string): string {
  const k = calendarDateKey(raw);
  if (/^\d{4}-\d{2}-\d{2}$/.test(k)) return k;
  const t = Date.parse(raw.trim());
  if (!Number.isNaN(t)) {
    const d = new Date(t);
    const yy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yy}-${mm}-${dd}`;
  }
  const parts = k.split("-").map((p) => p.trim());
  if (parts.length === 3) {
    const y = Number.parseInt(parts[0]!, 10);
    const mo = Number.parseInt(parts[1]!, 10);
    const da = Number.parseInt(parts[2]!, 10);
    if (Number.isFinite(y) && Number.isFinite(mo) && Number.isFinite(da)) {
      return `${y}-${String(mo).padStart(2, "0")}-${String(da).padStart(2, "0")}`;
    }
  }
  return k;
}

function accountHasNonRejectedPayout(state: JournalDataV1, accountId: string): boolean {
  for (const p of Object.values(state.payoutEntries)) {
    if (p.accountId !== accountId) continue;
    if (p.status === "rejected") continue;
    return true;
  }
  return false;
}

/**
 * Inclusive calendar start of the payout window.
 * After a payout: same as Topstep (day after last payout).
 * Before any payout on funded/live: funded baseline → eval start → account start — avoids using eval-era P&L
 * when `fundedProgressPnlBaselineDate` is missing but `evaluationStartedDate` is set.
 */
function selectFlexFundedPayoutCycleStartInclusive(state: JournalDataV1, account: JournalAccount): string {
  if (accountHasNonRejectedPayout(state, account.id)) {
    return (topStepFundedPayoutCycleStartInclusive(state, account) ?? account.startDate).trim();
  }
  if (account.accountType === "funded" || account.accountType === "live") {
    return (
      fundedProgressPnlBaselineDate(account) ??
      account.evaluationStartedDate ??
      account.startDate
    ).trim();
  }
  return (topStepFundedPayoutCycleStartInclusive(state, account) ?? account.startDate).trim();
}

function dayHasTradesSyncedJournalPnl(state: JournalDataV1, accountId: string, dayKey: string): boolean {
  for (const e of Object.values(state.pnlEntries)) {
    if (e.accountId !== accountId) continue;
    if (normalizedCalendarKey(e.date) !== dayKey) continue;
    if (isPnlEntrySyncedFromTradesTable(e)) return true;
  }
  return false;
}

function isOnOrAfterCalendarDay(entryDate: string, sinceInclusive: string): boolean {
  const a = normalizedCalendarKey(entryDate);
  const b = normalizedCalendarKey(sinceInclusive);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(a) || !/^\d{4}-\d{2}-\d{2}$/.test(b)) {
    return entryDate >= sinceInclusive;
  }
  const [ay, am, ad] = a.split("-").map((x) => Number.parseInt(x, 10));
  const [by, bm, bd] = b.split("-").map((x) => Number.parseInt(x, 10));
  const ta = new Date(ay, am - 1, ad).setHours(0, 0, 0, 0);
  const tb = new Date(by, bm - 1, bd).setHours(0, 0, 0, 0);
  return ta >= tb;
}

function buildTradeifySelectFundedDailyPnlMap(
  state: JournalDataV1,
  account: JournalAccount,
  cycleStartInclusive: string,
  storedTrades?: readonly StoredTrade[]
): Record<string, number> {
  const daily: Record<string, number> = {};

  for (const e of Object.values(state.pnlEntries)) {
    if (e.accountId !== account.id) continue;
    if (!isOnOrAfterCalendarDay(e.date, cycleStartInclusive)) continue;
    const dk = normalizedCalendarKey(e.date);
    daily[dk] = (daily[dk] ?? 0) + e.pnlCents;
  }

  if (storedTrades) {
    for (const t of storedTrades) {
      if (t.accountId !== account.id) continue;
      if (!isOnOrAfterCalendarDay(t.date, cycleStartInclusive)) continue;
      const dk = normalizedCalendarKey(t.date);
      if (dayHasTradesSyncedJournalPnl(state, account.id, dk)) continue;
      daily[dk] = (daily[dk] ?? 0) + t.pnlCents;
    }
  }

  return daily;
}

/** Inclusive calendar start of funded payout window (shared Select funded cycle boundary). */
export function tradeifySelectFundedPayoutCycleStartInclusive(
  state: JournalDataV1,
  account: JournalAccount
): string {
  return selectFlexFundedPayoutCycleStartInclusive(state, account);
}

/** Net P/L sum (cents) from journal + optional trades since `sinceInclusive` (deduped vs synced journal days). */
export function aggregateTradeifySelectFundedPnlCentsSince(
  state: JournalDataV1,
  account: JournalAccount,
  sinceInclusive: string,
  storedTrades?: readonly StoredTrade[]
): number {
  const daily = buildTradeifySelectFundedDailyPnlMap(state, account, sinceInclusive, storedTrades);
  let sum = 0;
  for (const v of Object.values(daily)) sum += v;
  return sum;
}

/** Largest single-calendar-day net P/L in the window (cents); −∞ if no days. */
export function aggregateTradeifySelectFundedMaxSingleDayPnlCentsSince(
  state: JournalDataV1,
  account: JournalAccount,
  sinceInclusive: string,
  storedTrades?: readonly StoredTrade[]
): number {
  const daily = buildTradeifySelectFundedDailyPnlMap(state, account, sinceInclusive, storedTrades);
  const vals = Object.values(daily);
  if (vals.length === 0) return Number.NEGATIVE_INFINITY;
  return Math.max(...vals);
}

function aggregateSelectFlexCycle(
  state: JournalDataV1,
  account: JournalAccount,
  cycleStartInclusive: string,
  minProfitPerDayCents: number,
  storedTrades?: readonly StoredTrade[]
): { winningDays: number; cycleProfitCents: number } {
  const daily = buildTradeifySelectFundedDailyPnlMap(state, account, cycleStartInclusive, storedTrades);

  let winningDays = 0;
  let cycleProfitCents = 0;
  for (const v of Object.values(daily)) {
    cycleProfitCents += v;
    if (v >= minProfitPerDayCents) winningDays += 1;
  }

  return { winningDays, cycleProfitCents };
}

export type TradeifySelectFlexPayoutState = {
  isEligible: boolean;
  eligibilityReason: string | null;
  winningDays: number;
  requiredWinningDays: number;
  /** Net P/L summed over the payout cycle (journal + optional trade imports), USD — basis for the 50% rule. */
  cycleProfit: number;
  /** Lifetime net P&L in the journal for this account (USD). */
  totalProfit: number;
  /** Select Flex has no CSV minimum — always 0. */
  payoutMin: number;
  payoutMax: number;
  availablePayout: number;
  showAddPayout: boolean;
  showGoodNews: boolean;
  cycleProfitCents: number;
  totalProfitCents: number;
  payoutMinCents: number;
  payoutMaxCents: number;
  availablePayoutCents: number;
};

export type GetTradeifySelectFlexPayoutStateParams = {
  storedTrades?: readonly StoredTrade[];
};

/**
 * Tradeify Select Flex funded: winning days from calendar since last payout; payout = min(50% × cycle P/L sum, CSV cap).
 * Same basis as Lucid Flex (ledger sum). First funded cycle uses {@link selectFlexFundedPayoutCycleStartInclusive}
 * so eval P/L is not pulled in when only `startDate` (eval) was set; trade rows are not double-counted with synced journal P/L.
 */
export function getTradeifySelectFlexPayoutState(
  state: JournalDataV1,
  account: JournalAccount,
  params: GetTradeifySelectFlexPayoutStateParams = {}
): TradeifySelectFlexPayoutState | null {
  if (!isTradeifySelectFlexFundedJournalAccount(account)) return null;
  const block = getTradeifySelectFlexFundedBlockForAccount(account);
  if (!block) return null;

  const start = selectFlexFundedPayoutCycleStartInclusive(state, account);
  const minProfitPerDayCents = Math.round(block.minProfitPerDayUsd * 100);
  const totalProfitCents = getAccountFinancialMetrics(state, account.id).totalPnlCents;

  if (!start) {
    return buildTradeifySelectFlexPayoutStateFromAgg(
      block,
      { winningDays: 0, cycleProfitCents: 0 },
      totalProfitCents
    );
  }

  const agg = aggregateSelectFlexCycle(
    state,
    account,
    start,
    minProfitPerDayCents,
    params.storedTrades
  );
  return buildTradeifySelectFlexPayoutStateFromAgg(block, agg, totalProfitCents);
}

function buildTradeifySelectFlexPayoutStateFromAgg(
  block: SelectFlexFunded,
  agg: { winningDays: number; cycleProfitCents: number },
  totalProfitCents: number
): TradeifySelectFlexPayoutState {
  const requiredWinningDays = block.minDays;
  const payoutMinCents = 0;
  const payoutMaxCents = Math.round(block.payoutMaxUsd * 100);

  const cycle = agg.cycleProfitCents;
  const half = cycle > 0 ? Math.round(cycle * 0.5) : 0;
  const availablePayoutCents = Math.min(half, payoutMaxCents);

  const daysOk = agg.winningDays >= requiredWinningDays;
  const profitOk = cycle > 0;
  const payoutOk = availablePayoutCents > 0;

  const isEligible = daysOk && profitOk && payoutOk;
  const showAddPayout = isEligible;
  const showGoodNews = isEligible;

  const reasons: string[] = [];
  if (!daysOk) {
    const need = Math.max(0, requiredWinningDays - agg.winningDays);
    reasons.push(
      need === 1
        ? `1 more winning day required (net ≥ ${formatUsdWholeGrouped(block.minProfitPerDayUsd)} / day)`
        : `${need} more winning days required (net ≥ ${formatUsdWholeGrouped(block.minProfitPerDayUsd)} / day)`
    );
  }
  if (!profitOk) {
    reasons.push("Cycle net profit must be positive since last payout");
  }
  if (profitOk && !payoutOk) {
    reasons.push("Available payout this cycle is $0");
  }

  return {
    isEligible,
    eligibilityReason: isEligible ? null : reasons.join(" · ") || "Not eligible",
    winningDays: agg.winningDays,
    requiredWinningDays,
    cycleProfit: cycle / 100,
    totalProfit: totalProfitCents / 100,
    payoutMin: 0,
    payoutMax: block.payoutMaxUsd,
    availablePayout: availablePayoutCents / 100,
    showAddPayout,
    showGoodNews,
    cycleProfitCents: cycle,
    totalProfitCents,
    payoutMinCents,
    payoutMaxCents,
    availablePayoutCents,
  };
}
