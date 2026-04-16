/** Production feedback form (Formspree). */
const FORMSPREE_FEEDBACK_DEFAULT = "https://formspree.io/f/mdayadbz";

/**
 * Workspace feedback POST target (`https://formspree.io/f/…`).
 * Set `NEXT_PUBLIC_FORMSPREE_FEEDBACK_ACTION` to override (e.g. staging form).
 */
export const FORMSPREE_FEEDBACK_ACTION =
  typeof process !== "undefined"
    ? (process.env.NEXT_PUBLIC_FORMSPREE_FEEDBACK_ACTION?.trim() || FORMSPREE_FEEDBACK_DEFAULT)
    : FORMSPREE_FEEDBACK_DEFAULT;
