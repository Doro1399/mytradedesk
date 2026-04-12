import { getAccountFinancialMetrics, getAccountPnlCentsSinceDate } from "@/lib/journal/selectors";
import type { ISODate, JournalAccount, JournalDataV1 } from "@/lib/journal/types";

export function fundedProgressPnlBaselineDate(acc: JournalAccount): ISODate | undefined {
  if (acc.accountType === "funded" || acc.accountType === "live") {
    return acc.fundedConvertedDate ?? acc.passedEvaluationDate ?? undefined;
  }
  if (acc.accountType === "challenge" && acc.status === "passed") {
    return acc.fundedConvertedDate ?? acc.passedEvaluationDate ?? undefined;
  }
  return undefined;
}

/**
 * P&L (cents) depuis la phase funded. `0` si le compte n’est pas `funded` / `live`.
 */
export function getFundedPhaseProfitCents(
  state: JournalDataV1,
  account: JournalAccount
): number {
  if (account.accountType !== "funded" && account.accountType !== "live") {
    return 0;
  }
  const fundedBaseline = fundedProgressPnlBaselineDate(account);
  const lifetimePnlCents = getAccountFinancialMetrics(state, account.id).totalPnlCents;
  if (account.fundedProgressBaselinePnlCents != null) {
    return lifetimePnlCents - account.fundedProgressBaselinePnlCents;
  }
  if (fundedBaseline) {
    return getAccountPnlCentsSinceDate(state, account.id, fundedBaseline);
  }
  return getAccountPnlCentsSinceDate(state, account.id, null);
}
