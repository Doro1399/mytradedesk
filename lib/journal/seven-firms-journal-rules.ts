/**
 * Règles Account view pour les firmes alignées sur les CSV (My Funded Futures, Blusky, TradeDay,
 * Phidias, Elite Trader Funding, DayTraders, Taurus Arena) — éval vs funded / direct.
 */
import { findEvalCompareRow, findFundedCompareRow } from "@/lib/journal/compare-account-helpers";
import { lookupJournalBufferCents } from "@/lib/journal/journal-buffer-lookup";
import type { JournalAccount, JournalDataV1 } from "@/lib/journal/types";
import {
  formatAllowedFromCsv,
  formatEvalDllDisplay,
  formatJournalMinProfitDaysLine,
  formatPayoutRulesConsistency,
  type ApexAccountRulesCard,
  type ApexEvalRulesLayout,
  type ApexFundedRulesLayout,
} from "@/lib/journal/apex-journal-rules";
import { DAYTRADERS_FUNDED_FROM_CSV } from "@/lib/journal/daytraders-funded-csv.generated";
import {
  formatEliteTraderFundingPayoutMaxTiers,
  lookupEliteTraderFundingFundedPayoutRow,
} from "@/lib/journal/elite-trader-funding-journal-rules";
import { formatPhidiasPayoutMaxTiers, lookupPhidiasFundedPayoutRow } from "@/lib/journal/phidias-journal-rules";
import {
  formatTaurusArenaPayoutMaxTiers,
  lookupTaurusArenaFundedPayoutRow,
} from "@/lib/journal/taurus-arena-journal-rules";
import { lookupTradeDayFundedPayoutRow } from "@/lib/journal/tradeday-journal-rules";
import { formatUsdWholeGrouped, type PropFirm } from "@/lib/prop-firms";

const SEVEN_FIRM_NAMES = new Set([
  "My Funded Futures",
  "Blusky",
  "TradeDay",
  "Phidias",
  "Elite Trader Funding",
  "DayTraders",
  "Taurus Arena",
]);

function programLabel(account: JournalAccount): string {
  return (
    account.compareProgramName?.trim() ||
    findEvalCompareRow(account)?.accountName?.trim() ||
    ""
  );
}

function tableKey(account: JournalAccount): string {
  const firm = account.propFirm.name.trim();
  const prog = programLabel(account);
  const size = account.sizeLabel.trim().toLowerCase();
  return `${firm}|${prog}|${size}`;
}

function drawdownTypeLabel(d: PropFirm["drawdown"]): string {
  if (d === "Trailing") return "Trailing";
  if (d === "EOD") return "EOD";
  if (d === "Static") return "Static";
  return d;
}

/** Limite overnight Phidias Swing (même chiffres que le compare, sans suffixe redondant). */
function phidiasSwingOvernightLimit(size: string): string {
  switch (size.trim().toLowerCase()) {
    case "50k":
      return "1 mini / 10 micros";
    case "100k":
      return "2 minis / 20 micros";
    case "150k":
      return "3 minis / 30 micros";
    default:
      return "—";
  }
}

/** Overnight / news en évaluation (CSV). */
function evalOvernightNews(
  firm: string,
  program: string,
  sizeLabel: string
): { o: string; n: string } {
  const size = (sizeLabel ?? "").trim().toLowerCase();
  if (firm === "TradeDay") return { o: "No", n: "No" };
  if (firm === "Phidias" && program.includes("Swing")) {
    return { o: phidiasSwingOvernightLimit(size), n: "Yes" };
  }
  if (firm === "Phidias") return { o: "No", n: "Yes" };
  if (firm === "Elite Trader Funding" && program.includes("DTF")) return { o: "—", n: "—" };
  return { o: "No", n: "Yes" };
}

function evalRulesCell(row: PropFirm, firm: string, program: string): { value: string; multiline: boolean } {
  if (firm === "Phidias") {
    if (program.includes("Static")) {
      return { value: "1 min trading day(s)", multiline: false };
    }
    if (program.includes("Fundamental") || program.includes("Swing")) {
      return { value: "3 min trading day(s)", multiline: false };
    }
  }
  if (firm === "Taurus Arena" && !program.includes("Direct")) {
    if (program.includes("Prime") || program.includes("Frees")) {
      return { value: "-", multiline: false };
    }
  }
  const c = row.rules.consistency?.trim() ?? "";
  const md = row.rules.minDays?.trim() ?? "";
  const mdLine =
    md && md !== "—" && md !== "-" ? `${md} min trading day(s)` : "";
  if (!c || c === "—" || c === "-") {
    return { value: mdLine || "—", multiline: false };
  }
  return {
    value: `${formatPayoutRulesConsistency(c)}${mdLine ? `\n${mdLine}` : ""}`,
    multiline: true,
  };
}

