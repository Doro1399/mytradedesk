/**
 * Règles Tradeify — alignées sur « Tradeify Rules.csv » (table 1 éval+funded Growth/Select,
 * table 2 Direct funded Ligthning). Select challenge = unique ; funded Daily vs Flex selon `compareProgramName`.
 */
import { findEvalCompareRow } from "@/lib/journal/compare-account-helpers";
import type { JournalAccount, JournalDataV1 } from "@/lib/journal/types";
import {
  formatAllowedFromCsv,
  formatEvalDllDisplay,
  formatJournalMinProfitDaysLine,
  formatPayoutRulesConsistency,
  type ApexAccountRulesCard,
  type ApexEvalRulesLayout,
  type ApexFundedRulesLayout,
  type ApexRulesRow,
} from "@/lib/journal/apex-journal-rules";
import { formatUsdWholeGrouped } from "@/lib/prop-firms";
import { TRADEIFY_GROWTH_FUNDED_FROM_CSV } from "@/lib/journal/tradeify-growth-funded-csv.generated";
import {
  TRADEIFY_LIGHTNING_FUNDED_FROM_CSV,
  type TradeifyLightningFundedCsvRow,
  type TradeifyLightningSize,
} from "@/lib/journal/tradeify-lightning-funded-csv.generated";
import { TRADEIFY_SELECT_DAILY_FUNDED_FROM_CSV } from "@/lib/journal/tradeify-select-daily-funded-csv.generated";
import { TRADEIFY_SELECT_FLEX_FUNDED_FROM_CSV } from "@/lib/journal/tradeify-select-flex-funded-csv.generated";

type TradeifySize = "25k" | "50k" | "100k" | "150k";

type GrowthEval = {
  overnight: string;
  tradingNews: string;
  maxDrawdownUsd: number;
  dllUsd: number | null;
  targetUsd: number;
  consistency: string;
  minDays: number;
};

export type GrowthFunded = {
  overnight: string;
  tradingNews: string;
  sizing: string;
  maxDrawdownUsd: number;
  dllUsd: number | null;
  bufferUsd: number;
  payoutConsistency: string;
  /** Ratio décimal issu du CSV (ex. 0.35 pour 35 %). */
  payoutConsistencyRatio: number;
  minDays: number;
  minProfitPerDayUsd: number;
  payoutMiniUsd: number;
  payout1st: number;
  payout2nd: number;
  payout3rd: number;
  payout4th: number;
  profitSplit: string;
};

type SelectEval = {
  overnight: string;
  tradingNews: string;
  maxDrawdownUsd: number;
  dllDisplay: string;
  targetUsd: number;
  consistency: string;
  minDays: number;
};

export type SelectDailyFunded = {
  overnight: string;
  tradingNews: string;
  sizing: string;
  maxDrawdownUsd: number;
  dllUsd: number | null;
  bufferUsd: number;
  payoutConsistencyDisplay: string;
  minDays: number;
  minProfitDisplay: string;
  payoutMiniUsd: number;
  payoutMaxUsd: number;
  profitSplit: string;
};

export type SelectFlexFunded = {
  overnight: string;
  tradingNews: string;
  sizing: string;
  maxDrawdownUsd: number;
  minDays: number;
  minProfitPerDayUsd: number;
  /** Select Flex: no CSV payout minimum — 0 shows as "—" in rules. */
  payoutMiniUsd: number;
  payoutMaxUsd: number;
  profitSplit: string;
  notes: string;
};

const GROWTH_EVAL: Record<TradeifySize, GrowthEval> = {
  "25k": {
    overnight: "No",
    tradingNews: "Yes",
    maxDrawdownUsd: 1000,
    dllUsd: 600,
    targetUsd: 1500,
    consistency: "100%",
    minDays: 1,
  },
  "50k": {
    overnight: "No",
    tradingNews: "Yes",
    maxDrawdownUsd: 2000,
    dllUsd: 1250,
    targetUsd: 3000,
    consistency: "100%",
    minDays: 1,
  },
  "100k": {
    overnight: "No",
    tradingNews: "Yes",
    maxDrawdownUsd: 3500,
    dllUsd: 2500,
    targetUsd: 6000,
    consistency: "100%",
    minDays: 1,
  },
  "150k": {
    overnight: "No",
    tradingNews: "Yes",
    maxDrawdownUsd: 5000,
    dllUsd: 3750,
    targetUsd: 9000,
    consistency: "100%",
    minDays: 1,
  },
};

