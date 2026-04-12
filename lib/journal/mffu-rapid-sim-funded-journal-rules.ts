import { findEvalCompareRow } from "@/lib/journal/compare-account-helpers";
import type { JournalAccount } from "@/lib/journal/types";

/** Program label from wizard / compare row (e.g. `My Funded Futures Rapid`). */
export function mffuRapidSimFundedProgramLabel(account: JournalAccount): string {
  const direct = account.compareProgramName?.trim();
  if (direct) return direct;
  return findEvalCompareRow(account)?.accountName?.trim() ?? "";
}

/**
 * **My Funded Futures** — Rapid **Sim Funded** / live only (not Flex, not Pro).
 * Aligns with compare `accountName` `My Funded Futures Rapid` + funded/live.
 */
export function isMffuRapidSimFundedJournalAccount(account: JournalAccount): boolean {
  if (account.propFirm.name.trim() !== "My Funded Futures") return false;
  if (account.accountType !== "funded" && account.accountType !== "live") return false;
  const p = mffuRapidSimFundedProgramLabel(account).toLowerCase();
  if (!p.includes("rapid")) return false;
  if (p.includes("flex") || p.includes("pro")) return false;
  return true;
}
