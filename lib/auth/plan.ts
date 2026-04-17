import type { SupabaseClient } from "@supabase/supabase-js";

import { DEFAULT_ACCOUNTS_LIMIT } from "@/lib/auth/constants";
import type { UserProfileRow } from "@/lib/auth/profile";

export const TRIAL_LENGTH_DAYS = 14;

/** Practical “unlimited” account cap for gating / UI. */
export const ACCOUNTS_UNLIMITED_CAP = 1_000_000;

/** Show trial expiry banner when remaining full days is at or below this (last week of trial). */
export const TRIAL_EXPIRY_BANNER_DAYS = 7;

export type WorkspaceFeature = "import_backup";

const DAY_MS = 86_400_000;

async function refetchProfileById(
  supabase: SupabaseClient,
  userId: string
): Promise<UserProfileRow | null> {
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  if (error || !data) return null;
  return data as UserProfileRow;
}

function trialEndsAtDate(profile: UserProfileRow): Date | null {
  if (!profile.trial_ends_at) return null;
  return new Date(profile.trial_ends_at);
}

/** Premium subscription paid and active (Stripe later — not trial). */
export function isPremiumPaidActive(profile: UserProfileRow | null): boolean {
  return profile?.premium_status === "active";
}

/** Trial window still open (status + clock). */
export function isTrialActive(profile: UserProfileRow | null, now: Date = new Date()): boolean {
  if (!profile || profile.premium_status !== "trialing") return false;
  const end = trialEndsAtDate(profile);
  if (!end) return false;
  return now.getTime() <= end.getTime();
}

/** Trial over by time or already marked expired in DB. */
export function isTrialExpired(profile: UserProfileRow | null, now: Date = new Date()): boolean {
  if (!profile) return false;
  if (profile.premium_status === "expired") return true;
  if (profile.premium_status !== "trialing") return false;
  const end = trialEndsAtDate(profile);
  if (!end) return false;
  return now.getTime() > end.getTime();
}

/** Clock says trial ended but row may still say `trialing` until lazy persist runs. */
export function isTrialPastDue(profile: UserProfileRow | null, now: Date = new Date()): boolean {
  if (!profile || profile.premium_status !== "trialing") return false;
  const end = trialEndsAtDate(profile);
  if (!end) return false;
  return now.getTime() > end.getTime();
}

/**
 * Full calendar days remaining in trial (ceil). `0` when not in an active trial window.
 */
export function getTrialRemainingDays(profile: UserProfileRow | null, now: Date = new Date()): number {
  if (!isTrialActive(profile, now)) return 0;
  const end = trialEndsAtDate(profile!);
  if (!end) return 0;
  const ms = end.getTime() - now.getTime();
  return Math.max(0, Math.ceil(ms / DAY_MS));
}

export function hasUnlimitedAccounts(profile: UserProfileRow | null, now: Date = new Date()): boolean {
  if (!profile) return false;
  if (isPremiumPaidActive(profile)) return true;
  return isTrialActive(profile, now);
}

/** Effective cap for journal account adds (trial / paid = huge number, else DB column). */
export function getEffectiveAccountsCap(profile: UserProfileRow | null, now: Date = new Date()): number {
  if (!profile) return DEFAULT_ACCOUNTS_LIMIT;
  if (isPremiumPaidActive(profile)) return ACCOUNTS_UNLIMITED_CAP;
  if (isTrialActive(profile, now)) return ACCOUNTS_UNLIMITED_CAP;
  if (isTrialPastDue(profile, now)) return DEFAULT_ACCOUNTS_LIMIT;
  const n = profile.accounts_limit;
  return Number.isFinite(n) && n >= 1 ? n : DEFAULT_ACCOUNTS_LIMIT;
}

export function canUseFeature(feature: WorkspaceFeature, profile: UserProfileRow | null): boolean {
  if (!profile) return false;
  if (feature === "import_backup") return profile.premium_status === "active";
  return true;
}

/**
 * Lite / limited banner: not in active trial, not paid premium active, and on a limited tier.
 */
export function shouldShowLitePlanBanner(profile: UserProfileRow | null, now: Date = new Date()): boolean {
  if (!profile) return false;
  if (isPremiumPaidActive(profile)) return false;
  if (isTrialActive(profile, now)) return false;
  const plan = profile.plan.trim().toLowerCase();
  if (profile.premium_status === "expired") return true;
  return plan === "lite" || plan === "free";
}

export function shouldShowTrialExpiryBanner(profile: UserProfileRow | null, now: Date = new Date()): boolean {
  if (!isTrialActive(profile, now)) return false;
  const d = getTrialRemainingDays(profile, now);
  return d >= 1 && d <= TRIAL_EXPIRY_BANNER_DAYS;
}

/** Profils créés avant le trigger trial (ou sans migration) : `none` + pas de fenêtre d’essai. */
export function shouldBootstrapPremiumTrial(profile: UserProfileRow | null): boolean {
  if (!profile) return false;
  if (profile.premium_status !== "none") return false;
  if (profile.trial_started_at != null || profile.trial_ends_at != null) return false;
  const plan = profile.plan.trim().toLowerCase();
  return plan === "free" || plan === "lite" || plan === "";
}

/**
 * Démarre le trial Premium 14 jours une seule fois (lazy), si la ligne est encore au défaut “lite/free + none”.
 * Compense un trigger SQL non migré ou une base distante pas à jour.
 */
export async function ensurePremiumTrialBootstrapped(
  supabase: SupabaseClient,
  profile: UserProfileRow
): Promise<UserProfileRow> {
  if (!shouldBootstrapPremiumTrial(profile)) return profile;

  const { error: rpcError } = await supabase.rpc("bootstrap_premium_trial_if_needed");
  if (!rpcError) {
    const refreshed = await refetchProfileById(supabase, profile.id);
    return refreshed ?? profile;
  }

  const started = new Date();
  const ends = new Date(started.getTime() + TRIAL_LENGTH_DAYS * DAY_MS);

  const { data, error } = await supabase
    .from("profiles")
    .update({
      plan: "lite",
      premium_status: "trialing",
      trial_started_at: started.toISOString(),
      trial_ends_at: ends.toISOString(),
      accounts_limit: ACCOUNTS_UNLIMITED_CAP,
    })
    .eq("id", profile.id)
    .eq("premium_status", "none")
    .is("trial_started_at", null)
    .is("trial_ends_at", null)
    .select("*")
    .maybeSingle();

  if (error || !data) return profile;
  return data as UserProfileRow;
}

/**
 * If trial ended in time but row still `trialing`, persist Lite + expired (lazy, no cron).
 */
export async function ensureTrialExpiredIfNeeded(
  supabase: SupabaseClient,
  profile: UserProfileRow
): Promise<UserProfileRow> {
  if (profile.premium_status !== "trialing" || !profile.trial_ends_at) return profile;
  if (!(new Date() > new Date(profile.trial_ends_at))) return profile;

  const { error: rpcError } = await supabase.rpc("expire_premium_trial_if_needed");
  if (!rpcError) {
    const refreshed = await refetchProfileById(supabase, profile.id);
    return refreshed ?? profile;
  }

  const { data, error } = await supabase
    .from("profiles")
    .update({
      premium_status: "expired",
      plan: "lite",
      accounts_limit: DEFAULT_ACCOUNTS_LIMIT,
    })
    .eq("id", profile.id)
    .eq("premium_status", "trialing")
    .select("*")
    .maybeSingle();

  if (error || !data) return profile;
  return data as UserProfileRow;
}
