import { loadJournalData } from "@/lib/journal/storage";
import { loadTradesStore, type TradesStoreV1 } from "@/lib/journal/trades-storage";
import type { JournalDataV1 } from "@/lib/journal/types";

/** True when there is nothing meaningful to keep (fresh browser / cleared local). */
export function isWorkspaceEmpty(journal: JournalDataV1, trades: TradesStoreV1): boolean {
  return (
    Object.keys(journal.accounts).length === 0 &&
    Object.keys(journal.pnlEntries).length === 0 &&
    Object.keys(journal.feeEntries).length === 0 &&
    Object.keys(journal.payoutEntries).length === 0 &&
    trades.trades.length === 0
  );
}

/**
 * Monotonic “amount of workspace data” for comparing two snapshots without deep diff.
 * Used to refuse merges / pushes that would overwrite a **richer** side with a **poorer** one (data-loss guard).
 * Accounts are weighted heavily vs. individual ledger rows / trades.
 */
export function workspaceDataMass(journal: JournalDataV1, trades: TradesStoreV1): number {
  return (
    Object.keys(journal.accounts).length * 10_000 +
    Object.keys(journal.pnlEntries).length * 3 +
    Object.keys(journal.feeEntries).length * 2 +
    Object.keys(journal.payoutEntries).length * 2 +
    trades.trades.length
  );
}

/** Same shape as Settings → Export backup (importable via `parseWorkspaceBackupJson`). */
export type WorkspaceBackupPayloadV1 = {
  format: "mytradedesk-workspace-backup";
  version: 1;
  exportedAt: string;
  userId: string;
  journal: JournalDataV1;
  tradesStore: TradesStoreV1;
};

/** Reads current journal + trades from localStorage (same as manual export). */
export function buildWorkspaceBackupPayload(userId: string): WorkspaceBackupPayloadV1 {
  return {
    format: "mytradedesk-workspace-backup",
    version: 1,
    exportedAt: new Date().toISOString(),
    userId,
    journal: loadJournalData(userId),
    tradesStore: loadTradesStore(userId),
  };
}

/** Uses in-memory journal + trades (e.g. right after a trade save, before journal debounce flush). */
export function buildWorkspaceBackupPayloadLive(
  userId: string,
  journal: JournalDataV1,
  tradesStore: TradesStoreV1
): WorkspaceBackupPayloadV1 {
  return {
    format: "mytradedesk-workspace-backup",
    version: 1,
    exportedAt: new Date().toISOString(),
    userId,
    journal,
    tradesStore,
  };
}

/** Cheap fingerprint to detect meaningful workspace changes (debounced cloud snapshot). */
export function workspaceChangeFingerprint(journal: JournalDataV1, trades: TradesStoreV1): string {
  const pnlSum = Object.values(journal.pnlEntries).reduce((s, e) => s + e.pnlCents, 0);
  const tradeSum = trades.trades.reduce((s, t) => s + t.pnlCents, 0);
  return [
    journal.lastSavedAt,
    Object.keys(journal.accounts).length,
    Object.keys(journal.pnlEntries).length,
    Object.keys(journal.feeEntries).length,
    Object.keys(journal.payoutEntries).length,
    trades.trades.length,
    tradeSum,
    pnlSum,
    trades.lastImportAt ?? "",
  ].join("|");
}
