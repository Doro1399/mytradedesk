/** Fired when a new journal account is blocked by `accounts_limit` (UI toast / notice). */
export const ACCOUNT_LIMIT_REACHED_EVENT = "mtd-account-limit-reached";

/** Fallback when no profile row yet (should be rare once triggers run). */
export const DEFAULT_ACCOUNTS_LIMIT = 2;
