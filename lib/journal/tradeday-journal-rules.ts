import { findEvalCompareRow } from "@/lib/journal/compare-account-helpers";
import {
  TRADEDAY_FUNDED_FROM_CSV,
  type TradeDayFundedPayoutCsvRow,
} from "@/lib/journal/tradeday-funded-payout-csv.generated";
import type { JournalAccount, JournalDataV1, JournalId } from "@/lib/journal/types";

/** Cumulative gross withdrawal thresholds (USD) for marginal trader split tiers. */
const TRADEDAY_SPLIT_BAND1_USD = 50_000;
const TRADEDAY_SPLIT_BAND2_USD = 100_000;

const B1_CENTS = TRADEDAY_SPLIT_BAND1_USD * 100;
const B2_CENTS = TRADEDAY_SPLIT_BAND2_USD * 100;
const R1 = 0.8;
const R2 = 0.9;
const R3 = 0.95;

export function sumNonRejectedJournalPayoutGrossCents(
  state: JournalDataV1,
  accountId: JournalId
): number {
  let s = 0;
  for (const p of Object.values(state.payoutEntries)) {
    if (p.accountId !== accountId) continue;
    if (p.status === "rejected") continue;
    s += p.grossAmountCents;
  }
  return s;
}

/**
 * Trader wallet share (cents) for a gross withdrawal, given prior cumulative gross withdrawals
 * on the same funded account (marginal 80% / 90% / 95% per CSV bands).
 */
export function tradedayTraderNetFromGrossMarginal(
  priorCumulativeGrossCents: number,
  grossCents: number
): number {
  const gross = Math.max(0, Math.round(grossCents));
  if (gross <= 0) return 0;
  let prior = Math.max(0, Math.round(priorCumulativeGrossCents));
  let left = gross;
  let trader = 0;
  while (left > 0) {
    if (prior < B1_CENTS) {
      const space = B1_CENTS - prior;
      const take = Math.min(left, space);
      trader += Math.round(take * R1);
      prior += take;
      left -= take;
    } else if (prior < B2_CENTS) {
      const space = B2_CENTS - prior;
      const take = Math.min(left, space);
      trader += Math.round(take * R2);
      prior += take;
      left -= take;
    } else {
      trader += Math.round(left * R3);
      left = 0;
    }
  }
  return trader;
}

/** Smallest gross (cents) such that trader net from marginal split is >= netTargetCents. */
export function tradedayGrossCentsFromTraderNetMarginal(
  priorCumulativeGrossCents: number,
  netTargetCents: number
): number {
  const target = Math.max(0, Math.round(netTargetCents));
  if (target <= 0) return 0;
  const prior = Math.max(0, Math.round(priorCumulativeGrossCents));
  let hi = Math.max(1, Math.ceil(target / R1));
  while (tradedayTraderNetFromGrossMarginal(prior, hi) < target) {
    hi = hi * 2 + 1;
    if (hi > 1e12) return hi;
  }
  let lo = 1;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    const n = tradedayTraderNetFromGrossMarginal(prior, mid);
    if (n >= target) hi = mid;
    else lo = mid + 1;
  }
  return lo;
}

export function lookupTradeDayFundedPayoutRow(
  program: string,
  sizeLabel: string
): TradeDayFundedPayoutCsvRow | null {
  const sz = sizeLabel.trim().toLowerCase().replace(/\s+/g, "");
  const prog = program.trim();
  const key = `${prog}|${sz}`;
  return TRADEDAY_FUNDED_FROM_CSV[key] ?? null;
}

export function getTradeDayFundedPayoutRowForAccount(
  account: JournalAccount
): TradeDayFundedPayoutCsvRow | null {
  if (account.propFirm.name.trim() !== "TradeDay") return null;
  if (account.accountType !== "funded" && account.accountType !== "live") return null;
  const program =
    account.compareProgramName?.trim() || findEvalCompareRow(account)?.accountName?.trim() || "";
  return lookupTradeDayFundedPayoutRow(program, account.sizeLabel);
}

export function isTradeDayFundedJournalAccount(account: JournalAccount): boolean {
  return getTradeDayFundedPayoutRowForAccount(account) != null;
}
