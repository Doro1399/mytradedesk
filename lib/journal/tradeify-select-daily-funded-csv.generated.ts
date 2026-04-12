/** Auto-generated from CSV Propfirm Rules/Tradeify Rules.csv (Tradeify Select Daily funded) — run: `npm run gen:tradeify-select-daily` */

export type TradeifySelectDailyCsvSize = "25k" | "50k" | "100k" | "150k";

export type TradeifySelectDailyFundedCsvRow = {
  overnight: string;
  tradingNews: string;
  sizing: string;
  maxDrawdownUsd: number;
  dllUsd: number | null;
  bufferUsd: number;
  payoutMiniUsd: number;
  payoutMaxUsd: number;
  profitSplitLabel: string;
};

export const TRADEIFY_SELECT_DAILY_FUNDED_FROM_CSV: Record<TradeifySelectDailyCsvSize, TradeifySelectDailyFundedCsvRow> = {
  "25k": {
    overnight: "No",
    tradingNews: "Yes",
    sizing: "1 mini / 10 micros",
    maxDrawdownUsd: 1000,
    dllUsd: 500,
    bufferUsd: 1100,
    payoutMiniUsd: 250,
    payoutMaxUsd: 600,
    profitSplitLabel: "90%",
  },
  "50k": {
    overnight: "No",
    tradingNews: "Yes",
    sizing: "4 minis / 40 micros",
    maxDrawdownUsd: 2000,
    dllUsd: 1000,
    bufferUsd: 2100,
    payoutMiniUsd: 250,
    payoutMaxUsd: 1000,
    profitSplitLabel: "90%",
  },
  "100k": {
    overnight: "No",
    tradingNews: "Yes",
    sizing: "8 minis / 80 micros",
    maxDrawdownUsd: 2500,
    dllUsd: 1250,
    bufferUsd: 2600,
    payoutMiniUsd: 250,
    payoutMaxUsd: 1500,
    profitSplitLabel: "90%",
  },
  "150k": {
    overnight: "No",
    tradingNews: "Yes",
    sizing: "12 minis / 120 micros",
    maxDrawdownUsd: 3500,
    dllUsd: 1750,
    bufferUsd: 3600,
    payoutMiniUsd: 250,
    payoutMaxUsd: 2500,
    profitSplitLabel: "90%",
  },
};