function profitTargetCell(row: PropFirm): string {
  const t = row.target?.trim() ?? "";
  if (!t || t === "—" || t === "-") return "—";
  if (t.startsWith("$")) return t;
  return t;
}

type FundedCsv = {
  overnight: string;
  tradingNews: string;
  sizing: string;
  drawdownType: string;
  maxDrawdownUsd: number;
  dllCsv: string;
  payoutRules: string;
  payoutMiniUsd: number;
  payoutMax: string;
  profitSplit: string;
  /** Si défini, remplace le buffer issu du lookup journal */
  bufferUsd?: number | null;
  notes?: string;
};

function fundedLayoutFrom(fd: FundedCsv, bufferCents: number | null): ApexFundedRulesLayout {
  const buf =
    fd.bufferUsd !== undefined
      ? fd.bufferUsd != null
        ? formatUsdWholeGrouped(fd.bufferUsd)
        : "—"
      : bufferCents != null && bufferCents > 0
        ? formatUsdWholeGrouped(bufferCents / 100)
        : "—";
  const col1: ApexFundedRulesLayout["column1"] = [
    { label: "Payout rules", value: fd.payoutRules, multiline: true },
    { label: "Trading News", value: formatAllowedFromCsv(fd.tradingNews) },
    { label: "Overnight / Overweek", value: formatAllowedFromCsv(fd.overnight) },
    { label: "Profit split", value: fd.profitSplit },
  ];
  if (fd.notes) col1.push({ label: "Notes", value: fd.notes, multiline: true });

  return {
    column1: col1,
    column2: [
      { label: "Drawdown type", value: fd.drawdownType },
      { label: "Drawdown", value: formatUsdWholeGrouped(fd.maxDrawdownUsd) },
      { label: "DLL", value: formatEvalDllDisplay(fd.dllCsv) },
      { label: "Buffer", value: buf },
    ],
    column3: [
      {
        label: "Sizing",
        value: fd.sizing,
        multiline: fd.sizing.includes("\n"),
        multilinePreserveLines: fd.sizing.includes("\n"),
      },
      {
        label: "Payout mini",
        value:
          fd.payoutMiniUsd > 0 ? formatUsdWholeGrouped(fd.payoutMiniUsd) : "—",
      },
      { label: "Payout max", value: fd.payoutMax, multiline: true },
    ],
  };
}

/** Funded Flex — colonne « Sizing (Scaling Plan) » du CSV (paliers selon profits compte). */
const MFF_FLEX_FUNDED_SCALING: Record<"25k" | "50k", string> = {
  "25k": [
    "$0 – $749: 1 mini / 10 micros",
    "$750 – $999: 2 minis / 20 micros",
    "$1,000+: 3 minis / 30 micros",
  ].join("\n"),
  "50k": [
    "$0 – $1,499: 2 minis / 20 micros",
    "$1,500 – $1,999: 3 minis / 30 micros",
    "$2,000+: 5 minis / 50 micros",
  ].join("\n"),
};

