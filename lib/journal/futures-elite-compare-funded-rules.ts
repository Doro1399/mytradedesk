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

export type FuturesEliteFundedDef = {
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
  payoutMiniDisplay: string;
  payoutMaxLines: string;
  payoutMaxMultiline: boolean;
  /** Colonne CSV « Payout mini » : `—` / tiret → 0 pour la carte Progress simplifiée. */
  payoutMiniUsd: number;
  /** 1er palier colonne « Payout max » (CSV). */
  payoutMaxFirstUsd: number;
  /** Modèle indicatif Progress — Prime = notes 50/50 ; Elite = buffer ; Instant = profit. */
  simplePayoutModel: "buffer" | "fifty_percent" | "profit";
};

const SPLIT_80 = "80%";

export const PRIME_FUNDED: Record<"50k" | "100k" | "150k", FuturesEliteFundedDef> = {
  "50k": {
    tradingNews: "No",
    overnight: "No",
    consistency: "40%",
    minTradingDays: 5,
    minProfitPerDayUsd: 150,
    profitSplit: SPLIT_80,
    drawdownTypeRaw: "Trailing",
    maxDrawdownUsd: 2000,
    dllUsd: null,
    bufferUsd: 2000,
    scalingPlan: "3 minis / 30 micros",
    payoutMiniDisplay: "—",
    payoutMaxLines: ["1st: $1,300", "2nd: $1,500", "3rd+: $1,800"].join("\n"),
    payoutMaxMultiline: true,
    payoutMiniUsd: 0,
    payoutMaxFirstUsd: 1300,
    simplePayoutModel: "fifty_percent",
  },
  "100k": {
    tradingNews: "No",
    overnight: "No",
    consistency: "40%",
    minTradingDays: 5,
    minProfitPerDayUsd: 250,
    profitSplit: SPLIT_80,
    drawdownTypeRaw: "Trailing",
    maxDrawdownUsd: 3000,
    dllUsd: null,
    bufferUsd: 2800,
    scalingPlan: "8 minis / 80 micros",
    payoutMiniDisplay: "—",
    payoutMaxLines: ["1st: $2,500", "2nd: $2,900", "3rd+: $3,300"].join("\n"),
    payoutMaxMultiline: true,
    payoutMiniUsd: 0,
    payoutMaxFirstUsd: 2500,
    simplePayoutModel: "fifty_percent",
  },
  "150k": {
    tradingNews: "No",
    overnight: "No",
    consistency: "40%",
    minTradingDays: 5,
    minProfitPerDayUsd: 350,
    profitSplit: SPLIT_80,
    drawdownTypeRaw: "Trailing",
    maxDrawdownUsd: 4500,
    dllUsd: null,
    bufferUsd: 4500,
    scalingPlan: "12 minis / 120 micros",
    payoutMiniDisplay: "—",
    payoutMaxLines: ["1st: $3,500", "2nd: $3,900", "3rd+: $4,500"].join("\n"),
    payoutMaxMultiline: true,
    payoutMiniUsd: 0,
    payoutMaxFirstUsd: 3500,
    simplePayoutModel: "fifty_percent",
  },
};

export const ELITE_FUNDED: Record<"50k" | "100k" | "150k", FuturesEliteFundedDef> = {
  "50k": {
    tradingNews: "No",
    overnight: "No",
    consistency: "50%",
    minTradingDays: 5,
    minProfitPerDayUsd: 150,
    profitSplit: SPLIT_80,
    drawdownTypeRaw: "EOD",
    maxDrawdownUsd: 2000,
    dllUsd: null,
    bufferUsd: 2000,
    scalingPlan: "4 minis / 40 micros",
    payoutMiniDisplay: "—",
    payoutMaxLines: ["1st: $1,300", "2nd: $1,500", "3rd+: $1,500"].join("\n"),
    payoutMaxMultiline: true,
    payoutMiniUsd: 0,
    payoutMaxFirstUsd: 1300,
    simplePayoutModel: "buffer",
  },
  "100k": {
    tradingNews: "No",
    overnight: "No",
    consistency: "50%",
    minTradingDays: 5,
    minProfitPerDayUsd: 250,
    profitSplit: SPLIT_80,
    drawdownTypeRaw: "EOD",
    maxDrawdownUsd: 3000,
    dllUsd: null,
    bufferUsd: 2800,
    scalingPlan: "8 minis / 80 micros",
    payoutMiniDisplay: "—",
    payoutMaxLines: ["1st: $2,500", "2nd: $2,900", "3rd+: $2,900"].join("\n"),
    payoutMaxMultiline: true,
    payoutMiniUsd: 0,
    payoutMaxFirstUsd: 2500,
    simplePayoutModel: "buffer",
  },
  "150k": {
    tradingNews: "No",
    overnight: "No",
    consistency: "50%",
    minTradingDays: 5,
    minProfitPerDayUsd: 350,
    profitSplit: SPLIT_80,
    drawdownTypeRaw: "EOD",
    maxDrawdownUsd: 4500,
    dllUsd: null,
    bufferUsd: 4500,
    scalingPlan: "12 minis / 120 micros",
    payoutMiniDisplay: "—",
    payoutMaxLines: ["1st: $3,500", "2nd: $3,900", "3rd+: $3,900"].join("\n"),
    payoutMaxMultiline: true,
    payoutMiniUsd: 0,
    payoutMaxFirstUsd: 3500,
    simplePayoutModel: "buffer",
  },
};

