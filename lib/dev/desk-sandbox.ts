/**
 * Dev-only desk sandbox (`/desk/sandbox`) — espace d’essai (ex. Rithmic), jamais en prod.
 * Désactivé par défaut : mettre `NEXT_PUBLIC_DESK_SANDBOX=1` dans `.env.local` pour afficher la nav + la route sous `next dev`.
 */
export const IS_DESK_SANDBOX_VISIBLE =
  process.env.NODE_ENV === "development" && process.env.NEXT_PUBLIC_DESK_SANDBOX === "1";
