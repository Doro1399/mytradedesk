import { findEvalCompareRow, findFundedCompareRow } from "@/lib/journal/compare-account-helpers";
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
import { FIFTY_PERCENT_ACCOUNT_BALANCE_PAYOUT_NOTE } from "@/lib/journal/fifty-percent-payout-note";

/** Données issues de Lucid Trading Rules.csv (Pro/Flex éval + funded, Direct funded). */
type LucidSize = "25k" | "50k" | "100k" | "150k";

type LucidEvalBlock = {
  overnight: string;
  tradingNews: string;
  drawdownUsd: number;
  dllCsv: string;
  profitTargetUsd: number;
  consistencyPct: string;
  minTradingDays: number;
};

export type LucidProFundedBlock = {
  overnight: string;
  tradingNews: string;
  drawdownUsd: number;
  dllUsd: number | null;
  bufferUsd: number;
  consistencyPct: string;
  minTradingDays: number;
  payoutMiniUsd: number;
  payoutMax1stUsd: number;
  payoutMaxSubsequentUsd: number;
  profitSplit: string;
};

/**
 * Ratio σ de la colonne consistency (ex. `"40%"` → `0.4`). Si la valeur est absente ou illisible, retourne `null`
 * (aucune contrainte de consistance au-delà de `payout_mini`).
 */
export function parseLucidProFundedConsistencyRatio(block: LucidProFundedBlock): number | null {
  const p = block.consistencyPct.trim();
  if (!p) return null;
  const pctMatch = p.match(/^([\d.,]+)\s*%$/);
  if (pctMatch) {
    const v = Number(pctMatch[1].replace(",", "."));
    if (Number.isFinite(v) && v > 0 && v <= 100) return v / 100;
    return null;
  }
  const n = Number(p.replace(",", "."));
  if (!Number.isFinite(n) || n <= 0) return null;
  if (n <= 1) return n;
  if (n <= 100) return n / 100;
  return null;
}

/** Règles funded Lucid Flex (CSV Lucid Trading Rules). */
export type LucidFlexFundedBlock = {
  overnight: string;
  tradingNews: string;
  drawdownUsd: number;
  minTradingDays: number;
  minProfitPerDayUsd: number;
  payoutMiniUsd: number;
  payoutMaxUsd: number;
  profitSplit: string;
  notes: string;
};

export type LucidDirectFundedBlock = {
  overnight: string;
  tradingNews: string;
  sizing: string;
  drawdownUsd: number;
  dllUsd: number | null;
  profitGoal1stUsd: number;
  profitGoalAfter1stUsd: number;
  consistencyPct: string;
  payoutMiniUsd: number;
  payouts1stTo6thUsd: readonly number[];
  profitSplit: string;
};

const LUCID_PRO_EVAL: Record<LucidSize, LucidEvalBlock> = {
  "25k": {
    overnight: "No",
    tradingNews: "Yes",
    drawdownUsd: 1000,
    dllCsv: "No",
    profitTargetUsd: 1250,
    consistencyPct: "100%",
    minTradingDays: 1,
  },
  "50k": {
    overnight: "No",
    tradingNews: "Yes",
    drawdownUsd: 2000,
    dllCsv: "$1,200",
    profitTargetUsd: 3000,
    consistencyPct: "100%",
    minTradingDays: 1,
  },
  "100k": {
    overnight: "No",
    tradingNews: "Yes",
    drawdownUsd: 3000,
    dllCsv: "$1,800",
    profitTargetUsd: 6000,
    consistencyPct: "100%",
    minTradingDays: 1,
  },
  "150k": {
    overnight: "No",
    tradingNews: "Yes",
    drawdownUsd: 4500,
    dllCsv: "$2,700",
    profitTargetUsd: 9000,
    consistencyPct: "100%",
    minTradingDays: 1,
  },
};

const LUCID_FLEX_EVAL: Record<LucidSize, LucidEvalBlock> = {
  "25k": { ...LUCID_PRO_EVAL["25k"], consistencyPct: "50%", minTradingDays: 2 },
  "50k": { ...LUCID_PRO_EVAL["50k"], consistencyPct: "50%", minTradingDays: 2 },
  "100k": { ...LUCID_PRO_EVAL["100k"], consistencyPct: "50%", minTradingDays: 2 },
  "150k": { ...LUCID_PRO_EVAL["150k"], consistencyPct: "50%", minTradingDays: 2 },
};

