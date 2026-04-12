import type { JournalAccount } from "@/lib/journal/types";
import { formatUsdWholeGrouped } from "@/lib/prop-firms";
import { getTptRuleBlockForAccount, isTakeProfitTraderJournalAccount } from "@/lib/journal/tpt-journal-rules";

/** Split affiché dashboard (wallet → banque) : 80 % du brut enregistré. */
const TPT_NET_DISPLAY_SHARE = 0.8;

const WALLET_WITHDRAWAL_FEE_USD = 50;

export type TptPayoutState = {
  bufferUsd: number;
  balanceNowUsd: number;
  availablePayoutUsd: number;
  isEligible: boolean;
  eligibilityReason: string | null;
  grossPayoutEstimateUsd: number | null;
  netPayoutEstimateUsd: number | null;
  showAddPayout: boolean;
  showFeeWarning: boolean;
  feeWarningMessage: string;
};

function isTptFundedOrLiveAccount(account: JournalAccount): boolean {
  return account.accountType === "funded" || account.accountType === "live";
}

/**
 * État payout funded TPT : buffer et mini depuis le CSV (via `getTptRuleBlockForAccount`).
 * Pas de consistance, pas de min profit journalier, pas de winning days.
 */
export function getTptPayoutState(
  account: JournalAccount,
  params: {
    balanceNowCents: number;
    startCents: number;
    /** Montant brut demandé (USD), pour estimations net / warning frais wallet. */
    selectedPayoutGrossUsd?: number | null;
  }
): TptPayoutState | null {
  if (!isTakeProfitTraderJournalAccount(account)) return null;
  if (!isTptFundedOrLiveAccount(account)) return null;

  const block = getTptRuleBlockForAccount(account);
  if (!block) return null;

  const bufferUsd = block.fundedBufferUsd;
  const bufferCents = Math.round(bufferUsd * 100);
  const thresholdCents = params.startCents + bufferCents;
  const currentCents = Math.round(params.balanceNowCents);
  const availablePayoutCents = Math.max(0, currentCents - thresholdCents);

  const balanceNowUsd = currentCents / 100;
  const availablePayoutUsd = availablePayoutCents / 100;

  const showAddPayout = availablePayoutCents > 0;
  const isEligible = showAddPayout;

  let eligibilityReason: string | null = null;
  if (!isEligible) {
    const gap = thresholdCents - currentCents;
    if (gap > 0) {
      eligibilityReason = `Need ${formatUsdWholeGrouped(gap / 100)} more to reach start + buffer.`;
    } else {
      eligibilityReason = "No withdrawable surplus above buffer.";
    }
  }

  const sel = params.selectedPayoutGrossUsd;
  let grossPayoutEstimateUsd: number | null = null;
  let netPayoutEstimateUsd: number | null = null;
  if (sel != null && Number.isFinite(sel) && sel > 0) {
    grossPayoutEstimateUsd = sel;
    netPayoutEstimateUsd = sel * TPT_NET_DISPLAY_SHARE;
  }

  const payoutMiniUsd = block.payoutMiniUsd;
  const showFeeWarning =
    sel != null && Number.isFinite(sel) && sel > 0 && sel < payoutMiniUsd;
  const feeWarningMessage = showFeeWarning
    ? `Warning: payouts below ${formatUsdWholeGrouped(payoutMiniUsd)} may incur a $${WALLET_WITHDRAWAL_FEE_USD} wallet withdrawal fee.`
    : "";

  return {
    bufferUsd,
    balanceNowUsd,
    availablePayoutUsd,
    isEligible,
    eligibilityReason,
    grossPayoutEstimateUsd,
    netPayoutEstimateUsd,
    showAddPayout,
    showFeeWarning,
    feeWarningMessage,
  };
}

/** Avertissement informatif modal Add Payout (ne bloque pas la soumission). */
export function getTptFundedPayoutFeeWarning(
  account: JournalAccount,
  grossPayoutUsd: number
): { show: boolean; message: string } {
  const st = getTptPayoutState(account, {
    balanceNowCents: 0,
    startCents: 0,
    selectedPayoutGrossUsd: grossPayoutUsd,
  });
  if (!st) return { show: false, message: "" };
  return { show: st.showFeeWarning, message: st.feeWarningMessage };
}
