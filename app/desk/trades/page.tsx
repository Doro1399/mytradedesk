"use client";

import { useCallback, useEffect, useMemo, useState, type MouseEvent } from "react";
import { flushSync } from "react-dom";
import { JournalWorkspaceShell } from "@/components/journal/journal-workspace-shell";
import { useJournalStorageUserId } from "@/components/journal/journal-storage-context";
import { useJournal } from "@/components/journal/journal-provider";
import { resolveAccountDisplayName, useAutoAccountLabelById } from "@/components/journal/account-auto-labels";
import { DeleteDayTradesModal } from "@/components/journal/delete-day-trades-modal";
import {
  DeleteAllTradesModal,
} from "@/components/journal/delete-all-trades-modal";
import { DeleteManualPnlModal } from "@/components/journal/delete-manual-pnl-modal";
import { EditManualPnlModal, type ManualPnlEditSave } from "@/components/journal/edit-manual-pnl-modal";
import { ImportTradesModal, type ManualPnlCommit } from "@/components/journal/import-trades-modal";
import { nowIso } from "@/lib/journal/reducer";
import {
  emptyTradesStore,
  loadTradesStore,
  csvModalSnapshotFromTradesForAccount,
  mergeTradesSkipDuplicatesByAccountSecond,
  mergeTradesSkipDuplicates,
  netPnlDisplayCents,
  pruneCsvModalAfterDayDelete,
  saveTradesStore,
  stripCsvModalOrphanDays,
  tradesStorageKeyForUser,
  type CsvImportModalSnapshot,
  type StoredTrade,
  type TradesStoreV1,
} from "@/lib/journal/trades-storage";
import type { ISODate, JournalId, JournalPnlEntry } from "@/lib/journal/types";
import { isCommissionNoiseTrade } from "@/lib/journal/trade-metrics";

const TRADE_TABLE_PREVIEW_ROWS = 20;

const CARD =
  "rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.07] to-white/[0.02] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-sm";

const SECTION_LABEL = "text-[10px] font-semibold uppercase tracking-[0.2em] text-sky-400/90";

