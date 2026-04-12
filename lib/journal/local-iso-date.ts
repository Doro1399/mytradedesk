import type { ISODate } from "@/lib/journal/types";

/**
 * Date calendaire locale YYYY-MM-DD (même convention que le P&L manuel dans le journal).
 * À utiliser pour les jalons compte (pass, blow, conversion) afin qu’ils restent alignés
 * avec les dates choisies dans l’UI — contrairement à `toISOString().slice(0, 10)` (UTC).
 */
export function isoDateLocal(d: Date = new Date()): ISODate {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
