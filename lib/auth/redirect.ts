/** Post-login default: TradeDesk dashboard. */
export const DEFAULT_AUTH_REDIRECT = "/desk/dashboard";

/**
 * Prevents open redirects. Only same-origin relative paths are allowed.
 */
export function safeAuthRedirectPath(next: string | null | undefined): string {
  if (!next || typeof next !== "string") return DEFAULT_AUTH_REDIRECT;
  const t = next.trim();
  if (!t.startsWith("/") || t.startsWith("//")) return DEFAULT_AUTH_REDIRECT;
  return t;
}
