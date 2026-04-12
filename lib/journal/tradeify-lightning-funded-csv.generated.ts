/** Auto-generated from CSV Propfirm Rules/Tradeify Rules.csv (Tradeify Ligthning Direct funded) — run: `npm run gen:tradeify-lightning` */

export type TradeifyLightningSize = "25k" | "50k" | "100k" | "150k";

export type TradeifyLightningFundedCsvRow = {
  csvRowNumber: number;
  propFirm: string;
  headquarters: string;
  since: string;
  accountName: string;
  size: TradeifyLightningSize;
  billing: string;
  regularPriceUsd: number;
  discountPriceUsd: number;
  promoCode: string;
  overnight: string;
  tradingNews: string;
  sizing: string;
  drawdownType: string;
  drawdownUsd: number;
  dllRaw: string;
  dllUsd: number | null;
  profitGoal1stCycleUsd: number;
  profitGoal2PlusCycleUsd: number;
  payoutConsistencyDisplay: string;
  /** Ex. 0.2 pour 20 % */
  payoutConsistencyRatio: number;
  minTradingDaysFromCsv: number;
  payoutMiniUsd: number;
  payoutMax1stUsd: number;
  payoutMax2ndUsd: number;
  payoutMax3rdUsd: number;
  payoutMax4thPlusUsd: number;
  profitSplitLabel: string;
};

export const TRADEIFY_LIGHTNING_FUNDED_FROM_CSV: Record<TradeifyLightningSize, TradeifyLightningFundedCsvRow> = {
  "25k": {
    csvRowNumber: 13,
    propFirm: "Tradeify",
    headquarters: "US",
    since: "2024",
    accountName: "Tradeify Ligthning",
    size: "25k",
    billing: "OTP",
    regularPriceUsd: 345,
    discountPriceUsd: 207,
    promoCode: "MTD",
    overnight: "No",
    tradingNews: "Yes",
    sizing: "1 mini / 10 micros",
    drawdownType: "EOD",
    drawdownUsd: 1000,
    dllRaw: "-",
    dllUsd: null,
    profitGoal1stCycleUsd: 1500,
    profitGoal2PlusCycleUsd: 1000,
    payoutConsistencyDisplay: "20%",
    payoutConsistencyRatio: 0.2,
    minTradingDaysFromCsv: 1,
    payoutMiniUsd: 1000,
    payoutMax1stUsd: 1000,
    payoutMax2ndUsd: 1000,
    payoutMax3rdUsd: 1000,
    payoutMax4thPlusUsd: 1000,
    profitSplitLabel: "90%",
  },
  "50k": {
    csvRowNumber: 14,
    propFirm: "Tradeify",
    headquarters: "US",
    since: "2024",
    accountName: "Tradeify Ligthning",
    size: "50k",
    billing: "OTP",
    regularPriceUsd: 492,
    discountPriceUsd: 295.2,
    promoCode: "MTD",
    overnight: "No",
    tradingNews: "Yes",
    sizing: "4 minis / 40 micros",
    drawdownType: "EOD",
    drawdownUsd: 2000,
    dllRaw: "$1 250",
    dllUsd: 1250,
    profitGoal1stCycleUsd: 3000,
    profitGoal2PlusCycleUsd: 2000,
    payoutConsistencyDisplay: "20%",
    payoutConsistencyRatio: 0.2,
    minTradingDaysFromCsv: 1,
    payoutMiniUsd: 1000,
    payoutMax1stUsd: 2000,
    payoutMax2ndUsd: 2000,
    payoutMax3rdUsd: 2000,
    payoutMax4thPlusUsd: 2500,
    profitSplitLabel: "90%",
  },
  "100k": {
    csvRowNumber: 15,
    propFirm: "Tradeify",
    headquarters: "US",
    since: "2024",
    accountName: "Tradeify Ligthning",
    size: "100k",
    billing: "OTP",
    regularPriceUsd: 660,
    discountPriceUsd: 396,
    promoCode: "MTD",
    overnight: "No",
    tradingNews: "Yes",
    sizing: "8 minis / 80 micros",
    drawdownType: "EOD",
    drawdownUsd: 4000,
    dllRaw: "$2 500",
    dllUsd: 2500,
    profitGoal1stCycleUsd: 6000,
    profitGoal2PlusCycleUsd: 3500,
    payoutConsistencyDisplay: "20%",
    payoutConsistencyRatio: 0.2,
    minTradingDaysFromCsv: 1,
    payoutMiniUsd: 1000,
    payoutMax1stUsd: 2500,
    payoutMax2ndUsd: 2500,
    payoutMax3rdUsd: 2500,
    payoutMax4thPlusUsd: 3000,
    profitSplitLabel: "90%",
  },
  "150k": {
    csvRowNumber: 16,
    propFirm: "Tradeify",
    headquarters: "US",
    since: "2024",
    accountName: "Tradeify Ligthning",
    size: "150k",
    billing: "OTP",
    regularPriceUsd: 796,
    discountPriceUsd: 477.6,
    promoCode: "MTD",
    overnight: "No",
    tradingNews: "Yes",
    sizing: "12 minis / 120 micros",
    drawdownType: "EOD",
    drawdownUsd: 5250,
    dllRaw: "$3 000",
    dllUsd: 3000,
    profitGoal1stCycleUsd: 9000,
    profitGoal2PlusCycleUsd: 4500,
    payoutConsistencyDisplay: "20%",
    payoutConsistencyRatio: 0.2,
    minTradingDaysFromCsv: 1,
    payoutMiniUsd: 1000,
    payoutMax1stUsd: 3000,
    payoutMax2ndUsd: 3000,
    payoutMax3rdUsd: 3000,
    payoutMax4thPlusUsd: 5000,
    profitSplitLabel: "90%",
  },
};