/** Funded / direct : données CSV par clé `Firme|Programme|taille`. */
const FUNDED_CSV: Record<string, FundedCsv> = {
  // —— My Funded Futures ——
  "My Funded Futures|My Funded Futures Rapid|25k": {
    overnight: "No",
    tradingNews: "No",
    sizing: "3 minis / 30 micros",
    drawdownType: "Trailing",
    maxDrawdownUsd: 1000,
    dllCsv: "-",
    payoutRules: "—",
    payoutMiniUsd: 500,
    payoutMax: formatUsdWholeGrouped(5000),
    profitSplit: "90%",
    bufferUsd: 1100,
  },
  "My Funded Futures|My Funded Futures Rapid|50k": {
    overnight: "No",
    tradingNews: "No",
    sizing: "5 minis / 50 micros",
    drawdownType: "Trailing",
    maxDrawdownUsd: 2000,
    dllCsv: "-",
    payoutRules: "—",
    payoutMiniUsd: 500,
    payoutMax: formatUsdWholeGrouped(5000),
    profitSplit: "90%",
    bufferUsd: 2100,
  },
  "My Funded Futures|My Funded Futures Rapid|100k": {
    overnight: "No",
    tradingNews: "No",
    sizing: "10 minis / 100 micros",
    drawdownType: "EOD",
    maxDrawdownUsd: 3000,
    dllCsv: "-",
    payoutRules: "—",
    payoutMiniUsd: 500,
    payoutMax: formatUsdWholeGrouped(5000),
    profitSplit: "90%",
    bufferUsd: 3100,
  },
  "My Funded Futures|My Funded Futures Rapid|150k": {
    overnight: "No",
    tradingNews: "No",
    sizing: "15 minis / 150 micros",
    drawdownType: "EOD",
    maxDrawdownUsd: 4500,
    dllCsv: "-",
    payoutRules: "—",
    payoutMiniUsd: 500,
    payoutMax: formatUsdWholeGrouped(5000),
    profitSplit: "90%",
    bufferUsd: 4600,
  },
  "My Funded Futures|My Funded Futures Flex|25k": {
    overnight: "No",
    tradingNews: "Yes",
    sizing: MFF_FLEX_FUNDED_SCALING["25k"],
    drawdownType: "EOD",
    maxDrawdownUsd: 1000,
    dllCsv: "-",
    payoutRules: `${formatPayoutRulesConsistency("50%")}\n${formatJournalMinProfitDaysLine(5, 100)}`,
    payoutMiniUsd: 250,
    payoutMax: `${formatUsdWholeGrouped(250)} / ${formatUsdWholeGrouped(3000)}`,
    profitSplit: "80%",
    bufferUsd: null,
    notes: "Request 50% of balance; other 50% stays as buffer.",
  },
  "My Funded Futures|My Funded Futures Flex|50k": {
    overnight: "No",
    tradingNews: "Yes",
    sizing: MFF_FLEX_FUNDED_SCALING["50k"],
    drawdownType: "EOD",
    maxDrawdownUsd: 2000,
    dllCsv: "-",
    payoutRules: `${formatPayoutRulesConsistency("50%")}\n${formatJournalMinProfitDaysLine(5, 150)}`,
    payoutMiniUsd: 250,
    payoutMax: `${formatUsdWholeGrouped(250)} / ${formatUsdWholeGrouped(5000)}`,
    profitSplit: "80%",
    bufferUsd: null,
    notes: "Request 50% of balance; other 50% stays as buffer.",
  },
  "My Funded Futures|My Funded Futures Pro|50k": {
    overnight: "No",
    tradingNews: "No",
    sizing: "5 minis / 50 micros",
    drawdownType: "EOD",
    maxDrawdownUsd: 2000,
    dllCsv: "-",
    payoutRules: `${formatPayoutRulesConsistency("50%")}\n14 min trading days (first payout)`,
    payoutMiniUsd: 1000,
    payoutMax: formatUsdWholeGrouped(100000),
    profitSplit: "100%",
    bufferUsd: 2100,
    notes: "After first payout, MLL moves to $50,100 (static).",
  },
  "My Funded Futures|My Funded Futures Pro|100k": {
    overnight: "No",
    tradingNews: "No",
    sizing: "10 minis / 100 micros",
    drawdownType: "EOD",
    maxDrawdownUsd: 3000,
    dllCsv: "-",
    payoutRules: `${formatPayoutRulesConsistency("50%")}\n14 min trading days (first payout)`,
    payoutMiniUsd: 1000,
    payoutMax: formatUsdWholeGrouped(100000),
    profitSplit: "100%",
    bufferUsd: 3100,
    notes: "After first payout, MLL moves to $100,100 (static).",
  },
  "My Funded Futures|My Funded Futures Pro|150k": {
    overnight: "No",
    tradingNews: "No",
    sizing: "15 minis / 150 micros",
    drawdownType: "EOD",
    maxDrawdownUsd: 4500,
    dllCsv: "-",
    payoutRules: `${formatPayoutRulesConsistency("50%")}\n14 min trading days (first payout)`,
    payoutMiniUsd: 1000,
    payoutMax: formatUsdWholeGrouped(100000),
    profitSplit: "100%",
    bufferUsd: 4600,
    notes: "After first payout, MLL moves to $150,100 (static).",
  },
  // —— Blusky (noms alignés sur BluSky Rules.csv) ——
  "Blusky|Bluesky Launch|50k": {
    overnight: "No",
    tradingNews: "Yes",
    sizing: "5 minis / 50 micros",
    drawdownType: "EOD",
    maxDrawdownUsd: 2000,
    dllCsv: "-",
    payoutRules: formatPayoutRulesConsistency("30%"),
    payoutMiniUsd: 250,
    payoutMax: `${formatUsdWholeGrouped(3000)} / week`,
    profitSplit: "90%",
    bufferUsd: 3000,
  },
  "Blusky|Bluesky Launch|100k": {
    overnight: "No",
    tradingNews: "Yes",
    sizing: "10 minis / 100 micros",
    drawdownType: "EOD",
    maxDrawdownUsd: 2500,
    dllCsv: "-",
    payoutRules: formatPayoutRulesConsistency("30%"),
    payoutMiniUsd: 250,
    payoutMax: `${formatUsdWholeGrouped(3000)} / week`,
    profitSplit: "90%",
    bufferUsd: 3500,
  },
  "Blusky|Bluesky Static Launch|200k": {
    overnight: "No",
    tradingNews: "Yes",
    sizing: "2 minis / 20 micros",
    drawdownType: "Static",
    maxDrawdownUsd: 2000,
    dllCsv: "-",
    payoutRules: formatPayoutRulesConsistency("30%"),
    payoutMiniUsd: 250,
    payoutMax: `${formatUsdWholeGrouped(3000)} / week`,
    profitSplit: "90%",
    bufferUsd: 3000,
  },
  "Blusky|Bluesky Propel|25k": {
    overnight: "No",
    tradingNews: "Yes",
    sizing: "4 minis / 40 micros",
    drawdownType: "EOD",
    maxDrawdownUsd: 1200,
    dllCsv: "-",
    payoutRules: formatPayoutRulesConsistency("30%"),
    payoutMiniUsd: 250,
    payoutMax: `${formatUsdWholeGrouped(3000)} / week`,
    profitSplit: "90%",
    bufferUsd: 1500,
  },
  "Blusky|Bluesky Propel|50k": {
    overnight: "No",
    tradingNews: "Yes",
    sizing: "5 minis / 50 micros",
    drawdownType: "EOD",
    maxDrawdownUsd: 2000,
    dllCsv: "-",
    payoutRules: formatPayoutRulesConsistency("30%"),
    payoutMiniUsd: 250,
    payoutMax: `${formatUsdWholeGrouped(3000)} / week`,
    profitSplit: "90%",
    bufferUsd: 3000,
  },
  "Blusky|Bluesky Propel|100k": {
    overnight: "No",
    tradingNews: "Yes",
    sizing: "10 minis / 100 micros",
    drawdownType: "EOD",
    maxDrawdownUsd: 2500,
    dllCsv: "-",
    payoutRules: formatPayoutRulesConsistency("30%"),
    payoutMiniUsd: 250,
    payoutMax: `${formatUsdWholeGrouped(3000)} / week`,
    profitSplit: "90%",
    bufferUsd: 3500,
  },
  "Blusky|Bluesky Static Propel|150k": {
    overnight: "No",
    tradingNews: "Yes",
    sizing: "1 mini / 10 micros",
    drawdownType: "Static",
    maxDrawdownUsd: 1000,
    dllCsv: "-",
    payoutRules: formatPayoutRulesConsistency("30%"),
    payoutMiniUsd: 250,
    payoutMax: `${formatUsdWholeGrouped(3000)} / week`,
    profitSplit: "90%",
    bufferUsd: 2000,
  },
  "Blusky|Bluesky Static Propel|200k": {
    overnight: "No",
    tradingNews: "Yes",
    sizing: "2 minis / 20 micros",
    drawdownType: "Static",
    maxDrawdownUsd: 2000,
    dllCsv: "-",
    payoutRules: formatPayoutRulesConsistency("30%"),
    payoutMiniUsd: 250,
    payoutMax: `${formatUsdWholeGrouped(3000)} / week`,
    profitSplit: "90%",
    bufferUsd: 3000,
  },
  "Blusky|Bluesky Static Propel|300k": {
    overnight: "No",
    tradingNews: "Yes",
    sizing: "5 minis / 50 micros",
    drawdownType: "Static",
    maxDrawdownUsd: 5000,
    dllCsv: "-",
    payoutRules: formatPayoutRulesConsistency("21%"),
    payoutMiniUsd: 250,
    payoutMax: `${formatUsdWholeGrouped(3000)} / week`,
    profitSplit: "90%",
    bufferUsd: 3500,
  },
  "Blusky|Bluesky Instant Plans|50k": {
    overnight: "No",
    tradingNews: "Yes",
    sizing: "5 minis / 50 micros",
    drawdownType: "Trailing",
    maxDrawdownUsd: 2000,
    dllCsv: "$1,000",
    payoutRules: formatPayoutRulesConsistency("21%"),
    payoutMiniUsd: 250,
    payoutMax: formatUsdWholeGrouped(2500),
    profitSplit: "80%",
    bufferUsd: 3000,
  },
};

