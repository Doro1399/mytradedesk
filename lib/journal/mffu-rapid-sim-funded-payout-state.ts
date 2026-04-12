import { parseFundedNextRewardSplitRatio } from "@/lib/journal/funded-next-journal-rules";
import {
  MFFU_RAPID_SIM_FUNDED_FROM_CSV,
  type MffuRapidSimFundedCsvSize,
} from "@/lib/journal/mffu-rapid-sim-funded-csv.generated";
import { isMffuRapidSimFundedJournalAccount } from "@/lib/journal/mffu-rapid-sim-funded-journal-rules";
import type { JournalAccount, JournalDataV1 } from "@/lib/journal/types";

export type MffuRapidSimFundedPayoutState = {
  isEligible: boolean;
  eligibilityReason: string | null;
  /** CSV funded buffer (USD) — extra profit above nominal before surplus is withdrawable (formula A). */
  buffer: number;
  payoutMin: number;
  rewardSplit: number;
  /** Gross withdrawable (USD) after buffer + min gates; **capped by CSV payout max only** once `surplusCents >= payoutMin`. */
  availablePayout: number;
  grossPayoutEstimate: number;
  netPayoutEstimate: number;
  showAddPayout: boolean;
  showGoodNews: boolean;
  availablePayoutCents: number;
  surplusCents: number;
  bufferFloorCents: number;
};

export type GetMffuRapidSimFundedPayoutStateParams = {
  startCents: number;
  currentCents: number;
};

export function getMffuRapidSimFundedPayoutState(
  _state: JournalDataV1,
  account: JournalAccount,
  params: GetMffuRapidSimFundedPayoutStateParams
): MffuRapidSimFundedPayoutState | null {
  if (!isMffuRapidSimFundedJournalAccount(account)) return null;
  const sk = account.sizeLabel.trim().toLowerCase().replace(/\s+/g, "") as MffuRapidSimFundedCsvSize;
  const csv = MFFU_RAPID_SIM_FUNDED_FROM_CSV[sk];
  if (!csv) return null;

  const bufferCents = Math.round(csv.bufferUsd * 100);
  const payoutMinCents = Math.round(csv.payoutMiniUsd * 100);
  const payoutMaxCents = Math.round(csv.payoutMaxUsd * 100);
  const floorCents = params.startCents + bufferCents;
  const surplusCents = Math.max(0, Math.round(params.currentCents - floorCents));

  let availablePayoutCents = 0;
  if (surplusCents >= payoutMinCents) {
    availablePayoutCents = Math.min(surplusCents, payoutMaxCents);
  }

  const rewardSplit = parseFundedNextRewardSplitRatio(csv.profitSplitLabel) ?? 0;
  const grossUsd = availablePayoutCents / 100;
  const netUsd = Math.round(availablePayoutCents * rewardSplit) / 100;

  const bufferReached = params.currentCents >= floorCents;
  const minAmountOk = availablePayoutCents >= payoutMinCents;
  const isEligible = bufferReached && minAmountOk && availablePayoutCents > 0;

  let eligibilityReason: string | null = null;
  if (!isEligible) {
    if (!bufferReached) {
      eligibilityReason = "Buffer not reached";
    } else if (!minAmountOk) {
      eligibilityReason = "Payout minimum not reached";
    } else {
      eligibilityReason = "Not eligible";
    }
  }

  return {
    isEligible,
    eligibilityReason,
    buffer: csv.bufferUsd,
    payoutMin: csv.payoutMiniUsd,
    rewardSplit,
    availablePayout: grossUsd,
    grossPayoutEstimate: grossUsd,
    netPayoutEstimate: netUsd,
    showAddPayout: isEligible,
    showGoodNews: isEligible,
    availablePayoutCents,
    surplusCents,
    bufferFloorCents: floorCents,
  };
}
