"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
} from "react";
import { useJournalStorageUserId } from "@/components/journal/journal-storage-context";
import { useWorkspaceProfileOptional } from "@/components/auth/workspace-profile-provider";
import { ACCOUNT_LIMIT_REACHED_EVENT } from "@/lib/auth/constants";
import { canAddJournalAccounts } from "@/lib/auth/accounts-limit";
import {
  filterPnlSyncForEditableAccounts,
  getLiteEditableAccountSet,
  isJournalActionAllowedForLiteLock,
  LITE_ACCOUNT_READ_ONLY_EVENT,
  needsLiteAccountSelection,
  saveLiteEditablePair,
} from "@/lib/journal/lite-editable-accounts";
import {
  createEmptyJournalData,
  journalReducer,
  type JournalAction,
} from "@/lib/journal/reducer";
import { syncJournalPnlFromStoredTrades } from "@/lib/journal/trades-journal-sync";
import type { JournalDataV1 } from "@/lib/journal/types";
import {
  loadTradesStore,
  tradesStorageKeyForUser,
  TRADES_STORE_CHANGED_EVENT,
  type TradesStoreChangedDetail,
} from "@/lib/journal/trades-storage";
import { loadJournalData, saveJournalData } from "@/lib/journal/storage";

type JournalContextValue = {
  state: JournalDataV1;
  dispatch: Dispatch<JournalAction>;
  hydrated: boolean;
  /**
   * Seeded demo workspace: no localStorage I/O, no trades-table sync.
   * Dashboard pulse uses journal P&amp;L lines only (same totals as a filled journal).
   */
  isEphemeral: boolean;
  /** When Lite plan exceeds account cap, only these accounts accept edits (local selection). */
  isAccountEditable: (accountId: string) => boolean;
  needsLiteAccountSelection: boolean;
  confirmLiteAccountSelection: (pair: [string, string]) => void;
};

const JournalContext = createContext<JournalContextValue | null>(null);

