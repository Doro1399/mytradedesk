import type { SupabaseClient } from "@supabase/supabase-js";
import {
  coalesceLocalWorkspacePair,
  isWorkspaceEmpty,
  workspaceDataMass,
  workspaceSemanticFingerprint,
} from "@/lib/journal/workspace-backup-payload";
import { parseWorkspaceBackupJson } from "@/lib/journal/workspace-backup";
import type { JournalDataV1 } from "@/lib/journal/types";
import {
  parseWorkspaceSnapshotServerWatermarkMs,
  readWorkspaceSnapshotServerWatermark,
} from "@/lib/journal/workspace-snapshot-server-watermark";
import { fetchWorkspaceSnapshotRow, waitForSupabaseAccessToken } from "@/lib/journal/workspace-snapshots-supabase";
import { loadJournalData } from "@/lib/journal/storage";
import { loadTradesStore, type TradesStoreV1 } from "@/lib/journal/trades-storage";
import {
  workspaceSyncLogLocalOverwritePrevented,
  workspaceSyncLogLoaded,
} from "@/lib/journal/workspace-sync-telemetry";

export type ResolvedWorkspaceFromCloud = {
  journal: JournalDataV1;
  trades: TradesStoreV1;
  mergedFromServer: boolean;
  /** Persist after apply: epoch ms string, or null. */
  watermarkIso: string | null;
};

/** Hints optionnels : état React / mémoire à fusionner avec le disque avant toute comparaison au snapshot serveur. */
export type ResolveWorkspaceFromCloudOptions = {
  localJournalHint?: JournalDataV1;
  localTradesHint?: TradesStoreV1;
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
 * Read in-memory workspace, then (after session is ready) fetch cloud and decide merged journal + trades.
 * No writes — caller persists and dispatches.
 */
export async function resolveWorkspaceFromCloudSnapshot(
  supabase: SupabaseClient,
  userId: string,
  options?: ResolveWorkspaceFromCloudOptions
): Promise<ResolvedWorkspaceFromCloud> {
  const diskJournal = loadJournalData(userId);
  const diskTrades = loadTradesStore(userId);
  const { journal: localJournalAtStart, trades: localTradesAtStart } = coalesceLocalWorkspacePair(
    diskJournal,
    diskTrades,
    options?.localJournalHint,
    options?.localTradesHint
  );
  const localEmpty = isWorkspaceEmpty(localJournalAtStart, localTradesAtStart);

  await waitForSupabaseAccessToken(supabase);
  const row = await fetchWorkspaceSnapshotRow(supabase);

  if (!row) {
    workspaceSyncLogLoaded("client_memory", { reason: "no_supabase_row", userId });
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

  const localMass = workspaceDataMass(localJournalAtStart, localTradesAtStart);
  const serverMass = workspaceDataMass(parsed.journal, parsed.tradesStore);

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

  const localSemanticFp = workspaceSemanticFingerprint(localJournalAtStart, localTradesAtStart);
  const serverSemanticFp = workspaceSemanticFingerprint(parsed.journal, parsed.tradesStore);

  let shouldMerge = false;
  if (localEmpty) {
    shouldMerge = true;
  } else if (serverMass > localMass) {
    // Multi-device : le cloud peut avoir plus de lignes. Si le snapshot serveur est **plus vieux**
    // que la dernière activité locale (comptes / journal récents), ne pas écraser — évite un
    // « gros » backup obsolète qui repasse par-dessus un workspace actif.
    const serverStaleVersusLocalActivity =
      !localEmpty &&
      serverRev > 0 &&
      bootstrapLocalTs > 0 &&
      serverRev < bootstrapLocalTs - 1_000;
    if (serverStaleVersusLocalActivity) {
      workspaceSyncLogLocalOverwritePrevented("server_snapshot_older_than_local_activity", {
        userId,
        serverRev,
        bootstrapLocalTs,
        localMass,
        serverMass,
      });
      if (process.env.NODE_ENV === "development") {
        console.warn(
          "[resolveWorkspaceFromCloudSnapshot] skip merge: server has higher mass but snapshot is older than recent local activity.",
          { serverRev, bootstrapLocalTs, localMass, serverMass }
        );
      }
      shouldMerge = false;
    } else {
      shouldMerge = true;
    }
  } else if (serverMass >= localMass && localSemanticFp !== serverSemanticFp) {
    // Same row counts but different PnL/trade totals — e.g. desk edited amounts; mass alone does
    // not change. Timestamps excluded so mobile `lastSavedAt` does not block this path.
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

  if (!localEmpty && localMass > serverMass) {
    workspaceSyncLogLocalOverwritePrevented("local_richer_than_server_snapshot", { userId, localMass, serverMass });
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

  workspaceSyncLogLoaded("merged", {
    userId,
    serverRev,
    mergedFromServer: true,
    accounts: Object.keys(parsed.journal.accounts).length,
    trades: parsed.tradesStore.trades.length,
  });
  return {
    journal: parsed.journal,
    trades: parsed.tradesStore,
    mergedFromServer: true,
    watermarkIso: String(serverRev),
  };
}
