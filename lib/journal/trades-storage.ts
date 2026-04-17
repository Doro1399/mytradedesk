import type { ISODate, JournalId } from "@/lib/journal/types";

/** Exact totals from the CSV import modal (parse rows) — keeps Journal/Dashboard/Calendar aligned with preview. */
export type CsvImportModalSnapshot = {
  modalNetCents: number;
  modalDailyPnlByDate: Record<ISODate, number>;
};

/** Legacy key — migrated into a per-user key on first load. */
export const LEGACY_TRADES_STORAGE_KEY = "prop-control-center:trades:v1";

/** @deprecated Use `tradesStorageKeyForUser` — kept for migration source. */
export const TRADES_STORAGE_KEY = LEGACY_TRADES_STORAGE_KEY;

export function tradesStorageKeyForUser(userId: string): string {
  return `${LEGACY_TRADES_STORAGE_KEY}:user:${userId}`;
}

/** Fired after `saveTradesStore` and when the Trades page pushes in-memory trades (detail) for immediate PnL sync. */
export const TRADES_STORE_CHANGED_EVENT = "mytradedesk:trades-store-changed";

export type StoredTrade = {
  id: string;
  accountId: JournalId;
  importedAt: string;
  date: ISODate;
  /**
   * Ligne 1-based du fichier CSV source (grille NinjaTrader : plusieurs lignes peuvent avoir la même
   * date / exit / PnL pour des legs partiels — sans ce champ, `storedTradeDedupeKey` fusionne à tort).
   */
  sourceFileLine?: number;
  /** Formatted for table, e.g. "Apr 2, 2026, 1:57 AM" */
  exitDisplay: string;
  /** Raw exit-time cell from CSV — used for stable dedupe (Intl can vary on exitDisplay). */
  exitRaw?: string;
  symbol: string;
  /** LONG, SHORT, or raw from file */
  side: string;
  qty: number | null;
  entry: string;
  exit: string;
  pnlCents: number;
  durationSec: number | null;
  /** Set on CSV import when Gross P/L is 0 and Net matches fees — not a real fill. */
  commissionOnly?: boolean;
  /**
   * CSV ligne avec Gross P/L vide (commission / jambe d’ouverture non fusionnée) : compte dans le P&amp;L net,
   * mais pas dans le nombre de trades ni W/L. Absent après fusion 2 lignes → 1 trade.
   */
  excludeFromWinLossStats?: boolean;
};

export type TradesStoreChangedDetail = {
  /** When set (e.g. after save), listeners can sync without reading stale localStorage. */
  store?: TradesStoreV1;
  /** @deprecated Prefer `store`; kept for older call sites. */
  trades?: StoredTrade[];
};

export type TradesStoreV1 = {
  schemaVersion: 1;
  trades: StoredTrade[];
  lastImportAt?: string;
  /** Per account: net P&L cents = sum of CSV parse rows (modal preview). */
  csvModalNetByAccount?: Record<string, number>;
  /** Per account: per-day cents from CSV parse (modal), used for calendar sync + day table. */
  csvModalDailyByAccount?: Record<string, Record<string, number>>;
};

/**
 * Recalcule le snapshot « modal » à partir des trades stockés pour un compte, après import(s) cumulés.
 * Garde alignés le total net Trades, le calendrier et `netPnlDisplayCents`.
 */
export function csvModalSnapshotFromTradesForAccount(
  trades: StoredTrade[],
  accountId: JournalId
): CsvImportModalSnapshot {
  const modalDailyPnlByDate: Record<ISODate, number> = {};
  let modalNetCents = 0;
  for (const t of trades) {
    if (t.accountId !== accountId) continue;
    modalNetCents += t.pnlCents;
    modalDailyPnlByDate[t.date] = (modalDailyPnlByDate[t.date] ?? 0) + t.pnlCents;
  }
  return { modalNetCents, modalDailyPnlByDate };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseModalNetMap(raw: unknown): Record<string, number> | undefined {
  if (!isObject(raw)) return undefined;
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (typeof v === "number" && Number.isFinite(v)) out[k] = v;
  }
  return Object.keys(out).length ? out : undefined;
}

