import type {
  ApexAccountRulesCard,
  ApexFundedRulesLayout,
  ApexRulesRow,
} from "@/lib/journal/apex-journal-rules";
import {
  formatAllowedFromCsv,
  formatApexDrawdownType,
  formatJournalMinProfitDaysLine,
  formatPayoutRulesConsistency,
} from "@/lib/journal/apex-journal-rules";
import { formatUsdWholeGrouped, type PropFirm } from "@/lib/prop-firms";

export type AlphaFuturesFundedDef = {
  tradingNews: string;
  overnight: string;
  consistency: string;
  minTradingDays: number;
  minProfitPerDayUsd: number | null;
  profitSplit: string;
  drawdownTypeRaw: string;
  maxDrawdownUsd: number;
  dllUsd: number | null;
  bufferUsd: number | null;
  scalingPlan: string;
  /** Colonne CSV « Payout mini » (USD entier). */
  payoutMiniUsd: number;
  payoutMaxDisplay: string;
  payoutMaxMultiline: boolean;
  /** 1er palier « Payout max » CSV (montant indicatif carte Progress). */
  payoutMaxFirstUsd: number;
  /** Modèle indicatif Progress — Zero / Advanced = notes 50 % ; Standard = profit (pas de buffer CSV). */
  simplePayoutModel: "fifty_percent" | "profit";
  /** Standard : split trader marginal selon l’index de payout payé (notes CSV 70 / 80 / 90 %). */
  standardEscalatingSplit: boolean;
};

export const ZERO_FUNDED: Record<"25k" | "50k" | "100k", AlphaFuturesFundedDef> = {
  "25k": {
    tradingNews: "No",
    overnight: "No",
    consistency: "40%",
    minTradingDays: 5,
    minProfitPerDayUsd: 200,
    profitSplit: "90%",
    drawdownTypeRaw: "EOD",
    maxDrawdownUsd: 1000,
    dllUsd: 500,
    bufferUsd: null,
    scalingPlan: "1 mini / 10 micros",
    payoutMiniUsd: 200,
    payoutMaxDisplay: formatUsdWholeGrouped(1000),
    payoutMaxMultiline: false,
    payoutMaxFirstUsd: 1000,
    simplePayoutModel: "fifty_percent",
    standardEscalatingSplit: false,
  },
  "50k": {
    tradingNews: "No",
    overnight: "No",
    consistency: "40%",
    minTradingDays: 5,
    minProfitPerDayUsd: 200,
    profitSplit: "90%",
    drawdownTypeRaw: "EOD",
    maxDrawdownUsd: 2000,
    dllUsd: 1000,
    bufferUsd: null,
    scalingPlan: "3 minis / 30 micros",
    payoutMiniUsd: 200,
    payoutMaxDisplay: formatUsdWholeGrouped(1500),
    payoutMaxMultiline: false,
    payoutMaxFirstUsd: 1500,
    simplePayoutModel: "fifty_percent",
    standardEscalatingSplit: false,
  },
  "100k": {
    tradingNews: "No",
    overnight: "No",
    consistency: "40%",
    minTradingDays: 5,
    minProfitPerDayUsd: 200,
    profitSplit: "90%",
    drawdownTypeRaw: "EOD",
    maxDrawdownUsd: 3000,
    dllUsd: 2000,
    bufferUsd: null,
    scalingPlan: "6 minis / 60 micros",
    payoutMiniUsd: 200,
    payoutMaxDisplay: formatUsdWholeGrouped(2500),
    payoutMaxMultiline: false,
    payoutMaxFirstUsd: 2500,
    simplePayoutModel: "fifty_percent",
    standardEscalatingSplit: false,
  },
};

export const STANDARD_FUNDED: Record<"50k" | "100k" | "150k", AlphaFuturesFundedDef> = {
  "50k": {
    tradingNews: "No",
    overnight: "No",
    consistency: "40%",
    minTradingDays: 3,
    minProfitPerDayUsd: null,
    profitSplit: "70%–90%",
    drawdownTypeRaw: "EOD",
    maxDrawdownUsd: 2000,
    dllUsd: null,
    bufferUsd: null,
    scalingPlan: "5 minis / 50 micros",
    payoutMiniUsd: 200,
    payoutMaxDisplay: formatUsdWholeGrouped(15000),
    payoutMaxMultiline: false,
    payoutMaxFirstUsd: 15000,
    simplePayoutModel: "profit",
    standardEscalatingSplit: true,
  },
  "100k": {
    tradingNews: "No",
    overnight: "No",
    consistency: "40%",
    minTradingDays: 3,
    minProfitPerDayUsd: null,
    profitSplit: "70%–90%",
    drawdownTypeRaw: "EOD",
    maxDrawdownUsd: 4000,
    dllUsd: null,
    bufferUsd: null,
    scalingPlan: "10 minis / 100 micros",
    payoutMiniUsd: 200,
    payoutMaxDisplay: formatUsdWholeGrouped(15000),
    payoutMaxMultiline: false,
    payoutMaxFirstUsd: 15000,
    simplePayoutModel: "profit",
    standardEscalatingSplit: true,
  },
  "150k": {
    tradingNews: "No",
    overnight: "No",
    consistency: "40%",
    minTradingDays: 3,
    minProfitPerDayUsd: null,
    profitSplit: "70%–90%",
    drawdownTypeRaw: "EOD",
    maxDrawdownUsd: 6000,
    dllUsd: null,
    bufferUsd: null,
    scalingPlan: "15 minis / 150 micros",
    payoutMiniUsd: 200,
    payoutMaxDisplay: formatUsdWholeGrouped(15000),
    payoutMaxMultiline: false,
    payoutMaxFirstUsd: 15000,
    simplePayoutModel: "profit",
    standardEscalatingSplit: true,
  },
};

