export const GA_SIGNUP_QUERY = "mtd_ga";
export const GA_SIGNUP_VALUE = "signup";

/** Append `?mtd_ga=signup` (or merge) for post-auth client-side GA. */
export function withSignupAnalyticsQuery(relativePath: string): string {
  const path = relativePath.startsWith("/") ? relativePath : `/${relativePath}`;
  const u = new URL(path, "https://mtd.local");
  u.searchParams.set(GA_SIGNUP_QUERY, GA_SIGNUP_VALUE);
  return `${u.pathname}${u.search}${u.hash}`;
}