const LUCID_PRO_FUNDED: Record<LucidSize, LucidProFundedBlock> = {
  "25k": {
    overnight: "No",
    tradingNews: "Yes",
    drawdownUsd: 1000,
    dllUsd: null,
    bufferUsd: 1100,
    consistencyPct: "40%",
    minTradingDays: 3,
    payoutMiniUsd: 250,
    payoutMax1stUsd: 1000,
    payoutMaxSubsequentUsd: 1500,
    profitSplit: "90%",
  },
  "50k": {
    overnight: "No",
    tradingNews: "Yes",
    drawdownUsd: 2000,
    dllUsd: 1200,
    bufferUsd: 2100,
    consistencyPct: "40%",
    minTradingDays: 3,
    payoutMiniUsd: 500,
    payoutMax1stUsd: 2000,
    payoutMaxSubsequentUsd: 2500,
    profitSplit: "90%",
  },
  "100k": {
    overnight: "No",
    tradingNews: "Yes",
    drawdownUsd: 3000,
    dllUsd: 1800,
    bufferUsd: 3100,
    consistencyPct: "40%",
    minTradingDays: 3,
    payoutMiniUsd: 750,
    payoutMax1stUsd: 2500,
    payoutMaxSubsequentUsd: 3000,
    profitSplit: "90%",
  },
  "150k": {
    overnight: "No",
    tradingNews: "Yes",
    drawdownUsd: 4500,
    dllUsd: 2700,
    bufferUsd: 4600,
    consistencyPct: "40%",
    minTradingDays: 3,
    payoutMiniUsd: 1000,
    payoutMax1stUsd: 3000,
    payoutMaxSubsequentUsd: 3500,
    profitSplit: "90%",
  },
};

const LUCID_FLEX_FUNDED: Record<LucidSize, LucidFlexFundedBlock> = {
  "25k": {
    overnight: "No",
    tradingNews: "Yes",
    drawdownUsd: 1000,
    minTradingDays: 5,
    minProfitPerDayUsd: 100,
    payoutMiniUsd: 500,
    payoutMaxUsd: 1000,
    profitSplit: "90%",
    notes: FIFTY_PERCENT_ACCOUNT_BALANCE_PAYOUT_NOTE,
  },
  "50k": {
    overnight: "No",
    tradingNews: "Yes",
    drawdownUsd: 2000,
    minTradingDays: 5,
    minProfitPerDayUsd: 150,
    payoutMiniUsd: 500,
    payoutMaxUsd: 2000,
    profitSplit: "90%",
    notes: FIFTY_PERCENT_ACCOUNT_BALANCE_PAYOUT_NOTE,
  },
  "100k": {
    overnight: "No",
    tradingNews: "Yes",
    drawdownUsd: 3000,
    minTradingDays: 5,
    minProfitPerDayUsd: 200,
    payoutMiniUsd: 500,
    payoutMaxUsd: 2500,
    profitSplit: "90%",
    notes: FIFTY_PERCENT_ACCOUNT_BALANCE_PAYOUT_NOTE,
  },
  "150k": {
    overnight: "No",
    tradingNews: "Yes",
    drawdownUsd: 4500,
    minTradingDays: 5,
    minProfitPerDayUsd: 250,
    payoutMiniUsd: 500,
    payoutMaxUsd: 3000,
    profitSplit: "90%",
    notes: FIFTY_PERCENT_ACCOUNT_BALANCE_PAYOUT_NOTE,
  },
};

const LUCID_DIRECT: Record<LucidSize, LucidDirectFundedBlock> = {
  "25k": {
    overnight: "No",
    tradingNews: "Yes",
    sizing: "2 minis / 20 micros",
    drawdownUsd: 1000,
    dllUsd: null,
    profitGoal1stUsd: 1500,
    profitGoalAfter1stUsd: 1250,
    consistencyPct: "20%",
    payoutMiniUsd: 500,
    payouts1stTo6thUsd: [1000, 1000, 1000, 1000, 1000, 1000],
    profitSplit: "90%",
  },
  "50k": {
    overnight: "No",
    tradingNews: "Yes",
    sizing: "4 minis / 40 micros",
    drawdownUsd: 2000,
    dllUsd: 1200,
    profitGoal1stUsd: 3000,
    profitGoalAfter1stUsd: 2500,
    consistencyPct: "20%",
    payoutMiniUsd: 500,
    payouts1stTo6thUsd: [2000, 2000, 2000, 2500, 2500, 2500],
    profitSplit: "90%",
  },
  "100k": {
    overnight: "No",
    tradingNews: "Yes",
    sizing: "6 minis / 60 micros",
    drawdownUsd: 3500,
    dllUsd: 2100,
    profitGoal1stUsd: 6000,
    profitGoalAfter1stUsd: 3500,
    consistencyPct: "20%",
    payoutMiniUsd: 500,
    payouts1stTo6thUsd: [2500, 2500, 2500, 3000, 3000, 3000],
    profitSplit: "90%",
  },
  "150k": {
    overnight: "No",
    tradingNews: "Yes",
    sizing: "10 minis / 100 micros",
    drawdownUsd: 5000,
    dllUsd: 3000,
    profitGoal1stUsd: 9000,
    profitGoalAfter1stUsd: 4500,
    consistencyPct: "20%",
    payoutMiniUsd: 500,
    payouts1stTo6thUsd: [3000, 3000, 3000, 3500, 3500, 3500],
    profitSplit: "90%",
  },
};

