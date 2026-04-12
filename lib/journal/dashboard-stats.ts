import { isCommissionNoiseTrade } from "@/lib/journal/trade-metrics";
import { getAccountFinancialMetrics } from "@/lib/journal/selectors";
import { getAccountPayoutTotalDisplayCents, journalPayoutDisplayCents } from "@/lib/journal/payout-display";
import { netPnlDisplayCents, type StoredTrade, type TradesStoreV1 } from "@/lib/journal/trades-storage";
import type {
  JournalAccount,
  JournalDataV1,
  JournalId,
  JournalPnlEntry,
  JournalPayoutEntry,
} from "@/lib/journal/types";

function isManualJournalPnlEntry(e: JournalPnlEntry): boolean {
  return e.source === "manual";
}

function sumManualPnlCents(state: JournalDataV1): number {
  let s = 0;
  for (const e of Object.values(state.pnlEntries)) {
    if (isManualJournalPnlEntry(e)) s += e.pnlCents;
  }
  return s;
}

export type CycleStats = {
  /** Evaluation / challenge accounts */
  challengeTotal: number;
  challengePassed: number;
  challengeFailed: number;
  challengeOngoing: number;
  /** Funded accounts (type funded, not archived) */
  fundedTotal: number;
  /** Funded accounts still in play: status active or passed (post-eval funded still marked Passed). */
  fundedActive: number;
  fundedLost: number;
  /** Success rate: share of eval+funded rows that are funded (non-archived). */
  evalToFundedRatePct: number | null;
};

export type PnlPulseStats = {
  netPnlCents: number;
  entryCount: number;
  winRatePct: number;
  wins: number;
  losses: number;
};

export type FirmBreakdownRow = {
  key: string;
  firmName: string;
  /** Comptes « en jeu » : eval active + funded actif/passé (hors blown). */
  accountCount: number;
  /** Challenge-type accounts: eval passed */
  challengePassed: number;
  /** Challenge-type accounts: blown eval */
  challengeFailed: number;
  /** Challenge-type accounts: eval still running (status active) */
  challengeOngoing: number;
  /** Funded accounts still running (active or passed), excl. blown/closed. */
  fundedActiveCount: number;
  /** Funded accounts blown or closed. */
  fundedBlownCount: number;
  feesCents: number;
  payoutsCents: number;
  netCents: number;
  roiPct: number | null;
};

export type TopAccountRow = {
  accountId: JournalId;
  label: string;
  subline: string;
  netCashCents: number;
  roiVsFeesPct: number | null;
};

function isLostFunded(a: JournalAccount): boolean {
  return a.status === "failed" || a.status === "closed";
}

/** Funded or live account treated as still running (not blown / closed). */
function isFundedRunning(a: JournalAccount): boolean {
  return (
    (a.accountType === "funded" || a.accountType === "live") &&
    (a.status === "active" || a.status === "passed")
  );
}

export function getCycleStats(state: JournalDataV1): CycleStats {
  const visible = Object.values(state.accounts).filter((a) => !a.isArchived);
  const challenges = visible.filter((a) => a.accountType === "challenge");
  const funded = visible.filter((a) => a.accountType === "funded" || a.accountType === "live");

  const challengePassed = challenges.filter((a) => a.status === "passed").length;
  const challengeFailed = challenges.filter((a) => a.status === "failed").length;
  const challengeOngoing = challenges.filter((a) => a.status === "active").length;

  const fundedActive = funded.filter((a) => isFundedRunning(a)).length;
  const fundedLost = funded.filter((a) => isLostFunded(a)).length;

  const funnelSeats = funded.length + challenges.length;
  const evalToFundedRatePct =
    funnelSeats > 0
      ? Math.round((funded.length / funnelSeats) * 1000) / 10
      : null;

  return {
    challengeTotal: challenges.length,
    challengePassed,
    challengeFailed,
    challengeOngoing,
    fundedTotal: funded.length,
    fundedActive,
    fundedLost,
    evalToFundedRatePct,
  };
}

