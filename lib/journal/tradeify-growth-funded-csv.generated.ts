/** Auto-generated from CSV Propfirm Rules/Tradeify Rules.csv (Tradeify Growth funded) — run: `npm run gen:tradeify-growth` */

export type TradeifyGrowthCsvSize = "25k" | "50k" | "100k" | "150k";

export type TradeifyGrowthFundedCsvRow = {
  bufferUsd: number;
  /** Ex. 0.35 pour 35 % */
  payoutConsistencyRatio: number;
  minTradingDays: number;
  minProfitPerDayUsd: number;
  payoutMiniUsd: number;
  payout1stUsd: number;
  payout2ndUsd: number;
  payout3rdUsd: number;
  payout4thPlusUsd: number;
  profitSplitLabel: string;
};

export const TRADEIFY_GROWTH_FUNDED_FROM_CSV: Record<TradeifyGrowthCsvSize, TradeifyGrowthFundedCsvRow> = {
  "25k": {
    bufferUsd: 1500,
    payoutConsistencyRatio: 0.35,
    minTradingDays: 5,
    minProfitPerDayUsd: 100,
    payoutMiniUsd: 250,
    payout1stUsd: 1000,
    payout2ndUsd: 1000,
    payout3rdUsd: 1000,
    payout4thPlusUsd: 1000,
    profitSplitLabel: "90%",
  },
  "50k": {
    bufferUsd: 3000,
    payoutConsistencyRatio: 0.35,
    minTradingDays: 5,
    minProfitPerDayUsd: 150,
    payoutMiniUsd: 500,
    payout1stUsd: 1500,
    payout2ndUsd: 2000,
    payout3rdUsd: 2500,
    payout4thPlusUsd: 3000,
    profitSplitLabel: "90%",
  },
  "100k": {
    bufferUsd: 4500,
    payoutConsistencyRatio: 0.35,
    minTradingDays: 5,
    minProfitPerDayUsd: 200,
    payoutMiniUsd: 1000,
    payout1stUsd: 2000,
    payout2ndUsd: 2500,
    payout3rdUsd: 3000,
    payout4thPlusUsd: 4000,
    profitSplitLabel: "90%",
  },
  "150k": {
    bufferUsd: 6500,
    payoutConsistencyRatio: 0.35,
    minTradingDays: 5,
    minProfitPerDayUsd: 250,
    payoutMiniUsd: 1500,
    payout1stUsd: 2500,
    payout2ndUsd: 3000,
    payout3rdUsd: 4000,
    payout4thPlusUsd: 5000,
    profitSplitLabel: "90%",
  },
};
