export type PremiumStatus = "none" | "trialing" | "active" | "expired";

/** Row in `public.profiles`. Email is a UX copy; source of truth is `auth.users.email`. */
export type UserProfileRow = {
  id: string;
  email: string | null;
  plan: string;
  premium_status: PremiumStatus;
  trial_started_at: string | null;
  trial_ends_at: string | null;
  accounts_limit: number;
  created_at: string;
};
