import type { ApexAccountRulesCard } from "@/lib/journal/apex-journal-rules";
import { findEvalCompareRow, findFundedCompareRow } from "@/lib/journal/compare-account-helpers";
import { resolveCompareRowFundedRulesCard } from "@/lib/journal/compare-funded-rules-resolve";
import type { JournalAccount, JournalDataV1 } from "@/lib/journal/types";

/**
 * Règles « Account rules » pour un journal aligné sur une ligne Compare :
 * même grille funded que le modal Compare dès qu’un résolveur existe pour cette ligne.
 */
export function resolveCompareBackedJournalAccountRules(
  _state: JournalDataV1,
  account: JournalAccount
): ApexAccountRulesCard | null {
  const compareRow =
    account.accountType === "challenge"
      ? findEvalCompareRow(account)
      : findFundedCompareRow(account) ?? findEvalCompareRow(account);
  if (!compareRow) return null;
  return resolveCompareRowFundedRulesCard(compareRow);
}
