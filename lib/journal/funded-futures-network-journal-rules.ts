/**
 * Funded Futures Network — aligné sur « Funded Futures Networrk Rules.csv » (eval + funded).
 * Évaluation : sizing / cible / drawdown / DLL / règles depuis la ligne compare (`prop-firms`).
 * Funded : paliers OG & OG Express identiques ; MAX (EOD + DLL) ; MAX Express (Trailing, payout 25 % / 4 j).
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
} from "@/lib/journal/apex-journal-rules";
import { formatUsdWholeGrouped, type PropFirm } from "@/lib/prop-firms";

type FfnSize = "25k" | "50k" | "100k" | "150k" | "250k";
/** Programme compare (accountName). */
type FfnTrack = "og" | "og_express" | "max" | "max_express";

type FfnFundedRow = {
  overnight: string;
  tradingNews: string;
  sizing: string;
  drawdownTypeRaw: string;
  maxDrawdownUsd: number;
  dllUsd: number | null;
  bufferUsd: number;
  payoutConsistency: string;
  payoutMinDays: number;
  payoutMiniUsd: number;
  payoutMaxUsd: number;
  profitSplit: string;
};

/** OG & OG Express — même ligne funded CSV. */
const FFN_OG_FUNDED: Record<FfnSize, FfnFundedRow> = {
  "25k": {
    overnight: "No",
    tradingNews: "No",
    sizing: "1 mini / 10 micros",
    drawdownTypeRaw: "EOT",
    maxDrawdownUsd: 1500,
    dllUsd: null,
    bufferUsd: 1600,
    payoutConsistency: "40%",
    payoutMinDays: 3,
    payoutMiniUsd: 500,
    payoutMaxUsd: 10000,
    profitSplit: "80%",
  },
  "50k": {
    overnight: "No",
    tradingNews: "No",
    sizing: "2 minis / 20 micros",
    drawdownTypeRaw: "EOT",
    maxDrawdownUsd: 2000,
    dllUsd: null,
    bufferUsd: 2100,
    payoutConsistency: "40%",
    payoutMinDays: 3,
    payoutMiniUsd: 500,
    payoutMaxUsd: 10000,
    profitSplit: "80%",
  },
  "100k": {
    overnight: "No",
    tradingNews: "No",
    sizing: "4 minis / 40 micros",
    drawdownTypeRaw: "EOT",
    maxDrawdownUsd: 3600,
    dllUsd: null,
    bufferUsd: 3700,
    payoutConsistency: "40%",
    payoutMinDays: 3,
    payoutMiniUsd: 500,
    payoutMaxUsd: 10000,
    profitSplit: "80%",
  },
  "150k": {
    overnight: "No",
    tradingNews: "No",
    sizing: "4 minis / 40 micros",
    drawdownTypeRaw: "EOT",
    maxDrawdownUsd: 5000,
    dllUsd: null,
    bufferUsd: 5100,
    payoutConsistency: "40%",
    payoutMinDays: 3,
    payoutMiniUsd: 500,
    payoutMaxUsd: 10000,
    profitSplit: "80%",
  },
  "250k": {
    overnight: "No",
    tradingNews: "No",
    sizing: "6 minis / 60 micros",
    drawdownTypeRaw: "EOT",
    maxDrawdownUsd: 6000,
    dllUsd: null,
    bufferUsd: 6100,
    payoutConsistency: "40%",
    payoutMinDays: 3,
    payoutMiniUsd: 500,
    payoutMaxUsd: 10000,
    profitSplit: "80%",
  },
};