export const INSTANT_FUNDED: Record<"25k" | "50k" | "100k" | "150k", FuturesEliteFundedDef> = {
  "25k": {
    tradingNews: "No",
    overnight: "No",
    consistency: "20%",
    minTradingDays: 7,
    minProfitPerDayUsd: 100,
    profitSplit: SPLIT_80,
    drawdownTypeRaw: "EOD",
    maxDrawdownUsd: 1000,
    dllUsd: null,
    bufferUsd: null,
    scalingPlan: "2 minis / 20 micros",
    payoutMiniDisplay: "—",
    payoutMaxLines: "$1,000",
    payoutMaxMultiline: false,
    payoutMiniUsd: 0,
    payoutMaxFirstUsd: 1000,
    simplePayoutModel: "profit",
  },
  "50k": {
    tradingNews: "No",
    overnight: "No",
    consistency: "20%",
    minTradingDays: 7,
    minProfitPerDayUsd: 150,
    profitSplit: SPLIT_80,
    drawdownTypeRaw: "EOD",
    maxDrawdownUsd: 2000,
    dllUsd: null,
    bufferUsd: null,
    scalingPlan: "4 minis / 40 micros",
    payoutMiniDisplay: "—",
    payoutMaxLines: ["1st: $2,000", "2nd: $2,500", "3rd+: $3,000"].join("\n"),
    payoutMaxMultiline: true,
    payoutMiniUsd: 0,
    payoutMaxFirstUsd: 2000,
    simplePayoutModel: "profit",
  },
  "100k": {
    tradingNews: "No",
    overnight: "No",
    consistency: "20%",
    minTradingDays: 7,
    minProfitPerDayUsd: 250,
    profitSplit: SPLIT_80,
    drawdownTypeRaw: "EOD",
    maxDrawdownUsd: 4000,
    dllUsd: null,
    bufferUsd: null,
    scalingPlan: "8 minis / 80 micros",
    payoutMiniDisplay: "—",
    payoutMaxLines: ["1st: $3,500", "2nd: $4,000", "3rd+: $4,500"].join("\n"),
    payoutMaxMultiline: true,
    payoutMiniUsd: 0,
    payoutMaxFirstUsd: 3500,
    simplePayoutModel: "profit",
  },
  "150k": {
    tradingNews: "No",
    overnight: "No",
    consistency: "20%",
    minTradingDays: 7,
    minProfitPerDayUsd: 350,
    profitSplit: SPLIT_80,
    drawdownTypeRaw: "EOD",
    maxDrawdownUsd: 6000,
    dllUsd: null,
    bufferUsd: null,
    scalingPlan: "12 minis / 120 micros",
    payoutMiniDisplay: "—",
    payoutMaxLines: ["1st: $4,200", "2nd: $4,600", "3rd+: $5,000"].join("\n"),
    payoutMaxMultiline: true,
    payoutMiniUsd: 0,
    payoutMaxFirstUsd: 4200,
    simplePayoutModel: "profit",
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

function payoutRulesValue(fd: FuturesEliteFundedDef): string {
  return [
    formatPayoutRulesConsistency(fd.consistency),
    formatJournalMinProfitDaysLine(fd.minTradingDays, fd.minProfitPerDayUsd),
  ].join("\n");
}

function layoutFromDef(fd: FuturesEliteFundedDef): ApexFundedRulesLayout {
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
    {
      label: "Payout mini",
      value: fd.payoutMiniDisplay,
    },
    {
      label: "Payout maxi",
      value: fd.payoutMaxLines,
      multiline: fd.payoutMaxMultiline,
    },
  ];

  return { column1, column2, column3 };
}

export function resolveFuturesEliteCompareFundedRulesCard(
  firm: PropFirm
): ApexAccountRulesCard | null {
  if (firm.name !== "FuturesElite") return null;

  const sz = firm.size;

  if (firm.accountName === "FuturesElite Prime") {
    if (sz !== "50k" && sz !== "100k" && sz !== "150k") return null;
    return { phase: "funded", fundedLayout: layoutFromDef(PRIME_FUNDED[sz]) };
  }

  if (firm.accountName === "FuturesElite Elite") {
    if (sz !== "50k" && sz !== "100k" && sz !== "150k") return null;
    return { phase: "funded", fundedLayout: layoutFromDef(ELITE_FUNDED[sz]) };
  }

  if (firm.accountName === "FuturesElite Instant") {
    if (sz !== "25k" && sz !== "50k" && sz !== "100k" && sz !== "150k") return null;
    return { phase: "funded", fundedLayout: layoutFromDef(INSTANT_FUNDED[sz]) };
  }

  return null;
}