export function JournalProvider({
  children,
  ephemeralSeed,
}: {
  children: ReactNode;
  /** In-memory-only workspace (e.g. public `/demo`). Must be a stable reference from the parent. */
  ephemeralSeed?: JournalDataV1;
}) {
  const storageUserId = useJournalStorageUserId();
  const workspaceProfile = useWorkspaceProfileOptional();
  const profile = workspaceProfile?.profile ?? null;
  const accountsLimit = workspaceProfile?.accountsLimit ?? Number.POSITIVE_INFINITY;

  const [state, rawDispatch] = useReducer(journalReducer, undefined, () =>
    createEmptyJournalData()
  );
  const [hydrated, setHydrated] = useState(false);
  const [liteSelectionBump, setLiteSelectionBump] = useState(0);
  const stateRef = useRef(state);
  stateRef.current = state;

  const accountsLimitRef = useRef(accountsLimit);
  accountsLimitRef.current = accountsLimit;

  const accountIds = useMemo(() => Object.keys(state.accounts), [state.accounts]);

  const needsSelection = useMemo(() => {
    if (ephemeralSeed != null) return false;
    return needsLiteAccountSelection(profile, accountIds, storageUserId);
  }, [profile, accountIds, storageUserId, ephemeralSeed, liteSelectionBump]);

  const isAccountEditable = useCallback(
    (accountId: string) => {
      if (ephemeralSeed != null) return true;
      const set = getLiteEditableAccountSet(profile, accountIds, storageUserId);
      if (set === null) return true;
      if (set.size === 0) return false;
      return set.has(accountId);
    },
    [profile, accountIds, storageUserId, ephemeralSeed, liteSelectionBump]
  );

  const confirmLiteAccountSelection = useCallback(
    (pair: [string, string]) => {
      saveLiteEditablePair(storageUserId, pair);
      setLiteSelectionBump((n) => n + 1);
    },
    [storageUserId]
  );

  const dispatch = useCallback(
    (action: JournalAction) => {
      if (ephemeralSeed == null) {
        const editable = getLiteEditableAccountSet(profile, accountIds, storageUserId);
        let next: JournalAction = action;
        if (action.type === "pnl/syncFromTrades") {
          next = {
            type: "pnl/syncFromTrades",
            payload: filterPnlSyncForEditableAccounts(action.payload, stateRef.current, editable),
          };
          if (
            next.type === "pnl/syncFromTrades" &&
            next.payload.deleteIds.length === 0 &&
            next.payload.upserts.length === 0
          ) {
            return;
          }
        }
        if (!isJournalActionAllowedForLiteLock(next, stateRef.current, editable)) {
          if (typeof window !== "undefined") {
            window.dispatchEvent(new Event(LITE_ACCOUNT_READ_ONLY_EVENT));
          }
          return;
        }
        action = next;
      }

      if (action.type === "account/upsert") {
        const id = action.payload.id;
        if (!stateRef.current.accounts[id]) {
          const n = Object.keys(stateRef.current.accounts).length;
          const limit = accountsLimitRef.current;
          if (!canAddJournalAccounts(n, limit)) {
            if (typeof window !== "undefined") {
              window.dispatchEvent(new Event(ACCOUNT_LIMIT_REACHED_EVENT));
            }
            return;
          }
        }
      }
      rawDispatch(action);
    },
    [rawDispatch, profile, accountIds, storageUserId, ephemeralSeed]
  );

  const isEphemeral = ephemeralSeed != null;

  useEffect(() => {
    if (ephemeralSeed) {
      rawDispatch({ type: "journal/hydrate", payload: ephemeralSeed });
    } else {
      rawDispatch({ type: "journal/hydrate", payload: loadJournalData(storageUserId) });
    }
    setHydrated(true);
  }, [ephemeralSeed, storageUserId, rawDispatch]);

  useEffect(() => {
    if (!hydrated || isEphemeral) return;
    if (!storageUserId) return;

    const tradesKey = tradesStorageKeyForUser(storageUserId);

    const applySync = (ev?: Event) => {
      const detail =
        ev instanceof CustomEvent ? (ev.detail as TradesStoreChangedDetail | undefined) : undefined;
      const store =
        detail?.store && detail.store.schemaVersion === 1
          ? detail.store
          : loadTradesStore(storageUserId);
      let { deleteIds, upserts } = syncJournalPnlFromStoredTrades(stateRef.current, store);
      const editable = getLiteEditableAccountSet(
        profile,
        Object.keys(stateRef.current.accounts),
        storageUserId
      );
      const filtered = filterPnlSyncForEditableAccounts({ deleteIds, upserts }, stateRef.current, editable);
      deleteIds = filtered.deleteIds;
      upserts = filtered.upserts;
      if (deleteIds.length === 0 && upserts.length === 0) return;
      dispatch({ type: "pnl/syncFromTrades", payload: { deleteIds, upserts } });
    };

    applySync();

    const onTradesChanged = (ev: Event) => {
      applySync(ev);
    };

    const onStorage = (e: StorageEvent) => {
      if (e.key === tradesKey) applySync();
    };

    window.addEventListener(TRADES_STORE_CHANGED_EVENT, onTradesChanged);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(TRADES_STORE_CHANGED_EVENT, onTradesChanged);
      window.removeEventListener("storage", onStorage);
    };
  }, [hydrated, dispatch, isEphemeral, storageUserId, profile, liteSelectionBump]);

  useEffect(() => {
    if (!hydrated || isEphemeral) return;
    if (!storageUserId) return;
    const id = window.setTimeout(() => saveJournalData(state, storageUserId), 400);
    return () => window.clearTimeout(id);
  }, [state, hydrated, isEphemeral, storageUserId]);

  const contextValue = useMemo(
    () => ({
      state,
      dispatch,
      hydrated,
      isEphemeral,
      isAccountEditable,
      needsLiteAccountSelection: needsSelection,
      confirmLiteAccountSelection,
    }),
    [
      state,
      dispatch,
      hydrated,
      isEphemeral,
      isAccountEditable,
      needsSelection,
      confirmLiteAccountSelection,
    ]
  );

  return <JournalContext.Provider value={contextValue}>{children}</JournalContext.Provider>;
}

export function useJournal(): JournalContextValue {
  const ctx = useContext(JournalContext);
  if (!ctx) {
    throw new Error("useJournal must be used within JournalProvider");
  }
  return ctx;
}
