import { fundedProgressPnlBaselineDate } from "@/lib/journal/funded-phase-pnl";
import { topStepFundedPayoutCycleStartInclusive } from "@/lib/journal/topstep-funded-payout-cycle";
import type { JournalAccount, JournalDataV1 } from "@/lib/journal/types";
import type { StoredTrade } from "@/lib/journal/trades-storage";
import { isPnlEntrySyncedFromTradesTable } from "@/lib/journal/trades-journal-sync";

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
 * Inclusive calendar start of the payout window (Select Flex / Select Daily funded cycle).
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