function phidiasFundedBlock(program: string, size: string): FundedCsv | null {
  if (!program.includes("Fundamental") && !program.includes("Swing")) return null;
  const row = lookupPhidiasFundedPayoutRow(program, size);
  if (!row) return null;
  const dd = size === "50k" ? 2500 : size === "100k" ? 3000 : 4500;
  const swingOn = program.includes("Swing");
  const overnight = swingOn ? phidiasSwingOvernightLimit(size) : "No";
  const sizing =
    size === "50k"
      ? "10 minis / 100 micros"
      : size === "100k"
        ? "14 minis / 140 micros"
        : size === "150k"
          ? "17 minis / 170 micros"
          : "—";

  return {
    overnight,
    tradingNews: "Yes",
    sizing,
    drawdownType: "EOD",
    maxDrawdownUsd: dd,
    dllCsv: "-",
    payoutRules: "—",
    payoutMiniUsd: row.payoutMiniUsd,
    payoutMax: formatPhidiasPayoutMaxTiers(row),
    profitSplit: "80%",
    bufferUsd: row.bufferUsd,
  };
}

function etfLiveTrailingFunded(size: string): FundedCsv | null {
  const row = lookupEliteTraderFundingFundedPayoutRow("Elite Trader Funding Live Trailing", size);
  if (!row) return null;
  const map: Record<string, Omit<FundedCsv, "payoutRules" | "payoutMiniUsd" | "payoutMax" | "bufferUsd">> = {
    "50k": {
      overnight: "No",
      tradingNews: "Yes",
      sizing: "8 minis / 80 micros",
      drawdownType: "Trailing",
      maxDrawdownUsd: 2000,
      dllCsv: "-",
      profitSplit: "100%",
    },
    "100k": {
      overnight: "No",
      tradingNews: "Yes",
      sizing: "14 minis / 140 micros",
      drawdownType: "Trailing",
      maxDrawdownUsd: 3000,
      dllCsv: "-",
      profitSplit: "100%",
    },
    "150k": {
      overnight: "No",
      tradingNews: "Yes",
      sizing: "18 minis / 180 micros",
      drawdownType: "Trailing",
      maxDrawdownUsd: 5000,
      dllCsv: "-",
      profitSplit: "100%",
    },
    "250k": {
      overnight: "No",
      tradingNews: "Yes",
      sizing: "24 minis / 240 micros",
      drawdownType: "Trailing",
      maxDrawdownUsd: 6500,
      dllCsv: "-",
      profitSplit: "100%",
    },
  };
  const sk = size.trim().toLowerCase();
  const base = map[sk];
  if (!base) return null;
  return {
    ...base,
    payoutRules: "—",
    payoutMiniUsd: row.payoutMiniUsd,
    payoutMax: formatEliteTraderFundingPayoutMaxTiers(row),
    bufferUsd: row.bufferUsd,
  };
}

