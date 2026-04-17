export type PremiumStatus = "none" | "trialing" | "active" | "expired";

/** Row in `public.profiles`. Email is a UX copy; source of truth is `auth.users.email`. */
export type UserProfileRow = {
  id: string;
  email: string | null;
  plan: string;
  premium_status: PremiumStatus;
  trial_started_at: string | null;
  trial_ends_at: string | null;
  /** Premium paid subscription period end (Stripe); optional until billing is wired. */
  subscription_current_period_end?: string | null;
  accounts_limit: number;
  created_at: string;
};
