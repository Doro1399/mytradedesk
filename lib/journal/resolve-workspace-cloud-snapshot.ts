import type { SupabaseClient } from "@supabase/supabase-js";
import { isWorkspaceEmpty, workspaceDataMass } from "@/lib/journal/workspace-backup-payload";
import { parseWorkspaceBackupJson } from "@/lib/journal/workspace-backup";
import type { JournalDataV1 } from "@/lib/journal/types";
import {
  parseWorkspaceSnapshotServerWatermarkMs,
  readWorkspaceSnapshotServerWatermark,
} from "@/lib/journal/workspace-snapshot-server-watermark";
import { fetchWorkspaceSnapshotRow, waitForSupabaseAccessToken } from "@/lib/journal/workspace-snapshots-supabase";
import { loadJournalData } from "@/lib/journal/storage";
import { loadTradesStore, type TradesStoreV1 } from "@/lib/journal/trades-storage";

export type ResolvedWorkspaceFromCloud = {
  journal: JournalDataV1;
  trades: TradesStoreV1;
  mergedFromServer: boolean;
  /** Persist after apply: epoch ms string, or null. */
  watermarkIso: string | null;
};

function serverRevisionMs(updatedAt: string, payloadUnknown: unknown): number {
  const fromRow = Date.parse(updatedAt) || 0;
  let fromExport = 0;
  if (typeof payloadUnknown === "object" && payloadUnknown !== null) {
    const ex = (payloadUnknown as { exportedAt?: unknown }).exportedAt;
    if (typeof ex === "string") fromExport = Date.parse(ex) || 0;
  }
  return Math.max(fromRow, fromExport);
}

/**
 * Read local once, then (after session is ready) fetch cloud and decide merged journal + trades.
 * No writes — caller persists and dispatches.
 */
export async function resolveWorkspaceFromCloudSnapshot(
  supabase: SupabaseClient,
  userId: string
): Promise<ResolvedWorkspaceFromCloud> {
  const localJournalAtStart = loadJournalData(userId);
  const localTradesAtStart = loadTradesStore(userId);
  const localEmpty = isWorkspaceEmpty(localJournalAtStart, localTradesAtStart);

  await waitForSupabaseAccessToken(supabase);
  const row = await fetchWorkspaceSnapshotRow(supabase);

  if (!row) {
    if (process.env.NODE_ENV === "development") {
      console.info(
        "[resolveWorkspaceFromCloudSnapshot] no cloud row — check Supabase migration `workspace_snapshots`, RLS, and NEXT_PUBLIC_SUPABASE_* on this origin."
      );
    }
    return {
      journal: localJournalAtStart,
      trades: localTradesAtStart,
      mergedFromServer: false,
      watermarkIso: null,
    };
  }

  const parsed = parseWorkspaceBackupJson(row.payload);
  if (!parsed.ok) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[resolveWorkspaceFromCloudSnapshot] payload parse failed:", parsed.error);
    }
    return {
      journal: localJournalAtStart,
      trades: localTradesAtStart,
      mergedFromServer: false,
      watermarkIso: null,
    };
  }

  const serverEmpty = isWorkspaceEmpty(parsed.journal, parsed.tradesStore);
  if (serverEmpty) {
    return {
      journal: localJournalAtStart,
      trades: localTradesAtStart,
      mergedFromServer: false,
      watermarkIso: null,
    };
  }

  const serverRev = serverRevisionMs(row.updated_at, row.payload);
  if (!Number.isFinite(serverRev) || serverRev <= 0) {
    return {
      journal: localJournalAtStart,
      trades: localTradesAtStart,
      mergedFromServer: false,
      watermarkIso: null,
    };
  }

  const watermarkRaw = readWorkspaceSnapshotServerWatermark(userId);
  const hasWatermark = watermarkRaw != null;
  const watermarkMs = parseWorkspaceSnapshotServerWatermarkMs(userId);

  const bootstrapLocalTs = Math.max(
    Date.parse(localJournalAtStart.lastSavedAt) || 0,
    Date.parse(localTradesAtStart.lastImportAt ?? "") || 0
  );

  let shouldMerge = false;
  if (localEmpty) {
    shouldMerge = true;
  } else if (hasWatermark) {
    shouldMerge = serverRev > watermarkMs;
  } else {
    shouldMerge = serverRev > bootstrapLocalTs;
  }

  if (!shouldMerge) {
    return {
      journal: localJournalAtStart,
      trades: localTradesAtStart,
      mergedFromServer: false,
      watermarkIso: hasWatermark ? null : String(serverRev),
    };
  }

  const localMass = workspaceDataMass(localJournalAtStart, localTradesAtStart);
  const serverMass = workspaceDataMass(parsed.journal, parsed.tradesStore);
  if (!localEmpty && localMass > serverMass) {
    if (process.env.NODE_ENV === "development") {
      console.warn(
        "[resolveWorkspaceFromCloudSnapshot] refusing cloud merge: local workspace is richer than server snapshot (data-loss guard).",
        { localMass, serverMass }
      );
    }
    return {
      journal: localJournalAtStart,
      trades: localTradesAtStart,
      mergedFromServer: false,
      watermarkIso: String(serverRev),
    };
  }

  return {
    journal: parsed.journal,
    trades: parsed.tradesStore,
    mergedFromServer: true,
    watermarkIso: String(serverRev),
  };
}