function parseModalDailyMap(raw: unknown): Record<string, Record<string, number>> | undefined {
  if (!isObject(raw)) return undefined;
  const out: Record<string, Record<string, number>> = {};
  for (const [acc, inner] of Object.entries(raw)) {
    if (!isObject(inner)) continue;
    const dm: Record<string, number> = {};
    for (const [date, v] of Object.entries(inner)) {
      if (typeof v === "number" && Number.isFinite(v)) dm[date] = v;
    }
    if (Object.keys(dm).length) out[acc] = dm;
  }
  return Object.keys(out).length ? out : undefined;
}

export function emptyTradesStore(): TradesStoreV1 {
  return { schemaVersion: 1, trades: [] };
}

export function loadTradesStore(userId: string | null): TradesStoreV1 {
  if (typeof window === "undefined" || !userId) return emptyTradesStore();
  try {
    const scoped = tradesStorageKeyForUser(userId);
    let raw = window.localStorage.getItem(scoped);
    if (!raw) {
      const legacy = window.localStorage.getItem(LEGACY_TRADES_STORAGE_KEY);
      if (legacy) {
        window.localStorage.setItem(scoped, legacy);
        window.localStorage.removeItem(LEGACY_TRADES_STORAGE_KEY);
        raw = window.localStorage.getItem(scoped);
      }
    }
    if (!raw) return emptyTradesStore();
    const parsed = JSON.parse(raw) as unknown;
    if (!isObject(parsed) || parsed.schemaVersion !== 1) return emptyTradesStore();
    const trades = parsed.trades;
    if (!Array.isArray(trades)) return emptyTradesStore();
    const loaded: TradesStoreV1 = {
      schemaVersion: 1,
      trades: trades as StoredTrade[],
      lastImportAt: typeof parsed.lastImportAt === "string" ? parsed.lastImportAt : undefined,
      csvModalNetByAccount: parseModalNetMap(parsed.csvModalNetByAccount),
      csvModalDailyByAccount: parseModalDailyMap(parsed.csvModalDailyByAccount),
    };
    return stripCsvModalOrphanDays(loaded);
  } catch {
    return emptyTradesStore();
  }
}

/**
 * Supprime les totaux « modal CSV » pour les couples compte/jour sans aucun trade stocké.
 * Sinon, après suppression des trades, l’overlay continuait d’alimenter le journal / Progress.
 */
export function stripCsvModalOrphanDays(store: TradesStoreV1): TradesStoreV1 {
  const trades = store.trades;
  const dailyIn = store.csvModalDailyByAccount;
  if (!dailyIn || Object.keys(dailyIn).length === 0) return store;

  const dailyOut: Record<string, Record<string, number>> = {};
  const netOut: Record<string, number> = {};

  for (const [acc, dm] of Object.entries(dailyIn)) {
    const nextDm: Record<string, number> = {};
    for (const [date, cents] of Object.entries(dm)) {
      if (typeof cents !== "number" || !Number.isFinite(cents)) continue;
      const hasTradeHere = trades.some((t) => t.accountId === acc && t.date === date);
      if (!hasTradeHere) continue;
      nextDm[date] = cents;
    }
    if (Object.keys(nextDm).length > 0) {
      dailyOut[acc] = nextDm;
      netOut[acc] = Object.values(nextDm).reduce((s, v) => s + v, 0);
    }
  }

  const csvModalDailyByAccount = Object.keys(dailyOut).length > 0 ? dailyOut : undefined;
  const csvModalNetByAccount = Object.keys(netOut).length > 0 ? netOut : undefined;

  const sameDaily =
    JSON.stringify(store.csvModalDailyByAccount ?? null) === JSON.stringify(csvModalDailyByAccount ?? null);
  const sameNet =
    JSON.stringify(store.csvModalNetByAccount ?? null) === JSON.stringify(csvModalNetByAccount ?? null);
  if (sameDaily && sameNet) return store;

  return { ...store, csvModalDailyByAccount, csvModalNetByAccount };
}

export function saveTradesStore(data: TradesStoreV1, userId: string | null): void {
  if (typeof window === "undefined" || !userId) return;
  const cleaned = stripCsvModalOrphanDays(data);
  window.localStorage.setItem(tradesStorageKeyForUser(userId), JSON.stringify(cleaned));
  window.dispatchEvent(
    new CustomEvent<TradesStoreChangedDetail>(TRADES_STORE_CHANGED_EVENT, { detail: { store: cleaned } })
  );
}

