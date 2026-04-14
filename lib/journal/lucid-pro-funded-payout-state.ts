import { normalizedCalendarKey } from "@/lib/journal/apex-funded-payout-cycle";
import type { ISODate, JournalDataV1, JournalId } from "@/lib/journal/types";
import type { StoredTrade } from "@/lib/journal/trades-storage";
import { isPnlEntrySyncedFromTradesTable } from "@/lib/journal/trades-journal-sync";

export function countLucidProNonRejectedPayouts(
  state: JournalDataV1,
  accountId: JournalId
): number {
  let n = 0;
  for (const p of Object.values(state.payoutEntries)) {
    if (p.accountId !== accountId) continue;
    if (p.status === "rejected") continue;
    n += 1;
  }
  return n;
}

function pnlEventInFundedCycleWindow(
  isoDate: string,
  eventTimeIso: string,
  lastPayAt: string | null,
  fundedBaseline: ISODate | undefined
): boolean {
  if (lastPayAt != null) {
    if (eventTimeIso <= lastPayAt) return false;
  } else if (fundedBaseline) {
    if (normalizedCalendarKey(isoDate) < normalizedCalendarKey(fundedBaseline)) return false;
  }
  return true;
}

/**
 * P&L du cycle courant par jour calendaire (journal + trades optionnels).
 * Partagé par Lucid Direct (fenêtre après dernier payout non rejeté).
 */
export function lucidProFundedCycleTotals(
  state: JournalDataV1,
  accountId: string,
  lastPayAt: string | null,
  fundedBaseline: ISODate | undefined,
  trades?: readonly StoredTrade[]
): { totalCents: number; bestDayCents: number } {
  const byDay = new Map<string, number>();

  const tradeSyncDayKeys = new Set<string>();
  for (const e of Object.values(state.pnlEntries)) {
    if (e.accountId !== accountId) continue;
    if (!pnlEventInFundedCycleWindow(e.date, e.createdAt, lastPayAt, fundedBaseline)) continue;
    if (isPnlEntrySyncedFromTradesTable(e)) {
      tradeSyncDayKeys.add(`${accountId}::${normalizedCalendarKey(e.date)}`);
    }
  }

  const include = (isoDate: string, eventTimeIso: string, pnlCents: number) => {
    if (!pnlEventInFundedCycleWindow(isoDate, eventTimeIso, lastPayAt, fundedBaseline)) return;
    const dk = normalizedCalendarKey(isoDate);
    byDay.set(dk, (byDay.get(dk) ?? 0) + pnlCents);
  };

  for (const e of Object.values(state.pnlEntries)) {
    if (e.accountId !== accountId) continue;
    include(e.date, e.createdAt, e.pnlCents);
  }
  if (trades) {
    for (const t of trades) {
      if (t.accountId !== accountId) continue;
      if (tradeSyncDayKeys.has(`${accountId}::${normalizedCalendarKey(t.date)}`)) continue;
      include(t.date, t.importedAt, t.pnlCents);
    }
  }

  let totalCents = 0;
  let bestDayCents = 0;
  for (const v of byDay.values()) {
    totalCents += v;
    if (v > bestDayCents) bestDayCents = v;
  }
  return { totalCents, bestDayCents };
}
