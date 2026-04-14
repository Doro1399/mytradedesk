/** Auto-generated from CSV Propfirm Rules/Tradeify Rules.csv (Tradeify Select Flex funded) — run: `npm run gen:tradeify-select-flex` */

export type TradeifySelectFlexCsvSize = "25k" | "50k" | "100k" | "150k";

export type TradeifySelectFlexFundedCsvRow = {
  overnight: string;
  tradingNews: string;
  sizing: string;
  maxDrawdownUsd: number;
  minTradingDays: number;
  minProfitPerDayUsd: number;
  payoutMiniUsd: number;
  payoutMaxUsd: number;
  profitSplitLabel: string;
  notes: string;
};

export const TRADEIFY_SELECT_FLEX_FUNDED_FROM_CSV: Record<TradeifySelectFlexCsvSize, TradeifySelectFlexFundedCsvRow> = {
  "25k": {
    overnight: "No",
    tradingNews: "Yes",
    sizing: "1 mini / 10 micros",
    maxDrawdownUsd: 1000,
    minTradingDays: 5,
    minProfitPerDayUsd: 100,
    payoutMiniUsd: 0,
    payoutMaxUsd: 1250,
    profitSplitLabel: "90%",
    notes: "Request 50% of account balance\nOther 50% stays as buffer",
  },
  "50k": {
    overnight: "No",
    tradingNews: "Yes",
    sizing: "4 minis / 40 micros",
    maxDrawdownUsd: 2000,
    minTradingDays: 5,
    minProfitPerDayUsd: 150,
    payoutMiniUsd: 0,
    payoutMaxUsd: 3000,
    profitSplitLabel: "90%",
    notes: "Request 50% of account balance\nOther 50% stays as buffer",
  },
  "100k": {
    overnight: "No",
    tradingNews: "Yes",
    sizing: "8 minis / 80 micros",
    maxDrawdownUsd: 3000,
    minTradingDays: 5,
    minProfitPerDayUsd: 200,
    payoutMiniUsd: 0,
    payoutMaxUsd: 4000,
    profitSplitLabel: "90%",
    notes: "Request 50% of account balance\nOther 50% stays as buffer",
  },
  "150k": {
    overnight: "No",
    tradingNews: "Yes",
    sizing: "12 minis / 120 micros",
    maxDrawdownUsd: 4500,
    minTradingDays: 5,
    minProfitPerDayUsd: 250,
    payoutMiniUsd: 0,
    payoutMaxUsd: 5000,
    profitSplitLabel: "90%",
    notes: "Request 50% of account balance\nOther 50% stays as buffer",
  },
};
