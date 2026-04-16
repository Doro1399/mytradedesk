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

export type LegendsTradingFundedDef = {
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
  payoutMaxDisplay: string;
  payoutMaxMultiline: boolean;
  /** Colonne CSV « Payout maxi » (USD) — plafond indicatif carte Progress. */
  payoutMaxFirstUsd: number;
  /** CSV : buffer renseigné sur toutes les lignes funded → modèle buffer Progress. */
  simplePayoutModel: "buffer";
};

export const APPRENTICE_FUNDED: Record<"50k" | "100k" | "150k", LegendsTradingFundedDef> = {
  "50k": {
    tradingNews: "No",
    overnight: "No",
    consistency: "35%",
    minTradingDays: 7,
    minProfitPerDayUsd: 200,
    profitSplit: "90%",
    drawdownTypeRaw: "EOD",
    maxDrawdownUsd: 2000,
    dllUsd: null,
    bufferUsd: 2000,
    scalingPlan: "2 minis / 20 micros",
    payoutMiniUsd: 1000,
    payoutMaxDisplay: formatUsdWholeGrouped(1200),
    payoutMaxMultiline: false,
    payoutMaxFirstUsd: 1200,
    simplePayoutModel: "buffer",
  },
  "100k": {
    tradingNews: "No",
    overnight: "No",
    consistency: "35%",
    minTradingDays: 7,
    minProfitPerDayUsd: 200,
    profitSplit: "90%",
    drawdownTypeRaw: "EOD",
    maxDrawdownUsd: 3000,
    dllUsd: null,
    bufferUsd: 4000,
    scalingPlan: "4 minis / 40 micros",
    payoutMiniUsd: 1000,
    payoutMaxDisplay: formatUsdWholeGrouped(2000),
    payoutMaxMultiline: false,
    payoutMaxFirstUsd: 2000,
    simplePayoutModel: "buffer",
  },
  "150k": {
    tradingNews: "No",
    overnight: "No",
    consistency: "35%",
    minTradingDays: 7,
    minProfitPerDayUsd: 200,
    profitSplit: "90%",
    drawdownTypeRaw: "EOD",
    maxDrawdownUsd: 4500,
    dllUsd: null,
    bufferUsd: 6500,
    scalingPlan: "6 minis / 60 micros",
    payoutMiniUsd: 1000,
    payoutMaxDisplay: formatUsdWholeGrouped(2500),
    payoutMaxMultiline: false,
    payoutMaxFirstUsd: 2500,
    simplePayoutModel: "buffer",
  },
};

export const ELITE_FUNDED: Record<"25k" | "50k" | "100k" | "150k", LegendsTradingFundedDef> = {
  "25k": {
    tradingNews: "No",
    overnight: "No",
    consistency: "40%",
    minTradingDays: 5,
    minProfitPerDayUsd: 100,
    profitSplit: "90%",
    drawdownTypeRaw: "EOD",
    maxDrawdownUsd: 1250,
    dllUsd: null,
    bufferUsd: 1000,
    scalingPlan: "2 minis / 20 micros",
    payoutMiniUsd: 500,
    payoutMaxDisplay: formatUsdWholeGrouped(800),
    payoutMaxMultiline: false,
    payoutMaxFirstUsd: 800,
    simplePayoutModel: "buffer",
  },
  "50k": {
    tradingNews: "No",
    overnight: "No",
    consistency: "40%",
    minTradingDays: 5,
    minProfitPerDayUsd: 150,
    profitSplit: "90%",
    drawdownTypeRaw: "EOD",
    maxDrawdownUsd: 2200,
    dllUsd: null,
    bufferUsd: 1500,
    scalingPlan: "4 minis / 40 micros",
    payoutMiniUsd: 500,
    payoutMaxDisplay: formatUsdWholeGrouped(2000),
    payoutMaxMultiline: false,
    payoutMaxFirstUsd: 2000,
    simplePayoutModel: "buffer",
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
    dllUsd: null,
    bufferUsd: 3000,
    scalingPlan: "8 minis / 80 micros",
    payoutMiniUsd: 500,
    payoutMaxDisplay: formatUsdWholeGrouped(3000),
    payoutMaxMultiline: false,
    payoutMaxFirstUsd: 3000,
    simplePayoutModel: "buffer",
  },
  "150k": {
    tradingNews: "No",
    overnight: "No",
    consistency: "40%",
    minTradingDays: 5,
    minProfitPerDayUsd: 250,
    profitSplit: "90%",
    drawdownTypeRaw: "EOD",
    maxDrawdownUsd: 4500,
    dllUsd: null,
    bufferUsd: 3500,
    scalingPlan: "12 minis / 120 micros",
    payoutMiniUsd: 500,
    payoutMaxDisplay: formatUsdWholeGrouped(3500),
    payoutMaxMultiline: false,
    payoutMaxFirstUsd: 3500,
    simplePayoutModel: "buffer",
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

function payoutRulesValue(fd: LegendsTradingFundedDef): string {
  return [
    formatPayoutRulesConsistency(fd.consistency),
    formatJournalMinProfitDaysLine(fd.minTradingDays, fd.minProfitPerDayUsd),
  ].join("\n");
}

function layoutFromDef(fd: LegendsTradingFundedDef): ApexFundedRulesLayout {
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
      value: fd.payoutMaxDisplay,
      multiline: fd.payoutMaxMultiline,
    },
  ];

  return { column1, column2, column3 };
}

export function resolveLegendsTradingCompareFundedRulesCard(
  firm: PropFirm
): ApexAccountRulesCard | null {
  if (firm.name !== "Legends Trading") return null;

  const sz = firm.size;

  if (firm.accountName === "Legends Trading Apprentice") {
    if (sz !== "50k" && sz !== "100k" && sz !== "150k") return null;
    return { phase: "funded", fundedLayout: layoutFromDef(APPRENTICE_FUNDED[sz]) };
  }

  if (firm.accountName === "Legends Trading Elite") {
    if (sz !== "25k" && sz !== "50k" && sz !== "100k" && sz !== "150k") return null;
    return { phase: "funded", fundedLayout: layoutFromDef(ELITE_FUNDED[sz]) };
  }

  return null;
}
