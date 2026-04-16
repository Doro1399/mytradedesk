/**
 * TradeDay funded (CSV Propfirm Rules/TradeDay Rules.csv).
 * Buffer, payout mini; payout max = no cap in CSV.
 * Profit split (marginal on cumulative gross withdrawal): 80% / 90% / 95% by $50k / $100k bands (see tradeday-journal-rules).
 * Consistency / min trading days excluded from app payout runway (payoutRules card uses "—" like other CSV firms).
 */
export type TradeDayFundedPayoutCsvRow = {
  bufferUsd: number;
  payoutMiniUsd: number;
};

export const TRADEDAY_FUNDED_FROM_CSV: Record<string, TradeDayFundedPayoutCsvRow> = {
  "TradeDay Intraday|50k": { bufferUsd: 2000, payoutMiniUsd: 250 },
  "TradeDay Intraday|100k": { bufferUsd: 3000, payoutMiniUsd: 250 },
  "TradeDay Intraday|150k": { bufferUsd: 4000, payoutMiniUsd: 250 },

  "TradeDay End of Day|50k": { bufferUsd: 2000, payoutMiniUsd: 250 },
  "TradeDay End of Day|100k": { bufferUsd: 3000, payoutMiniUsd: 250 },
  "TradeDay End of Day|150k": { bufferUsd: 4000, payoutMiniUsd: 250 },

  "TradeDay Static|50k": { bufferUsd: 500, payoutMiniUsd: 250 },
  "TradeDay Static|100k": { bufferUsd: 750, payoutMiniUsd: 250 },
  "TradeDay Static|150k": { bufferUsd: 2000, payoutMiniUsd: 250 },
};