const PAYOUT_ORDINAL_LABELS = ["1st", "2nd", "3rd", "4th", "5th", "6th"] as const;

function formatPayoutCapsMultiline(
  firstUsd: number,
  subsequentUsd: number
): string {
  return `1st: ${formatUsdWholeGrouped(firstUsd)}\n2nd+: ${formatUsdWholeGrouped(subsequentUsd)}`;
}

function formatSixPayoutsMultiline(amounts: readonly number[]): string {
  return amounts
    .map((v, i) => {
      const label = PAYOUT_ORDINAL_LABELS[i] ?? `${i + 1}th`;
      return `${label}: ${formatUsdWholeGrouped(v)}`;
    })
    .join("\n");
}

export function isLucidTradingJournalAccount(account: JournalAccount): boolean {
  return account.propFirm.name.trim().toLowerCase() === "lucid trading";
}

/** Données payout funded Lucid Pro (CSV) pour la taille du compte, ou null. */
export function getLucidProFundedCsvRow(account: JournalAccount): LucidProFundedBlock | null {
  if (!isLucidTradingJournalAccount(account)) return null;
  const p = account.compareProgramName?.trim();
  if (p !== "LucidPro") {
    const ev = findEvalCompareRow(account);
    if (ev?.accountName?.trim() !== "LucidPro") return null;
  }
  const s = account.sizeLabel.trim().toLowerCase().replace(/\s+/g, "");
  if (s !== "25k" && s !== "50k" && s !== "100k" && s !== "150k") return null;
  return LUCID_PRO_FUNDED[s];
}

/** Compte Lucid Pro en funded / live uniquement (pas Flex / Direct). */
export function isLucidProFundedJournalAccount(account: JournalAccount): boolean {
  if (!isLucidTradingJournalAccount(account)) return false;
  if (account.accountType !== "funded" && account.accountType !== "live") return false;
  const p = account.compareProgramName?.trim();
  if (p === "LucidPro") return true;
  const ev = findEvalCompareRow(account);
  return ev?.accountName?.trim() === "LucidPro";
}

/** Compte Lucid Flex en funded / live uniquement (pas Pro / Direct / challenge). */
export function isLucidFlexFundedJournalAccount(account: JournalAccount): boolean {
  if (!isLucidTradingJournalAccount(account)) return false;
  if (account.accountType !== "funded" && account.accountType !== "live") return false;
  const p = account.compareProgramName?.trim();
  if (p === "LucidFlex") return true;
  const ev = findEvalCompareRow(account);
  return ev?.accountName?.trim() === "LucidFlex";
}

/** Bloc CSV funded Lucid Flex pour la taille du compte. */
export function getLucidFlexFundedBlockForAccount(
  account: JournalAccount
): LucidFlexFundedBlock | null {
  if (!isLucidFlexFundedJournalAccount(account)) return null;
  const sz = lucidSizeFromAccount(account);
  if (!sz) return null;
  return LUCID_FLEX_FUNDED[sz];
}

/** Compte Lucid Direct en funded / live uniquement (pas Pro / Flex / challenge). */
export function isLucidDirectFundedJournalAccount(account: JournalAccount): boolean {
  if (!isLucidTradingJournalAccount(account)) return false;
  if (account.accountType !== "funded" && account.accountType !== "live") return false;
  const p = account.compareProgramName?.trim();
  if (p === "LucidDirect") return true;
  const ev = findEvalCompareRow(account);
  if (ev?.accountName?.trim() === "LucidDirect") return true;
  if (account.accountType === "funded" || account.accountType === "live") {
    const d = findFundedCompareRow(account);
    if (d?.name === "Lucid Trading" && d.accountName === "LucidDirect") return true;
  }
  return false;
}

