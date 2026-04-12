import { findEvalCompareRow } from "@/lib/journal/compare-account-helpers";
import type { MffuProSimFundedCsvSize } from "@/lib/journal/mffu-pro-sim-funded-csv.generated";
import type { JournalAccount } from "@/lib/journal/types";

export function mffuProSimFundedProgramLabel(account: JournalAccount): string {
  const direct = account.compareProgramName?.trim();
  if (direct) return direct;
  return findEvalCompareRow(account)?.accountName?.trim() ?? "";
}

/**
 * **My Funded Futures** — **Pro** Sim funded / live (50k / 100k / 150k ; pas Rapid, pas Flex).
 */
export function isMffuProSimFundedJournalAccount(account: JournalAccount): boolean {
  if (account.propFirm.name.trim() !== "My Funded Futures") return false;
  if (account.accountType !== "funded" && account.accountType !== "live") return false;
  const sz = account.sizeLabel.trim().toLowerCase().replace(/\s+/g, "");
  if (sz !== "50k" && sz !== "100k" && sz !== "150k") return false;
  const p = mffuProSimFundedProgramLabel(account).toLowerCase();
  if (!p.includes("pro")) return false;
  if (p.includes("rapid") || p.includes("flex")) return false;
  return true;
}

export function mffuProSimFundedCsvSizeOrNull(account: JournalAccount): MffuProSimFundedCsvSize | null {
  if (!isMffuProSimFundedJournalAccount(account)) return null;
  const sz = account.sizeLabel.trim().toLowerCase().replace(/\s+/g, "") as MffuProSimFundedCsvSize;
  return sz === "50k" || sz === "100k" || sz === "150k" ? sz : null;
}
