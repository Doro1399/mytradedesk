import { findEvalCompareRow } from "@/lib/journal/compare-account-helpers";
import {
  TAURUS_ARENA_FUNDED_FROM_CSV,
  type TaurusArenaFundedPayoutCsvRow,
} from "@/lib/journal/taurus-arena-funded-payout-csv.generated";
import type { JournalAccount } from "@/lib/journal/types";
import { formatUsdWholeGrouped } from "@/lib/prop-firms";

export function formatTaurusArenaPayoutMaxTiers(row: TaurusArenaFundedPayoutCsvRow): string {
  return [
    `1st ${formatUsdWholeGrouped(row.payoutMax1stUsd)}`,
    `2nd ${formatUsdWholeGrouped(row.payoutMax2ndUsd)}`,
    `3rd ${formatUsdWholeGrouped(row.payoutMax3rdUsd)}`,
    `4th+ ${formatUsdWholeGrouped(row.payoutMax4thPlusUsd)}`,
  ].join("\n");
}

export function lookupTaurusArenaFundedPayoutRow(
  program: string,
  sizeLabel: string
): TaurusArenaFundedPayoutCsvRow | null {
  const sz = sizeLabel.trim().toLowerCase().replace(/\s+/g, "");
  const key = `${program.trim()}|${sz}`;
  return TAURUS_ARENA_FUNDED_FROM_CSV[key] ?? null;
}

export function getTaurusArenaFundedPayoutRowForAccount(
  account: JournalAccount
): TaurusArenaFundedPayoutCsvRow | null {
  if (account.propFirm.name.trim() !== "Taurus Arena") return null;
  if (account.accountType !== "funded" && account.accountType !== "live") return null;
  const program =
    account.compareProgramName?.trim() || findEvalCompareRow(account)?.accountName?.trim() || "";
  return lookupTaurusArenaFundedPayoutRow(program, account.sizeLabel);
}

export function isTaurusArenaFundedJournalAccount(account: JournalAccount): boolean {
  return getTaurusArenaFundedPayoutRowForAccount(account) != null;
}
