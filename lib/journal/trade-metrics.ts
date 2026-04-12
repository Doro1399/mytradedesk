import type { StoredTrade } from "@/lib/journal/trades-storage";

/** Trades with |P&L| below this are excluded from win rate and profit factor (commission noise). */
export const TRADE_PNL_SIGNIFICANT_ABS_CENTS = 100; // $1

export function isPnlSignificantForWinRate(pnlCents: number): boolean {
  return Math.abs(pnlCents) >= TRADE_PNL_SIGNIFICANT_ABS_CENTS;
}

/**
 * Fee-only / commission rows (not real positions). Excluded from trade counts and the Trades table.
 * - Set explicitly on CSV import when Gross P/L is 0 and Net matches fees.
 * - Legacy rows: small negative P&L, no qty, placeholder symbol (imports before that metadata existed).
 */
export function isCommissionNoiseTrade(t: StoredTrade): boolean {
  if (t.commissionOnly === true) return true;
  if (t.commissionOnly === false) return false;
  if (t.pnlCents >= 0) return false;
  if (Math.abs(t.pnlCents) >= TRADE_PNL_SIGNIFICANT_ABS_CENTS) return false;
  const sym = (t.symbol ?? "").trim();
  const noSymbol = sym === "" || sym === "—";
  const noQty = t.qty == null || t.qty === 0;
  return noSymbol && noQty;
}