function etfStaticFunded(size: string): FundedCsv | null {
  const row = lookupEliteTraderFundingFundedPayoutRow("Elite Trader Funding Static", size);
  if (!row) return null;
  const map: Record<string, Omit<FundedCsv, "payoutRules" | "payoutMiniUsd" | "payoutMax" | "bufferUsd">> = {
    "10k": {
      overnight: "No",
      tradingNews: "Yes",
      sizing: "1 mini / 10 micros",
      drawdownType: "Static",
      maxDrawdownUsd: 500,
      dllCsv: "-",
      profitSplit: "100%",
    },
    "25k": {
      overnight: "No",
      tradingNews: "Yes",
      sizing: "2 minis / 20 micros",
      drawdownType: "Static",
      maxDrawdownUsd: 1000,
      dllCsv: "-",
      profitSplit: "100%",
    },
    "50k": {
      overnight: "No",
      tradingNews: "Yes",
      sizing: "4 minis / 40 micros",
      drawdownType: "Static",
      maxDrawdownUsd: 2000,
      dllCsv: "-",
      profitSplit: "100%",
    },
  };
  const sk = size.trim().toLowerCase();
  const base = map[sk];
  if (!base) return null;
  return {
    ...base,
    payoutRules: "—",
    payoutMiniUsd: row.payoutMiniUsd,
    payoutMax: formatEliteTraderFundingPayoutMaxTiers(row),
    bufferUsd: row.bufferUsd,
  };
}