const FFN_MAX_FUNDED: Record<FfnSize, FfnFundedRow> = {
  "25k": {
    overnight: "No",
    tradingNews: "No",
    sizing: "1 mini / 10 micros",
    drawdownTypeRaw: "EOD",
    maxDrawdownUsd: 1500,
    dllUsd: 1000,
    bufferUsd: 1600,
    payoutConsistency: "40%",
    payoutMinDays: 3,
    payoutMiniUsd: 500,
    payoutMaxUsd: 10000,
    profitSplit: "80%",
  },
  "50k": {
    overnight: "No",
    tradingNews: "No",
    sizing: "2 minis / 20 micros",
    drawdownTypeRaw: "EOD",
    maxDrawdownUsd: 2000,
    dllUsd: 1250,
    bufferUsd: 2100,
    payoutConsistency: "40%",
    payoutMinDays: 3,
    payoutMiniUsd: 500,
    payoutMaxUsd: 10000,
    profitSplit: "80%",
  },
  "100k": {
    overnight: "No",
    tradingNews: "No",
    sizing: "4 minis / 40 micros",
    drawdownTypeRaw: "EOD",
    maxDrawdownUsd: 3600,
    dllUsd: 2500,
    bufferUsd: 3700,
    payoutConsistency: "40%",
    payoutMinDays: 3,
    payoutMiniUsd: 500,
    payoutMaxUsd: 10000,
    profitSplit: "80%",
  },
  "150k": {
    overnight: "No",
    tradingNews: "No",
    sizing: "4 minis / 40 micros",
    drawdownTypeRaw: "EOD",
    maxDrawdownUsd: 5000,
    dllUsd: 3750,
    bufferUsd: 5100,
    payoutConsistency: "40%",
    payoutMinDays: 3,
    payoutMiniUsd: 500,
    payoutMaxUsd: 10000,
    profitSplit: "80%",
  },
  "250k": {
    overnight: "No",
    tradingNews: "No",
    sizing: "6 minis / 60 micros",
    drawdownTypeRaw: "EOD",
    maxDrawdownUsd: 6000,
    dllUsd: 4500,
    bufferUsd: 6100,
    payoutConsistency: "40%",
    payoutMinDays: 3,
    payoutMiniUsd: 500,
    payoutMaxUsd: 10000,
    profitSplit: "80%",
  },
};

/** MAX Express — Trailing, payout rules 25 % / 4 j (CSV funded). */
const FFN_MAX_EXPRESS_FUNDED: Record<FfnSize, FfnFundedRow> = {
  "25k": {
    overnight: "No",
    tradingNews: "No",
    sizing: "1 mini / 10 micros",
    drawdownTypeRaw: "Trailing",
    maxDrawdownUsd: 1500,
    dllUsd: null,
    bufferUsd: 1600,
    payoutConsistency: "25%",
    payoutMinDays: 4,
    payoutMiniUsd: 500,
    payoutMaxUsd: 10000,
    profitSplit: "80%",
  },
  "50k": {
    overnight: "No",
    tradingNews: "No",
    sizing: "2 minis / 20 micros",
    drawdownTypeRaw: "Trailing",
    maxDrawdownUsd: 2000,
    dllUsd: null,
    bufferUsd: 2100,
    payoutConsistency: "25%",
    payoutMinDays: 4,
    payoutMiniUsd: 500,
    payoutMaxUsd: 10000,
    profitSplit: "80%",
  },
  "100k": {
    overnight: "No",
    tradingNews: "No",
    sizing: "4 minis / 40 micros",
    drawdownTypeRaw: "Trailing",
    maxDrawdownUsd: 3600,
    dllUsd: null,
    bufferUsd: 3700,
    payoutConsistency: "25%",
    payoutMinDays: 4,
    payoutMiniUsd: 500,
    payoutMaxUsd: 10000,
    profitSplit: "80%",
  },
  "150k": {
    overnight: "No",
    tradingNews: "No",
    sizing: "4 minis / 40 micros",
    drawdownTypeRaw: "Trailing",
    maxDrawdownUsd: 5000,
    dllUsd: null,
    bufferUsd: 5100,
    payoutConsistency: "25%",
    payoutMinDays: 4,
    payoutMiniUsd: 500,
    payoutMaxUsd: 10000,
    profitSplit: "80%",
  },
  "250k": {
    overnight: "No",
    tradingNews: "No",
    sizing: "6 minis / 60 micros",
    drawdownTypeRaw: "Trailing",
    maxDrawdownUsd: 6000,
    dllUsd: null,
    bufferUsd: 6100,
    payoutConsistency: "25%",
    payoutMinDays: 4,
    payoutMiniUsd: 500,
    payoutMaxUsd: 10000,
    profitSplit: "80%",
  },
};

function ffnSizeKey(account: JournalAccount): FfnSize | null {
  const s = account.sizeLabel.trim().toLowerCase();
  if (s === "25k" || s === "50k" || s === "100k" || s === "150k" || s === "250k") return s;
  return null;
}

function ffnTrack(account: JournalAccount): FfnTrack | null {
  const p =
    account.compareProgramName?.trim() || findEvalCompareRow(account)?.accountName?.trim() || "";
  if (p === "Funded Futures Network MAX Express") return "max_express";
  if (p === "Funded Futures Network MAX") return "max";
  if (p === "Funded Futures Network OG Express") return "og_express";
  if (p === "Funded Futures Network OG") return "og";
  return null;
}

