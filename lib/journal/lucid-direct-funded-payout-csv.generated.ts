/** Auto-generated from `CSV Propfirm Rules/Lucid Trading Rules.csv` (LucidDirect) — run `npm run gen:lucid-direct-funded`. */

export type LucidDirectFundedPayoutCsvRow = {
  profitGoal1stUsd: number;
  profitGoalAfter1stUsd: number;
  payoutMiniUsd: number;
  payouts1stTo6thUsd: readonly [number, number, number, number, number, number];
};

export const LUCID_DIRECT_FUNDED_PAYOUT_BY_SIZE: Record<
  "25k" | "50k" | "100k" | "150k",
  LucidDirectFundedPayoutCsvRow
> = {
  "25k": {
    profitGoal1stUsd: 1500,
    profitGoalAfter1stUsd: 1250,
    payoutMiniUsd: 500,
    payouts1stTo6thUsd: [1000, 1000, 1000, 1000, 1000, 1000],
  },
  "50k": {
    profitGoal1stUsd: 3000,
    profitGoalAfter1stUsd: 2500,
    payoutMiniUsd: 500,
    payouts1stTo6thUsd: [2000, 2000, 2000, 2500, 2500, 2500],
  },
  "100k": {
    profitGoal1stUsd: 6000,
    profitGoalAfter1stUsd: 3500,
    payoutMiniUsd: 500,
    payouts1stTo6thUsd: [2500, 2500, 2500, 3000, 3000, 3000],
  },
  "150k": {
    profitGoal1stUsd: 9000,
    profitGoalAfter1stUsd: 4500,
    payoutMiniUsd: 500,
    payouts1stTo6thUsd: [3000, 3000, 3000, 3500, 3500, 3500],
  },
};