function etfDtfFunded(size: string): FundedCsv | null {
  const row = lookupEliteTraderFundingFundedPayoutRow("Elite Trader Funding DTF", size);
  if (!row) return null;
  const m: Record<string, Omit<FundedCsv, "payoutRules" | "payoutMiniUsd" | "payoutMax" | "bufferUsd">> = {
    "25k": {
      overnight: "No",
      tradingNews: "Yes",
      sizing: "2 minis / 20 micros",
      drawdownType: "EOD",
      maxDrawdownUsd: 2500,
      dllCsv: "-",
      profitSplit: "100%",
    },
    "50k": {
      overnight: "No",
      tradingNews: "Yes",
      sizing: "5 minis / 50 micros",
      drawdownType: "EOD",
      maxDrawdownUsd: 5000,
      dllCsv: "-",
      profitSplit: "100%",
    },
    "100k": {
      overnight: "No",
      tradingNews: "Yes",
      sizing: "3 minis / 30 micros",
      drawdownType: "EOD",
      maxDrawdownUsd: 5000,
      dllCsv: "-",
      profitSplit: "100%",
    },
  };
  const sk = size.trim().toLowerCase();
  const base = m[sk];
  if (!base) return null;
  return {
    ...base,
    payoutRules: "—",
    payoutMiniUsd: row.payoutMiniUsd,
    payoutMax: formatEliteTraderFundingPayoutMaxTiers(row),
    bufferUsd: row.bufferUsd,
  };
}

function resolveEtfFunded(program: string, size: string): FundedCsv | null {
  if (program.includes("Live Trailing")) return etfLiveTrailingFunded(size);
  if (program.includes("Static")) return etfStaticFunded(size);
  if (program.includes("DTF")) return etfDtfFunded(size);
  if (program.includes("DH") && size === "100k") {
    const row = lookupEliteTraderFundingFundedPayoutRow("Elite Trader Funding DH", size);
    if (!row) return null;
    return {
      overnight: "Yes",
      tradingNews: "Yes",
      sizing: "2 minis / 20 micros",
      drawdownType: "EOD",
      maxDrawdownUsd: 3500,
      dllCsv: "$1,500",
      payoutRules: "—",
      payoutMiniUsd: row.payoutMiniUsd,
      payoutMax: formatEliteTraderFundingPayoutMaxTiers(row),
      profitSplit: "100%",
      bufferUsd: row.bufferUsd,
    };
  }
  if (program.includes("EOD")) {
    const row = lookupEliteTraderFundingFundedPayoutRow("Elite Trader Funding EOD", size);
    if (!row) return null;
    const dd = size === "50k" ? 2000 : size === "100k" ? 3500 : 4500;
    const dll = size === "50k" ? "$1,100" : size === "100k" ? "$2,200" : "$3,300";
    const s =
      size === "50k"
        ? "8 minis / 80 micros"
        : size === "100k"
          ? "14 minis / 140 micros"
          : "18 minis / 180 micros";
    return {
      overnight: "No",
      tradingNews: "Yes",
      sizing: s,
      drawdownType: "EOD",
      maxDrawdownUsd: dd,
      dllCsv: dll,
      payoutRules: "—",
      payoutMiniUsd: row.payoutMiniUsd,
      payoutMax: formatEliteTraderFundingPayoutMaxTiers(row),
      profitSplit: "100%",
      bufferUsd: row.bufferUsd,
    };
  }
  return null;
}

