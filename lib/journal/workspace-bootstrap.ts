import type { SupabaseClient } from "@supabase/supabase-js";
import { createEmptyJournalData } from "@/lib/journal/reducer";
import { parseWorkspaceBackupJson } from "@/lib/journal/workspace-backup";
import { isWorkspaceEmpty, type WorkspaceBackupPayloadV1 } from "@/lib/journal/workspace-backup-payload";
import type { JournalDataV1 } from "@/lib/journal/types";
import {
  clearJournalBusinessLocalStorageKeys,
  parseJournalFromStorageRaw,
  peekJournalLocalStorageRaw,
  saveJournalData,
} from "@/lib/journal/storage";
import {
  clearTradesBusinessLocalStorageKeys,
  emptyTradesStore,
  parseTradesFromStorageRaw,
  peekTradesLocalStorageRaw,
  saveTradesStore,
  type TradesStoreV1,
} from "@/lib/journal/trades-storage";
import { fetchWorkspaceSnapshotRow, upsertWorkspaceSnapshot, waitForSupabaseAccessToken } from "@/lib/journal/workspace-snapshots-supabase";
import { workspaceSyncLogLoaded } from "@/lib/journal/workspace-sync-telemetry";

function buildPayload(userId: string, journal: JournalDataV1, trades: TradesStoreV1): WorkspaceBackupPayloadV1 {
  return {
    format: "mytradedesk-workspace-backup",
    version: 1,
    exportedAt: new Date().toISOString(),
    userId,
    journal,
    tradesStore: trades,
  };
}

export type DeskWorkspaceBootstrapResult = {
  journal: JournalDataV1;
  trades: TradesStoreV1;
  watermarkIso: string | null;
  /** Où les données affichées proviennent pour ce bootstrap. */
  source: "supabase" | "migrated_localStorage" | "empty";
};

/**
 * Charge le desk depuis `workspace_snapshots` uniquement, avec migration one-shot
 * si le snapshot est vide mais que d’anciennes données métier existent encore dans localStorage.
 */
export async function bootstrapDeskWorkspaceFromSupabase(
  supabase: SupabaseClient,
  userId: string
): Promise<DeskWorkspaceBootstrapResult> {
  await waitForSupabaseAccessToken(supabase);

  const row = await fetchWorkspaceSnapshotRow(supabase);
  let serverJournal: JournalDataV1 | null = null;
  let serverTrades: TradesStoreV1 | null = null;
  let watermarkIso: string | null = null;

  if (row) {
    const parsed = parseWorkspaceBackupJson(row.payload);
    if (parsed.ok && !isWorkspaceEmpty(parsed.journal, parsed.tradesStore)) {
      serverJournal = parsed.journal;
      serverTrades = parsed.tradesStore;
      watermarkIso = String(Date.parse(row.updated_at) || 0);
    }
  }

  const rawJ = peekJournalLocalStorageRaw(userId);
  const rawT = peekTradesLocalStorageRaw(userId);
  const legacyJournal = rawJ ? parseJournalFromStorageRaw(rawJ) : null;
  const legacyTrades = rawT ? parseTradesFromStorageRaw(rawT) : null;
  const mergedLegacyJournal = legacyJournal ?? createEmptyJournalData();
  const mergedLegacyTrades = legacyTrades ?? emptyTradesStore();
  const hadRawLocal = rawJ != null || rawT != null;
  const legacyMeaningful = hadRawLocal && !isWorkspaceEmpty(mergedLegacyJournal, mergedLegacyTrades);

  if (serverJournal && serverTrades) {
    saveJournalData(serverJournal, userId);
    saveTradesStore(serverTrades, userId);
    clearJournalBusinessLocalStorageKeys(userId);
    clearTradesBusinessLocalStorageKeys(userId);
    workspaceSyncLogLoaded("supabase", { userId, accounts: Object.keys(serverJournal.accounts).length });
    return { journal: serverJournal, trades: serverTrades, watermarkIso, source: "supabase" };
  }

  if (legacyMeaningful) {
    const payload = buildPayload(userId, mergedLegacyJournal, mergedLegacyTrades);
    const updatedAt = await upsertWorkspaceSnapshot(supabase, userId, payload);
    const rev = updatedAt ? String(Date.parse(updatedAt) || 0) : null;
    saveJournalData(mergedLegacyJournal, userId);
    saveTradesStore(mergedLegacyTrades, userId);
    clearJournalBusinessLocalStorageKeys(userId);
    clearTradesBusinessLocalStorageKeys(userId);
    workspaceSyncLogLoaded("merged", { userId, migratedFrom: "localStorage", reason: "empty_supabase_snapshot" });
    return {
      journal: mergedLegacyJournal,
      trades: mergedLegacyTrades,
      watermarkIso: rev,
      source: "migrated_localStorage",
    };
  }

  const emptyJ = createEmptyJournalData();
  const emptyT = emptyTradesStore();
  saveJournalData(emptyJ, userId);
  saveTradesStore(emptyT, userId);
  clearJournalBusinessLocalStorageKeys(userId);
  clearTradesBusinessLocalStorageKeys(userId);
  return { journal: emptyJ, trades: emptyT, watermarkIso: null, source: "empty" };
}
