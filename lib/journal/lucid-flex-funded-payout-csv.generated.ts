/** Auto-generated from `CSV Propfirm Rules/Lucid Trading Rules.csv` (LucidFlex) — run `npm run gen:lucid-flex-funded`. */

export type LucidFlexFundedPayoutCsvRow = {
  minTradingDays: number;
  minProfitPerDayUsd: number;
  payoutMiniUsd: number;
  payoutMaxUsd: number;
};

export const LUCID_FLEX_FUNDED_PAYOUT_BY_SIZE: Record<
  "25k" | "50k" | "100k" | "150k",
  LucidFlexFundedPayoutCsvRow
> = {
  "25k": {
    minTradingDays: 5,
    minProfitPerDayUsd: 100,
    payoutMiniUsd: 500,
    payoutMaxUsd: 1000,
  },
  "50k": {
    minTradingDays: 5,
    minProfitPerDayUsd: 150,
    payoutMiniUsd: 500,
    payoutMaxUsd: 2000,
  },
  "100k": {
    minTradingDays: 5,
    minProfitPerDayUsd: 200,
    payoutMiniUsd: 500,
    payoutMaxUsd: 2500,
  },
  "150k": {
    minTradingDays: 5,
    minProfitPerDayUsd: 250,
    payoutMiniUsd: 500,
    payoutMaxUsd: 3000,
  },
};
