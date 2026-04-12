/**
 * Règles Bulenox — alignées sur « Bulenox Rules.csv » (éval + funded).
 * Clé : `compareProgramName` + `sizeLabel` (ex. Bulenox Opt. 1 · 25k).
 */
import { findEvalCompareRow } from "@/lib/journal/compare-account-helpers";
import type { JournalAccount, JournalDataV1 } from "@/lib/journal/types";
import {
  formatAllowedFromCsv,
  formatApexDrawdownType,
  formatEvalDllDisplay,
  formatPayoutRulesConsistency,
  type ApexAccountRulesCard,
  type ApexEvalRulesLayout,
  type ApexFundedRulesLayout,
  type ApexRulesRow,
} from "@/lib/journal/apex-journal-rules";
import { formatUsdWholeGrouped } from "@/lib/prop-firms";

type BulenoxEvalBlock = {
  /** Colonne Overnight / Overweek éval (USD, ex. marge overnight). */
  overnightUsd: number | null;
  tradingNews: string;
  drawdownTypeRaw: string;
  maxDrawdownUsd: number;
  dllCsv: string;
  targetEvalUsd: number;
  consistencyRules: string;
  minTradingDays: number;
};

type BulenoxFundedBlock = {
  overnightOverweek: string;
  tradingNews: string;
  sizing: string;
  drawdownTypeRaw: string;
  maxDrawdownUsd: number;
  dllCsv: string;
  bufferUsd: number;
  payoutConsistency: string;
  minTradingDays: number;
  payoutMiniUsd: number;
  payoutMax1stUsd: number;
  payoutMax2ndPlusUsd: number;
  payoutMax3rdUsd: number;
  profitSplit: string;
  notes: string;
};

type BulenoxBundle = { eval: BulenoxEvalBlock; funded: BulenoxFundedBlock };

function formatBulenoxEvalOvernight(ev: BulenoxEvalBlock): string {
  if (ev.overnightUsd != null) return formatUsdWholeGrouped(ev.overnightUsd);
  return "—";
}

/** Payout max Bulenox funded : 3e palier = montant colonne « 1st », puis pas de plafond. */
function formatBulenoxPayoutMax(fd: BulenoxFundedBlock): string {
  return `3st: ${formatUsdWholeGrouped(fd.payoutMax1stUsd)} then no limit`;
}

function buildBulenoxEvalLayout(ev: BulenoxEvalBlock, sizingDisplay: string): ApexEvalRulesLayout {
  return {
    rules: { label: "Rules", value: "None" },
    drawdownType: {
      label: "Drawdown type",
      value: formatApexDrawdownType(ev.drawdownTypeRaw),
    },
    sizing: { label: "Sizing", value: sizingDisplay },
    profitTarget: {
      label: "Profit Target",
      value: formatUsdWholeGrouped(ev.targetEvalUsd),
    },
    tradingNews: {
      label: "Trading News",
      value: formatAllowedFromCsv(ev.tradingNews),
    },
    drawdown: {
      label: "Drawdown",
      value: formatUsdWholeGrouped(ev.maxDrawdownUsd),
    },
    overnight: {
      label: "Overnight / Overweek",
      value: formatBulenoxEvalOvernight(ev),
    },
    dll: {
      label: "DLL (Daily Loss Limit)",
      value: formatEvalDllDisplay(ev.dllCsv),
    },
  };
}

function buildBulenoxFundedLayout(fd: BulenoxFundedBlock): ApexFundedRulesLayout {
  const payoutRules: ApexRulesRow = {
    label: "Payout rules",
    value: formatPayoutRulesConsistency(fd.payoutConsistency),
  };

  const column1: ApexRulesRow[] = [
    payoutRules,
    {
      label: "Trading News",
      value: formatAllowedFromCsv(fd.tradingNews),
    },
    {
      label: "Overnight / Overweek",
      value: formatAllowedFromCsv(fd.overnightOverweek),
    },
    { label: "Profit split", value: fd.profitSplit.trim() || "—" },
  ];

  const column2: ApexRulesRow[] = [
    {
      label: "Drawdown type",
      value: formatApexDrawdownType(fd.drawdownTypeRaw),
    },
    {
      label: "Drawdown",
      value: formatUsdWholeGrouped(fd.maxDrawdownUsd),
    },
    {
      label: "DLL",
      value: formatEvalDllDisplay(fd.dllCsv),
    },
    { label: "Buffer", value: formatUsdWholeGrouped(fd.bufferUsd) },
  ];

  const column3: ApexRulesRow[] = [
    { label: "Sizing", value: fd.sizing.trim() || "—" },
    {
      label: "Payout mini",
      value: formatUsdWholeGrouped(fd.payoutMiniUsd),
    },
    {
      label: "Payout max",
      value: formatBulenoxPayoutMax(fd),
    },
    { label: "Notes", value: fd.notes, multiline: true },
  ];

  return { column1, column2, column3 };
}