export function getPnlPulseStats(state: JournalDataV1): PnlPulseStats {
  const entries = Object.values(state.pnlEntries);
  let net = 0;
  let wins = 0;
  let losses = 0;
  for (const e of entries) {
    net += e.pnlCents;
    if (e.pnlCents > 0) wins += 1;
    else if (e.pnlCents < 0) losses += 1;
  }
  const n = entries.length;
  const decided = wins + losses;
  const winRatePct = decided > 0 ? Math.round((wins / decided) * 1000) / 10 : 0;

  return {
    netPnlCents: net,
    entryCount: n,
    winRatePct,
    wins,
    losses,
  };
}

/**
 * Logged P&amp;L on the dashboard from stored trade rows.
 * Net = somme de toutes les lignes (aligné import CSV) ; W/L et win rate = lignes hors bruit commission uniquement.
 */
export function getPnlPulseStatsFromStoredTrades(trades: StoredTrade[]): PnlPulseStats {
  let net = 0;
  let wins = 0;
  let losses = 0;
  let tradeRowCount = 0;
  for (const t of trades) {
    net += t.pnlCents;
    if (isCommissionNoiseTrade(t)) continue;
    tradeRowCount += 1;
    if (t.pnlCents > 0) wins += 1;
    else if (t.pnlCents < 0) losses += 1;
  }
  const decided = wins + losses;
  const winRatePct = decided > 0 ? Math.round((wins / decided) * 1000) / 10 : 0;

  return {
    netPnlCents: net,
    entryCount: tradeRowCount,
    winRatePct,
    wins,
    losses,
  };
}

/** Logged P&amp;L pulse: net = trades (CSV modal rule) + manual journal lines; W/L still from stored rows only. */
export function getPnlPulseStatsFromTradesStore(
  store: TradesStoreV1,
  state: JournalDataV1
): PnlPulseStats {
  const trades = store.trades;
  let wins = 0;
  let losses = 0;
  let tradeRowCount = 0;
  for (const t of trades) {
    if (isCommissionNoiseTrade(t)) continue;
    tradeRowCount += 1;
    if (t.pnlCents > 0) wins += 1;
    else if (t.pnlCents < 0) losses += 1;
  }
  const decided = wins + losses;
  const winRatePct = decided > 0 ? Math.round((wins / decided) * 1000) / 10 : 0;
  const tradeNet = netPnlDisplayCents(store, {
    filterAccount: "all",
    filterAsset: "all",
    filterDay: "all",
    tradesSubset: trades,
  });
  const netPnlCents = tradeNet + sumManualPnlCents(state);
  return {
    netPnlCents,
    entryCount: tradeRowCount,
    winRatePct,
    wins,
    losses,
  };
}

const TRADE_CELL_SEP = "\x1e";

/** Monthly buckets: trades (modal overlay) + manual journal P&amp;L only (avoids double-counting synced import rows). */
export function getMonthlyPnlCentsFromTradesStore(
  store: TradesStoreV1,
  state: JournalDataV1,
  year: number
): number[] {
  const months = Array.from({ length: 12 }, () => 0);
  const pref = `${year}-`;
  const cell = new Map<string, number>();
  for (const t of store.trades) {
    if (!t.date.startsWith(pref)) continue;
    const k = `${t.accountId}${TRADE_CELL_SEP}${t.date}`;
    cell.set(k, (cell.get(k) ?? 0) + t.pnlCents);
  }
  for (const [acc, dm] of Object.entries(store.csvModalDailyByAccount ?? {})) {
    for (const [date, cents] of Object.entries(dm)) {
      if (!date.startsWith(pref)) continue;
      cell.set(`${acc}${TRADE_CELL_SEP}${date}`, cents);
    }
  }
  for (const [k, cents] of cell) {
    const idx = k.indexOf(TRADE_CELL_SEP);
    const date = k.slice(idx + TRADE_CELL_SEP.length);
    const parts = date.split("-");
    const m = Number(parts[1]);
    if (!Number.isFinite(m) || m < 1 || m > 12) continue;
    months[m - 1] += cents;
  }
  for (const e of Object.values(state.pnlEntries)) {
    if (!isManualJournalPnlEntry(e)) continue;
    if (!e.date.startsWith(pref)) continue;
    const parts = e.date.split("-");
    const m = Number(parts[1]);
    if (!Number.isFinite(m) || m < 1 || m > 12) continue;
    months[m - 1] += e.pnlCents;
  }
  return months;
}

