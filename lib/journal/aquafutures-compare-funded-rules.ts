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

/** Données funded (hors notes) — CSV « AquaFutures Rules.csv ». */
export type AquaFundedDef = {
  tradingNews: string;
  overnight: string;
  consistency: string;
  minTradingDays: number;
  minProfitPerDayUsd: number;
  profitSplit: string;
  drawdownTypeRaw: string;
  maxDrawdownUsd: number;
  dllUsd: number | null;
  bufferUsd: number | null;
  scalingPlan: string;
  payoutMiniUsd: number;
  /** Une seule valeur dans le CSV (colonne Payout max). */
  payoutMaxUsd: number;
};

const PROFIT_SPLIT_DISPLAY = "100%";

export const ONE_STEP_BEGINNER_FUNDED: Record<"25k" | "50k" | "100k" | "150k", AquaFundedDef> = {
  "25k": {
    tradingNews: "No",
    overnight: "No",
    consistency: "40%",
    minTradingDays: 5,
    minProfitPerDayUsd: 200,
    profitSplit: PROFIT_SPLIT_DISPLAY,
    drawdownTypeRaw: "EOD",
    maxDrawdownUsd: 1000,
    dllUsd: 600,
    bufferUsd: null,
    scalingPlan: "1 mini / 10 micros",
    payoutMiniUsd: 250,
    payoutMaxUsd: 750,
  },
  "50k": {
    tradingNews: "No",
    overnight: "No",
    consistency: "40%",
    minTradingDays: 5,
    minProfitPerDayUsd: 200,
    profitSplit: PROFIT_SPLIT_DISPLAY,
    drawdownTypeRaw: "EOD",
    maxDrawdownUsd: 2500,
    dllUsd: 1250,
    bufferUsd: null,
    scalingPlan: "3 minis / 30 micros",
    payoutMiniUsd: 250,
    payoutMaxUsd: 1500,
  },
  "100k": {
    tradingNews: "No",
    overnight: "No",
    consistency: "40%",
    minTradingDays: 5,
    minProfitPerDayUsd: 360,
    profitSplit: PROFIT_SPLIT_DISPLAY,
    drawdownTypeRaw: "EOD",
    maxDrawdownUsd: 3500,
    dllUsd: 2500,
    bufferUsd: null,
    scalingPlan: "6 minis / 60 micros",
    payoutMiniUsd: 250,
    payoutMaxUsd: 3000,
  },
  "150k": {
    tradingNews: "No",
    overnight: "No",
    consistency: "40%",
    minTradingDays: 5,
    minProfitPerDayUsd: 580,
    profitSplit: PROFIT_SPLIT_DISPLAY,
    drawdownTypeRaw: "EOD",
    maxDrawdownUsd: 5000,
    dllUsd: 3750,
    bufferUsd: null,
    scalingPlan: "9 minis / 90 micros",
    payoutMiniUsd: 250,
    payoutMaxUsd: 4500,
  },
};

export const ONE_STEP_STANDARD_FUNDED: Record<"25k" | "50k" | "100k" | "150k", AquaFundedDef> = {
  "25k": {
    tradingNews: "No",
    overnight: "No",
    consistency: "40%",
    minTradingDays: 5,
    minProfitPerDayUsd: 120,
    profitSplit: PROFIT_SPLIT_DISPLAY,
    drawdownTypeRaw: "EOD",
    maxDrawdownUsd: 1000,
    dllUsd: null,
    bufferUsd: 1100,
    scalingPlan: "2 minis / 20 micros",
    payoutMiniUsd: 500,
    payoutMaxUsd: 850,
  },
  "50k": {
    tradingNews: "No",
    overnight: "No",
    consistency: "40%",
    minTradingDays: 5,
    minProfitPerDayUsd: 200,
    profitSplit: PROFIT_SPLIT_DISPLAY,
    drawdownTypeRaw: "EOD",
    maxDrawdownUsd: 2000,
    dllUsd: null,
    bufferUsd: 2100,
    scalingPlan: "4 minis / 40 micros",
    payoutMiniUsd: 500,
    payoutMaxUsd: 1500,
  },
  "100k": {
    tradingNews: "No",
    overnight: "No",
    consistency: "40%",
    minTradingDays: 5,
    minProfitPerDayUsd: 360,
    profitSplit: PROFIT_SPLIT_DISPLAY,
    drawdownTypeRaw: "EOD",
    maxDrawdownUsd: 3500,
    dllUsd: null,
    bufferUsd: 3100,
    scalingPlan: "6 minis / 60 micros",
    payoutMiniUsd: 500,
    payoutMaxUsd: 2000,
  },
  "150k": {
    tradingNews: "No",
    overnight: "No",
    consistency: "40%",
    minTradingDays: 5,
    minProfitPerDayUsd: 580,
    profitSplit: PROFIT_SPLIT_DISPLAY,
    drawdownTypeRaw: "EOD",
    maxDrawdownUsd: 5000,
    dllUsd: null,
    bufferUsd: 4600,
    scalingPlan: "10 minis / 100 micros",
    payoutMiniUsd: 500,
    payoutMaxUsd: 3000,
  },
};

