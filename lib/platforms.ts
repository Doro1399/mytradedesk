export const PLATFORM_IDS = [
  "tradovate",
  "rithmic",
  "projectx",
  "wealthcharts",
  "ninjatrader",
  "dxfeed",
  "quantower",
  "edgeprox",
  "onyx",
  "motivewave",
  "tradesea",
  "deepcharts",
] as const;

export type PlatformId = (typeof PLATFORM_IDS)[number];

export const platformLabels: Record<PlatformId, string> = {
  tradovate: "Tradovate",
  rithmic: "Rithmic",
  projectx: "ProjectX",
  wealthcharts: "WealthCharts",
  ninjatrader: "NinjaTrader",
  dxfeed: "Dx Feed",
  quantower: "Quantower",
  edgeprox: "EdgeProX",
  onyx: "Onyx",
  motivewave: "MotiveWave",
  tradesea: "Tradesea",
  deepcharts: "DeepCharts",
};

/** Logo files under /public/platforms. */
export const platformLogoSrc: Partial<Record<PlatformId, string>> = {
  tradovate: "/platforms/tradovate.png",
  rithmic: "/platforms/rithmic.png",
  projectx: "/platforms/projectx.png",
  wealthcharts: "/platforms/wealthcharts.png",
  ninjatrader: "/platforms/ninjatrader.png",
  dxfeed: "/platforms/dxfeed.png",
  quantower: "/platforms/quantower.png",
  edgeprox: "/platforms/edgeprox.png",
  onyx: "/platforms/onyx.png",
  motivewave: "/platforms/motivewave.png",
  tradesea: "/platforms/tradesea.png",
  deepcharts: "/platforms/deepcharts.png",
};
