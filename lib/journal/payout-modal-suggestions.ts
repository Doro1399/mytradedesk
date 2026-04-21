import type { JournalAccount, JournalDataV1 } from "@/lib/journal/types";

/**
 * Suggestions runway / prop firm désactivées : pas de préremplissage « max payout ».
 */
export function getSuggestedMaxPayoutUsd(
  state: JournalDataV1,
  account: JournalAccount
): number | null {
  void state;
  void account;
  return null;
}