/** Bloc CSV funded Lucid Direct pour la taille du compte. */
export function getLucidDirectFundedBlockForAccount(
  account: JournalAccount
): LucidDirectFundedBlock | null {
  if (!isLucidDirectFundedJournalAccount(account)) return null;
  const sz = lucidSizeFromAccount(account);
  if (!sz) return null;
  return LUCID_DIRECT[sz];
}

function lucidSizeFromAccount(account: JournalAccount): LucidSize | null {
  const s = account.sizeLabel.trim().toLowerCase().replace(/\s+/g, "");
  if (s === "25k" || s === "50k" || s === "100k" || s === "150k") return s;
  return null;
}

function lucidProgramFromAccount(account: JournalAccount): "LucidPro" | "LucidFlex" | "LucidDirect" | null {
  const p = account.compareProgramName?.trim();
  if (p === "LucidPro" || p === "LucidFlex" || p === "LucidDirect") return p;

  const ev = findEvalCompareRow(account);
  const n = ev?.accountName?.trim();
  if (n === "LucidPro" || n === "LucidFlex" || n === "LucidDirect") return n;

  if (account.accountType === "funded" || account.accountType === "live") {
    const d = findFundedCompareRow(account);
    if (d?.name === "Lucid Trading" && d.accountName === "LucidDirect") return "LucidDirect";
  }

  return null;
}

function fundedPhaseForProFlex(account: JournalAccount): boolean {
  if (account.accountType === "funded" || account.accountType === "live") return true;
  return account.accountType === "challenge" && account.status === "passed";
}

function buildLucidEvalLayout(ev: LucidEvalBlock, sizingDisplay: string): ApexEvalRulesLayout {
  return {
    rules: {
      label: "Rules",
      value: `${formatPayoutRulesConsistency(ev.consistencyPct)}\nMin trading days: ${ev.minTradingDays}`,
      multiline: true,
    },
    drawdownType: { label: "Drawdown type", value: "EOD" },
    sizing: { label: "Sizing", value: sizingDisplay.trim() || "—" },
    profitTarget: {
      label: "Profit Target",
      value: formatUsdWholeGrouped(ev.profitTargetUsd),
    },
    tradingNews: {
      label: "Trading news",
      value: formatAllowedFromCsv(ev.tradingNews),
    },
    drawdown: {
      label: "Drawdown",
      value: formatUsdWholeGrouped(ev.drawdownUsd),
    },
    overnight: {
      label: "Overnight / Overweek",
      value: formatAllowedFromCsv(ev.overnight),
    },
    dll: { label: "DLL", value: formatEvalDllDisplay(ev.dllCsv) },
  };
}

function buildLucidProFundedLayout(fd: LucidProFundedBlock): ApexFundedRulesLayout {
  const payoutRulesValue = `${formatPayoutRulesConsistency(fd.consistencyPct)}\nMin trading days: ${fd.minTradingDays}`;

  const dllFunded = fd.dllUsd != null ? formatUsdWholeGrouped(fd.dllUsd) : "None";

  const column1: ApexRulesRow[] = [
    { label: "Payout rules", value: payoutRulesValue, multiline: true },
    { label: "Trading news", value: formatAllowedFromCsv(fd.tradingNews) },
    { label: "Overnight / Overweek", value: formatAllowedFromCsv(fd.overnight) },
    { label: "Profit split", value: fd.profitSplit },
  ];

  const column2: ApexRulesRow[] = [
    { label: "Drawdown type", value: "EOD" },
    { label: "Drawdown", value: formatUsdWholeGrouped(fd.drawdownUsd) },
    { label: "DLL", value: dllFunded },
    { label: "Buffer", value: formatUsdWholeGrouped(fd.bufferUsd) },
  ];

  const column3: ApexRulesRow[] = [
    { label: "Payout mini", value: formatUsdWholeGrouped(fd.payoutMiniUsd) },
    {
      label: "Payout maxi",
      value: formatPayoutCapsMultiline(fd.payoutMax1stUsd, fd.payoutMaxSubsequentUsd),
      multiline: true,
    },
  ];

  return { column1, column2, column3 };
}

