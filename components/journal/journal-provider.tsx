"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
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
  const accountsLimit = workspaceProfile?.accountsLimit ?? Number.POSITIVE_INFINITY;

  const [state, rawDispatch] = useReducer(journalReducer, undefined, () =>
    createEmptyJournalData()
  );
  const [hydrated, setHydrated] = useState(false);
  const stateRef = useRef(state);
  stateRef.current = state;

  const accountsLimitRef = useRef(accountsLimit);
  accountsLimitRef.current = accountsLimit;

  const dispatch = useCallback(
    (action: JournalAction) => {
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
    [rawDispatch]
  );

  const isEphemeral = ephemeralSeed != null;

  useEffect(() => {
    if (ephemeralSeed) {
      dispatch({ type: "journal/hydrate", payload: ephemeralSeed });
    } else {
      dispatch({ type: "journal/hydrate", payload: loadJournalData(storageUserId) });
    }
    setHydrated(true);
  }, [ephemeralSeed, storageUserId, dispatch]);

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
      const { deleteIds, upserts } = syncJournalPnlFromStoredTrades(stateRef.current, store);
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
  }, [hydrated, dispatch, isEphemeral, storageUserId]);

  useEffect(() => {
    if (!hydrated || isEphemeral) return;
    if (!storageUserId) return;
    const id = window.setTimeout(() => saveJournalData(state, storageUserId), 400);
    return () => window.clearTimeout(id);
  }, [state, hydrated, isEphemeral, storageUserId]);

  return (
    <JournalContext.Provider value={{ state, dispatch, hydrated, isEphemeral }}>
      {children}
    </JournalContext.Provider>
  );
}

export function useJournal(): JournalContextValue {
  const ctx = useContext(JournalContext);
  if (!ctx) {
    throw new Error("useJournal must be used within JournalProvider");
  }
  return ctx;
}
