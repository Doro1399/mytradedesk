/** Auto-generated from CSV Propfirm Rules/Funded Next Futures Rules.csv (Legacy funded) — run: `npm run gen:funded-next-legacy` */

export type FundedNextLegacyCsvSize = "25k" | "50k" | "100k";

export type FundedNextLegacyFundedCsvRow = {
  overnight: string;
  tradingNews: string;
  sizing: string;
  maxDrawdownUsd: number;
  dllUsd: number | null;
  /** Funded « Consistency » cell (often « - » for Legacy). */
  fundedConsistencyCell: string;
  /** Min profit required on the payout cycle (CSV Buffer column on Legacy funded rows). */
  cycleProfitMinUsd: number;
  /** Min benchmark days in cycle before payout request (CSV Min trading days, funded payout block). */
  requiredBenchmarkDays: number;
  /** Benchmark days after which withdrawable gross = full balance gain (help centre: 30; not in CSV). */
  uncapBenchmarkDays: number;
  /** Min net P/L per calendar day to count one benchmark day (CSV Min Profit per day). */
  benchmarkMinProfitPerDayUsd: number;
  payoutMiniUsd: number;
  /** Max gross per cycle while in 50% + cap phase (CSV 4st column). */
  payoutCapStandardUsd: number;
  payoutMaxTierLabel: string;
  profitSplitLabel: string;
  notes: string;
  /** Share of cycle profit used as withdrawable base before uncapBenchmarkDays (not in CSV numerically). */
  earlyPhaseWithdrawalFractionOfCycle: number;
};

export const FUNDED_NEXT_LEGACY_FUNDED_FROM_CSV: Record<FundedNextLegacyCsvSize, FundedNextLegacyFundedCsvRow> = {
  "25k": {
    overnight: "No",
    tradingNews: "Yes",
    sizing: "3 minis / 30 micros",
    maxDrawdownUsd: 1000,
    dllUsd: null,
    fundedConsistencyCell: "-",
    cycleProfitMinUsd: 500,
    requiredBenchmarkDays: 5,
    uncapBenchmarkDays: 30,
    benchmarkMinProfitPerDayUsd: 100,
    payoutMiniUsd: 250,
    payoutCapStandardUsd: 3000,
    payoutMaxTierLabel: "100% of balance",
    profitSplitLabel: "80%",
    notes: "The first withdrawal resets the maximum loss limit (MLL) back to the initial balance.",
    earlyPhaseWithdrawalFractionOfCycle: 0.5,
  },
  "50k": {
    overnight: "No",
    tradingNews: "Yes",
    sizing: "5 minis / 50 micros",
    maxDrawdownUsd: 2000,
    dllUsd: null,
    fundedConsistencyCell: "-",
    cycleProfitMinUsd: 500,
    requiredBenchmarkDays: 5,
    uncapBenchmarkDays: 30,
    benchmarkMinProfitPerDayUsd: 200,
    payoutMiniUsd: 250,
    payoutCapStandardUsd: 6000,
    payoutMaxTierLabel: "100% of balance",
    profitSplitLabel: "80%",
    notes: "The first withdrawal resets the maximum loss limit (MLL) back to the initial balance.",
    earlyPhaseWithdrawalFractionOfCycle: 0.5,
  },
  "100k": {
    overnight: "No",
    tradingNews: "Yes",
    sizing: "7 minis / 70 micros",
    maxDrawdownUsd: 3000,
    dllUsd: null,
    fundedConsistencyCell: "-",
    cycleProfitMinUsd: 500,
    requiredBenchmarkDays: 5,
    uncapBenchmarkDays: 30,
    benchmarkMinProfitPerDayUsd: 200,
    payoutMiniUsd: 250,
    payoutCapStandardUsd: 6000,
    payoutMaxTierLabel: "100% of balance",
    profitSplitLabel: "80%",
    notes: "The first withdrawal resets the maximum loss limit (MLL) back to the initial balance.",
    earlyPhaseWithdrawalFractionOfCycle: 0.5,
  },
};
