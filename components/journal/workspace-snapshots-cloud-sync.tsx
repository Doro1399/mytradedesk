"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch } from "react";
import { useSupabase } from "@/components/auth/supabase-provider";
import { useJournal } from "@/components/journal/journal-provider";
import { useJournalStorageUserId } from "@/components/journal/journal-storage-context";
import { parseWorkspaceBackupJson } from "@/lib/journal/workspace-backup";
import {
  buildWorkspaceBackupPayloadLive,
  isWorkspaceEmpty,
  workspaceChangeFingerprint,
  workspaceDataMass,
} from "@/lib/journal/workspace-backup-payload";
import type { JournalAction } from "@/lib/journal/reducer";
import type { JournalDataV1 } from "@/lib/journal/types";
import { loadJournalData, saveJournalData } from "@/lib/journal/storage";
import {
  parseWorkspaceSnapshotServerWatermarkMs,
  writeWorkspaceSnapshotServerWatermark,
} from "@/lib/journal/workspace-snapshot-server-watermark";
import { workspaceSnapshotRevisionMs } from "@/lib/journal/workspace-snapshot-revision";
import { upsertDailyWorkspaceBackup } from "@/lib/journal/workspace-snapshot-daily-backups";
import {
  fetchWorkspaceSnapshotRow,
  upsertWorkspaceSnapshot,
  waitForSupabaseAccessToken,
} from "@/lib/journal/workspace-snapshots-supabase";
import {
  loadTradesStore,
  saveTradesStore,
  TRADES_STORE_CHANGED_EVENT,
} from "@/lib/journal/trades-storage";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { TradesStoreV1 } from "@/lib/journal/trades-storage";

/**
 * Block push only when the server snapshot looks **strictly richer** and **newer** than this
 * client state. Comparing mass alone breaks deletes: after removing an account, local mass drops
 * but the server row is still the pre-delete JSON — we must still be allowed to push.
 */
