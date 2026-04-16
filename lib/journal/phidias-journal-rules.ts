import { findEvalCompareRow } from "@/lib/journal/compare-account-helpers";
import { PHIDIAS_FUNDED_FROM_CSV, type PhidiasFundedPayoutCsvRow } from "@/lib/journal/phidias-funded-payout-csv.generated";
import type { JournalAccount } from "@/lib/journal/types";
import { formatUsdWholeGrouped } from "@/lib/prop-firms";

export function formatPhidiasPayoutMaxTiers(row: PhidiasFundedPayoutCsvRow): string {
  return [
    `1st ${formatUsdWholeGrouped(row.payoutMax1stUsd)}`,
    `2nd ${formatUsdWholeGrouped(row.payoutMax2ndUsd)}`,
    `3rd ${formatUsdWholeGrouped(row.payoutMax3rdUsd)}`,
    `4th+ ${formatUsdWholeGrouped(row.payoutMax4thPlusUsd)}`,
  ].join("\n");
}

export function lookupPhidiasFundedPayoutRow(
  program: string,
  sizeLabel: string
): PhidiasFundedPayoutCsvRow | null {
  const sz = sizeLabel.trim().toLowerCase().replace(/\s+/g, "");
  const key = `${program.trim()}|${sz}`;
  return PHIDIAS_FUNDED_FROM_CSV[key] ?? null;
}

export function getPhidiasFundedPayoutRowForAccount(account: JournalAccount): PhidiasFundedPayoutCsvRow | null {
  if (account.propFirm.name.trim() !== "Phidias") return null;
  if (account.accountType !== "funded" && account.accountType !== "live") return null;
  const program =
    account.compareProgramName?.trim() || findEvalCompareRow(account)?.accountName?.trim() || "";
  return lookupPhidiasFundedPayoutRow(program, account.sizeLabel);
}

export function isPhidiasFundedJournalAccount(account: JournalAccount): boolean {
  return getPhidiasFundedPayoutRowForAccount(account) != null;
}
