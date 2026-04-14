import {
  DAYTRADERS_FUNDED_FROM_CSV,
  type DaytradersFundedCsvRow,
} from "@/lib/journal/daytraders-funded-csv.generated";
import type { JournalAccount } from "@/lib/journal/types";

export function isDaytradersJournalAccount(account: Pick<JournalAccount, "propFirm">): boolean {
  return account.propFirm.name.trim() === "DayTraders";
}

/**
 * Ligne funded depuis `Day Traders Rules.csv` (clé `programme|taille`, ex. `DayTraders Trail|25k`).
 */
export function getDaytradersFundedPayoutRowForAccount(
  account: JournalAccount
): DaytradersFundedCsvRow | null {
  if (!isDaytradersJournalAccount(account)) return null;
  if (account.accountType !== "funded" && account.accountType !== "live") return null;
  const p = account.compareProgramName?.trim() ?? "";
  const sz = account.sizeLabel.trim().toLowerCase().replace(/\s+/g, "");
  if (!p || !/^\d+k$/.test(sz)) return null;
  const key = `${p}|${sz}`;
  return DAYTRADERS_FUNDED_FROM_CSV[key] ?? null;
}

export function isDaytradersFundedJournalAccount(account: JournalAccount): boolean {
  return getDaytradersFundedPayoutRowForAccount(account) != null;
}
