/** Horizontal rhythm: readable line length on laptop, opens up on large displays. */
export const LANDING_CONTENT_CLASS =
  "mx-auto w-full max-w-[min(96rem,calc(100vw-3rem))] px-6 sm:px-10 lg:px-14 xl:px-20";

/**
 * Product / dense previews: still wide, but capped on ultra-wide screens so side gutters
 * stay visible (centered column).
 */
export const LANDING_SECTION_BLEED =
  "mx-auto w-full max-w-[min(90rem,calc(100vw-1rem))] px-3 min-[400px]:px-4 min-[480px]:px-5 sm:px-6 md:px-8 lg:px-10 xl:px-12 2xl:px-16";
