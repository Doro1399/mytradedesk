/**
 * Elite Trader Funding — funded payout (buffer, mini, max 1st–4th+).
 * Source: `CSV Propfirm Rules/Elite Trader Funding Rules.csv` (consistency / min trading days excluded from app logic).
 */
export type EliteTraderFundingFundedPayoutCsvRow = {
  bufferUsd: number;
  payoutMiniUsd: number;
  payoutMax1stUsd: number;
  payoutMax2ndUsd: number;
  payoutMax3rdUsd: number;
  payoutMax4thPlusUsd: number;
};

export const ELITE_TRADER_FUNDING_FUNDED_FROM_CSV: Record<string, EliteTraderFundingFundedPayoutCsvRow> = {
  "Elite Trader Funding Live Trailing|50k": {
    bufferUsd: 2100,
    payoutMiniUsd: 100,
    payoutMax1stUsd: 1250,
    payoutMax2ndUsd: 1500,
    payoutMax3rdUsd: 1750,
    payoutMax4thPlusUsd: 2000,
  },
  "Elite Trader Funding Live Trailing|100k": {
    bufferUsd: 3100,
    payoutMiniUsd: 100,
    payoutMax1stUsd: 1750,
    payoutMax2ndUsd: 2000,
    payoutMax3rdUsd: 2250,
    payoutMax4thPlusUsd: 2500,
  },
  "Elite Trader Funding Live Trailing|150k": {
    bufferUsd: 5100,
    payoutMiniUsd: 100,
    payoutMax1stUsd: 2250,
    payoutMax2ndUsd: 2500,
    payoutMax3rdUsd: 2750,
    payoutMax4thPlusUsd: 3000,
  },
  "Elite Trader Funding Live Trailing|250k": {
    bufferUsd: 6600,
    payoutMiniUsd: 100,
    payoutMax1stUsd: 2750,
    payoutMax2ndUsd: 2750,
    payoutMax3rdUsd: 3000,
    payoutMax4thPlusUsd: 3000,
  },
  "Elite Trader Funding DTF|25k": {
    bufferUsd: 2600,
    payoutMiniUsd: 1000,
    payoutMax1stUsd: 1000,
    payoutMax2ndUsd: 2000,
    payoutMax3rdUsd: 3000,
    payoutMax4thPlusUsd: 4000,
  },
  "Elite Trader Funding DTF|50k": {
    bufferUsd: 5100,
    payoutMiniUsd: 500,
    payoutMax1stUsd: 2500,
    payoutMax2ndUsd: 2500,
    payoutMax3rdUsd: 5000,
    payoutMax4thPlusUsd: 5000,
  },
  "Elite Trader Funding DTF|100k": {
    bufferUsd: 5100,
    payoutMiniUsd: 500,
    payoutMax1stUsd: 1500,
    payoutMax2ndUsd: 2500,
    payoutMax3rdUsd: 3500,
    payoutMax4thPlusUsd: 5000,
  },
  "Elite Trader Funding Static|10k": {
    bufferUsd: 600,
    payoutMiniUsd: 100,
    payoutMax1stUsd: 500,
    payoutMax2ndUsd: 500,
    payoutMax3rdUsd: 500,
    payoutMax4thPlusUsd: 1000,
  },
  "Elite Trader Funding Static|25k": {
    bufferUsd: 1100,
    payoutMiniUsd: 100,
    payoutMax1stUsd: 750,
    payoutMax2ndUsd: 1000,
    payoutMax3rdUsd: 1250,
    payoutMax4thPlusUsd: 1500,
  },
  "Elite Trader Funding Static|50k": {
    bufferUsd: 2100,
    payoutMiniUsd: 100,
    payoutMax1stUsd: 1250,
    payoutMax2ndUsd: 1500,
    payoutMax3rdUsd: 1750,
    payoutMax4thPlusUsd: 2000,
  },
  "Elite Trader Funding DH|100k": {
    bufferUsd: 3600,
    payoutMiniUsd: 100,
    payoutMax1stUsd: 1750,
    payoutMax2ndUsd: 2000,
    payoutMax3rdUsd: 2250,
    payoutMax4thPlusUsd: 2500,
  },
  "Elite Trader Funding EOD|50k": {
    bufferUsd: 2100,
    payoutMiniUsd: 100,
    payoutMax1stUsd: 1250,
    payoutMax2ndUsd: 1500,
    payoutMax3rdUsd: 1750,
    payoutMax4thPlusUsd: 2000,
  },
  "Elite Trader Funding EOD|100k": {
    bufferUsd: 3600,
    payoutMiniUsd: 100,
    payoutMax1stUsd: 1750,
    payoutMax2ndUsd: 2000,
    payoutMax3rdUsd: 2250,
    payoutMax4thPlusUsd: 2500,
  },
  "Elite Trader Funding EOD|150k": {
    bufferUsd: 4600,
    payoutMiniUsd: 100,
    payoutMax1stUsd: 2250,
    payoutMax2ndUsd: 2500,
    payoutMax3rdUsd: 2750,
    payoutMax4thPlusUsd: 3000,
  },
};
