import { getEffectiveAccountsCap } from "@/lib/auth/plan";
import type { UserProfileRow } from "@/lib/auth/profile";

export function accountsLimitFromProfile(profile: UserProfileRow | null): number {
  return getEffectiveAccountsCap(profile);
}

export function canAddJournalAccounts(currentCount: number, accountsLimit: number): boolean {
  return currentCount < accountsLimit;
}

/** How many new accounts can still be created (single-account adds). */
export function remainingAccountSlots(currentCount: number, accountsLimit: number): number {
  return Math.max(0, accountsLimit - currentCount);
}
