/** Shown as `displayAccountCode` for new accounts until the user sets their platform account name. */
export const DEFAULT_NEW_ACCOUNT_DISPLAY_NAME =
  "Use the same name as your trading platform.";

/** For CSV matching: placeholder is not a real broker account label — fall back to auto label / id. */
export function effectivePlatformAccountNameForMatch(
  displayAccountCode: string | undefined
): string | undefined {
  const t = displayAccountCode?.trim();
  if (!t || t === DEFAULT_NEW_ACCOUNT_DISPLAY_NAME) return undefined;
  return t;
}
