/** Auto-generated from CSV Propfirm Rules/My Funded Futures Rules.csv (Pro funded) — run: `npm run gen:mffu-pro` */

export type MffuProSimFundedCsvSize = "50k" | "100k" | "150k";

export type MffuProSimFundedCsvRow = {
  bufferUsd: number;
  /** Funded « Min trading days » — jours civils requis depuis le 1er trade Sim funded (CSV Pro = 14). */
  fundedCalendarDaysFromFirstTrade: number;
  payoutMiniUsd: number;
  payoutMaxUsd: number;
  profitSplitLabel: string;
  notes: string;
};

export const MFFU_PRO_SIM_FUNDED_FROM_CSV: Record<MffuProSimFundedCsvSize, MffuProSimFundedCsvRow> = {
  "50k": {
    bufferUsd: 2100,
    fundedCalendarDaysFromFirstTrade: 14,
    payoutMiniUsd: 1000,
    payoutMaxUsd: 100000,
    profitSplitLabel: "100%",
    notes: "After first payout, MLL moves to $50,100 and remains static.",
  },
  "100k": {
    bufferUsd: 3100,
    fundedCalendarDaysFromFirstTrade: 14,
    payoutMiniUsd: 1000,
    payoutMaxUsd: 100000,
    profitSplitLabel: "100%",
    notes: "After first payout, MLL moves to $100,100 and remains static.",
  },
  "150k": {
    bufferUsd: 4600,
    fundedCalendarDaysFromFirstTrade: 14,
    payoutMiniUsd: 1000,
    payoutMaxUsd: 100000,
    profitSplitLabel: "100%",
    notes: "After first payout, MLL moves to $150,100 and remains static.",
  },
};