export function getYearsWithTradeDataFromStore(store: TradesStoreV1, state: JournalDataV1): number[] {
  const years = new Set<number>();
  for (const t of store.trades) {
    const y = Number(t.date.slice(0, 4));
    if (Number.isFinite(y)) years.add(y);
  }
  for (const dm of Object.values(store.csvModalDailyByAccount ?? {})) {
    for (const d of Object.keys(dm)) {
      const y = Number(d.slice(0, 4));
      if (Number.isFinite(y)) years.add(y);
    }
  }
  for (const e of Object.values(state.pnlEntries)) {
    if (!isManualJournalPnlEntry(e)) continue;
    const y = Number(e.date.slice(0, 4));
    if (Number.isFinite(y)) years.add(y);
  }
  return [...years].sort((a, b) => a - b);
}

export function getMonthlyPnlCentsForYear(
  state: JournalDataV1,
  year: number
): number[] {
  const months = Array.from({ length: 12 }, () => 0);
  const prefix = `${year}-`;
  for (const e of Object.values(state.pnlEntries)) {
    if (!e.date.startsWith(prefix)) continue;
    const parts = e.date.split("-");
    const m = Number(parts[1]);
    if (!Number.isFinite(m) || m < 1 || m > 12) continue;
    months[m - 1] += e.pnlCents;
  }
  return months;
}

/** Sum of stored trade P&amp;L by calendar month (trade `date` = exit day). */
export function getMonthlyTradePnlCentsForYear(trades: StoredTrade[], year: number): number[] {
  const months = Array.from({ length: 12 }, () => 0);
  const prefix = `${year}-`;
  for (const t of trades) {
    if (!t.date.startsWith(prefix)) continue;
    const parts = t.date.split("-");
    const m = Number(parts[1]);
    if (!Number.isFinite(m) || m < 1 || m > 12) continue;
    months[m - 1] += t.pnlCents;
  }
  return months;
}

export function getYearsWithTradeData(trades: StoredTrade[]): number[] {
  const years = new Set<number>();
  const yNow = new Date().getFullYear();
  years.add(yNow);
  for (const t of trades) {
    const y = Number(t.date.slice(0, 4));
    if (Number.isFinite(y) && y >= 2000 && y <= yNow + 1) years.add(y);
  }
  return [...years].sort((a, b) => a - b);
}

export function getYearsWithPnlData(state: JournalDataV1): number[] {
  const years = new Set<number>();
  const yNow = new Date().getFullYear();
  years.add(yNow);
  for (const e of Object.values(state.pnlEntries)) {
    const y = Number(e.date.slice(0, 4));
    if (Number.isFinite(y) && y >= 2000 && y <= yNow + 1) years.add(y);
  }
  return [...years].sort((a, b) => a - b);
}

function payoutRowEffectiveDate(p: JournalPayoutEntry): string {
  return p.paidDate ?? p.requestedDate;
}

/** Payouts summed by calendar month (effective date), montants affichés (TopStep 90 % brut, TPT 80 % brut). */
export function getMonthlyPayoutsCentsForYear(state: JournalDataV1, year: number): number[] {
  const months = Array.from({ length: 12 }, () => 0);
  const prefix = `${year}-`;
  for (const p of Object.values(state.payoutEntries)) {
    const d = payoutRowEffectiveDate(p);
    if (!d.startsWith(prefix)) continue;
    const acc = state.accounts[p.accountId];
    if (!acc) continue;
    const parts = d.split("-");
    const m = Number(parts[1]);
    if (!Number.isFinite(m) || m < 1 || m > 12) continue;
    months[m - 1] += journalPayoutDisplayCents(p, acc);
  }
  return months;
}