async function serverSnapshotRicherThanLocal(
  supabase: SupabaseClient,
  localJournal: JournalDataV1,
  localTrades: TradesStoreV1
): Promise<boolean> {
  try {
    const row = await fetchWorkspaceSnapshotRow(supabase);
    if (!row) return false;
    const parsed = parseWorkspaceBackupJson(row.payload);
    if (!parsed.ok) return false;
    if (isWorkspaceEmpty(parsed.journal, parsed.tradesStore)) return false;

    const serverMass = workspaceDataMass(parsed.journal, parsed.tradesStore);
    const localMass = workspaceDataMass(localJournal, localTrades);
    if (serverMass <= localMass) return false;

    const localTs = Date.parse(localJournal.lastSavedAt) || 0;
    const serverJournalTs = Date.parse(parsed.journal.lastSavedAt) || 0;
    const serverRowTs = Date.parse(row.updated_at) || 0;
    const rawPayload = row.payload as { exportedAt?: unknown };
    const exportedTs =
      typeof rawPayload.exportedAt === "string" ? Date.parse(rawPayload.exportedAt) || 0 : 0;
    const serverContentTs = Math.max(serverJournalTs, serverRowTs, exportedTs);

    if (localTs > serverContentTs - 2_000) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/** Court délai pour regrouper les frappes rapides ; le push part aussi sur blur / pagehide. */
const SNAPSHOT_DEBOUNCE_MS = 350;

/** Après retour sur l’onglet : attendre un peu puis lire Supabase si la ligne a bougé. */
const VISIBILITY_PULL_DEBOUNCE_MS = 150;

/** Après login / session init : laisser le bootstrap journal finir avant le pull. */
const AUTH_PULL_DEBOUNCE_MS = 400;

/**
 * Modèle : Supabase = source de vérité. On **pull** uniquement si `workspace_snapshots` est plus récent
 * que le dernier filigrane intégré (même horloge que le push), sinon on garde l’état local déjà poussé.
 */
async function pullSnapshotIfServerRevisionNewer(
  supabase: SupabaseClient,
  userId: string,
  dispatch: Dispatch<JournalAction>,
  onMergedTrades: () => void
): Promise<{ didPull: boolean; mergedFingerprint: string | null }> {
  const tokenOk = await waitForSupabaseAccessToken(supabase);
  if (!tokenOk) return { didPull: false, mergedFingerprint: null };

  const row = await fetchWorkspaceSnapshotRow(supabase);
  if (!row) return { didPull: false, mergedFingerprint: null };

  const parsed = parseWorkspaceBackupJson(row.payload);
  if (!parsed.ok) return { didPull: false, mergedFingerprint: null };
  if (isWorkspaceEmpty(parsed.journal, parsed.tradesStore)) {
    return { didPull: false, mergedFingerprint: null };
  }

  const serverRev = workspaceSnapshotRevisionMs(row.updated_at, row.payload);
  if (!Number.isFinite(serverRev) || serverRev <= 0) {
    return { didPull: false, mergedFingerprint: null };
  }

  const watermarkMs = parseWorkspaceSnapshotServerWatermarkMs(userId);
  if (serverRev <= watermarkMs) {
    return { didPull: false, mergedFingerprint: null };
  }

  dispatch({ type: "journal/hydrate", payload: parsed.journal });
  saveJournalData(parsed.journal, userId);
  saveTradesStore(parsed.tradesStore, userId);
  onMergedTrades();
  writeWorkspaceSnapshotServerWatermark(userId, String(serverRev));
  const mergedFingerprint = workspaceChangeFingerprint(parsed.journal, parsed.tradesStore);
  return { didPull: true, mergedFingerprint };
}

/**
 * Push debouncé vers Supabase après chaque changement workspace ; pull « strict » quand le serveur
 * a une révision plus récente que le filigrane (retour d’onglet, session auth). Le premier chargement
 * reste `bootstrapDeskWorkspaceFromSupabase` dans JournalProvider.
 */
export function WorkspaceSnapshotsCloudSync() {
  const supabase = useSupabase();
  const { state, hydrated, dispatch } = useJournal();
  const userId = useJournalStorageUserId();
  const [tradesBump, setTradesBump] = useState(0);
  const lastPushedFingerprint = useRef<string | null>(null);
  const pushBaselineSeededRef = useRef(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const visibilityTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dispatchRef = useRef(dispatch);
  dispatchRef.current = dispatch;
  const hydratedRef = useRef(hydrated);
  hydratedRef.current = hydrated;
  const stateRef = useRef(state);
  stateRef.current = state;
  const prevAccountCountRef = useRef<number | null>(null);

  const pushSnapshotNow = useCallback(async () => {
    if (!hydratedRef.current || !userId) return;
    const s = stateRef.current;
    const t = loadTradesStore(userId);
    const fp = workspaceChangeFingerprint(s, t);
    if (!fp) return;

    const emptyWorkspace =
      Object.keys(s.accounts).length === 0 &&
      Object.keys(s.pnlEntries).length === 0 &&
      Object.keys(s.feeEntries).length === 0 &&
      Object.keys(s.payoutEntries).length === 0 &&
      t.trades.length === 0;
    if (emptyWorkspace) return;

    if (fp === lastPushedFingerprint.current) return;

    if (await serverSnapshotRicherThanLocal(supabase, s, t)) {
      console.warn(
        "[WorkspaceSnapshotsCloudSync] skip push: server snapshot is richer than local (data-loss guard)."
      );
      return;
    }

    const payload = buildWorkspaceBackupPayloadLive(userId, s, t);
    try {
      const updatedAt = await upsertWorkspaceSnapshot(supabase, userId, payload);
      const pushRev = workspaceSnapshotRevisionMs(updatedAt ?? "", payload);
      if (pushRev > 0) {
        writeWorkspaceSnapshotServerWatermark(userId, String(pushRev));
      }
      lastPushedFingerprint.current = fp;
      void upsertDailyWorkspaceBackup(supabase, userId, payload).catch((err) => {
        console.error("[WorkspaceSnapshotsCloudSync] daily backup failed", err);
      });
    } catch (e) {
      console.error("[WorkspaceSnapshotsCloudSync] immediate snapshot failed", e);
    }
  }, [userId, supabase]);

  useEffect(() => {
    const onTrades = () => setTradesBump((n) => n + 1);
    window.addEventListener(TRADES_STORE_CHANGED_EVENT, onTrades);
    return () => window.removeEventListener(TRADES_STORE_CHANGED_EVENT, onTrades);
  }, []);

  /** Ajout / suppression de compte : push immédiat (structure du workspace). */
  useEffect(() => {
    if (!userId) {
      prevAccountCountRef.current = null;
      return;
    }
    if (!hydrated) return;
    const n = Object.keys(state.accounts).length;
    const prev = prevAccountCountRef.current;
    prevAccountCountRef.current = n;
    if (prev == null || n === prev) return;
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
      debounceTimer.current = null;
    }
    void pushSnapshotNow();
  }, [hydrated, userId, state.accounts, pushSnapshotNow]);

  useEffect(() => {
    if (!hydrated || !userId || pushBaselineSeededRef.current) return;
    pushBaselineSeededRef.current = true;
    try {
      const j = loadJournalData(userId);
      const t = loadTradesStore(userId);
      lastPushedFingerprint.current = workspaceChangeFingerprint(j, t);
    } catch {
      /* ignore */
    }
  }, [hydrated, userId]);

  useEffect(() => {
    if (!hydrated || !userId) return;

    const runSoftPull = () => {
      if (document.visibilityState !== "visible") return;
      if (visibilityTimer.current) clearTimeout(visibilityTimer.current);
      visibilityTimer.current = setTimeout(() => {
        visibilityTimer.current = null;
        void (async () => {
          try {
            const { didPull, mergedFingerprint } = await pullSnapshotIfServerRevisionNewer(
              supabase,
              userId,
              dispatchRef.current,
              () => setTradesBump((n) => n + 1)
            );
            if (didPull && mergedFingerprint) {
              lastPushedFingerprint.current = mergedFingerprint;
            }
          } catch (e) {
            console.error("[WorkspaceSnapshotsCloudSync] visibility cloud pull failed", e);
          }
        })();
      }, VISIBILITY_PULL_DEBOUNCE_MS);
    };

    const onVisibility = () => runSoftPull();
    const onPageShow = (ev: PageTransitionEvent) => {
      if (ev.persisted) runSoftPull();
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pageshow", onPageShow);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pageshow", onPageShow);
      if (visibilityTimer.current) clearTimeout(visibilityTimer.current);
    };
  }, [hydrated, userId, supabase]);

  /** Re-pull from Supabase on each browser session (INITIAL_SESSION) and explicit login (SIGNED_IN). */
  useEffect(() => {
    if (!userId) return;

    let authPullTimer: ReturnType<typeof setTimeout> | null = null;

    const scheduleAuthPull = () => {
      if (authPullTimer) clearTimeout(authPullTimer);
      authPullTimer = setTimeout(() => {
        authPullTimer = null;
        if (!hydratedRef.current) return;
        void (async () => {
          try {
            const { didPull, mergedFingerprint } = await pullSnapshotIfServerRevisionNewer(
              supabase,
              userId,
              dispatchRef.current,
              () => setTradesBump((n) => n + 1)
            );
            if (didPull && mergedFingerprint) {
              lastPushedFingerprint.current = mergedFingerprint;
            }
          } catch (e) {
            console.error("[WorkspaceSnapshotsCloudSync] auth session cloud pull failed", e);
          }
        })();
      }, AUTH_PULL_DEBOUNCE_MS);
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session?.user || session.user.id !== userId) return;
      if (event !== "SIGNED_IN" && event !== "INITIAL_SESSION") return;
      scheduleAuthPull();
    });

    return () => {
      subscription.unsubscribe();
      if (authPullTimer) clearTimeout(authPullTimer);
    };
  }, [supabase, userId]);

  /**
   * Push before backgrounding / closing so other devices see data without waiting for debounce.
   * Mobile browsers often abort in-flight `fetch` when the tab is killed; a shorter debounce above
   * reduces how often we rely on this path alone.
   */
  useEffect(() => {
    const cancelDebounceAndPush = () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
        debounceTimer.current = null;
      }
      void pushSnapshotNow();
    };

    const onVisibility = () => {
      if (document.visibilityState === "hidden") cancelDebounceAndPush();
    };

    window.addEventListener("pagehide", cancelDebounceAndPush);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", cancelDebounceAndPush);
    document.addEventListener("freeze", cancelDebounceAndPush);
    return () => {
      window.removeEventListener("pagehide", cancelDebounceAndPush);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", cancelDebounceAndPush);
      document.removeEventListener("freeze", cancelDebounceAndPush);
    };
  }, [pushSnapshotNow]);

  const trades = useMemo(() => {
    if (!userId) return null;
    return loadTradesStore(userId);
  }, [userId, tradesBump, state.lastSavedAt]);

  const fingerprint = useMemo(() => {
    if (!trades) return "";
    return workspaceChangeFingerprint(state, trades);
  }, [state, trades]);

  useEffect(() => {
    if (!hydrated || !userId || !fingerprint) return;

    const emptyWorkspace =
      Object.keys(state.accounts).length === 0 &&
      Object.keys(state.pnlEntries).length === 0 &&
      Object.keys(state.feeEntries).length === 0 &&
      Object.keys(state.payoutEntries).length === 0 &&
      (trades?.trades.length ?? 0) === 0;
    if (emptyWorkspace) return;

    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    debounceTimer.current = setTimeout(() => {
      debounceTimer.current = null;
      const t = loadTradesStore(userId);
      const s = stateRef.current;
      const fpNow = workspaceChangeFingerprint(s, t);
      if (!fpNow || fpNow === lastPushedFingerprint.current) return;

      void (async () => {
        try {
          if (await serverSnapshotRicherThanLocal(supabase, s, t)) {
            console.warn(
              "[WorkspaceSnapshotsCloudSync] skip push: server snapshot is richer than local (data-loss guard)."
            );
            return;
          }

          const payload = buildWorkspaceBackupPayloadLive(userId, s, t);
          const updatedAt = await upsertWorkspaceSnapshot(supabase, userId, payload);
          const pushRev = workspaceSnapshotRevisionMs(updatedAt ?? "", payload);
          if (pushRev > 0) {
            writeWorkspaceSnapshotServerWatermark(userId, String(pushRev));
          }
          lastPushedFingerprint.current = fpNow;
          void upsertDailyWorkspaceBackup(supabase, userId, payload).catch((err) => {
            console.error("[WorkspaceSnapshotsCloudSync] daily backup failed", err);
          });
        } catch (e) {
          console.error("[WorkspaceSnapshotsCloudSync] snapshot failed", e);
        }
      })();
    }, SNAPSHOT_DEBOUNCE_MS);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [hydrated, userId, fingerprint, supabase, state, trades]);

  return null;
}
