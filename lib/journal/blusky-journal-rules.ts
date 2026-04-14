import { BLUSKY_FUNDED_FROM_CSV, type BluskyFundedCsvRow } from "@/lib/journal/blusky-funded-csv.generated";
import type { JournalAccount } from "@/lib/journal/types";

export function isBluskyJournalAccount(account: Pick<JournalAccount, "propFirm">): boolean {
  return account.propFirm.name.trim().toLowerCase() === "blusky";
}

/**
 * Ligne payout funded depuis `Blusky Rules.csv` (clé `programme|taille`, ex. `Bluesky Launch|50k`).
 */
export function getBluskyFundedPayoutRowForAccount(
  account: JournalAccount
): BluskyFundedCsvRow | null {
  if (!isBluskyJournalAccount(account)) return null;
  if (account.accountType !== "funded" && account.accountType !== "live") return null;
  const p = account.compareProgramName?.trim() ?? "";
  const sz = account.sizeLabel.trim().toLowerCase().replace(/\s+/g, "");
  if (!p || !/^\d+k$/.test(sz)) return null;
  const key = `${p}|${sz}`;
  return BLUSKY_FUNDED_FROM_CSV[key] ?? null;
}

export function isBluskyFundedJournalAccount(account: JournalAccount): boolean {
  return getBluskyFundedPayoutRowForAccount(account) != null;
}