/** Données par programme Bulenox + taille (CSV lignes 1–10). */
const BULENOX_BY_PROGRAM_SIZE: Record<string, BulenoxBundle> = {
  "Bulenox Opt. 1|25k": {
    eval: {
      overnightUsd: 1500,
      tradingNews: "Yes",
      drawdownTypeRaw: "Trail",
      maxDrawdownUsd: 1500,
      dllCsv: "No",
      targetEvalUsd: 1500,
      consistencyRules: "100%",
      minTradingDays: 1,
    },
    funded: {
      overnightOverweek: "No",
      tradingNews: "Yes",
      sizing: "3 minis / 30 micros",
      drawdownTypeRaw: "Trail",
      maxDrawdownUsd: 1500,
      dllCsv: "No",
      bufferUsd: 1600,
      payoutConsistency: "40%",
      minTradingDays: 3,
      payoutMiniUsd: 1000,
      payoutMax1stUsd: 1000,
      payoutMax2ndPlusUsd: 1000,
      payoutMax3rdUsd: 1000,
      profitSplit: "100%",
      notes: "Profit split 90% after the first $10,000",
    },
  },
  "Bulenox Opt. 2|25k": {
    eval: {
      overnightUsd: 1500,
      tradingNews: "Yes",
      drawdownTypeRaw: "EOD",
      maxDrawdownUsd: 1500,
      dllCsv: "$500",
      targetEvalUsd: 1500,
      consistencyRules: "100%",
      minTradingDays: 1,
    },
    funded: {
      overnightOverweek: "No",
      tradingNews: "Yes",
      sizing: "3 minis / 30 micros",
      drawdownTypeRaw: "Trail",
      maxDrawdownUsd: 1500,
      dllCsv: "No",
      bufferUsd: 1600,
      payoutConsistency: "40%",
      minTradingDays: 3,
      payoutMiniUsd: 1000,
      payoutMax1stUsd: 1000,
      payoutMax2ndPlusUsd: 1000,
      payoutMax3rdUsd: 1000,
      profitSplit: "100%",
      notes: "Profit split 90% after the first $10,000",
    },
  },
  "Bulenox Opt. 1|50k": {
    eval: {
      overnightUsd: 2500,
      tradingNews: "Yes",
      drawdownTypeRaw: "Trail",
      maxDrawdownUsd: 2500,
      dllCsv: "No",
      targetEvalUsd: 3000,
      consistencyRules: "100%",
      minTradingDays: 1,
    },
    funded: {
      overnightOverweek: "No",
      tradingNews: "Yes",
      sizing: "7 minis / 70 micros",
      drawdownTypeRaw: "Trail",
      maxDrawdownUsd: 2500,
      dllCsv: "No",
      bufferUsd: 2600,
      payoutConsistency: "40%",
      minTradingDays: 3,
      payoutMiniUsd: 1000,
      payoutMax1stUsd: 1500,
      payoutMax2ndPlusUsd: 1500,
      payoutMax3rdUsd: 1500,
      profitSplit: "100%",
      notes: "Profit split 90% after the first $10,000",
    },
  },
  "Bulenox Opt. 2|50k": {
    eval: {
      overnightUsd: 2500,
      tradingNews: "Yes",
      drawdownTypeRaw: "EOD",
      maxDrawdownUsd: 2500,
      dllCsv: "$1,100",
      targetEvalUsd: 3000,
      consistencyRules: "100%",
      minTradingDays: 1,
    },
    funded: {
      overnightOverweek: "No",
      tradingNews: "Yes",
      sizing: "7 minis / 70 micros",
      drawdownTypeRaw: "Trail",
      maxDrawdownUsd: 2500,
      dllCsv: "No",
      bufferUsd: 2600,
      payoutConsistency: "40%",
      minTradingDays: 3,
      payoutMiniUsd: 1000,
      payoutMax1stUsd: 1500,
      payoutMax2ndPlusUsd: 1500,
      payoutMax3rdUsd: 1500,
      profitSplit: "100%",
      notes: "Profit split 90% after the first $10,000",
    },
  },
  "Bulenox Opt. 1|100k": {
    eval: {
      overnightUsd: 3500,
      tradingNews: "Yes",
      drawdownTypeRaw: "Trail",
      maxDrawdownUsd: 3000,
      dllCsv: "No",
      targetEvalUsd: 6000,
      consistencyRules: "100%",
      minTradingDays: 1,
    },
    funded: {
      overnightOverweek: "No",
      tradingNews: "Yes",
      sizing: "12 minis / 120 micros",
      drawdownTypeRaw: "Trail",
      maxDrawdownUsd: 3000,
      dllCsv: "No",
      bufferUsd: 3100,
      payoutConsistency: "40%",
      minTradingDays: 3,
      payoutMiniUsd: 1000,
      payoutMax1stUsd: 1750,
      payoutMax2ndPlusUsd: 1750,
      payoutMax3rdUsd: 1750,
      profitSplit: "100%",
      notes: "Profit split 90% after the first $10,000",
    },
  },
  "Bulenox Opt. 2|100k": {
    eval: {
      overnightUsd: 3500,
      tradingNews: "Yes",
      drawdownTypeRaw: "EOD",
      maxDrawdownUsd: 3000,
      dllCsv: "$2,200",
      targetEvalUsd: 6000,
      consistencyRules: "100%",
      minTradingDays: 1,
    },
    funded: {
      overnightOverweek: "No",
      tradingNews: "Yes",
      sizing: "12 minis / 120 micros",
      drawdownTypeRaw: "Trail",
      maxDrawdownUsd: 3000,
      dllCsv: "No",
      bufferUsd: 3100,
      payoutConsistency: "40%",
      minTradingDays: 3,
      payoutMiniUsd: 1000,
      payoutMax1stUsd: 1750,
      payoutMax2ndPlusUsd: 1750,
      payoutMax3rdUsd: 1750,
      profitSplit: "100%",
      notes: "Profit split 90% after the first $10,000",
    },
  },
  "Bulenox Opt. 1|150k": {
    eval: {
      overnightUsd: 4500,
      tradingNews: "Yes",
      drawdownTypeRaw: "Trail",
      maxDrawdownUsd: 4500,
      dllCsv: "No",
      targetEvalUsd: 9000,
      consistencyRules: "100%",
      minTradingDays: 1,
    },
    funded: {
      overnightOverweek: "No",
      tradingNews: "Yes",
      sizing: "15 minis / 150 micros",
      drawdownTypeRaw: "Trail",
      maxDrawdownUsd: 4500,
      dllCsv: "No",
      bufferUsd: 4600,
      payoutConsistency: "40%",
      minTradingDays: 3,
      payoutMiniUsd: 1000,
      payoutMax1stUsd: 2000,
      payoutMax2ndPlusUsd: 2000,
      payoutMax3rdUsd: 2000,
      profitSplit: "100%",
      notes: "Profit split 90% after the first $10,000",
    },
  },
  "Bulenox Opt. 2|150k": {
    eval: {
      overnightUsd: 4500,
      tradingNews: "Yes",
      drawdownTypeRaw: "EOD",
      maxDrawdownUsd: 4500,
      dllCsv: "$3,300",
      targetEvalUsd: 9000,
      consistencyRules: "100%",
      minTradingDays: 1,
    },
    funded: {
      overnightOverweek: "No",
      tradingNews: "Yes",
      sizing: "15 minis / 150 micros",
      drawdownTypeRaw: "Trail",
      maxDrawdownUsd: 4500,
      dllCsv: "No",
      bufferUsd: 4600,
      payoutConsistency: "40%",
      minTradingDays: 3,
      payoutMiniUsd: 1000,
      payoutMax1stUsd: 2000,
      payoutMax2ndPlusUsd: 2000,
      payoutMax3rdUsd: 2000,
      profitSplit: "100%",
      notes: "Profit split 90% after the first $10,000",
    },
  },
  "Bulenox Opt. 1|250k": {
    eval: {
      overnightUsd: 5500,
      tradingNews: "Yes",
      drawdownTypeRaw: "Trail",
      maxDrawdownUsd: 5500,
      dllCsv: "No",
      targetEvalUsd: 15000,
      consistencyRules: "100%",
      minTradingDays: 1,
    },
    funded: {
      overnightOverweek: "No",
      tradingNews: "Yes",
      sizing: "25 minis / 250 micros",
      drawdownTypeRaw: "Trail",
      maxDrawdownUsd: 5500,
      dllCsv: "No",
      bufferUsd: 5600,
      payoutConsistency: "40%",
      minTradingDays: 3,
      payoutMiniUsd: 1000,
      payoutMax1stUsd: 2500,
      payoutMax2ndPlusUsd: 2500,
      payoutMax3rdUsd: 2500,
      profitSplit: "100%",
      notes: "Profit split 90% after the first $10,000",
    },
  },
  "Bulenox Opt. 2|250k": {
    eval: {
      overnightUsd: 5500,
      tradingNews: "Yes",
      drawdownTypeRaw: "EOD",
      maxDrawdownUsd: 5500,
      dllCsv: "$4,500",
      targetEvalUsd: 15000,
      consistencyRules: "100%",
      minTradingDays: 1,
    },
    funded: {
      overnightOverweek: "No",
      tradingNews: "Yes",
      sizing: "25 minis / 250 micros",
      drawdownTypeRaw: "Trail",
      maxDrawdownUsd: 5500,
      dllCsv: "No",
      bufferUsd: 5600,
      payoutConsistency: "40%",
      minTradingDays: 3,
      payoutMiniUsd: 1000,
      payoutMax1stUsd: 2500,
      payoutMax2ndPlusUsd: 2500,
      payoutMax3rdUsd: 2500,
      profitSplit: "100%",
      notes: "Profit split 90% after the first $10,000",
    },
  },
};