/**
 * Stable fingerprint for deduping imports (ignores `id` and `importedAt`).
 * Re-importing the same CSV into the same account skips matching rows.
 */
export function storedTradeDedupeKey(t: StoredTrade): string {
  const base = [
    t.accountId,
    t.date,
    t.exitRaw ?? t.exitDisplay,
    t.symbol,
    t.side,
    String(t.qty ?? ""),
    t.entry,
    t.exit,
    String(t.pnlCents),
    String(t.durationSec ?? ""),
    t.commissionOnly ? "c" : "",
    t.excludeFromWinLossStats ? "x" : "",
  ];
  if (t.sourceFileLine != null) base.push(`L${t.sourceFileLine}`);
  return base.join("\x1e");
}

export function mergeTradesSkipDuplicates(
  existing: StoredTrade[],
  incoming: StoredTrade[]
): { merged: StoredTrade[]; appended: StoredTrade[]; skipped: number } {
  const keys = new Set(existing.map(storedTradeDedupeKey));
  const appended: StoredTrade[] = [];
  for (const t of incoming) {
    const k = storedTradeDedupeKey(t);
    if (keys.has(k)) continue;
    keys.add(k);
    appended.push(t);
  }
  return {
    merged: [...existing, ...appended],
    appended,
    skipped: incoming.length - appended.length,
  };
}

/**
 * Net P&L for the Trades summary when asset/day filters are "all": prefer CSV modal totals per account.
 */
export function netPnlDisplayCents(
  store: TradesStoreV1,
  opts: {
    filterAccount: JournalId | "all";
    filterAsset: string;
    filterDay: string;
    tradesSubset: StoredTrade[];
  }
): number {
  const { filterAccount, filterAsset, filterDay, tradesSubset } = opts;
  if (filterAsset !== "all" || filterDay !== "all") {
    return tradesSubset.reduce((s, t) => s + t.pnlCents, 0);
  }
  if (filterAccount !== "all") {
    const m = store.csvModalNetByAccount?.[filterAccount];
    if (m !== undefined) return m;
    return tradesSubset.reduce((s, t) => s + t.pnlCents, 0);
  }
  const accountIds = new Set<string>();
  for (const t of store.trades) accountIds.add(t.accountId);
  for (const id of Object.keys(store.csvModalNetByAccount ?? {})) accountIds.add(id);
  let net = 0;
  for (const acc of accountIds) {
    const m = store.csvModalNetByAccount?.[acc];
    if (m !== undefined) net += m;
    else net += store.trades.filter((t) => t.accountId === acc).reduce((s, t) => s + t.pnlCents, 0);
  }
  return net;
}

/**
 * After deleting trades for a calendar day (respecting filters), adjust modal snapshots.
 * Full-day removal for an account: drop that date from overlay and recompute net.
 * Partial removal (some rows left same day): clear modal for that account (stale vs stored rows).
 */
export function pruneCsvModalAfterDayDelete(
  prev: TradesStoreV1,
  nextTrades: StoredTrade[],
  deletedDate: ISODate,
  affectedAccountIds: Iterable<JournalId>
): Pick<TradesStoreV1, "csvModalNetByAccount" | "csvModalDailyByAccount"> {
  const dailyMap: Record<string, Record<string, number>> = {
    ...(prev.csvModalDailyByAccount ?? {}),
  };
  const netMap: Record<string, number> = { ...(prev.csvModalNetByAccount ?? {}) };
  for (const acc of affectedAccountIds) {
    const dm = dailyMap[acc];
    if (!dm || dm[deletedDate] === undefined) continue;
    const stillOnDate = nextTrades.some((t) => t.accountId === acc && t.date === deletedDate);
    if (!stillOnDate) {
      const nextDm = { ...dm };
      delete nextDm[deletedDate];
      if (Object.keys(nextDm).length === 0) {
        delete dailyMap[acc];
        delete netMap[acc];
      } else {
        dailyMap[acc] = nextDm;
        netMap[acc] = Object.values(nextDm).reduce((s, v) => s + v, 0);
      }
    } else {
      delete dailyMap[acc];
      delete netMap[acc];
    }
  }
  const cleanedNet = Object.keys(netMap).length ? netMap : undefined;
  const cleanedDaily = Object.keys(dailyMap).length ? dailyMap : undefined;
  return { csvModalNetByAccount: cleanedNet, csvModalDailyByAccount: cleanedDaily };
}
