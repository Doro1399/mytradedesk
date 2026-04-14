/** Auto-generated from `CSV Propfirm Rules/TopStep Rules.csv` — run `npm run gen:topstep-funded`. */

export type TopStepFundedPayoutCsvRow = {
  payoutMiniUsd: number;
  payoutMaxStandardUsd: number;
};

export const TOPSTEP_FUNDED_PAYOUT_BY_PROGRAM_SIZE: Record<
  "TopStep Standard" | "TopStep",
  Record<"50k" | "100k" | "150k", TopStepFundedPayoutCsvRow>
> = {
  "TopStep Standard": {
    "50k": {
      payoutMiniUsd: 375,
      payoutMaxStandardUsd: 5000,
    },
    "100k": {
      payoutMiniUsd: 375,
      payoutMaxStandardUsd: 5000,
    },
    "150k": {
      payoutMiniUsd: 375,
      payoutMaxStandardUsd: 5000,
    },
  },
  "TopStep": {
    "50k": {
      payoutMiniUsd: 375,
      payoutMaxStandardUsd: 5000,
    },
    "100k": {
      payoutMiniUsd: 375,
      payoutMaxStandardUsd: 5000,
    },
    "150k": {
      payoutMiniUsd: 375,
      payoutMaxStandardUsd: 5000,
    },
  },
};
