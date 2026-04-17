export type PremiumStatus = "none" | "trialing" | "active" | "expired";

/** Row in `public.profiles`. Email is a UX copy; source of truth is `auth.users.email`. */
export type UserProfileRow = {
  id: string;
  email: string | null;
  plan: string;
  premium_status: PremiumStatus;
  trial_started_at: string | null;
  trial_ends_at: string | null;
  /** End of paid Premium access (authoritative with `subscription_current_period_end` as mirror for display). */
  premium_access_until?: string | null;
  /** Premium paid subscription period end (Stripe); kept in sync with `premium_access_until` for billing UX. */
  subscription_current_period_end?: string | null;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  stripe_price_id?: string | null;
  subscription_interval?: "month" | "year" | null;
  cancel_at_period_end?: boolean;
  accounts_limit: number;
  created_at: string;
};