export const INSTANT_STANDARD_FUNDED: Record<"50k" | "100k", AquaFundedDef> = {
  "50k": {
    tradingNews: "No",
    overnight: "No",
    consistency: "20%",
    minTradingDays: 7,
    minProfitPerDayUsd: 75,
    profitSplit: PROFIT_SPLIT_DISPLAY,
    drawdownTypeRaw: "EOD",
    maxDrawdownUsd: 2000,
    dllUsd: 1250,
    bufferUsd: null,
    scalingPlan: "3 minis / 30 micros",
    payoutMiniUsd: 500,
    payoutMaxUsd: 1500,
  },
  "100k": {
    tradingNews: "No",
    overnight: "No",
    consistency: "20%",
    minTradingDays: 7,
    minProfitPerDayUsd: 200,
    profitSplit: PROFIT_SPLIT_DISPLAY,
    drawdownTypeRaw: "EOD",
    maxDrawdownUsd: 3000,
    dllUsd: 2500,
    bufferUsd: null,
    scalingPlan: "6 minis / 60 micros",
    payoutMiniUsd: 500,
    payoutMaxUsd: 3000,
  },
};

export const INSTANT_PRO_FUNDED: Record<"50k" | "100k", AquaFundedDef> = {
  "50k": {
    tradingNews: "No",
    overnight: "No",
    consistency: "15%",
    minTradingDays: 7,
    minProfitPerDayUsd: 100,
    profitSplit: PROFIT_SPLIT_DISPLAY,
    drawdownTypeRaw: "Trailing",
    maxDrawdownUsd: 2000,
    dllUsd: null,
    bufferUsd: null,
    scalingPlan: "3 minis / 30 micros",
    payoutMiniUsd: 500,
    payoutMaxUsd: 1500,
  },
  "100k": {
    tradingNews: "No",
    overnight: "No",
    consistency: "15%",
    minTradingDays: 7,
    minProfitPerDayUsd: 200,
    profitSplit: PROFIT_SPLIT_DISPLAY,
    drawdownTypeRaw: "Trailing",
    maxDrawdownUsd: 3000,
    dllUsd: null,
    bufferUsd: null,
    scalingPlan: "6 minis / 60 micros",
    payoutMiniUsd: 500,
    payoutMaxUsd: 3000,
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

function payoutRulesValue(fd: AquaFundedDef): string {
  return [
    formatPayoutRulesConsistency(fd.consistency),
    formatJournalMinProfitDaysLine(fd.minTradingDays, fd.minProfitPerDayUsd),
  ].join("\n");
}

function layoutFromDef(fd: AquaFundedDef): ApexFundedRulesLayout {
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

  const column3: ApexRulesRow[] = [
    { label: "Scaling Plan", value: fd.scalingPlan },
    { label: "Payout mini", value: formatUsdWholeGrouped(fd.payoutMiniUsd) },
    {
      label: "Payout maxi",
      value: formatUsdWholeGrouped(fd.payoutMaxUsd),
    },
  ];

  return { column1, column2, column3 };
}

export function resolveAquaFuturesCompareFundedRulesCard(
  firm: PropFirm
): ApexAccountRulesCard | null {
  if (firm.name !== "AquaFutures") return null;

  const size = firm.size;

  if (firm.accountName === "One Step Beginner") {
    if (size !== "25k" && size !== "50k" && size !== "100k" && size !== "150k") return null;
    return {
      phase: "funded",
      fundedLayout: layoutFromDef(ONE_STEP_BEGINNER_FUNDED[size]),
    };
  }

  if (firm.accountName === "One Step Standard") {
    if (size !== "25k" && size !== "50k" && size !== "100k" && size !== "150k") return null;
    return {
      phase: "funded",
      fundedLayout: layoutFromDef(ONE_STEP_STANDARD_FUNDED[size]),
    };
  }

  if (firm.accountName === "Instant Standard") {
    if (size !== "50k" && size !== "100k") return null;
    return {
      phase: "funded",
      fundedLayout: layoutFromDef(INSTANT_STANDARD_FUNDED[size]),
    };
  }

  if (firm.accountName === "Instant Pro") {
    if (size !== "50k" && size !== "100k") return null;
    return {
      phase: "funded",
      fundedLayout: layoutFromDef(INSTANT_PRO_FUNDED[size]),
    };
  }

  return null;
}