const GROWTH_FUNDED: Record<TradeifySize, GrowthFunded> = {
  "25k": {
    overnight: "No",
    tradingNews: "Yes",
    sizing: "1 mini / 10 micros",
    maxDrawdownUsd: 1000,
    dllUsd: 600,
    bufferUsd: 1500,
    payoutConsistency: "35%",
    payoutConsistencyRatio: 0.35,
    minDays: 5,
    minProfitPerDayUsd: 100,
    payoutMiniUsd: 250,
    payout1st: 1000,
    payout2nd: 1000,
    payout3rd: 1000,
    payout4th: 1000,
    profitSplit: "90%",
  },
  "50k": {
    overnight: "No",
    tradingNews: "Yes",
    sizing: "4 minis / 40 micros",
    maxDrawdownUsd: 2000,
    dllUsd: 1250,
    bufferUsd: 3000,
    payoutConsistency: "35%",
    payoutConsistencyRatio: 0.35,
    minDays: 5,
    minProfitPerDayUsd: 150,
    payoutMiniUsd: 500,
    payout1st: 1500,
    payout2nd: 2000,
    payout3rd: 2500,
    payout4th: 3000,
    profitSplit: "90%",
  },
  "100k": {
    overnight: "No",
    tradingNews: "Yes",
    sizing: "8 minis / 80 micros",
    maxDrawdownUsd: 3500,
    dllUsd: 2500,
    bufferUsd: 4500,
    payoutConsistency: "35%",
    payoutConsistencyRatio: 0.35,
    minDays: 5,
    minProfitPerDayUsd: 200,
    payoutMiniUsd: 1000,
    payout1st: 2000,
    payout2nd: 2500,
    payout3rd: 3000,
    payout4th: 4000,
    profitSplit: "90%",
  },
  "150k": {
    overnight: "No",
    tradingNews: "Yes",
    sizing: "12 minis / 120 micros",
    maxDrawdownUsd: 5000,
    dllUsd: 3750,
    bufferUsd: 6500,
    payoutConsistency: "35%",
    payoutConsistencyRatio: 0.35,
    minDays: 5,
    minProfitPerDayUsd: 250,
    payoutMiniUsd: 1500,
    payout1st: 2500,
    payout2nd: 3000,
    payout3rd: 4000,
    payout4th: 5000,
    profitSplit: "90%",
  },
};

const SELECT_EVAL: Record<TradeifySize, SelectEval> = {
  "25k": {
    overnight: "No",
    tradingNews: "Yes",
    maxDrawdownUsd: 1000,
    dllDisplay: "-",
    targetUsd: 1500,
    consistency: "40%",
    minDays: 3,
  },
  "50k": {
    overnight: "No",
    tradingNews: "Yes",
    maxDrawdownUsd: 2000,
    dllDisplay: "-",
    targetUsd: 3000,
    consistency: "40%",
    minDays: 3,
  },
  "100k": {
    overnight: "No",
    tradingNews: "Yes",
    maxDrawdownUsd: 3000,
    dllDisplay: "-",
    targetUsd: 6000,
    consistency: "40%",
    minDays: 3,
  },
  "150k": {
    overnight: "No",
    tradingNews: "Yes",
    maxDrawdownUsd: 4500,
    dllDisplay: "-",
    targetUsd: 9000,
    consistency: "40%",
    minDays: 3,
  },
};

