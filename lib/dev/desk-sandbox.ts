/**
 * Optional dev flag for future tooling (e.g. Rithmic Protocol smoke tests). The Integrations UI is always
 * visible in Settings; production shows a blurred “Coming soon” teaser; development unlocks the full
 * broker cards when Premium is active.
 *
 * @example `.env.local` — `NEXT_PUBLIC_DESK_SANDBOX=1`
 */
export const IS_DESK_SANDBOX_ENV_ENABLED =
  process.env.NODE_ENV === "development" && process.env.NEXT_PUBLIC_DESK_SANDBOX === "1";
