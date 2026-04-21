/**
 * Static lists for sandbox connection UI (Quantower-style).
 * Rithmic: mirrors common Rithmic server / area labels; final Protocol URIs come from Rithmic post-attribution.
 * Tradovate (stored broker id `ninjatrader` for compatibility): placeholders until integration is wired.
 */

/** PJ3 — Server dropdown (Rithmic). */
export const RITHMIC_SERVER_OPTIONS = [
  "Apex",
  "10XFutures",
  "LegendsTrading",
  "LucidTrading",
  "Rithmic 01",
  "TopstepTrader",
  "Bulenox",
  "MES Capital",
  "PropShopTrader",
  "DayTraders.com",
  "Rithmic Paper Trading",
  "4PropTrader",
  "Rithmic 04 Colo",
  "FundedFuturesNetwork",
  "UProfitTrader",
  "Rithmic Test",
  "TradeFundrr",
  "TheTradingPit",
  "SpeedUp",
  "ThriveTrading",
  "Earn2Trade",
  "P.T-t",
  "YPF-t",
] as const;

/** PJ4 — Area dropdown (Rithmic gateway / region summary). */
export const RITHMIC_AREA_OPTIONS = [
  "Chicago Area Summary",
  "Colo 75 Summary",
  "Europe",
  "Hong Kong",
  "Mumbai",
  "Frankfurt",
  "Cape Town",
  "Chicago Area",
  "Colo 75",
  "Seoul",
  "Sao Paolo",
  "Satellite Link",
  "Singapore",
  "Sydney",
  "Tokyo",
] as const;

/** New Rithmic rows: matches R | Protocol dev default (`rituz00100` + RequestLogin system name). */
export const RITHMIC_DEFAULT_SERVER = "Rithmic Test";
/** Sensible default area for dropdown (user can change). */
export const RITHMIC_DEFAULT_AREA = "Chicago Area Summary";

/** Placeholder — replace when Tradovate integration is defined. */
export const NINJATRADER_SERVER_OPTIONS = [
  "Tradovate Demo",
  "Tradovate Live",
  "Playback / Replay",
  "Custom (TBD)",
] as const;

export const NINJATRADER_AREA_OPTIONS = [
  "Default",
  "US East",
  "US West",
  "Europe",
  "Asia",
] as const;

export const NINJATRADER_DEFAULT_SERVER = NINJATRADER_SERVER_OPTIONS[0];
export const NINJATRADER_DEFAULT_AREA = NINJATRADER_AREA_OPTIONS[0];

export type SandboxBrokerId = "rithmic" | "ninjatrader";

export type SandboxConnectionStatus = "disconnected" | "connected" | "error";

export type SandboxConnectionRow = {
  id: string;
  broker: SandboxBrokerId;
  /** User-defined label (e.g. PJ1 "APEX_R"). */
  name: string;
  username: string;
  /** Not persisted to localStorage (dev UI only). */
  password?: string;
  server: string;
  area: string;
  status: SandboxConnectionStatus;
  autoConnectOnStartup: boolean;
};

export const SANDBOX_CONNECTIONS_STORAGE_KEY = "mtd-desk-sandbox-connections-v1";