/** Funded Select Flex : champs issus du CSV généré (`npm run gen:tradeify-select-flex`). */
export function buildTradeifySelectFlexFundedBlock(sk: TradeifySize): SelectFlexFunded {
  const csv = TRADEIFY_SELECT_FLEX_FUNDED_FROM_CSV[sk];
  return {
    overnight: csv.overnight,
    tradingNews: csv.tradingNews,
    sizing: csv.sizing,
    maxDrawdownUsd: csv.maxDrawdownUsd,
    minDays: csv.minTradingDays,
    minProfitPerDayUsd: csv.minProfitPerDayUsd,
    payoutMiniUsd: 0,
    payoutMaxUsd: csv.payoutMaxUsd,
    profitSplit: csv.profitSplitLabel,
    notes: csv.notes,
  };
}

/** Funded Select Daily : depuis le CSV généré (`npm run gen:tradeify-select-daily`). */
export function buildTradeifySelectDailyFundedBlock(sk: TradeifySize): SelectDailyFunded {
  const csv = TRADEIFY_SELECT_DAILY_FUNDED_FROM_CSV[sk];
  return {
    overnight: csv.overnight,
    tradingNews: csv.tradingNews,
    sizing: csv.sizing,
    maxDrawdownUsd: csv.maxDrawdownUsd,
    dllUsd: csv.dllUsd,
    bufferUsd: csv.bufferUsd,
    payoutConsistencyDisplay: "None",
    minDays: 0,
    minProfitDisplay: "—",
    payoutMiniUsd: csv.payoutMiniUsd,
    payoutMaxUsd: csv.payoutMaxUsd,
    profitSplit: csv.profitSplitLabel,
  };
}

function sizeKey(account: JournalAccount): TradeifySize | null {
  const s = account.sizeLabel.trim().toLowerCase();
  if (s === "25k" || s === "50k" || s === "100k" || s === "150k") return s;
  return null;
}

function programTrack(account: JournalAccount): "growth" | "select" | "lightning" | null {
  const p = account.compareProgramName?.trim() || findEvalCompareRow(account)?.accountName?.trim() || "";
  if (p === "Tradeify Growth") return "growth";
  if (p === "Tradeify Select" || p === "Tradeify Select Daily" || p === "Tradeify Select Flex")
    return "select";
  if (p === "Tradeify Ligthning") return "lightning";
  return null;
}

/** Funded Growth : champs payout/buffer depuis le CSV généré ; le reste depuis le bloc statique. */
export function buildTradeifyGrowthFundedBlock(sk: TradeifySize): GrowthFunded {
  const base = GROWTH_FUNDED[sk];
  const csv = TRADEIFY_GROWTH_FUNDED_FROM_CSV[sk];
  const pct = Math.round(csv.payoutConsistencyRatio * 100);
  return {
    ...base,
    bufferUsd: csv.bufferUsd,
    payoutConsistency: `${pct}%`,
    payoutConsistencyRatio: csv.payoutConsistencyRatio,
    minDays: csv.minTradingDays,
    minProfitPerDayUsd: csv.minProfitPerDayUsd,
    payoutMiniUsd: csv.payoutMiniUsd,
    payout1st: csv.payout1stUsd,
    payout2nd: csv.payout2ndUsd,
    payout3rd: csv.payout3rdUsd,
    payout4th: csv.payout4thPlusUsd,
    profitSplit: csv.profitSplitLabel,
  };
}

export function getTradeifyGrowthFundedBlockForAccount(account: JournalAccount): GrowthFunded | null {
  if (!isTradeifyJournalAccount(account)) return null;
  if (account.accountType !== "funded" && account.accountType !== "live") return null;
  if (programTrack(account) !== "growth") return null;
  const sk = sizeKey(account);
  if (!sk) return null;
  return buildTradeifyGrowthFundedBlock(sk);
}

export function getTradeifySelectFlexFundedBlockForAccount(account: JournalAccount): SelectFlexFunded | null {
  if (!isTradeifyJournalAccount(account)) return null;
  if (account.accountType !== "funded" && account.accountType !== "live") return null;
  if (account.compareProgramName?.trim() !== "Tradeify Select Flex") return null;
  const sk = sizeKey(account);
  if (!sk) return null;
  return buildTradeifySelectFlexFundedBlock(sk);
}

export function isTradeifySelectFlexFundedJournalAccount(account: JournalAccount): boolean {
  return getTradeifySelectFlexFundedBlockForAccount(account) != null;
}

