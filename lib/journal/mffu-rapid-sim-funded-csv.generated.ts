/** Auto-generated from CSV Propfirm Rules/My Funded Futures Rules.csv (Rapid funded) — run: `npm run gen:mffu-rapid` */

export type MffuRapidSimFundedCsvSize = "25k" | "50k" | "100k" | "150k";

export type MffuRapidSimFundedCsvRow = {
  bufferUsd: number;
  payoutMiniUsd: number;
  payoutMaxUsd: number;
  profitSplitLabel: string;
};

export const MFFU_RAPID_SIM_FUNDED_FROM_CSV: Record<MffuRapidSimFundedCsvSize, MffuRapidSimFundedCsvRow> = {
  "25k": {
    bufferUsd: 1100,
    payoutMiniUsd: 500,
    payoutMaxUsd: 5000,
    profitSplitLabel: "90%",
  },
  "50k": {
    bufferUsd: 2100,
    payoutMiniUsd: 500,
    payoutMaxUsd: 5000,
    profitSplitLabel: "90%",
  },
  "100k": {
    bufferUsd: 3100,
    payoutMiniUsd: 500,
    payoutMaxUsd: 5000,
    profitSplitLabel: "90%",
  },
  "150k": {
    bufferUsd: 4600,
    payoutMiniUsd: 500,
    payoutMaxUsd: 5000,
    profitSplitLabel: "90%",
  },
};
