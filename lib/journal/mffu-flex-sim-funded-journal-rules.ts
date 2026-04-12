import { findEvalCompareRow } from "@/lib/journal/compare-account-helpers";
import type { MffuFlexSimFundedCsvSize } from "@/lib/journal/mffu-flex-sim-funded-csv.generated";
import type { JournalAccount } from "@/lib/journal/types";

export function mffuFlexSimFundedProgramLabel(account: JournalAccount): string {
  const direct = account.compareProgramName?.trim();
  if (direct) return direct;
  return findEvalCompareRow(account)?.accountName?.trim() ?? "";
}

/**
 * **My Funded Futures** — **Flex** Sim funded / live (25k / 50k uniquement ; pas Rapid, pas Pro).
 */
export function isMffuFlexSimFundedJournalAccount(account: JournalAccount): boolean {
  if (account.propFirm.name.trim() !== "My Funded Futures") return false;
  if (account.accountType !== "funded" && account.accountType !== "live") return false;
  const sz = account.sizeLabel.trim().toLowerCase().replace(/\s+/g, "");
  if (sz !== "25k" && sz !== "50k") return false;
  const p = mffuFlexSimFundedProgramLabel(account).toLowerCase();
  if (!p.includes("flex")) return false;
  if (p.includes("rapid") || p.includes("pro")) return false;
  return true;
}

export function mffuFlexSimFundedCsvSizeOrNull(account: JournalAccount): MffuFlexSimFundedCsvSize | null {
  if (!isMffuFlexSimFundedJournalAccount(account)) return null;
  const sz = account.sizeLabel.trim().toLowerCase().replace(/\s+/g, "") as MffuFlexSimFundedCsvSize;
  return sz === "25k" || sz === "50k" ? sz : null;
}