export function getYearsWithPayoutData(state: JournalDataV1): number[] {
  const years = new Set<number>();
  const yNow = new Date().getFullYear();
  years.add(yNow);
  for (const p of Object.values(state.payoutEntries)) {
    const d = payoutRowEffectiveDate(p);
    const y = Number(d.slice(0, 4));
    if (Number.isFinite(y) && y >= 2000 && y <= yNow + 1) years.add(y);
  }
  return [...years].sort((a, b) => a - b);
}

export function getFirmBreakdownRows(state: JournalDataV1): FirmBreakdownRow[] {
  const byKey = new Map<
    string,
    {
      firmName: string;
      challengePassed: number;
      challengeFailed: number;
      challengeOngoing: number;
      fundedActiveCount: number;
      fundedBlownCount: number;
      feesCents: number;
      payoutsCents: number;
    }
  >();

  for (const acc of Object.values(state.accounts)) {
    if (acc.isArchived) continue;
    const key = acc.propFirm.id.trim() || acc.propFirm.name.trim().toLowerCase();
    const firmName = acc.propFirm.name.trim() || "Unknown firm";
    let row = byKey.get(key);
    if (!row) {
      row = {
        firmName,
        challengePassed: 0,
        challengeFailed: 0,
        challengeOngoing: 0,
        fundedActiveCount: 0,
        fundedBlownCount: 0,
        feesCents: 0,
        payoutsCents: 0,
      };
      byKey.set(key, row);
    }
    if (acc.accountType === "challenge") {
      if (acc.status === "passed") row.challengePassed += 1;
      else if (acc.status === "failed") row.challengeFailed += 1;
      else if (acc.status === "active") row.challengeOngoing += 1;
    }
    if (acc.accountType === "funded" || acc.accountType === "live") {
      if (isLostFunded(acc)) row.fundedBlownCount += 1;
      else row.fundedActiveCount += 1;
    }
  }

  const metricsList = getAllAccountMetricsMap(state);
  for (const acc of Object.values(state.accounts)) {
    if (acc.isArchived) continue;
    const key = acc.propFirm.id.trim() || acc.propFirm.name.trim().toLowerCase();
    const row = byKey.get(key);
    if (!row) continue;
    const m = metricsList.get(acc.id);
    if (m) {
      row.feesCents += m.totalFeesCents;
      row.payoutsCents += getAccountPayoutTotalDisplayCents(state, acc.id);
    }
  }

  const rows: FirmBreakdownRow[] = [];
  for (const [key, r] of byKey) {
    const netCents = r.payoutsCents - r.feesCents;
    const roiPct =
      r.feesCents > 0 ? Math.round((netCents / r.feesCents) * 1000) / 10 : null;
    rows.push({
      key,
      firmName: r.firmName,
      accountCount: r.challengeOngoing + r.fundedActiveCount,
      challengePassed: r.challengePassed,
      challengeFailed: r.challengeFailed,
      challengeOngoing: r.challengeOngoing,
      fundedActiveCount: r.fundedActiveCount,
      fundedBlownCount: r.fundedBlownCount,
      feesCents: r.feesCents,
      payoutsCents: r.payoutsCents,
      netCents,
      roiPct,
    });
  }

  rows.sort((a, b) => b.netCents - a.netCents || a.firmName.localeCompare(b.firmName));
  return rows;
}

function getAllAccountMetricsMap(
  state: JournalDataV1
): Map<JournalId, ReturnType<typeof getAccountFinancialMetrics>> {
  const m = new Map<JournalId, ReturnType<typeof getAccountFinancialMetrics>>();
  for (const id of Object.keys(state.accounts)) {
    m.set(id, getAccountFinancialMetrics(state, id));
  }
  return m;
}

