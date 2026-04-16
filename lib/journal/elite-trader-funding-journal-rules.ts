import { findEvalCompareRow } from "@/lib/journal/compare-account-helpers";
import {
  ELITE_TRADER_FUNDING_FUNDED_FROM_CSV,
  type EliteTraderFundingFundedPayoutCsvRow,
} from "@/lib/journal/elite-trader-funding-funded-payout-csv.generated";
import type { JournalAccount } from "@/lib/journal/types";
import { formatUsdWholeGrouped } from "@/lib/prop-firms";

export function formatEliteTraderFundingPayoutMaxTiers(row: EliteTraderFundingFundedPayoutCsvRow): string {
  return [
    `1st ${formatUsdWholeGrouped(row.payoutMax1stUsd)}`,
    `2nd ${formatUsdWholeGrouped(row.payoutMax2ndUsd)}`,
    `3rd ${formatUsdWholeGrouped(row.payoutMax3rdUsd)}`,
    `4th+ ${formatUsdWholeGrouped(row.payoutMax4thPlusUsd)}`,
  ].join("\n");
}

export function lookupEliteTraderFundingFundedPayoutRow(
  program: string,
  sizeLabel: string
): EliteTraderFundingFundedPayoutCsvRow | null {
  const sz = sizeLabel.trim().toLowerCase().replace(/\s+/g, "");
  const key = `${program.trim()}|${sz}`;
  return ELITE_TRADER_FUNDING_FUNDED_FROM_CSV[key] ?? null;
}

export function getEliteTraderFundingFundedPayoutRowForAccount(
  account: JournalAccount
): EliteTraderFundingFundedPayoutCsvRow | null {
  if (account.propFirm.name.trim() !== "Elite Trader Funding") return null;
  if (account.accountType !== "funded" && account.accountType !== "live") return null;
  const program =
    account.compareProgramName?.trim() || findEvalCompareRow(account)?.accountName?.trim() || "";
  return lookupEliteTraderFundingFundedPayoutRow(program, account.sizeLabel);
}

export function isEliteTraderFundingFundedJournalAccount(account: JournalAccount): boolean {
  return getEliteTraderFundingFundedPayoutRowForAccount(account) != null;
}