export const ADVANCED_FUNDED: Record<"50k" | "100k" | "150k", AlphaFuturesFundedDef> = {
  "50k": {
    tradingNews: "No",
    overnight: "No",
    consistency: "40%",
    minTradingDays: 5,
    minProfitPerDayUsd: 200,
    profitSplit: "90%",
    drawdownTypeRaw: "EOD",
    maxDrawdownUsd: 1750,
    dllUsd: null,
    bufferUsd: null,
    scalingPlan: "5 minis / 50 micros",
    payoutMiniUsd: 1000,
    payoutMaxDisplay: formatUsdWholeGrouped(15000),
    payoutMaxMultiline: false,
    payoutMaxFirstUsd: 15000,
    simplePayoutModel: "fifty_percent",
    standardEscalatingSplit: false,
  },
  "100k": {
    tradingNews: "No",
    overnight: "No",
    consistency: "40%",
    minTradingDays: 5,
    minProfitPerDayUsd: 200,
    profitSplit: "90%",
    drawdownTypeRaw: "EOD",
    maxDrawdownUsd: 3500,
    dllUsd: null,
    bufferUsd: null,
    scalingPlan: "10 minis / 100 micros",
    payoutMiniUsd: 1000,
    payoutMaxDisplay: formatUsdWholeGrouped(15000),
    payoutMaxMultiline: false,
    payoutMaxFirstUsd: 15000,
    simplePayoutModel: "fifty_percent",
    standardEscalatingSplit: false,
  },
  "150k": {
    tradingNews: "No",
    overnight: "No",
    consistency: "40%",
    minTradingDays: 5,
    minProfitPerDayUsd: 200,
    profitSplit: "90%",
    drawdownTypeRaw: "EOD",
    maxDrawdownUsd: 5250,
    dllUsd: null,
    bufferUsd: null,
    scalingPlan: "15 minis / 150 micros",
    payoutMiniUsd: 1000,
    payoutMaxDisplay: formatUsdWholeGrouped(15000),
    payoutMaxMultiline: false,
    payoutMaxFirstUsd: 15000,
    simplePayoutModel: "fifty_percent",
    standardEscalatingSplit: false,
  },
};

function formatDllFunded(usd: number | null): string {
  if (usd == null) return "None";
  return formatUsdWholeGrouped(usd);
}

function formatBuffer(usd: number | null): string {
  if (usd == null) return "—";
  return formatUsdWholeGrouped(usd);
}

function payoutRulesValue(fd: AlphaFuturesFundedDef): string {
  const lines = [formatPayoutRulesConsistency(fd.consistency)];
  if (fd.minProfitPerDayUsd != null) {
    lines.push(formatJournalMinProfitDaysLine(fd.minTradingDays, fd.minProfitPerDayUsd));
  } else {
    lines.push(`${fd.minTradingDays} min. trading days`);
  }
  return lines.join("\n");
}

function layoutFromDef(fd: AlphaFuturesFundedDef): ApexFundedRulesLayout {
  const column1: ApexRulesRow[] = [
    {
      label: "Payout rules",
      value: payoutRulesValue(fd),
      multiline: true,
    },
    { label: "Trading news", value: formatAllowedFromCsv(fd.tradingNews) },
    { label: "Overnight / Overweek", value: formatAllowedFromCsv(fd.overnight) },
    { label: "Profit split", value: fd.profitSplit },
  ];

  const column2: ApexRulesRow[] = [
    { label: "Drawdown Type", value: formatApexDrawdownType(fd.drawdownTypeRaw) },
    { label: "Drawdown", value: formatUsdWholeGrouped(fd.maxDrawdownUsd) },
    { label: "DLL", value: formatDllFunded(fd.dllUsd) },
    { label: "Buffer", value: formatBuffer(fd.bufferUsd) },
  ];

  const payoutMiniVal = formatUsdWholeGrouped(fd.payoutMiniUsd);

  const column3: ApexRulesRow[] = [
    { label: "Scaling Plan", value: fd.scalingPlan },
    { label: "Payout mini", value: payoutMiniVal },
    {
      label: "Payout maxi",
      value: fd.payoutMaxDisplay,
      multiline: fd.payoutMaxMultiline,
    },
  ];

  return { column1, column2, column3 };
}

export function resolveAlphaFuturesCompareFundedRulesCard(
  firm: PropFirm
): ApexAccountRulesCard | null {
  if (firm.name !== "Alpha Futures") return null;

  const sz = firm.size;

  if (firm.accountName === "Alpha Futures Zero") {
    if (sz !== "25k" && sz !== "50k" && sz !== "100k") return null;
    return { phase: "funded", fundedLayout: layoutFromDef(ZERO_FUNDED[sz]) };
  }

  if (firm.accountName === "Alpha Futures Standard") {
    if (sz !== "50k" && sz !== "100k" && sz !== "150k") return null;
    return { phase: "funded", fundedLayout: layoutFromDef(STANDARD_FUNDED[sz]) };
  }

  if (firm.accountName === "Alpha Futures Advanced") {
    if (sz !== "50k" && sz !== "100k" && sz !== "150k") return null;
    return { phase: "funded", fundedLayout: layoutFromDef(ADVANCED_FUNDED[sz]) };
  }

  return null;
}
