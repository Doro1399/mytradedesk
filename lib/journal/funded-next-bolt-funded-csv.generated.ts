/** Auto-generated from CSV Propfirm Rules/Funded Next Futures Rules.csv (Bolt funded) — run: `npm run gen:funded-next-bolt` */

export type FundedNextBoltCsvSize = "50k";

export type FundedNextBoltFundedCsvRow = {
  overnight: string;
  tradingNews: string;
  sizing: string;
  maxDrawdownUsd: number;
  dllUsd: number | null;
  bufferUsd: number;
  /** Min profit per day column when numeric; else null (Bolt CSV uses « - »). */
  cycleProfitMinUsd: number | null;
  /** Reserved when CSV adds explicit EOD floor; null = derive nominal + buffer in app. */
  requiredEodBalanceUsd: number | null;
  payoutMiniUsd: number;
  /** Withdrawals 1–4 cap (CSV continuation « 4st » column). */
  payoutMaxStandardUsd: number;
  /** 5th final withdrawal cap (CSV continuation « 5th » column). */
  payoutMaxFinalUsd: number;
  profitSplitLabel: string;
  /** Max withdrawals (Bolt: 5th is final; inferred from CSV « 5st » row). */
  maxWithdrawals: number;
};

export const FUNDED_NEXT_BOLT_FUNDED_FROM_CSV: Record<FundedNextBoltCsvSize, FundedNextBoltFundedCsvRow> = {
  "50k": {
    overnight: "No",
    tradingNews: "Yes",
    sizing: "3 minis / 9 micros",
    maxDrawdownUsd: 2000,
    dllUsd: null,
    bufferUsd: 2100,
    cycleProfitMinUsd: null,
    requiredEodBalanceUsd: null,
    payoutMiniUsd: 250,
    payoutMaxStandardUsd: 1200,
    payoutMaxFinalUsd: 7700,
    profitSplitLabel: "80%",
    maxWithdrawals: 5,
  },
};
