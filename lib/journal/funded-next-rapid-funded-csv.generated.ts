/** Auto-generated from CSV Propfirm Rules/Funded Next Futures Rules.csv (Rapid funded) — run: `npm run gen:funded-next-rapid` */

export type FundedNextRapidCsvSize = "25k" | "50k" | "100k";

export type FundedNextRapidFundedCsvRow = {
  overnight: string;
  tradingNews: string;
  sizing: string;
  maxDrawdownUsd: number;
  dllUsd: number | null;
  bufferUsd: number | null;
  /** Funded consistency ratio (ex. 40 % → 0.4). */
  consistencyRatio: number;
  /** CSV min trading days — rules display only; not used for payout eligibility. */
  minTradingDays: number | null;
  /** Min profit per day column when numeric; else null (Rapid CSV « - »). */
  cycleProfitMinUsd: number | null;
  payoutMiniUsd: number;
  payoutMaxStandardUsd: number;
  payoutMaxTierLabel: string;
  capUnlimited: boolean;
  /** Withdrawals completed before cap tier « No limit » applies (inferred from 4st / 5th columns). */
  capRemovalWithdrawalCount: number;
  profitSplitLabel: string;
  notes: string;
};

export const FUNDED_NEXT_RAPID_FUNDED_FROM_CSV: Record<FundedNextRapidCsvSize, FundedNextRapidFundedCsvRow> = {
  "25k": {
    overnight: "No",
    tradingNews: "Yes",
    sizing: "3 minis / 15 micros",
    maxDrawdownUsd: 1000,
    dllUsd: null,
    bufferUsd: null,
    consistencyRatio: 0.4,
    minTradingDays: 3,
    cycleProfitMinUsd: null,
    payoutMiniUsd: 250,
    payoutMaxStandardUsd: 800,
    payoutMaxTierLabel: "No limit",
    capUnlimited: true,
    capRemovalWithdrawalCount: 4,
    profitSplitLabel: "80%",
    notes: "The first withdrawal resets the maximum loss limit (MLL) back to the initial balance.",
  },
  "50k": {
    overnight: "No",
    tradingNews: "Yes",
    sizing: "5 minis / 25 micros",
    maxDrawdownUsd: 2000,
    dllUsd: null,
    bufferUsd: null,
    consistencyRatio: 0.4,
    minTradingDays: 3,
    cycleProfitMinUsd: null,
    payoutMiniUsd: 250,
    payoutMaxStandardUsd: 1500,
    payoutMaxTierLabel: "No limit",
    capUnlimited: true,
    capRemovalWithdrawalCount: 4,
    profitSplitLabel: "80%",
    notes: "The first withdrawal resets the maximum loss limit (MLL) back to the initial balance.",
  },
  "100k": {
    overnight: "No",
    tradingNews: "Yes",
    sizing: "7 minis / 35 micros",
    maxDrawdownUsd: 2500,
    dllUsd: null,
    bufferUsd: null,
    consistencyRatio: 0.4,
    minTradingDays: 3,
    cycleProfitMinUsd: null,
    payoutMiniUsd: 500,
    payoutMaxStandardUsd: 2500,
    payoutMaxTierLabel: "No limit",
    capUnlimited: true,
    capRemovalWithdrawalCount: 4,
    profitSplitLabel: "80%",
    notes: "The first withdrawal resets the maximum loss limit (MLL) back to the initial balance.",
  },
};
