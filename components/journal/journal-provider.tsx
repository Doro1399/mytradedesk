"use client";

import {
  createContext,
  useContext,
  useEffect,
  useReducer,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
} from "react";
import {
  createEmptyJournalData,
  journalReducer,
  type JournalAction,
} from "@/lib/journal/reducer";
import { syncJournalPnlFromStoredTrades } from "@/lib/journal/trades-journal-sync";
import type { JournalDataV1 } from "@/lib/journal/types";
import {
  loadTradesStore,
  TRADES_STORAGE_KEY,
  TRADES_STORE_CHANGED_EVENT,
  type TradesStoreChangedDetail,
} from "@/lib/journal/trades-storage";
import { loadJournalData, saveJournalData } from "@/lib/journal/storage";

type JournalContextValue = {
  state: JournalDataV1;
  dispatch: Dispatch<JournalAction>;
  hydrated: boolean;
};

const JournalContext = createContext<JournalContextValue | null>(null);

export function JournalProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(journalReducer, undefined, () =>
    createEmptyJournalData()
  );
  const [hydrated, setHydrated] = useState(false);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    dispatch({ type: "journal/hydrate", payload: loadJournalData() });
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    const applySync = (ev?: Event) => {
      const detail =
        ev instanceof CustomEvent ? (ev.detail as TradesStoreChangedDetail | undefined) : undefined;
      const store =
        detail?.store && detail.store.schemaVersion === 1 ? detail.store : loadTradesStore();
      const { deleteIds, upserts } = syncJournalPnlFromStoredTrades(stateRef.current, store);
      if (deleteIds.length === 0 && upserts.length === 0) return;
      dispatch({ type: "pnl/syncFromTrades", payload: { deleteIds, upserts } });
    };

    applySync();

    const onTradesChanged = (ev: Event) => {
      applySync(ev);
    };

    const onStorage = (e: StorageEvent) => {
      if (e.key === TRADES_STORAGE_KEY) applySync();
    };

    window.addEventListener(TRADES_STORE_CHANGED_EVENT, onTradesChanged);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(TRADES_STORE_CHANGED_EVENT, onTradesChanged);
      window.removeEventListener("storage", onStorage);
    };
  }, [hydrated, dispatch]);

  useEffect(() => {
    if (!hydrated) return;
    const id = window.setTimeout(() => saveJournalData(state), 400);
    return () => window.clearTimeout(id);
  }, [state, hydrated]);

  return (
    <JournalContext.Provider value={{ state, dispatch, hydrated }}>
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