function formatUsd2(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

function formatUsdSignedColored(cents: number): { text: string; className: string } {
  const sign = cents > 0 ? "+" : "";
  const text = sign + formatUsd2(cents);
  if (cents > 0) return { text, className: "text-emerald-400" };
  if (cents < 0) return { text, className: "text-rose-400" };
  return { text, className: "text-white/50" };
}

type JournalDayRow = {
  date: ISODate;
  netPnlCents: number;
  tradeCount: number;
  wins: number;
  losses: number;
  breakeven: number;
};

type TradesPageTableRow =
  | { kind: "day"; date: ISODate; row: JournalDayRow }
  | { kind: "manual"; date: ISODate; entry: JournalPnlEntry };

function tableRowKey(item: TradesPageTableRow): string {
  return item.kind === "day" ? `day:${item.date}` : `manual:${item.entry.id}`;
}

/** One row per calendar day. Net = sum of every stored row (same rule as CSV import preview). */
function aggregateTradesByDay(trades: StoredTrade[]): JournalDayRow[] {
  const map = new Map<ISODate, { net: number; wins: number; losses: number; be: number; tc: number }>();
  for (const t of trades) {
    const cur = map.get(t.date) ?? { net: 0, wins: 0, losses: 0, be: 0, tc: 0 };
    cur.net += t.pnlCents;
    if (!isCommissionNoiseTrade(t)) {
      cur.tc += 1;
      if (t.pnlCents > 0) cur.wins += 1;
      else if (t.pnlCents < 0) cur.losses += 1;
      else cur.be += 1;
    }
    map.set(t.date, cur);
  }
  return [...map.entries()]
    .map(([date, c]) => ({
      date,
      netPnlCents: c.net,
      tradeCount: c.tc,
      wins: c.wins,
      losses: c.losses,
      breakeven: c.be,
    }))
    .sort((a, b) => b.date.localeCompare(a.date));
}

const DAY_CELL_SEP = "\x1e";

/** When asset/day filters are off, per-day net uses CSV modal daily totals (same as calendar). */
function aggregateTradesByDayWithModal(
  tradesForDayTable: StoredTrade[],
  store: TradesStoreV1,
  filterAccount: JournalId | "all",
  filterAsset: string,
  filterDay: string
): JournalDayRow[] {
  if (filterAsset !== "all" || filterDay !== "all") {
    return aggregateTradesByDay(tradesForDayTable);
  }
  const overlay = store.csvModalDailyByAccount ?? {};
  const accounts = new Set<JournalId>();
  for (const t of tradesForDayTable) accounts.add(t.accountId);
  for (const acc of Object.keys(overlay)) {
    if (filterAccount === "all" || acc === filterAccount) accounts.add(acc as JournalId);
  }
  const cell = new Map<string, number>();
  for (const t of tradesForDayTable) {
    if (filterAccount !== "all" && t.accountId !== filterAccount) continue;
    const k = `${t.accountId}${DAY_CELL_SEP}${t.date}`;
    cell.set(k, (cell.get(k) ?? 0) + t.pnlCents);
  }
  for (const acc of accounts) {
    const dm = overlay[acc];
    if (!dm) continue;
    for (const [date, cents] of Object.entries(dm)) {
      if (filterAccount !== "all" && acc !== filterAccount) continue;
      cell.set(`${acc}${DAY_CELL_SEP}${date}`, cents);
    }
  }
  const byDate = new Map<ISODate, number>();
  for (const [k, cents] of cell) {
    const j = k.indexOf(DAY_CELL_SEP);
    const date = k.slice(j + DAY_CELL_SEP.length) as ISODate;
    byDate.set(date, (byDate.get(date) ?? 0) + cents);
  }
  const dates = [...byDate.keys()].sort((a, b) => b.localeCompare(a));
  return dates.map((date) => {
    let wins = 0;
    let losses = 0;
    let be = 0;
    let tc = 0;
    for (const t of tradesForDayTable) {
      if (t.date !== date) continue;
      if (filterAccount !== "all" && t.accountId !== filterAccount) continue;
      if (isCommissionNoiseTrade(t)) continue;
      tc += 1;
      if (t.pnlCents > 0) wins += 1;
      else if (t.pnlCents < 0) losses += 1;
      else be += 1;
    }
    return {
      date,
      netPnlCents: byDate.get(date) ?? 0,
      tradeCount: tc,
      wins,
      losses,
      breakeven: be,
    };
  });
}

function dayWinRatePct(row: JournalDayRow): number | null {
  const d = row.wins + row.losses;
  if (d <= 0) return null;
  return Math.round((row.wins / d) * 1000) / 10;
}

function journalSummary(trades: StoredTrade[]) {
  let net = 0;
  let wins = 0;
  let losses = 0;
  let be = 0;
  let count = 0;
  for (const t of trades) {
    net += t.pnlCents;
    if (isCommissionNoiseTrade(t)) continue;
    count += 1;
    if (t.pnlCents > 0) wins += 1;
    else if (t.pnlCents < 0) losses += 1;
    else be += 1;
  }
  const decided = wins + losses;
  const winRatePct = decided > 0 ? Math.round((wins / decided) * 1000) / 10 : 0;
  return { net, wins, losses, breakeven: be, count, winRatePct };
}

export default function JournalTradesPage() {
  const { state, dispatch, hydrated, isAccountEditable } = useJournal();
  const storageUserId = useJournalStorageUserId();

  const [tradeStore, setTradeStore] = useState<TradesStoreV1>(() => emptyTradesStore());
  const [storeReady, setStoreReady] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);

  const [filterAccount, setFilterAccount] = useState<JournalId | "all">("all");
  const [filterAsset, setFilterAsset] = useState<string>("all");
  const [filterDay, setFilterDay] = useState<string>("all");
  const [deleteDayModal, setDeleteDayModal] = useState<{ date: ISODate; count: number } | null>(null);
  const [manualPnlToDelete, setManualPnlToDelete] = useState<JournalPnlEntry | null>(null);
  const [manualPnlToEdit, setManualPnlToEdit] = useState<JournalPnlEntry | null>(null);
  const [deleteAllModalOpen, setDeleteAllModalOpen] = useState(false);
  const [tableSelectMode, setTableSelectMode] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    if (!storageUserId) return;
    setTradeStore(loadTradesStore(storageUserId));
    setStoreReady(true);
  }, [storageUserId]);

  /** Other tabs / windows: reload so we never show stale totals or overwrite fresh data mentally. */
  useEffect(() => {
    if (!storageUserId) return;
    const tradesKey = tradesStorageKeyForUser(storageUserId);
    const onStorage = (e: StorageEvent) => {
      if (e.key !== tradesKey || e.newValue == null) return;
      setTradeStore(loadTradesStore(storageUserId));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [storageUserId]);

  /**
   * Retire l’overlay CSV orphelin, persiste **toujours** le store à écrire (même quand strip retourne
   * un nouvel objet), puis réaligne l’état. Sinon `saveTradesStore` ne tourne pas, le journal lit un
   * localStorage périmé et les cartes Progress / balance ne suivent pas les suppressions de trades.
   */
  useEffect(() => {
    if (!storeReady || !storageUserId) return;
    const cleaned = stripCsvModalOrphanDays(tradeStore);
    const toPersist = cleaned !== tradeStore ? cleaned : tradeStore;
    saveTradesStore(toPersist, storageUserId);
    if (cleaned !== tradeStore) {
      setTradeStore(cleaned);
    }
  }, [tradeStore, storeReady, storageUserId]);

  const accounts = useMemo(
    () =>
      Object.values(state.accounts)
        .filter((a) => !a.isArchived)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [state.accounts]
  );

  const importEligibleAccounts = useMemo(
    () => accounts.filter((a) => isAccountEditable(a.id)),
    [accounts, isAccountEditable]
  );

  const labels = useAutoAccountLabelById(accounts);

  const uniqueSymbols = useMemo(() => {
    const s = new Set<string>();
    for (const t of tradeStore.trades) {
      if (t.symbol && t.symbol !== "—") s.add(t.symbol);
    }
    return [...s].sort((a, b) => a.localeCompare(b));
  }, [tradeStore.trades]);

  const filteredTrades = useMemo(() => {
    return tradeStore.trades.filter((t) => {
      if (filterAccount !== "all" && t.accountId !== filterAccount) return false;
      if (filterAsset !== "all" && t.symbol !== filterAsset) return false;
      if (filterDay !== "all" && t.date !== filterDay) return false;
      return true;
    });
  }, [tradeStore.trades, filterAccount, filterAsset, filterDay]);

  const filteredManualPnlEntries = useMemo(() => {
    return Object.values(state.pnlEntries).filter((e) => {
      if (e.source !== "manual") return false;
      if (filterAccount !== "all" && e.accountId !== filterAccount) return false;
      if (filterDay !== "all" && e.date !== filterDay) return false;
      if (filterAsset !== "all") return false;
      return true;
    });
  }, [state.pnlEntries, filterAccount, filterAsset, filterDay]);

  const manualPnlSumInView = useMemo(
    () => filteredManualPnlEntries.reduce((s, e) => s + e.pnlCents, 0),
    [filteredManualPnlEntries]
  );

  const dayRows = useMemo(
    () =>
      aggregateTradesByDayWithModal(
        filteredTrades,
        tradeStore,
        filterAccount,
        filterAsset,
        filterDay
      ),
    [filteredTrades, tradeStore, filterAccount, filterAsset, filterDay]
  );

  const [tableExpanded, setTableExpanded] = useState(false);

  useEffect(() => {
    setTableExpanded(false);
  }, [filterAccount, filterAsset, filterDay]);

  useEffect(() => {
    setTableSelectMode(false);
    setSelectedRowKeys(new Set());
  }, [filterAccount, filterAsset, filterDay]);

  const sortedManualPnlEntries = useMemo(
    () =>
      [...filteredManualPnlEntries].sort((a, b) => {
        const c = b.date.localeCompare(a.date);
        if (c !== 0) return c;
        return b.createdAt.localeCompare(a.createdAt);
      }),
    [filteredManualPnlEntries]
  );

  const combinedTableRows = useMemo((): TradesPageTableRow[] => {
    const rows: TradesPageTableRow[] = [];
    for (const dr of dayRows) rows.push({ kind: "day", date: dr.date, row: dr });
    for (const e of sortedManualPnlEntries) {
      rows.push({ kind: "manual", date: e.date, entry: e });
    }
    rows.sort((a, b) => {
      const c = b.date.localeCompare(a.date);
      if (c !== 0) return c;
      if (a.kind !== b.kind) return a.kind === "day" ? -1 : 1;
      if (a.kind === "manual" && b.kind === "manual") {
        return b.entry.createdAt.localeCompare(a.entry.createdAt);
      }
      return 0;
    });
    return rows;
  }, [dayRows, sortedManualPnlEntries]);

  const displayTableRows = useMemo(() => {
    if (tableExpanded || combinedTableRows.length <= TRADE_TABLE_PREVIEW_ROWS) {
      return combinedTableRows;
    }
    return combinedTableRows.slice(0, TRADE_TABLE_PREVIEW_ROWS);
  }, [combinedTableRows, tableExpanded]);

  const hasJournalTableContent = combinedTableRows.length > 0;

  const selectAllScopeKeys = useMemo(() => displayTableRows.map(tableRowKey), [displayTableRows]);

  const allDisplayedRowsSelected =
    tableSelectMode &&
    selectAllScopeKeys.length > 0 &&
    selectAllScopeKeys.every((k) => selectedRowKeys.has(k));

  const handleTableRowClick = useCallback(
    (key: string) => (e: MouseEvent<HTMLTableRowElement>) => {
      const t = e.target as HTMLElement;
      if (t.closest("button, a, input, label")) return;
      if (!tableSelectMode) {
        setTableSelectMode(true);
        setSelectedRowKeys(new Set([key]));
        return;
      }
      setSelectedRowKeys((prev) => {
        const n = new Set(prev);
        if (n.has(key)) n.delete(key);
        else n.add(key);
        return n;
      });
    },
    [tableSelectMode]
  );

  const dayFilterOptions = useMemo(() => {
    const s = new Set<ISODate>();
    for (const t of tradeStore.trades) s.add(t.date);
    for (const e of Object.values(state.pnlEntries)) {
      if (e.source === "manual") s.add(e.date);
    }
    return [...s].sort().reverse();
  }, [tradeStore.trades, state.pnlEntries]);

  const summary = useMemo(() => {
    const base = journalSummary(filteredTrades);
    const tradeNet = netPnlDisplayCents(tradeStore, {
      filterAccount,
      filterAsset,
      filterDay,
      tradesSubset: filteredTrades,
    });
    return { ...base, net: tradeNet + manualPnlSumInView };
  }, [
    filteredTrades,
    tradeStore,
    filterAccount,
    filterAsset,
    filterDay,
    manualPnlSumInView,
  ]);

  const matchesActiveFilters = useCallback(
    (t: StoredTrade) => {
      if (filterAccount !== "all" && t.accountId !== filterAccount) return false;
      if (filterAsset !== "all" && t.symbol !== filterAsset) return false;
      if (filterDay !== "all" && t.date !== filterDay) return false;
      return true;
    },
    [filterAccount, filterAsset, filterDay]
  );

  const confirmDeleteDayTrades = useCallback(
    (date: ISODate) => {
      setTradeStore((s) => {
        const affected = new Set<JournalId>();
        for (const t of s.trades) {
          if (t.date !== date) continue;
          if (matchesActiveFilters(t)) affected.add(t.accountId);
        }
        const nextTrades = s.trades.filter((t) => (t.date !== date ? true : !matchesActiveFilters(t)));
        const pruned = pruneCsvModalAfterDayDelete(s, nextTrades, date, affected);
        return { ...s, trades: nextTrades, ...pruned };
      });
    },
    [matchesActiveFilters]
  );

  const confirmDeleteManualPnl = useCallback(
    (entryId: JournalId) => {
      dispatch({ type: "pnl/delete", payload: { entryId } });
    },
    [dispatch]
  );

  const handleSaveManualPnlEdit = useCallback(
    (payload: ManualPnlEditSave) => {
      const existing = state.pnlEntries[payload.id];
      if (!existing || existing.source !== "manual") return;
      dispatch({
        type: "pnl/upsert",
        payload: {
          ...existing,
          accountId: payload.accountId,
          date: payload.date,
          pnlCents: payload.pnlCents,
          note: payload.note,
          source: "manual",
        },
      });
    },
    [dispatch, state.pnlEntries]
  );

  const manualPnlTotalCount = useMemo(
    () => Object.values(state.pnlEntries).filter((e) => e.source === "manual").length,
    [state.pnlEntries]
  );

  const openDeleteAllModal = useCallback(() => {
    if (tradeStore.trades.length === 0 && manualPnlTotalCount === 0) return;
    setDeleteAllModalOpen(true);
  }, [tradeStore.trades.length, manualPnlTotalCount]);

  const confirmDeleteAllTrades = useCallback(() => {
    if (tradeStore.trades.length > 0) {
      const next = emptyTradesStore();
      setTradeStore(next);
      if (storageUserId) saveTradesStore(next, storageUserId);
    }
    for (const e of Object.values(state.pnlEntries)) {
      if (e.source !== "manual") continue;
      dispatch({ type: "pnl/delete", payload: { entryId: e.id } });
    }
    setTableSelectMode(false);
    setSelectedRowKeys(new Set());
  }, [tradeStore.trades.length, state.pnlEntries, dispatch, storageUserId]);

  const deleteSelectedRows = useCallback(() => {
    if (selectedRowKeys.size === 0) return;
    if (
      !window.confirm(
        `Delete ${selectedRowKeys.size} selected row(s)? Trades and manual P&L lines will be removed.`
      )
    ) {
      return;
    }
    const dayDates: ISODate[] = [];
    const manualIds: JournalId[] = [];
    for (const k of selectedRowKeys) {
      if (k.startsWith("day:")) dayDates.push(k.slice(4) as ISODate);
      else if (k.startsWith("manual:")) manualIds.push(k.slice(7));
    }
    for (const id of manualIds) {
      dispatch({ type: "pnl/delete", payload: { entryId: id } });
    }
    if (dayDates.length > 0) {
      setTradeStore((s) => {
        let slice: TradesStoreV1 = s;
        let trades = s.trades;
        for (const date of dayDates) {
          const affected = new Set<JournalId>();
          for (const t of trades) {
            if (t.date !== date) continue;
            if (matchesActiveFilters(t)) affected.add(t.accountId);
          }
          trades = trades.filter((t) => (t.date !== date ? true : !matchesActiveFilters(t)));
          const pruned = pruneCsvModalAfterDayDelete(slice, trades, date, affected);
          slice = { ...slice, trades, ...pruned };
          trades = slice.trades;
        }
        if (storageUserId) saveTradesStore(slice, storageUserId);
        return slice;
      });
    }
    setSelectedRowKeys(new Set());
    setTableSelectMode(false);
  }, [selectedRowKeys, matchesActiveFilters, dispatch, storageUserId]);

  const handleCommitImport = useCallback((added: StoredTrade[], snapshot: CsvImportModalSnapshot) => {
    if (added.length === 0) return;
    const useSecondPrecisionDedupe = snapshot.importedBroker === "rithmic";
    const affectedIds = [...new Set(added.map((t) => t.accountId))];
    flushSync(() => {
      setFilterAccount(affectedIds.length === 1 ? affectedIds[0]! : "all");
      setFilterAsset("all");
      setFilterDay("all");
      setTradeStore((s) => {
        let allTrades = s.trades;
        const netMap: Record<string, number> = { ...(s.csvModalNetByAccount ?? {}) };
        const dailyMap: Record<string, Record<string, number>> = {
          ...(s.csvModalDailyByAccount ?? {}),
        };
        for (const accId of affectedIds) {
          const batch = added.filter((t) => t.accountId === accId);
          const existingForAccount = allTrades.filter((t) => t.accountId === accId);
          const keptOther = allTrades.filter((t) => t.accountId !== accId);
          const { merged: mergedForAccount } = useSecondPrecisionDedupe
            ? mergeTradesSkipDuplicatesByAccountSecond(existingForAccount, batch)
            : mergeTradesSkipDuplicates(existingForAccount, batch);
          allTrades = [...keptOther, ...mergedForAccount];
          const recomputed = csvModalSnapshotFromTradesForAccount(allTrades, accId);
          netMap[accId] = recomputed.modalNetCents;
          dailyMap[accId] = recomputed.modalDailyPnlByDate;
        }
        const next: TradesStoreV1 = {
          ...s,
          trades: allTrades,
          lastImportAt: new Date().toISOString(),
          csvModalNetByAccount: netMap,
          csvModalDailyByAccount: dailyMap,
        };
        if (storageUserId) saveTradesStore(next, storageUserId);
        return next;
      });
    });
  }, [storageUserId]);

  const handleCommitManualPnl = useCallback((payload: ManualPnlCommit) => {
    const t = nowIso();
    const id =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `pnl-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
    dispatch({
      type: "pnl/upsert",
      payload: {
        id,
        accountId: payload.accountId,
        date: payload.date,
        pnlCents: payload.pnlCents,
        source: "manual",
        note: payload.note?.trim() || "Manual entry",
        createdAt: t,
        updatedAt: t,
      },
    });
  }, [dispatch]);

  return (
    <JournalWorkspaceShell active="trades">
      <div className="relative z-[1] flex min-h-0 min-w-0 flex-1 flex-col">
        {/* Page header — same rhythm as Dashboard / Calendar */}
        <header className="shrink-0 border-b border-white/10 bg-black/55 px-[clamp(16px,2.5vw,40px)] py-[clamp(14px,1.8vw,24px)] backdrop-blur-xl">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <p className={SECTION_LABEL}>TradeDesk</p>
              <h1 className="mt-1 text-[clamp(1.35rem,2.2vw,1.9rem)] font-semibold tracking-tight text-white">Trades</h1>
            </div>
            <div className="flex w-full min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end lg:w-auto lg:shrink-0">
              <button
                type="button"
                onClick={() => setImportModalOpen(true)}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/20 bg-gradient-to-b from-white/15 to-white/[0.07] px-3 py-2.5 text-xs font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] transition hover:from-white/20 hover:to-white/10 sm:w-auto sm:px-4 sm:text-sm"
              >
                <UploadIcon className="h-4 w-4 shrink-0" />
                {"Add trades / P&L"}
              </button>
            </div>
          </div>
        </header>

        {!hydrated || !storeReady ? (
          <div className="flex min-h-[40vh] flex-1 items-center justify-center px-[clamp(16px,2.5vw,40px)]">
            <div className={`${CARD} w-full max-w-md px-[clamp(20px,4vw,28px)] py-12 text-center text-sm text-white/45`}>
              Loading…
            </div>
          </div>
        ) : (
          <div className="w-full min-w-0 flex-1 space-y-6 sm:space-y-8 px-[clamp(12px,2.5vw,40px)] py-[clamp(18px,3vw,40px)]">
            <JournalGamifiedStatStrip summary={summary} />

            {/* Filters */}
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
              <FilterSelect
                label="Account"
                value={filterAccount}
                onChange={(v) => setFilterAccount(v as JournalId | "all")}
                options={[
                  { value: "all", label: "All accounts" },
                  ...accounts.map((a) => ({
                    value: a.id as string,
                    label: resolveAccountDisplayName(a, labels),
                  })),
                ]}
              />
              <FilterSelect
                label="Asset"
                value={filterAsset}
                onChange={setFilterAsset}
                options={[
                  { value: "all", label: "All types" },
                  ...uniqueSymbols.map((sym) => ({ value: sym, label: sym })),
                ]}
              />
              <div className="flex w-full min-w-0 flex-col gap-1 sm:w-auto sm:min-w-[10rem] sm:max-w-[min(100vw-2rem,18rem)]">
                <span className="text-[10px] font-medium uppercase tracking-wider text-white/40">Day</span>
                <select
                  value={filterDay}
                  onChange={(e) => setFilterDay(e.target.value)}
                  className="w-full rounded-xl border border-white/12 bg-black/50 px-3 py-2 text-sm text-white outline-none focus:border-sky-500/40 focus:ring-2 focus:ring-sky-500/15"
                >
                  <option value="all">All days</option>
                  {dayFilterOptions.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Daily summary table */}
            <div className={`${CARD} min-w-0 overflow-hidden p-0`}>
              {!hasJournalTableContent ? (
                <div className="px-[clamp(16px,4vw,28px)] py-[clamp(48px,12vw,80px)] text-center">
                  <p className="text-lg font-medium text-white/55">No activity yet</p>
                  <p className="mt-2 text-sm text-white/35">
                    Use <span className="text-white/55">{"Add trades / P&L"}</span>
                    {
                      " to import a CSV or add a manual P&L line — trades sync to Calendar; manual lines appear here for editing or delete."
                    }
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto overscroll-x-contain touch-pan-x [-webkit-overflow-scrolling:touch]">
                  <div className="flex flex-wrap items-center justify-end gap-2 border-b border-white/10 bg-black/30 px-3 py-2.5 sm:px-4">
                    {tableSelectMode ? (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setTableSelectMode(false);
                            setSelectedRowKeys(new Set());
                          }}
                          className="rounded-lg border border-white/12 px-3 py-1.5 text-xs font-medium text-white/70 transition hover:border-white/20 hover:bg-white/[0.06] hover:text-white"
                        >
                          Cancel selection
                        </button>
                        {selectedRowKeys.size > 0 ? (
                          <button
                            type="button"
                            onClick={deleteSelectedRows}
                            className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-200/95 transition hover:border-rose-400/55 hover:bg-rose-500/18"
                          >
                            Delete selected ({selectedRowKeys.size})
                          </button>
                        ) : null}
                      </>
                    ) : null}
                    <button
                      type="button"
                      onClick={openDeleteAllModal}
                      disabled={tradeStore.trades.length === 0 && manualPnlTotalCount === 0}
                      className="rounded-lg border border-rose-500/35 px-3 py-1.5 text-xs font-medium text-rose-300/90 transition hover:bg-rose-500/10 disabled:cursor-not-allowed disabled:opacity-35"
                    >
                      Delete all
                    </button>
                  </div>
                  <table className="w-full min-w-[520px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-white/10 bg-black/30 text-[10px] font-semibold uppercase tracking-wider text-white/40">
                        {tableSelectMode ? (
                          <th className="w-11 px-2 py-3">
                            <input
                              type="checkbox"
                              checked={allDisplayedRowsSelected}
                              onChange={(e) => {
                                e.stopPropagation();
                                if (e.target.checked) {
                                  setSelectedRowKeys((prev) => {
                                    const n = new Set(prev);
                                    for (const k of selectAllScopeKeys) n.add(k);
                                    return n;
                                  });
                                } else {
                                  setSelectedRowKeys((prev) => {
                                    const n = new Set(prev);
                                    for (const k of selectAllScopeKeys) n.delete(k);
                                    return n;
                                  });
                                }
                              }}
                              className="h-4 w-4 rounded border-white/25 bg-black/50 text-sky-500 focus:ring-sky-400/40"
                              aria-label="Select all rows in table"
                            />
                          </th>
                        ) : null}
                        <th className="px-3 py-3">Date</th>
                        <th className="px-3 py-3">Trades (W/L)</th>
                        <th className="px-3 py-3 text-right">Win rate</th>
                        <th className="px-3 py-3 text-right">Net P&amp;L</th>
                        <th className="min-w-[5.5rem] px-2 py-3" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.06]">
                      {displayTableRows.map((item) => {
                        const key = tableRowKey(item);
                        const selected = selectedRowKeys.has(key);
                        if (item.kind === "day") {
                          const row = item.row;
                          const pnl = formatUsdSignedColored(row.netPnlCents);
                          const wr = dayWinRatePct(row);
                          const wl =
                            row.breakeven > 0
                              ? `${row.wins}W / ${row.losses}L · ${row.breakeven} BE`
                              : `${row.wins}W / ${row.losses}L`;
                          const tradeCountOnDay = filteredTrades.filter((t) => t.date === row.date).length;
                          return (
                            <tr
                              key={`day-${row.date}`}
                              onClick={handleTableRowClick(key)}
                              className={`text-white/85 transition hover:bg-white/[0.03] ${
                                tableSelectMode ? "cursor-pointer" : ""
                              } ${selected ? "bg-sky-500/[0.08]" : ""}`}
                            >
                              {tableSelectMode ? (
                                <td
                                  className="px-2 py-2.5"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <input
                                    type="checkbox"
                                    checked={selected}
                                    onChange={() => {
                                      setSelectedRowKeys((prev) => {
                                        const n = new Set(prev);
                                        if (n.has(key)) n.delete(key);
                                        else n.add(key);
                                        return n;
                                      });
                                    }}
                                    className="h-4 w-4 rounded border-white/25 bg-black/50 text-sky-500 focus:ring-sky-400/40"
                                    aria-label={`Select row ${row.date}`}
                                  />
                                </td>
                              ) : null}
                              <td className="px-3 py-2.5 text-sm font-medium text-white/90">{row.date}</td>
                              <td className="px-3 py-2.5 text-sm text-white/75">
                                {row.tradeCount}
                                <span className="text-white/45"> · </span>
                                {wl}
                              </td>
                              <td className="px-3 py-2.5 text-right text-sm tabular-nums text-white/80">
                                {wr == null ? "—" : `${wr.toFixed(1)}%`}
                              </td>
                              <td className={`px-3 py-2.5 text-right font-mono text-sm tabular-nums ${pnl.className}`}>
                                {pnl.text}
                              </td>
                              <td className="px-2 py-2.5">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (tradeCountOnDay > 0) {
                                      setDeleteDayModal({ date: row.date, count: tradeCountOnDay });
                                    }
                                  }}
                                  disabled={tradeCountOnDay === 0}
                                  className="rounded-lg p-1.5 text-white/35 transition hover:bg-rose-500/15 hover:text-rose-300 disabled:pointer-events-none disabled:opacity-20"
                                  aria-label={`Delete imported trades on ${row.date}`}
                                >
                                  <TrashIcon className="h-4 w-4" />
                                </button>
                              </td>
                            </tr>
                          );
                        }
                        const entry = item.entry;
                        const pnl = formatUsdSignedColored(entry.pnlCents);
                        const acc = accounts.find((a) => a.id === entry.accountId);
                        const accLabel = acc
                          ? resolveAccountDisplayName(acc, labels)
                          : entry.accountId;
                        const note =
                          entry.note && entry.note !== "Manual entry"
                            ? entry.note
                            : null;
                        return (
                          <tr
                            key={`manual-${entry.id}`}
                            onClick={handleTableRowClick(key)}
                            className={`text-white/85 transition hover:bg-sky-500/[0.06] ${
                              tableSelectMode ? "cursor-pointer" : ""
                            } ${selected ? "bg-sky-500/[0.12]" : ""}`}
                          >
                            {tableSelectMode ? (
                              <td
                                className="px-2 py-2.5"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <input
                                  type="checkbox"
                                  checked={selected}
                                  onChange={() => {
                                    setSelectedRowKeys((prev) => {
                                      const n = new Set(prev);
                                      if (n.has(key)) n.delete(key);
                                      else n.add(key);
                                      return n;
                                    });
                                  }}
                                  className="h-4 w-4 rounded border-white/25 bg-black/50 text-sky-500 focus:ring-sky-400/40"
                                  aria-label="Select manual P&L row"
                                />
                              </td>
                            ) : null}
                            <td className="px-3 py-2.5 text-sm font-medium text-white/90">{entry.date}</td>
                            <td className="px-3 py-2.5 text-sm text-sky-200/85">
                              {filterAccount === "all" ? `${accLabel} · ` : ""}
                              Manual P&L
                              {note ? (
                                <>
                                  <span className="text-white/45"> · </span>
                                  <span className="text-white/70">{note}</span>
                                </>
                              ) : null}
                            </td>
                            <td className="px-3 py-2.5 text-right text-sm text-white/45">—</td>
                            <td className={`px-3 py-2.5 text-right font-mono text-sm tabular-nums ${pnl.className}`}>
                              {pnl.text}
                            </td>
                            <td className="px-2 py-2.5">
                              <div className="flex items-center justify-end gap-0.5">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setManualPnlToEdit(entry);
                                  }}
                                  className="rounded-lg p-1.5 text-white/35 transition hover:bg-sky-500/15 hover:text-sky-200"
                                  aria-label="Edit manual P&L line"
                                >
                                  <PenIcon className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setManualPnlToDelete(entry);
                                  }}
                                  className="rounded-lg p-1.5 text-white/35 transition hover:bg-rose-500/15 hover:text-rose-300"
                                  aria-label="Delete manual P&L line"
                                >
                                  <TrashIcon className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {!tableExpanded && combinedTableRows.length > TRADE_TABLE_PREVIEW_ROWS ? (
                    <div className="border-t border-white/10 px-4 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => setTableExpanded(true)}
                        className="text-sm font-medium text-sky-400/90 underline decoration-sky-500/35 underline-offset-2 transition hover:text-sky-300"
                      >
                        Show more ({combinedTableRows.length - TRADE_TABLE_PREVIEW_ROWS} more)
                      </button>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        )}

        <ImportTradesModal
          open={importModalOpen}
          onClose={() => setImportModalOpen(false)}
          accounts={importEligibleAccounts}
          labelByAccountId={labels}
          lastImportAt={tradeStore.lastImportAt ?? undefined}
          onCommitImport={handleCommitImport}
          onCommitManualPnl={handleCommitManualPnl}
        />

        <DeleteDayTradesModal
          open={deleteDayModal != null}
          date={deleteDayModal?.date ?? null}
          tradeCount={deleteDayModal?.count ?? 0}
          onClose={() => setDeleteDayModal(null)}
          onConfirm={(date) => confirmDeleteDayTrades(date)}
        />

        <EditManualPnlModal
          open={manualPnlToEdit != null}
          entry={manualPnlToEdit}
          accounts={importEligibleAccounts}
          labelByAccountId={labels}
          onClose={() => setManualPnlToEdit(null)}
          onSave={handleSaveManualPnlEdit}
        />

        <DeleteManualPnlModal
          open={manualPnlToDelete != null}
          entry={manualPnlToDelete}
          onClose={() => setManualPnlToDelete(null)}
          onConfirm={(entryId) => confirmDeleteManualPnl(entryId)}
        />

        <DeleteAllTradesModal
          open={deleteAllModalOpen}
          tradeCount={tradeStore.trades.length}
          manualPnlCount={manualPnlTotalCount}
          onClose={() => setDeleteAllModalOpen(false)}
          onConfirm={confirmDeleteAllTrades}
        />
      </div>
    </JournalWorkspaceShell>
  );
}

function formatUsdSignedPlain(cents: number): string {
  const sign = cents > 0 ? "+" : cents < 0 ? "" : "";
  return sign + formatUsd2(cents);
}

type SummaryShape = ReturnType<typeof journalSummary> & { net: number };

/** Semi-circular gauge: losses (red, left) → wins (green, right); BE shown as badges only. */
function TradeWinRatePerformanceGauge({
  wins,
  losses,
  winRatePct,
}: {
  wins: number;
  losses: number;
  winRatePct: number;
}) {
  const cx = 100;
  const cy = 100;
  const R = 72;
  const strokeW = 14;
  const decided = wins + losses;
  const arcLen = Math.PI * R;
  const redLen = decided > 0 ? (losses / decided) * arcLen : 0;
  const greenLen = decided > 0 ? (wins / decided) * arcLen : 0;
  const d = `M ${cx - R} ${cy} A ${R} ${R} 0 0 1 ${cx + R} ${cy}`;
  const pctDisplay = decided > 0 ? Math.round(winRatePct) : 0;

  const gaugeId = "trade-win-gauge-grad";
  return (
    <div className="relative mx-auto w-full max-w-[248px]">
      <div
        className="pointer-events-none absolute left-1/2 top-[18%] h-[5.5rem] w-[120%] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(0,230,118,0.14)_0%,transparent_68%)] blur-2xl"
        aria-hidden
      />
      <svg
        viewBox="0 0 200 118"
        className="relative h-[7.5rem] w-full drop-shadow-[0_4px_28px_rgba(0,0,0,0.45)]"
        role="img"
        aria-label={`Trade win rate ${pctDisplay} percent, ${wins} wins, ${losses} losses`}
      >
        <defs>
          <linearGradient id={`${gaugeId}-track`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.07)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.14)" />
          </linearGradient>
          <linearGradient id={`${gaugeId}-green`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#4ade80" />
            <stop offset="55%" stopColor="#00e676" />
            <stop offset="100%" stopColor="#00c853" />
          </linearGradient>
          <linearGradient id={`${gaugeId}-red`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#fca5a5" />
            <stop offset="100%" stopColor="#ef5350" />
          </linearGradient>
          <filter id={`${gaugeId}-glow`} x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="1.2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <path
          d={d}
          fill="none"
          stroke={`url(#${gaugeId}-track)`}
          strokeWidth={strokeW}
          strokeLinecap="round"
        />
        {decided > 0 && redLen > 0 ? (
          <path
            d={d}
            fill="none"
            stroke={`url(#${gaugeId}-red)`}
            strokeWidth={strokeW}
            strokeLinecap="round"
            strokeDasharray={`${redLen} ${arcLen}`}
            filter={`url(#${gaugeId}-glow)`}
          />
        ) : null}
        {decided > 0 && greenLen > 0 ? (
          <path
            d={d}
            fill="none"
            stroke={`url(#${gaugeId}-green)`}
            strokeWidth={strokeW}
            strokeLinecap="round"
            strokeDasharray={`${greenLen} ${arcLen}`}
            strokeDashoffset={-redLen}
            filter={`url(#${gaugeId}-glow)`}
          />
        ) : null}
      </svg>
      <div className="pointer-events-none absolute inset-x-0 top-[40%] flex flex-col items-center text-center sm:top-[42%]">
        <p className="text-[clamp(1.65rem,4.2vw,2rem)] font-semibold leading-none tabular-nums tracking-[-0.03em] text-white drop-shadow-[0_2px_20px_rgba(0,230,118,0.12)]">
          {pctDisplay}%
        </p>
        <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/50">
          Trade win %
        </p>
      </div>
    </div>
  );
}

function JournalGamifiedStatStrip({ summary }: { summary: SummaryShape }) {
  const netPositive = summary.net > 0;
  const netNegative = summary.net < 0;
  const wr = summary.winRatePct;

  return (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-5">
      <div
        className={`relative overflow-hidden rounded-2xl border p-[clamp(18px,3.5vw,26px)] shadow-[0_22px_56px_rgba(0,0,0,0.4)] ${
          netPositive
            ? "border-emerald-400/30 bg-gradient-to-br from-emerald-500/[0.14] via-[#0a1412] to-[#060c0a]"
            : netNegative
              ? "border-rose-400/25 bg-gradient-to-br from-rose-500/[0.12] via-[#140c0e] to-[#0c080a]"
              : "border-white/12 bg-gradient-to-br from-white/[0.08] via-[#0a0e14] to-[#070a10]"
        }`}
      >
        <div
          className={`pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full blur-3xl ${
            netPositive ? "bg-emerald-400/20" : netNegative ? "bg-rose-400/15" : "bg-white/[0.07]"
          }`}
        />
        <div className="relative flex items-start justify-between gap-2">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/45">Net P&amp;L</p>
            <p className="mt-0.5 text-[11px] text-white/32">In view · full stack</p>
          </div>
          <span
            className={`rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
              netPositive
                ? "border-emerald-400/35 bg-emerald-500/15 text-emerald-200/90"
                : netNegative
                  ? "border-rose-400/35 bg-rose-500/12 text-rose-200/88"
                  : "border-white/15 bg-white/[0.06] text-white/50"
            }`}
          >
            {netPositive ? "Profit zone" : netNegative ? "Drawdown" : "Flat"}
          </span>
        </div>
        <p
          className={`relative mt-4 text-[clamp(1.4rem,4vw,1.95rem)] font-bold tabular-nums tracking-tight ${
            netPositive ? "text-emerald-300/95" : netNegative ? "text-rose-300/95" : "text-white/55"
          }`}
        >
          {formatUsdSignedPlain(summary.net)}
        </p>
        <p className="relative mt-3 text-xs leading-snug text-white/38">
          {netPositive
            ? "Stacking green — compound discipline, not just size."
            : netNegative
              ? "Red ink is data — tag what to fix on the next session."
              : "Breakeven bridge — one clear plan for the next entries."}
        </p>
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-violet-400/20 bg-gradient-to-b from-violet-500/[0.1] via-[#0c0e18] to-[#080b12] p-[clamp(18px,3.5vw,26px)] shadow-[inset_0_1px_0_rgba(255,255,255,0.07)]">
        <div className="pointer-events-none absolute bottom-0 right-0 h-24 w-24 rounded-tl-full bg-violet-500/[0.06] blur-2xl" />
        <div className="relative flex items-start justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/45">Trades</p>
            <p className="mt-0.5 text-[11px] text-white/32">Volume · W/L split</p>
          </div>
          <BarIcon className="h-6 w-6 text-violet-400/50" />
        </div>
        <p className="relative mt-4 text-[clamp(1.25rem,3.5vw,1.65rem)] font-bold tabular-nums text-white/92">
          {summary.count}
          <span className="text-lg font-semibold text-white/35"> · </span>
          <span className="text-emerald-300/90">{summary.wins}W</span>
          <span className="text-white/25"> / </span>
          <span className="text-rose-300/88">{summary.losses}L</span>
          {summary.breakeven > 0 ? (
            <span className="text-base font-semibold text-white/40"> · {summary.breakeven} BE</span>
          ) : null}
        </p>
        <div className="relative mt-4 h-1.5 overflow-hidden rounded-full bg-black/40">
          <div
            className="h-full rounded-full bg-gradient-to-r from-violet-500/80 to-sky-400/70 transition-[width] duration-500"
            style={{
              width: `${summary.count > 0 ? Math.min(100, (summary.wins / summary.count) * 100) : 8}%`,
            }}
          />
        </div>
        <p className="relative mt-2 text-[11px] text-white/35">Win share of logged rows (excl. commission noise)</p>
      </div>

      <div className="relative overflow-hidden rounded-[22px] border border-white/[0.09] bg-gradient-to-b from-[#151820] via-[#0c0e14] to-[#07080c] p-[clamp(18px,3.5vw,28px)] shadow-[0_28px_72px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.07)] ring-1 ring-white/[0.04]">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-400/35 to-transparent"
          aria-hidden
        />
        <div className="pointer-events-none absolute -right-16 top-1/2 h-40 w-40 -translate-y-1/2 rounded-full bg-emerald-500/[0.06] blur-3xl" aria-hidden />
        <p className="relative text-[10px] font-semibold uppercase tracking-[0.22em] text-white/45">
          Performance
        </p>
        <div className="relative mt-2">
          <TradeWinRatePerformanceGauge
            wins={summary.wins}
            losses={summary.losses}
            winRatePct={wr}
          />
        </div>
        <div className="relative mt-5 flex items-center justify-center gap-3">
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/[0.06] bg-[#ef5350] text-sm font-semibold tabular-nums text-black/90 shadow-[0_6px_22px_rgba(239,83,80,0.35)]"
            title="Losing trades"
          >
            {summary.losses}
          </span>
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/[0.08] bg-zinc-800/90 text-sm font-semibold tabular-nums text-white/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
            title="Breakeven"
          >
            {summary.breakeven}
          </span>
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-emerald-400/30 bg-[#00e676] text-sm font-semibold tabular-nums text-black/90 shadow-[0_6px_26px_rgba(0,230,118,0.38)]"
            title="Winning trades"
          >
            {summary.wins}
          </span>
        </div>
      </div>
    </section>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="flex w-full min-w-0 flex-col gap-1 sm:w-auto sm:min-w-[10rem] sm:max-w-[min(100vw-2rem,20rem)]">
      <span className="text-[10px] font-medium uppercase tracking-wider text-white/40">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-white/12 bg-black/50 px-3 py-2 text-[13px] text-white outline-none transition focus:border-sky-400/40 focus:ring-1 focus:ring-sky-400/25"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function BarIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path d="M4 20V10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M10 20V4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M16 20v-6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M22 20V8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function UploadIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path d="M12 4v11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="m8 8 4-4 4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M4 20h16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function PenIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden>
      <path
        d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path d="M4 7h16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M10 11v6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M14 11v6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path
        d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