export function getTradeifySelectDailyFundedBlockForAccount(account: JournalAccount): SelectDailyFunded | null {
  if (!isTradeifyJournalAccount(account)) return null;
  if (account.accountType !== "funded" && account.accountType !== "live") return null;
  if (account.compareProgramName?.trim() !== "Tradeify Select Daily") return null;
  const sk = sizeKey(account);
  if (!sk) return null;
  return buildTradeifySelectDailyFundedBlock(sk);
}

export function isTradeifySelectDailyFundedJournalAccount(account: JournalAccount): boolean {
  return getTradeifySelectDailyFundedBlockForAccount(account) != null;
}

export function isTradeifyGrowthFundedJournalAccount(account: JournalAccount): boolean {
  return getTradeifyGrowthFundedBlockForAccount(account) != null;
}

export type { TradeifyLightningFundedCsvRow, TradeifyLightningSize };

/** Lightning funded / live : règles 100 % depuis le CSV généré. */
export function getTradeifyLightningFundedRowForAccount(
  account: JournalAccount
): TradeifyLightningFundedCsvRow | null {
  if (!isTradeifyJournalAccount(account)) return null;
  if (account.accountType !== "funded" && account.accountType !== "live") return null;
  if (programTrack(account) !== "lightning") return null;
  const sk = sizeKey(account);
  if (!sk) return null;
  return TRADEIFY_LIGHTNING_FUNDED_FROM_CSV[sk as TradeifyLightningSize];
}

export function isTradeifyLightningFundedJournalAccount(account: JournalAccount): boolean {
  return getTradeifyLightningFundedRowForAccount(account) != null;
}

/** Part trader affichée (ex. `profitSplitLabel` « 90 % » → 0.9). */
export function tradeifyProfitSplitRatioFromLabel(label: string): number | null {
  const t = String(label ?? "")
    .trim()
    .replace(/\s/g, "");
  const m = t.match(/^([\d.,]+)\s*%$/);
  if (!m) return null;
  const n = Number(m[1].replace(",", "."));
  return Number.isFinite(n) && n > 0 && n <= 100 ? n / 100 : null;
}

function growthEvalLayout(ev: GrowthEval, sizing: string): ApexEvalRulesLayout {
  return {
    rules: { label: "Rules", value: "None" },
    drawdownType: { label: "Drawdown type", value: "EOD" },
    sizing: { label: "Sizing", value: sizing },
    profitTarget: { label: "Profit Target", value: formatUsdWholeGrouped(ev.targetUsd) },
    tradingNews: { label: "Trading News", value: formatAllowedFromCsv(ev.tradingNews) },
    drawdown: { label: "Drawdown", value: formatUsdWholeGrouped(ev.maxDrawdownUsd) },
    overnight: { label: "Overnight / Overweek", value: formatAllowedFromCsv(ev.overnight) },
    dll: {
      label: "DLL (Daily Loss Limit)",
      value: ev.dllUsd != null ? formatUsdWholeGrouped(ev.dllUsd) : "None",
    },
  };
}

function growthFundedLayout(fd: GrowthFunded): ApexFundedRulesLayout {
  const payoutLine = `${formatPayoutRulesConsistency(fd.payoutConsistency)}\n${formatJournalMinProfitDaysLine(fd.minDays, fd.minProfitPerDayUsd)}`;
  const payoutMax = [
    `1st: ${formatUsdWholeGrouped(fd.payout1st)}`,
    `2nd: ${formatUsdWholeGrouped(fd.payout2nd)}`,
    `3rd: ${formatUsdWholeGrouped(fd.payout3rd)}`,
    `4th+: ${formatUsdWholeGrouped(fd.payout4th)}`,
  ].join("\n");
  return {
    column1: [
      { label: "Payout rules", value: payoutLine, multiline: true },
      { label: "Trading News", value: formatAllowedFromCsv(fd.tradingNews) },
      { label: "Overnight / Overweek", value: formatAllowedFromCsv(fd.overnight) },
      { label: "Profit split", value: fd.profitSplit },
    ],
    column2: [
      { label: "Drawdown type", value: "EOD" },
      { label: "Drawdown", value: formatUsdWholeGrouped(fd.maxDrawdownUsd) },
      {
        label: "DLL",
        value: fd.dllUsd != null ? formatUsdWholeGrouped(fd.dllUsd) : "None",
      },
      { label: "Buffer", value: formatUsdWholeGrouped(fd.bufferUsd) },
    ],
    column3: [
      { label: "Sizing", value: fd.sizing },
      { label: "Payout mini", value: formatUsdWholeGrouped(fd.payoutMiniUsd) },
      { label: "Payout max", value: payoutMax, multiline: true },
    ],
  };
}