function dayTradersFunded(program: string, size: string): FundedCsv | null {
  const sz = size.trim().toLowerCase().replace(/\s+/g, "");
  const key = `${program.trim()}|${sz}`;
  const r = DAYTRADERS_FUNDED_FROM_CSV[key];
  if (!r) return null;
  return {
    overnight: r.overnight,
    tradingNews: r.tradingNews,
    sizing: r.sizingFunded,
    drawdownType: r.drawdownTypeFunded,
    maxDrawdownUsd: r.maxDrawdownFundedUsd,
    dllCsv: r.dllFunded,
    payoutRules: r.payoutRulesBrief,
    payoutMiniUsd: r.payoutMiniUsd,
    payoutMax: r.payoutMaxUsd == null ? "No limit" : formatUsdWholeGrouped(r.payoutMaxUsd),
    profitSplit: r.profitSplitLabel,
    bufferUsd: r.bufferUsd ?? undefined,
  };
}

function tradeDayFunded(program: string, size: string): FundedCsv | null {
  const row = lookupTradeDayFundedPayoutRow(program.trim(), size);
  if (!row) return null;
  const s = size.trim().toLowerCase();
  const profitSplit =
    "80% on the first $50k\n90% between $50k & $100k\n95% over $100k";
  if (program.includes("Intraday")) {
    const sizing = s === "50k" ? "5 minis / 50 micros" : s === "100k" ? "10 minis / 50 micros" : "15 minis / 50 micros";
    const maxDrawdownUsd = s === "50k" ? 2000 : s === "100k" ? 3000 : 4000;
    return {
      overnight: "No",
      tradingNews: "No",
      sizing,
      drawdownType: "Trailing",
      maxDrawdownUsd,
      dllCsv: "-",
      payoutRules: "—",
      payoutMiniUsd: row.payoutMiniUsd,
      payoutMax: "No limit",
      profitSplit,
      bufferUsd: row.bufferUsd,
    };
  }
  if (program.includes("End of Day")) {
    const sizing = s === "50k" ? "5 minis / 50 micros" : s === "100k" ? "10 minis / 50 micros" : "15 minis / 50 micros";
    const maxDrawdownUsd = s === "50k" ? 2000 : s === "100k" ? 3000 : 4000;
    return {
      overnight: "No",
      tradingNews: "No",
      sizing,
      drawdownType: "EOD",
      maxDrawdownUsd,
      dllCsv: "-",
      payoutRules: "—",
      payoutMiniUsd: row.payoutMiniUsd,
      payoutMax: "No limit",
      profitSplit,
      bufferUsd: row.bufferUsd,
    };
  }
  if (program.includes("Static")) {
    const sizing = s === "50k" ? "1 mini / 10 micros" : s === "100k" ? "2 minis / 20 micros" : "3 minis / 30 micros";
    const maxDrawdownUsd = s === "50k" ? 500 : s === "100k" ? 750 : 1000;
    return {
      overnight: "No",
      tradingNews: "No",
      sizing,
      drawdownType: "Static",
      maxDrawdownUsd,
      dllCsv: "-",
      payoutRules: "—",
      payoutMiniUsd: row.payoutMiniUsd,
      payoutMax: "No limit",
      profitSplit,
      bufferUsd: row.bufferUsd,
    };
  }
  return null;
}

function taurusFunded(program: string, size: string): FundedCsv | null {
  const programName = program.includes("Direct Prime")
    ? "Taurus Arena Direct Prime"
    : program.includes("Frees")
      ? "Taurus Arena Frees"
      : program.includes("Prime")
        ? "Taurus Arena Prime"
        : null;
  if (!programName) return null;
  const row = lookupTaurusArenaFundedPayoutRow(programName, size);
  if (!row) return null;
  const s = size.trim().toLowerCase();
  const sizing = s === "25k" ? "2 minis / 20 micros" : s === "50k" ? "4 minis / 40 micros" : "6 minis / 60 micros";
  const maxDrawdownUsd = s === "25k" ? 1000 : s === "50k" ? 2000 : 3000;
  return {
    overnight: "No",
    tradingNews: "Yes",
    sizing,
    drawdownType: "Trailing",
    maxDrawdownUsd,
    dllCsv: "-",
    payoutRules: "—",
    payoutMiniUsd: row.payoutMiniUsd,
    payoutMax: formatTaurusArenaPayoutMaxTiers(row),
    profitSplit: "85%",
    bufferUsd: row.bufferUsd,
  };
}

