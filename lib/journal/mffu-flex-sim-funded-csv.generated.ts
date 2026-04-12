/** Auto-generated from CSV Propfirm Rules/My Funded Futures Rules.csv (Flex funded) — run: `npm run gen:mffu-flex` */

export type MffuFlexSimFundedCsvSize = "25k" | "50k";

export type MffuFlexSimFundedCsvRow = {
  /** Funded « Min trading days » — winning days required per cycle. */
  fundedMinTradingDays: number;
  /** Funded « Min Profit per day » (USD) — net day threshold for a winning day. */
  winningDayThresholdUsd: number;
  /** Implied minimum cycle net P/L: `fundedMinTradingDays × winningDayThresholdUsd` (no separate CSV cell). */
  requiredCycleProfitUsd: number;
  payoutMiniUsd: number;
  payoutMaxUsd: number;
  profitSplitLabel: string;
  notes: string;
};

export const MFFU_FLEX_SIM_FUNDED_FROM_CSV: Record<MffuFlexSimFundedCsvSize, MffuFlexSimFundedCsvRow> = {
  "25k": {
    fundedMinTradingDays: 5,
    winningDayThresholdUsd: 100,
    requiredCycleProfitUsd: 500,
    payoutMiniUsd: 250,
    payoutMaxUsd: 3000,
    profitSplitLabel: "80%",
    notes: "Request 50% of account balance\nOther 50% stays as buffer",
  },
  "50k": {
    fundedMinTradingDays: 5,
    winningDayThresholdUsd: 150,
    requiredCycleProfitUsd: 750,
    payoutMiniUsd: 250,
    payoutMaxUsd: 5000,
    profitSplitLabel: "80%",
    notes: "Request 50% of account balance\nOther 50% stays as buffer",
  },
};
