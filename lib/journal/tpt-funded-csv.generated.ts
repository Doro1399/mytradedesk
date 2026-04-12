/** Auto-generated from CSV Propfirm Rules/Take Profit Trader Rules.csv — run: `npm run gen:tpt` */

export type TptCsvFundedSize = "25k" | "50k" | "75k" | "100k" | "150k";

export type TptFundedCsvRow = {
  fundedBufferUsd: number;
  payoutMiniWithoutFeesUsd: number;
  /** Dernière colonne « Notes » du CSV (ligne data). */
  notesRow: string;
};

export const TPT_FUNDED_FROM_CSV: Record<TptCsvFundedSize, TptFundedCsvRow> = {
  "25k": {
    fundedBufferUsd: 1500,
    payoutMiniWithoutFeesUsd: 250,
    notesRow: "Payouts <$250 = $50 de frais",
  },
  "50k": {
    fundedBufferUsd: 2000,
    payoutMiniWithoutFeesUsd: 250,
    notesRow: "Payouts <$250 = $50 de frais",
  },
  "75k": {
    fundedBufferUsd: 2500,
    payoutMiniWithoutFeesUsd: 250,
    notesRow: "Payouts <$250 = $50 de frais",
  },
  "100k": {
    fundedBufferUsd: 3000,
    payoutMiniWithoutFeesUsd: 250,
    notesRow: "Payouts <$250 = $50 de frais",
  },
  "150k": {
    fundedBufferUsd: 4500,
    payoutMiniWithoutFeesUsd: 250,
    notesRow: "Payouts <$250 = $50 de frais",
  },
};
