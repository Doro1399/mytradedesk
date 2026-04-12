import { nowIso } from "@/lib/journal/reducer";
import type { StoredTrade, TradesStoreV1 } from "@/lib/journal/trades-storage";
import type { ISODate, JournalDataV1, JournalId, JournalPnlEntry } from "@/lib/journal/types";

/** Current journal P&L rows owned by the Trades table sync (Calendar + Accounts). */
export const TRADES_PNL_NOTE = "Synced from Trades";

/** Older rows from the same pipeline — still removed/updated when trades change. */
const LEGACY_TRADES_SYNC_NOTES = new Set<string>([
  "Synchronisé depuis Trades",
  "Import CSV — PnL agrégé par jour",
]);

export function isPnlEntrySyncedFromTradesTable(e: JournalPnlEntry): boolean {
  const n = e.note ?? "";
  if (n === TRADES_PNL_NOTE) return true;
  return LEGACY_TRADES_SYNC_NOTES.has(n);
}

function newPnlId(): JournalId {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `pnl-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function aggregateTradesByAccountDate(
  trades: StoredTrade[]
): Map<string, { accountId: JournalId; date: ISODate; cents: number }> {
  const m = new Map<string, { accountId: JournalId; date: ISODate; cents: number }>();
  for (const tr of trades) {
    const k = `${tr.accountId}::${tr.date}`;
    const cur = m.get(k);
    if (cur) cur.cents += tr.pnlCents;
    else m.set(k, { accountId: tr.accountId, date: tr.date, cents: tr.pnlCents });
  }
  return m;
}

/**
 * Reconcile `pnlEntries` with stored trades: one row per account per calendar day.
 * - Targets only rows {@link isPnlEntrySyncedFromTradesTable} (current + legacy notes).
 * - Removes duplicate rows per account/day (keeps oldest `createdAt`, deletes extras).
 * - Deletes trade-sync rows for days that no longer have trades.
 * Manual / other journal P&L is left unchanged.
 */
export function syncJournalPnlFromStoredTrades(
  state: JournalDataV1,
  store: TradesStoreV1
): { deleteIds: JournalId[]; upserts: JournalPnlEntry[] } {
  const trades = store.trades;
  const target = aggregateTradesByAccountDate(trades);
  const overlay = store.csvModalDailyByAccount ?? {};
  for (const [accountId, daily] of Object.entries(overlay)) {
    for (const [date, cents] of Object.entries(daily)) {
      if (typeof cents !== "number" || !Number.isFinite(cents)) continue;
      const hasTradeHere = trades.some((t) => t.accountId === accountId && t.date === date);
      if (!hasTradeHere) continue;
      const k = `${accountId}::${date}`;
      target.set(k, { accountId, date: date as ISODate, cents });
    }
  }
  const t = nowIso();
  const deleteIds: JournalId[] = [];
  const upserts: JournalPnlEntry[] = [];

  const groups = new Map<string, JournalPnlEntry[]>();
  for (const e of Object.values(state.pnlEntries)) {
    if (!isPnlEntrySyncedFromTradesTable(e)) continue;
    const k = `${e.accountId}::${e.date}`;
    const arr = groups.get(k) ?? [];
    arr.push(e);
    groups.set(k, arr);
  }
  for (const arr of groups.values()) {
    arr.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  for (const [k, v] of target) {
    const arr = groups.get(k);
    if (!arr || arr.length === 0) {
      upserts.push({
        id: newPnlId(),
        accountId: v.accountId,
        date: v.date,
        pnlCents: v.cents,
        source: "import",
        note: TRADES_PNL_NOTE,
        createdAt: t,
        updatedAt: t,
      });
      continue;
    }
    const keep = arr[0]!;
    for (const extra of arr.slice(1)) {
      deleteIds.push(extra.id);
    }
    if (keep.pnlCents !== v.cents || keep.note !== TRADES_PNL_NOTE) {
      upserts.push({ ...keep, pnlCents: v.cents, note: TRADES_PNL_NOTE, updatedAt: t });
    }
  }

  for (const [k, arr] of groups) {
    if (target.has(k)) continue;
    for (const e of arr) {
      deleteIds.push(e.id);
    }
  }

  return { deleteIds, upserts };
}
