/** Post-login default: TradeDesk dashboard. */
export const DEFAULT_AUTH_REDIRECT = "/desk/dashboard";

/**
 * Short-lived cookie set before OAuth / magic link so `/auth/callback` still knows where to go
 * if the `next` query param is dropped by the IdP redirect (common with strict allow-lists).
 */
export const AUTH_NEXT_COOKIE = "mtd_auth_next";

/**
 * Prevents open redirects. Only same-origin relative paths are allowed.
 * The marketing home `/` is treated as “go to the desk” after sign-in.
 */
export function safeAuthRedirectPath(next: string | null | undefined): string {
  if (!next || typeof next !== "string") return DEFAULT_AUTH_REDIRECT;
  const t = next.trim();
  if (!t.startsWith("/") || t.startsWith("//")) return DEFAULT_AUTH_REDIRECT;
  if (t === "/" || t === "") return DEFAULT_AUTH_REDIRECT;
  return t;
}
