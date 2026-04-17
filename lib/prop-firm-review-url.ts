/**
 * External review / reputation URLs for compare table firm name clicks (Trustpilot or firm site).
 * Keys must match `name` on each row in {@link propFirms}.
 */
const PROP_FIRM_REVIEW_URLS: Record<string, string> = {
  "Alpha Futures": "https://www.trustpilot.com/review/alpha-futures.com",
  "Apex Trader Funding": "https://www.trustpilot.com/review/apextraderfunding.com",
  AquaFutures: "https://www.trustpilot.com/review/aquafutures.io",
  Blusky: "https://www.trustpilot.com/review/blusky.pro",
  Bulenox: "https://www.trustpilot.com/review/bulenox.com",
  DayTraders: "https://www.trustpilot.com/review/daytraders.com",
  "Elite Trader Funding": "https://www.trustpilot.com/review/elitetraderfunding.com",
  "Funded Futures Network": "https://www.trustpilot.com/review/fundedfuturesnetwork.com",
  "Funded Next Futures": "https://www.trustpilot.com/review/fundednext.com",
  FuturesElite: "https://www.trustpilot.com/review/futureselite.com",
  "Legends Trading": "https://thelegendstrading.com/",
  "Lucid Trading": "https://www.trustpilot.com/review/lucidtrading.com",
  "My Funded Futures": "https://www.trustpilot.com/review/myfundedfutures.com",
  Phidias: "https://www.trustpilot.com/review/www.phidiaspropfirm.com",
  "Take Profit Trader": "https://www.trustpilot.com/review/takeprofittrader.com",
  "Taurus Arena": "https://www.trustpilot.com/review/taurusarena.com",
  TopStep: "https://www.trustpilot.com/review/topstep.com",
  TradeDay: "https://www.trustpilot.com/review/tradeday.com",
  Tradeify: "https://www.trustpilot.com/review/tradeify.co",
  "YRM Prop": "https://www.trustpilot.com/review/yrmprop.com",
};

export function propFirmReviewUrl(firmName: string): string | undefined {
  return PROP_FIRM_REVIEW_URLS[firmName.trim()];
}