function selectEvalLayout(ev: SelectEval, sizing: string): ApexEvalRulesLayout {
  const rulesLine = `${formatPayoutRulesConsistency(ev.consistency)}\n${ev.minDays} min trading day(s)`;
  return {
    rules: { label: "Rules", value: rulesLine, multiline: true },
    drawdownType: { label: "Drawdown type", value: "EOD" },
    sizing: { label: "Sizing", value: sizing },
    profitTarget: { label: "Profit Target", value: formatUsdWholeGrouped(ev.targetUsd) },
    tradingNews: { label: "Trading News", value: formatAllowedFromCsv(ev.tradingNews) },
    drawdown: { label: "Drawdown", value: formatUsdWholeGrouped(ev.maxDrawdownUsd) },
    overnight: { label: "Overnight / Overweek", value: formatAllowedFromCsv(ev.overnight) },
    dll: { label: "DLL (Daily Loss Limit)", value: formatEvalDllDisplay(ev.dllDisplay) },
  };
}

function selectDailyFundedLayout(fd: SelectDailyFunded): ApexFundedRulesLayout {
  return {
    column1: [
      { label: "Payout rules", value: "None" },
      { label: "Trading News", value: formatAllowedFromCsv(fd.tradingNews) },
      { label: "Overnight / Overweek", value: formatAllowedFromCsv(fd.overnight) },
      { label: "Profit split", value: fd.profitSplit },
    ],
    column2: [
      { label: "Drawdown type", value: "EOD" },
      { label: "Drawdown", value: formatUsdWholeGrouped(fd.maxDrawdownUsd) },
      {
        label: "DLL",
        value: fd.dllUsd != null ? formatUsdWholeGrouped(fd.dllUsd) : "None",
      },
      { label: "Buffer", value: formatUsdWholeGrouped(fd.bufferUsd) },
    ],
    column3: [
      { label: "Sizing", value: fd.sizing },
      { label: "Payout mini", value: formatUsdWholeGrouped(fd.payoutMiniUsd) },
      { label: "Payout max", value: formatUsdWholeGrouped(fd.payoutMaxUsd) },
    ],
  };
}

function selectFlexFundedLayout(fd: SelectFlexFunded): ApexFundedRulesLayout {
  const payoutRulesValue = formatJournalMinProfitDaysLine(fd.minDays, fd.minProfitPerDayUsd);
  return {
    column1: [
      {
        label: "Payout rules",
        value: payoutRulesValue,
        multiline: true,
      },
      { label: "Trading News", value: formatAllowedFromCsv(fd.tradingNews) },
      { label: "Overnight / Overweek", value: formatAllowedFromCsv(fd.overnight) },
      { label: "Profit split", value: fd.profitSplit },
    ],
    column2: [
      { label: "Drawdown type", value: "EOD" },
      { label: "Drawdown", value: formatUsdWholeGrouped(fd.maxDrawdownUsd) },
      { label: "DLL", value: "None" },
      { label: "Buffer", value: "—" },
    ],
    column3: [
      { label: "Sizing", value: fd.sizing },
      {
        label: "Payout mini",
        value: fd.payoutMiniUsd > 0 ? formatUsdWholeGrouped(fd.payoutMiniUsd) : "—",
      },
      { label: "Payout max", value: formatUsdWholeGrouped(fd.payoutMaxUsd) },
      { label: "Notes", value: fd.notes, multiline: true },
    ],
  };
}