function bulenoxBundleKey(account: JournalAccount): string | null {
  if (account.propFirm.name.trim().toLowerCase() !== "bulenox") return null;
  const size = account.sizeLabel.trim().toLowerCase();
  if (!size) return null;
  const row = findEvalCompareRow(account);
  const program = (account.compareProgramName?.trim() || row?.accountName?.trim() || "").trim();
  if (!program) return null;
  const key = `${program}|${size}`;
  return BULENOX_BY_PROGRAM_SIZE[key] != null ? key : null;
}

export function isBulenoxJournalAccount(account: JournalAccount): boolean {
  return bulenoxBundleKey(account) != null;
}

export function resolveBulenoxAccountRulesCard(
  _state: JournalDataV1,
  account: JournalAccount
): ApexAccountRulesCard | null {
  const key = bulenoxBundleKey(account);
  if (!key) return null;
  const bundle = BULENOX_BY_PROGRAM_SIZE[key]!;
  const { eval: ev, funded: fd } = bundle;
  const compareRow = findEvalCompareRow(account);
  const sizingRaw = compareRow?.rules.sizing?.trim() ?? "";
  const sizingDisplay = sizingRaw && sizingRaw !== "—" ? sizingRaw : fd.sizing;

  if (account.accountType === "funded" || account.accountType === "live") {
    return { phase: "funded", fundedLayout: buildBulenoxFundedLayout(fd) };
  }

  if (account.accountType === "challenge" && account.status === "passed") {
    return { phase: "funded", fundedLayout: buildBulenoxFundedLayout(fd) };
  }

  if (account.accountType === "challenge") {
    return {
      phase: "eval",
      evalLayout: buildBulenoxEvalLayout(ev, sizingDisplay),
    };
  }

  return null;
}
