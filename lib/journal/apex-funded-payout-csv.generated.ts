/** Auto-generated from `CSV Propfirm Rules/Apex Trader Funding Rules.csv` — run `npm run gen:apex-funded`. */

export type ApexFundedPayoutCsvRow = {
  bufferUsd: number;
  payoutMiniUsd: number;
  payoutMaxiUsd: number;
  payouts1stTo6thUsd: readonly [number, number, number, number, number, number];
  consistency: string;
  minTradingDays: number;
  minProfitPerDayUsd: number;
};

export const APEX_FUNDED_PAYOUT_BY_PROGRAM_SIZE: Record<string, ApexFundedPayoutCsvRow> = {
  "Apex EOD|25k": {
    bufferUsd: 1100,
    payoutMiniUsd: 500,
    payoutMaxiUsd: 1000,
    payouts1stTo6thUsd: [1000, 1000, 1000, 1000, 1000, 1000] as const,
    consistency: "50%",
    minTradingDays: 5,
    minProfitPerDayUsd: 100,
  },
  "Apex Trailing|25k": {
    bufferUsd: 1100,
    payoutMiniUsd: 500,
    payoutMaxiUsd: 1000,
    payouts1stTo6thUsd: [1000, 1000, 1000, 1000, 1000, 1000] as const,
    consistency: "50%",
    minTradingDays: 5,
    minProfitPerDayUsd: 100,
  },
  "Apex EOD|50k": {
    bufferUsd: 2100,
    payoutMiniUsd: 500,
    payoutMaxiUsd: 1500,
    payouts1stTo6thUsd: [1500, 2000, 2500, 2500, 3000, 3000] as const,
    consistency: "50%",
    minTradingDays: 5,
    minProfitPerDayUsd: 200,
  },
  "Apex Trailing|50k": {
    bufferUsd: 2100,
    payoutMiniUsd: 500,
    payoutMaxiUsd: 1500,
    payouts1stTo6thUsd: [1500, 2000, 2500, 2500, 3000, 3000] as const,
    consistency: "50%",
    minTradingDays: 5,
    minProfitPerDayUsd: 200,
  },
  "Apex EOD|100k": {
    bufferUsd: 3100,
    payoutMiniUsd: 500,
    payoutMaxiUsd: 2000,
    payouts1stTo6thUsd: [2000, 2500, 3000, 3000, 4000, 4000] as const,
    consistency: "50%",
    minTradingDays: 5,
    minProfitPerDayUsd: 250,
  },
  "Apex Trailing|100k": {
    bufferUsd: 3100,
    payoutMiniUsd: 500,
    payoutMaxiUsd: 2000,
    payouts1stTo6thUsd: [2000, 2500, 3000, 3000, 4000, 4000] as const,
    consistency: "50%",
    minTradingDays: 5,
    minProfitPerDayUsd: 250,
  },
  "Apex EOD|150k": {
    bufferUsd: 4100,
    payoutMiniUsd: 500,
    payoutMaxiUsd: 2500,
    payouts1stTo6thUsd: [2500, 3000, 3000, 4000, 4000, 5000] as const,
    consistency: "50%",
    minTradingDays: 5,
    minProfitPerDayUsd: 300,
  },
  "Apex Trailing|150k": {
    bufferUsd: 4100,
    payoutMiniUsd: 500,
    payoutMaxiUsd: 2500,
    payouts1stTo6thUsd: [2500, 3000, 3000, 4000, 4000, 5000] as const,
    consistency: "50%",
    minTradingDays: 5,
    minProfitPerDayUsd: 300,
  },
};