function buildLucidFlexFundedLayout(fd: LucidFlexFundedBlock): ApexFundedRulesLayout {
  const column1: ApexRulesRow[] = [
    {
      label: "Payout rules",
      value: formatJournalMinProfitDaysLine(fd.minTradingDays, fd.minProfitPerDayUsd),
    },
    { label: "Trading news", value: formatAllowedFromCsv(fd.tradingNews) },
    { label: "Overnight / Overweek", value: formatAllowedFromCsv(fd.overnight) },
    { label: "Profit split", value: fd.profitSplit },
  ];

  const column2: ApexRulesRow[] = [
    { label: "Drawdown type", value: "EOD" },
    { label: "Drawdown", value: formatUsdWholeGrouped(fd.drawdownUsd) },
    { label: "DLL", value: "None" },
    { label: "Buffer", value: "—" },
  ];

  const column3: ApexRulesRow[] = [
    { label: "Payout maxi", value: formatUsdWholeGrouped(fd.payoutMaxUsd) },
    { label: "Payout mini", value: formatUsdWholeGrouped(fd.payoutMiniUsd) },
    { label: "Notes", value: fd.notes, multiline: true },
  ];

  return { column1, column2, column3 };
}

function buildLucidDirectFundedLayout(d: LucidDirectFundedBlock): ApexFundedRulesLayout {
  const dllFunded = d.dllUsd != null ? formatUsdWholeGrouped(d.dllUsd) : "None";
  const profitGoalLines = `1st payout: ${formatUsdWholeGrouped(d.profitGoal1stUsd)}\nAfter 1st: ${formatUsdWholeGrouped(d.profitGoalAfter1stUsd)}`;

  const column1: ApexRulesRow[] = [
    { label: "Payout rules", value: formatPayoutRulesConsistency(d.consistencyPct) },
    { label: "Trading news", value: formatAllowedFromCsv(d.tradingNews) },
    { label: "Overnight / Overweek", value: formatAllowedFromCsv(d.overnight) },
    { label: "Profit split", value: d.profitSplit },
  ];

  const column2: ApexRulesRow[] = [
    { label: "Drawdown type", value: "EOD" },
    { label: "Drawdown", value: formatUsdWholeGrouped(d.drawdownUsd) },
    { label: "DLL", value: dllFunded },
    {
      label: "Profit goal (payout req.)",
      value: profitGoalLines,
      multiline: true,
    },
  ];

  const column3: ApexRulesRow[] = [
    { label: "Scaling plan", value: d.sizing },
    { label: "Payout mini", value: formatUsdWholeGrouped(d.payoutMiniUsd) },
    {
      label: "Payout maxi",
      value: formatSixPayoutsMultiline(d.payouts1stTo6thUsd),
      multiline: true,
    },
  ];

  return { column1, column2, column3 };
}

/**
 * Carte Rules Lucid Trading : évaluation Pro/Flex, funded Pro/Flex, ou Direct funded (CSV).
 */
export function resolveLucidAccountRulesCard(
  _state: JournalDataV1,
  account: JournalAccount
): ApexAccountRulesCard | null {
  if (!isLucidTradingJournalAccount(account)) return null;

  const sz = lucidSizeFromAccount(account);
  if (!sz) return null;

  const program = lucidProgramFromAccount(account);
  if (!program) return null;

  if (program === "LucidDirect") {
    const block = LUCID_DIRECT[sz];
    return { phase: "funded", fundedLayout: buildLucidDirectFundedLayout(block) };
  }

  const compareRow = findEvalCompareRow(account);
  const sizingRaw = compareRow?.rules.sizing?.trim() ?? "";
  const sizingDisplay = sizingRaw && sizingRaw !== "—" ? sizingRaw : "—";

  if (program === "LucidPro") {
    if (!fundedPhaseForProFlex(account)) {
      const ev = LUCID_PRO_EVAL[sz];
      return { phase: "eval", evalLayout: buildLucidEvalLayout(ev, sizingDisplay) };
    }
    return {
      phase: "funded",
      fundedLayout: buildLucidProFundedLayout(LUCID_PRO_FUNDED[sz]),
    };
  }

  if (program === "LucidFlex") {
    if (!fundedPhaseForProFlex(account)) {
      const ev = LUCID_FLEX_EVAL[sz];
      return { phase: "eval", evalLayout: buildLucidEvalLayout(ev, sizingDisplay) };
    }
    return {
      phase: "funded",
      fundedLayout: buildLucidFlexFundedLayout(LUCID_FLEX_FUNDED[sz]),
    };
  }

  return null;
}
