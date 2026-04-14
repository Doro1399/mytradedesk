import type { JournalAccount } from "@/lib/journal/types";
import { formatUsdWholeGrouped } from "@/lib/prop-firms";
import { getTptRuleBlockForAccount, isTakeProfitTraderJournalAccount } from "@/lib/journal/tpt-journal-rules";

const WALLET_WITHDRAWAL_FEE_USD = 50;

/** Avertissement informatif modal Add Payout (ne bloque pas la soumission). */
export function getTptFundedPayoutFeeWarning(
  account: JournalAccount,
  grossPayoutUsd: number
): { show: boolean; message: string } {
  if (!isTakeProfitTraderJournalAccount(account)) return { show: false, message: "" };
  const block = getTptRuleBlockForAccount(account);
  if (!block) return { show: false, message: "" };
  const mini = block.payoutMiniUsd;
  if (Number.isFinite(grossPayoutUsd) && grossPayoutUsd > 0 && grossPayoutUsd < mini) {
    return {
      show: true,
      message: `Warning: wallet withdrawals below ${formatUsdWholeGrouped(mini)} may incur a $${WALLET_WITHDRAWAL_FEE_USD} fee.`,
    };
  }
  return { show: false, message: "" };
}
