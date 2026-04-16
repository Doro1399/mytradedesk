/**
 * Taurus Arena - funded/direct payout (buffer, mini, max 1st-4th+).
 * Source: CSV Propfirm Rules/Taurus Arena Rules.csv (consistency / min trading days excluded from app logic).
 * CSV exposes one payout max per row; value is repeated for 1st-4th+ tiers.
 * Profit Split column: 85% to trader (gross withdrawal from balance is 100% of requested payout).
 */
export type TaurusArenaFundedPayoutCsvRow = {
  bufferUsd: number;
  payoutMiniUsd: number;
  payoutMax1stUsd: number;
  payoutMax2ndUsd: number;
  payoutMax3rdUsd: number;
  payoutMax4thPlusUsd: number;
  /** Trader share of gross withdrawal (CSV "Profit Split", e.g. 85%). */
  profitSplitTraderFraction: number;
};

function sameMax(bufferUsd: number, payoutMiniUsd: number, payoutMaxUsd: number): TaurusArenaFundedPayoutCsvRow {
  return {
    bufferUsd,
    payoutMiniUsd,
    payoutMax1stUsd: payoutMaxUsd,
    payoutMax2ndUsd: payoutMaxUsd,
    payoutMax3rdUsd: payoutMaxUsd,
    payoutMax4thPlusUsd: payoutMaxUsd,
    profitSplitTraderFraction: 0.85,
  };
}

export const TAURUS_ARENA_FUNDED_FROM_CSV: Record<string, TaurusArenaFundedPayoutCsvRow> = {
  "Taurus Arena Prime|25k": sameMax(1600, 500, 1000),
  "Taurus Arena Prime|50k": sameMax(2600, 500, 1500),
  "Taurus Arena Prime|100k": sameMax(3100, 500, 2000),

  "Taurus Arena Frees|25k": sameMax(2500, 500, 1000),
  "Taurus Arena Frees|50k": sameMax(3000, 500, 1500),
  "Taurus Arena Frees|100k": sameMax(4000, 500, 2000),

  "Taurus Arena Direct Prime|25k": sameMax(1600, 500, 1000),
  "Taurus Arena Direct Prime|50k": sameMax(2600, 500, 1500),
  "Taurus Arena Direct Prime|100k": sameMax(3100, 500, 2000),
};
