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

/** Données funded (hors notes) — CSV « YRM Prop Rules.csv ». */
export type YrmFundedDef = {
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
  payoutMaxUsd: readonly [number, number, number, number];
};

export const PRIME_FUNDED: Record<"50k" | "100k" | "150k", YrmFundedDef> = {
  "50k": {
    tradingNews: "Yes",
    overnight: "No",
    consistency: "35%",
    minTradingDays: 6,
    minProfitPerDayUsd: 150,
    profitSplit: "90%",
    drawdownTypeRaw: "EOD",
    maxDrawdownUsd: 2000,
    dllUsd: null,
    bufferUsd: 100,
    scalingPlan: "5 minis / 50 micros",
    payoutMiniUsd: 250,
    payoutMaxUsd: [1500, 2000, 2500, 4000],
  },
  "100k": {
    tradingNews: "Yes",
    overnight: "No",
    consistency: "35%",
    minTradingDays: 6,
    minProfitPerDayUsd: 150,
    profitSplit: "90%",
    drawdownTypeRaw: "EOD",
    maxDrawdownUsd: 3000,
    dllUsd: null,
    bufferUsd: 100,
    scalingPlan: "10 minis / 100 micros",
    payoutMiniUsd: 250,
    payoutMaxUsd: [2000, 2500, 3000, 5000],
  },
  "150k": {
    tradingNews: "Yes",
    overnight: "No",
    consistency: "35%",
    minTradingDays: 6,
    minProfitPerDayUsd: 150,
    profitSplit: "90%",
    drawdownTypeRaw: "EOD",
    maxDrawdownUsd: 4500,
    dllUsd: null,
    bufferUsd: 100,
    scalingPlan: "15 minis / 150 micros",
    payoutMiniUsd: 250,
    payoutMaxUsd: [2500, 3000, 3500, 6000],
  },
};

export const INSTANT_FUNDED: Record<"25k" | "50k" | "100k" | "150k", YrmFundedDef> = {
  "25k": {
    tradingNews: "Yes",
    overnight: "No",
    consistency: "20%",
    minTradingDays: 8,
    minProfitPerDayUsd: 150,
    profitSplit: "90%",
    drawdownTypeRaw: "EOD",
    maxDrawdownUsd: 1250,
    dllUsd: null,
    bufferUsd: null,
    scalingPlan: "1 mini / 10 micros",
    payoutMiniUsd: 250,
    payoutMaxUsd: [1000, 1500, 2500, 3500],
  },
  "50k": {
    tradingNews: "Yes",
    overnight: "No",
    consistency: "20%",
    minTradingDays: 8,
    minProfitPerDayUsd: 150,
    profitSplit: "90%",
    drawdownTypeRaw: "EOD",
    maxDrawdownUsd: 2000,
    dllUsd: 1500,
    bufferUsd: null,
    scalingPlan: "2 minis / 20 micros",
    payoutMiniUsd: 250,
    payoutMaxUsd: [1500, 2000, 2500, 4000],
  },
  "100k": {
    tradingNews: "Yes",
    overnight: "No",
    consistency: "20%",
    minTradingDays: 8,
    minProfitPerDayUsd: 150,
    profitSplit: "90%",
    drawdownTypeRaw: "EOD",
    maxDrawdownUsd: 4000,
    dllUsd: 3000,
    bufferUsd: null,
    scalingPlan: "4 minis / 40 micros",
    payoutMiniUsd: 250,
    payoutMaxUsd: [2000, 2500, 3000, 5000],
  },
  "150k": {
    tradingNews: "Yes",
    overnight: "No",
    consistency: "20%",
    minTradingDays: 8,
    minProfitPerDayUsd: 150,
    profitSplit: "90%",
    drawdownTypeRaw: "EOD",
    maxDrawdownUsd: 6000,
    dllUsd: 4500,
    bufferUsd: null,
    scalingPlan: "7 minis / 70 micros",
    payoutMiniUsd: 250,
    payoutMaxUsd: [2500, 3000, 3500, 6000],
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

function formatPayoutMaxiFourTiers(usd: readonly [number, number, number, number]): string {
  const labels = ["1st", "2nd", "3rd", "4th+"] as const;
  return usd.map((v, i) => `${labels[i]}: ${formatUsdWholeGrouped(v)}`).join("\n");
}

function payoutRulesValue(fd: YrmFundedDef): string {
  return [
    formatPayoutRulesConsistency(fd.consistency),
    formatJournalMinProfitDaysLine(fd.minTradingDays, fd.minProfitPerDayUsd),
  ].join("\n");
}

function layoutFromDef(fd: YrmFundedDef): ApexFundedRulesLayout {
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
      value: formatPayoutMaxiFourTiers(fd.payoutMaxUsd),
      multiline: true,
    },
  ];

  return { column1, column2, column3 };
}

/**
 * Règles funded Compare pour YRM Prop — alignées CSV, mêmes labels que la section funded Apex / pj2.
 */
export function resolveYrmPropCompareFundedRulesCard(
  firm: PropFirm
): ApexAccountRulesCard | null {
  if (firm.name !== "YRM Prop") return null;

  if (firm.accountName === "YRM Prop Prime") {
    const key = firm.size;
    if (key !== "50k" && key !== "100k" && key !== "150k") return null;
    const def = PRIME_FUNDED[key];
    return { phase: "funded", fundedLayout: layoutFromDef(def) };
  }

  if (firm.accountName === "YRM Prop Instant Prime") {
    const key = firm.size;
    if (key !== "25k" && key !== "50k" && key !== "100k" && key !== "150k") return null;
    const def = INSTANT_FUNDED[key];
    return { phase: "funded", fundedLayout: layoutFromDef(def) };
  }

  return null;
}
