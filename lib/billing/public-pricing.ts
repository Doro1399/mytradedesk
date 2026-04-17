/** Display-only amounts (Stripe prices are configured in the dashboard / env). */

export const PREMIUM_MONTHLY_USD = 24.99;

/** Yearly is always shown at $19.99/mo (billed annually). */
export const PREMIUM_YEARLY_PER_MO_DISPLAY_USD = 19.99;

/** One yearly charge = 12 × the advertised monthly equivalent. */
export const PREMIUM_YEARLY_ONCE_USD =
  Math.round(PREMIUM_YEARLY_PER_MO_DISPLAY_USD * 12 * 100) / 100;

/** Same as {@link PREMIUM_YEARLY_PER_MO_DISPLAY_USD} — used by cards / settings copy. */
export const PREMIUM_YEARLY_EFFECTIVE_MONTHLY_USD = PREMIUM_YEARLY_PER_MO_DISPLAY_USD;

export const PREMIUM_YEARLY_SAVE_PCT = Math.round(
  ((PREMIUM_MONTHLY_USD * 12 - PREMIUM_YEARLY_ONCE_USD) / (PREMIUM_MONTHLY_USD * 12)) * 100
);
