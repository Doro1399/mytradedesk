import type { JournalAccount, JournalDataV1 } from "@/lib/journal/types";

/**
 * Suggestions runway / prop firm désactivées : pas de préremplissage « max payout ».
 */
export function getSuggestedMaxPayoutUsd(
  _state: JournalDataV1,
  _account: JournalAccount
): number | null {
  return null;
}
