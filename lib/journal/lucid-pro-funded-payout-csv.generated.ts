/** Auto-generated from `CSV Propfirm Rules/Lucid Trading Rules.csv` (rows LucidPro) — run `npm run gen:lucid-pro-funded`. */

export type LucidProFundedPayoutCsvRow = {
  bufferUsd: number;
  payoutMiniUsd: number;
  payoutMax1stUsd: number;
  payoutMaxSubsequentUsd: number;
};

export const LUCID_PRO_FUNDED_PAYOUT_BY_SIZE: Record<
  "25k" | "50k" | "100k" | "150k",
  LucidProFundedPayoutCsvRow
> = {
  "25k": {
    bufferUsd: 1100,
    payoutMiniUsd: 250,
    payoutMax1stUsd: 1000,
    payoutMaxSubsequentUsd: 1500,
  },
  "50k": {
    bufferUsd: 2100,
    payoutMiniUsd: 500,
    payoutMax1stUsd: 2000,
    payoutMaxSubsequentUsd: 2500,
  },
  "100k": {
    bufferUsd: 3100,
    payoutMiniUsd: 750,
    payoutMax1stUsd: 2500,
    payoutMaxSubsequentUsd: 3000,
  },
  "150k": {
    bufferUsd: 4600,
    payoutMiniUsd: 1000,
    payoutMax1stUsd: 3000,
    payoutMaxSubsequentUsd: 3500,
  },
};