function phidiasStaticFunded(program: string): FundedCsv | null {
  const name = program.includes("OTP") ? "Phidias Static OTP" : "Phidias Static";
  const row = lookupPhidiasFundedPayoutRow(name, "25k");
  if (!row) return null;
  return {
    overnight: "No",
    tradingNews: "Yes",
    sizing: "2 minis / 20 micros",
    drawdownType: "Static",
    maxDrawdownUsd: 500,
    dllCsv: "-",
    payoutRules: "—",
    payoutMiniUsd: row.payoutMiniUsd,
    payoutMax: formatPhidiasPayoutMaxTiers(row),
    profitSplit: "100%",
    bufferUsd: row.bufferUsd,
    notes: "$1k bonus at goal; transfer to live per firm.",
  };
}

function resolveFundedDef(account: JournalAccount, key: string): FundedCsv | null {
  if (FUNDED_CSV[key]) return FUNDED_CSV[key]!;
  const firm = account.propFirm.name.trim();
  const program = programLabel(account);
  const size = account.sizeLabel.trim().toLowerCase();
  if (firm === "Phidias") {
    if (program.includes("Static")) return phidiasStaticFunded(program);
    const fb = phidiasFundedBlock(program, size);
    if (fb) return fb;
  }
  if (firm === "Elite Trader Funding") return resolveEtfFunded(program, size);
  if (firm === "DayTraders") return dayTradersFunded(program, size);
  if (firm === "Taurus Arena") return taurusFunded(program, size);
  if (firm === "TradeDay") return tradeDayFunded(program, size);
  return null;
}

export function isSevenFirmsJournalAccount(account: JournalAccount): boolean {
  return SEVEN_FIRM_NAMES.has(account.propFirm.name.trim());
}

export function resolveSevenFirmsAccountRulesCard(
  _state: JournalDataV1,
  account: JournalAccount
): ApexAccountRulesCard | null {
  if (!isSevenFirmsJournalAccount(account)) return null;

  const row = findEvalCompareRow(account);
  if (!row) return null;

  const firm = account.propFirm.name.trim();
  const program = programLabel(account);
  const on = evalOvernightNews(firm, program, account.sizeLabel);

  const showFunded =
    account.accountType === "funded" ||
    account.accountType === "live" ||
    (account.accountType === "challenge" && account.status === "passed");

  if (!showFunded) {
    const rc = evalRulesCell(row, firm, program);
    const sizing =
      row.rules.sizing?.trim() && row.rules.sizing !== "—" ? row.rules.sizing : "—";
    const evalLayout: ApexEvalRulesLayout = {
      rules: { label: "Rules", value: rc.value, multiline: rc.multiline },
      drawdownType: { label: "Drawdown type", value: drawdownTypeLabel(row.drawdown) },
      sizing: { label: "Sizing", value: sizing, multiline: sizing.includes("\n") },
      profitTarget: { label: "Profit target", value: profitTargetCell(row) },
      tradingNews: { label: "Trading news", value: formatAllowedFromCsv(on.n) },
      drawdown: { label: "Drawdown", value: formatUsdWholeGrouped(row.maxDrawdownLimitUsd) },
      overnight: { label: "Overnight / Overweek", value: formatAllowedFromCsv(on.o) },
      dll: {
        label: "DLL",
        value: formatEvalDllDisplay(row.rules.dailyLossLimit?.trim() ?? "-"),
      },
    };
    return { phase: "eval", evalLayout };
  }

  const key = tableKey(account);
  const drow = findFundedCompareRow(account);
  const refRow = drow ?? row;
  let fd = resolveFundedDef(account, key);
  if (!fd && refRow.accountType === "Direct") {
    const tgt = refRow.target?.trim();
    fd = {
      overnight: "No",
      tradingNews: "Yes",
      sizing: refRow.rules.sizing?.trim() || "—",
      drawdownType: drawdownTypeLabel(refRow.drawdown),
      maxDrawdownUsd: refRow.maxDrawdownLimitUsd,
      dllCsv: refRow.rules.dailyLossLimit?.trim() ?? "-",
      payoutRules:
        refRow.rules.scalpingDetail?.trim() ||
        formatPayoutRulesConsistency(refRow.rules.consistency),
      payoutMiniUsd: -1,
      payoutMax: tgt && tgt !== "—" && tgt !== "-" ? `Profit goal ${tgt}` : "See firm",
      profitSplit: "See firm",
      bufferUsd: undefined,
    };
  }
  if (!fd) return null;

  const buf = lookupJournalBufferCents(account);
  return {
    phase: "funded",
    fundedLayout: fundedLayoutFrom(fd, buf),
  };
}