export function getTopAccountsByNetCash(
  state: JournalDataV1,
  limit: number,
  resolveLabel: (acc: JournalAccount) => string
): TopAccountRow[] {
  const rows: TopAccountRow[] = [];
  for (const acc of Object.values(state.accounts)) {
    if (acc.isArchived) continue;
    const fin = getAccountFinancialMetrics(state, acc.id);
    const payoutsDisplay = getAccountPayoutTotalDisplayCents(state, acc.id);
    const netCashDisplay = payoutsDisplay - fin.totalFeesCents;
    const roiVsFees =
      fin.totalFeesCents > 0
        ? Math.round((netCashDisplay / fin.totalFeesCents) * 1000) / 10
        : null;
    const subline = `${acc.propFirm.name} · ${acc.sizeLabel} · ${acc.accountType}`;
    rows.push({
      accountId: acc.id,
      label: resolveLabel(acc),
      subline,
      netCashCents: netCashDisplay,
      roiVsFeesPct: roiVsFees,
    });
  }
  rows.sort((a, b) => b.netCashCents - a.netCashCents);
  return rows.slice(0, limit);
}

/** Standard compare-style sizes → USD notional (matches user-facing 25k = $25,000, etc.). */
const SIZE_LABEL_USD: Record<string, number> = {
  "25k": 25_000,
  "50k": 50_000,
  "75k": 75_000,
  "100k": 100_000,
  "150k": 150_000,
  "200k": 200_000,
  "250k": 250_000,
  "300k": 300_000,
};

/** Parses `25k`-style labels to USD cents; explicit map first, then digits×1k like the accounts wizard. */
export function nominalUsdCentsFromSizeLabel(sizeLabel: string): number {
  const key = sizeLabel.trim().toLowerCase();
  const usd = SIZE_LABEL_USD[key];
  if (usd != null) return Math.round(usd * 100);
  const raw = Number(sizeLabel.replace(/[^\d]/g, ""));
  if (!Number.isFinite(raw) || raw <= 0) return 0;
  return raw * 1000 * 100;
}

function notionalCentsForAccount(a: JournalAccount): number {
  return nominalUsdCentsFromSizeLabel(a.sizeLabel);
}

/** Active or passed — still “in play” for notional (blown/closed/archived excluded). */
function accountCountsForNotionalCapital(a: JournalAccount): boolean {
  if (a.isArchived || a.status === "archived") return false;
  return a.status === "active" || a.status === "passed";
}

export type CapitalBreakdownCents = {
  /** Challenge-type accounts (evaluations) still active or passed. */
  evalCents: number;
  /** Funded + live accounts still active or passed. */
  fundedCents: number;
  /** Eval + funded notional. */
  totalCents: number;
};

export function getCapitalBreakdownCents(state: JournalDataV1): CapitalBreakdownCents {
  let evalCents = 0;
  let fundedCents = 0;
  for (const acc of Object.values(state.accounts)) {
    if (!accountCountsForNotionalCapital(acc)) continue;
    const n = notionalCentsForAccount(acc);
    if (acc.accountType === "challenge") evalCents += n;
    else if (acc.accountType === "funded" || acc.accountType === "live") fundedCents += n;
  }
  return {
    evalCents,
    fundedCents,
    totalCents: evalCents + fundedCents,
  };
}

/** Sum of eval + funded/live notional (active or passed). */
export function getCapitalUnderManagementCents(state: JournalDataV1): number {
  return getCapitalBreakdownCents(state).totalCents;
}

export function pickFirmInsightLine(rows: FirmBreakdownRow[]): string | null {
  const positive = rows.filter((r) => r.netCents > 0);
  if (positive.length === 0) return null;
  const top = positive[0]!;
  return `${top.firmName} is carrying the best net cash flow right now.`;
}