function lightningLayout(L: TradeifyLightningFundedCsvRow): ApexFundedRulesLayout {
  const goals = `1st cycle: ${formatUsdWholeGrouped(L.profitGoal1stCycleUsd)}\n2nd+ cycles: ${formatUsdWholeGrouped(L.profitGoal2PlusCycleUsd)}`;
  const payoutMax = [
    `1st: ${formatUsdWholeGrouped(L.payoutMax1stUsd)}`,
    `2nd: ${formatUsdWholeGrouped(L.payoutMax2ndUsd)}`,
    `3rd: ${formatUsdWholeGrouped(L.payoutMax3rdUsd)}`,
    `4th+: ${formatUsdWholeGrouped(L.payoutMax4thPlusUsd)}`,
  ].join("\n");
  const payoutRulesValue = `${formatPayoutRulesConsistency(L.payoutConsistencyDisplay)}\nNo minimum trading days required for payout.`;
  return {
    column1: [
      {
        label: "Payout rules",
        value: payoutRulesValue,
        multiline: true,
      },
      { label: "Trading News", value: formatAllowedFromCsv(L.tradingNews) },
      { label: "Overnight / Overweek", value: formatAllowedFromCsv(L.overnight) },
      { label: "Profit split", value: L.profitSplitLabel },
    ],
    column2: [
      { label: "Drawdown type", value: L.drawdownType || "EOD" },
      { label: "Drawdown", value: formatUsdWholeGrouped(L.drawdownUsd) },
      {
        label: "DLL",
        value: L.dllUsd != null ? formatUsdWholeGrouped(L.dllUsd) : "None",
      },
      { label: "Profit goals", value: goals, multiline: true },
    ],
    column3: [
      { label: "Sizing", value: L.sizing },
      { label: "Payout mini", value: formatUsdWholeGrouped(L.payoutMiniUsd) },
      { label: "Payout max", value: payoutMax, multiline: true },
    ],
  };
}

export function isTradeifyJournalAccount(account: JournalAccount): boolean {
  return account.propFirm.name.trim() === "Tradeify";
}

export function resolveTradeifyAccountRulesCard(
  _state: JournalDataV1,
  account: JournalAccount
): ApexAccountRulesCard | null {
  if (!isTradeifyJournalAccount(account)) return null;
  const sk = sizeKey(account);
  if (!sk) return null;
  const track = programTrack(account);
  if (!track) return null;
  const row = findEvalCompareRow(account);
  const sizing = row?.rules.sizing?.trim() && row.rules.sizing !== "—" ? row.rules.sizing : "—";

  const isFundedType = account.accountType === "funded" || account.accountType === "live";
  const isPassedChallenge = account.accountType === "challenge" && account.status === "passed";
  const prog = account.compareProgramName?.trim() ?? "";

  if (track === "lightning") {
    return {
      phase: "funded",
      fundedLayout: lightningLayout(TRADEIFY_LIGHTNING_FUNDED_FROM_CSV[sk as TradeifyLightningSize]),
    };
  }

  if (track === "growth") {
    if (!isFundedType && !isPassedChallenge) {
      return { phase: "eval", evalLayout: growthEvalLayout(GROWTH_EVAL[sk], sizing) };
    }
    return { phase: "funded", fundedLayout: growthFundedLayout(buildTradeifyGrowthFundedBlock(sk)) };
  }

  if (track === "select") {
    if (!isFundedType && !isPassedChallenge) {
      return { phase: "eval", evalLayout: selectEvalLayout(SELECT_EVAL[sk], sizing) };
    }
    if (isPassedChallenge && prog === "Tradeify Select") {
      return { phase: "eval", evalLayout: selectEvalLayout(SELECT_EVAL[sk], sizing) };
    }
    if (prog === "Tradeify Select Flex") {
      return { phase: "funded", fundedLayout: selectFlexFundedLayout(buildTradeifySelectFlexFundedBlock(sk)) };
    }
    return { phase: "funded", fundedLayout: selectDailyFundedLayout(buildTradeifySelectDailyFundedBlock(sk)) };
  }

  return null;
}
