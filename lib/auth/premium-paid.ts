import type { SupabaseClient } from "@supabase/supabase-js";

import { DEFAULT_ACCOUNTS_LIMIT } from "@/lib/auth/constants";
import type { UserProfileRow } from "@/lib/auth/profile";

/** End instant for paid Premium (prefers `premium_access_until`, falls back to legacy column). */
export function getPremiumAccessUntilDate(profile: UserProfileRow | null): Date | null {
  if (!profile) return null;
  const iso =
    profile.premium_access_until?.trim() || profile.subscription_current_period_end?.trim() || null;
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Paid Stripe Premium is in force for this clock instant (not trial).
 * Rows marked `active` without an end date yet are treated as entitled until webhooks fill dates.
 */
export function isPremiumPaidEntitled(profile: UserProfileRow | null, now: Date = new Date()): boolean {
  if (!profile || profile.premium_status !== "active") return false;
  const until = getPremiumAccessUntilDate(profile);
  if (!until) return true;
  return now.getTime() < until.getTime();
}

/**
 * If the paid access window is over but the row was never downgraded (missed webhook),
 * persist Lite + expired. Does not modify trialing / none rows.
 */
export async function syncPremiumStatus(
  supabase: SupabaseClient,
  profile: UserProfileRow,
  now: Date = new Date()
): Promise<UserProfileRow> {
  if (profile.premium_status !== "active") return profile;

  const until = getPremiumAccessUntilDate(profile);
  if (!until || now.getTime() < until.getTime()) return profile;

  const { data, error } = await supabase
    .from("profiles")
    .update({
      premium_status: "expired",
      plan: "lite",
      accounts_limit: DEFAULT_ACCOUNTS_LIMIT,
      cancel_at_period_end: false,
      stripe_subscription_id: null,
      stripe_price_id: null,
      subscription_interval: null,
      premium_access_until: null,
      subscription_current_period_end: null,
    })
    .eq("id", profile.id)
    .eq("premium_status", "active")
    .select("*")
    .maybeSingle();

  if (error || !data) return profile;
  return data as UserProfileRow;
}