function fundedRowFor(track: FfnTrack, size: FfnSize): FfnFundedRow {
  if (track === "max") return FFN_MAX_FUNDED[size];
  if (track === "max_express") return FFN_MAX_EXPRESS_FUNDED[size];
  return FFN_OG_FUNDED[size];
}

function ffnEvalLayout(row: PropFirm): ApexEvalRulesLayout {
  const sizing =
    row.rules.sizing?.trim() && row.rules.sizing !== "—" ? row.rules.sizing : "—";
  const target =
    row.target?.trim() && row.target !== "—" && row.target !== "-" ? row.target : "—";
  const minDays = Number.parseInt(row.rules.minDays?.trim() || "0", 10);
  const consistencyRaw = row.rules.consistency?.trim() || "40%";
  const rulesValue =
    minDays > 0
      ? `${formatPayoutRulesConsistency(consistencyRaw)}\n${minDays} min trading day(s)`
      : formatPayoutRulesConsistency(consistencyRaw);
  const maxDd = formatUsdWholeGrouped(row.maxDrawdownLimitUsd);
  const dllRaw = row.rules.dailyLossLimit?.trim() ?? "-";

  return {
    rules: {
      label: "Rules",
      value: rulesValue,
      multiline: minDays > 0,
    },
    drawdownType: { label: "Drawdown type", value: formatApexDrawdownType(row.drawdown) },
    sizing: { label: "Sizing", value: sizing },
    profitTarget: { label: "Profit Target", value: target },
    tradingNews: { label: "Trading News", value: formatAllowedFromCsv("Yes") },
    drawdown: { label: "Drawdown", value: maxDd },
    overnight: { label: "Overnight / Overweek", value: formatAllowedFromCsv("No") },
    dll: {
      label: "DLL (Daily Loss Limit)",
      value: formatEvalDllDisplay(dllRaw),
    },
  };
}

function ffnFundedLayout(fd: FfnFundedRow): ApexFundedRulesLayout {
  const payoutRulesValue = `${formatPayoutRulesConsistency(fd.payoutConsistency)}\n${fd.payoutMinDays} min trading day(s)`;
  const dllVal =
    fd.dllUsd != null ? formatUsdWholeGrouped(fd.dllUsd) : "None";

  return {
    column1: [
      { label: "Payout rules", value: payoutRulesValue, multiline: true },
      { label: "Trading News", value: formatAllowedFromCsv(fd.tradingNews) },
      { label: "Overnight / Overweek", value: formatAllowedFromCsv(fd.overnight) },
      { label: "Profit split", value: fd.profitSplit },
    ],
    column2: [
      { label: "Drawdown type", value: formatApexDrawdownType(fd.drawdownTypeRaw) },
      { label: "Drawdown", value: formatUsdWholeGrouped(fd.maxDrawdownUsd) },
      { label: "DLL", value: dllVal },
      { label: "Buffer", value: formatUsdWholeGrouped(fd.bufferUsd) },
    ],
    column3: [
      { label: "Sizing", value: fd.sizing },
      { label: "Payout mini", value: formatUsdWholeGrouped(fd.payoutMiniUsd) },
      { label: "Payout max", value: formatUsdWholeGrouped(fd.payoutMaxUsd) },
    ],
  };
}

export function isFundedFuturesNetworkJournalAccount(account: JournalAccount): boolean {
  return account.propFirm.name.trim() === "Funded Futures Network";
}

export function resolveFundedFuturesNetworkAccountRulesCard(
  _state: JournalDataV1,
  account: JournalAccount
): ApexAccountRulesCard | null {
  if (!isFundedFuturesNetworkJournalAccount(account)) return null;
  const sk = ffnSizeKey(account);
  const track = ffnTrack(account);
  if (!sk || !track) return null;

  const row = findEvalCompareRow(account);
  if (!row) return null;

  const isFundedType = account.accountType === "funded" || account.accountType === "live";
  const isPassedChallenge = account.accountType === "challenge" && account.status === "passed";

  if (!isFundedType && !isPassedChallenge) {
    return { phase: "eval", evalLayout: ffnEvalLayout(row) };
  }

  const funded = fundedRowFor(track, sk);
  return { phase: "funded", fundedLayout: ffnFundedLayout(funded) };
}
