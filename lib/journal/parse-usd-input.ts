/** Parses typed dollar amounts (e.g. -50.25, 1200, $1,200.50, or 0,5 for decimals). */
export function parseUsdInputToCents(raw: string): number | null {
  let s = raw.trim().replace(/\$/g, "").replace(/\s/g, "");
  if (!s) return null;
  const commaDec = /^-?\d+,\d+$/.test(s);
  if (commaDec) s = s.replace(",", ".");
  else s = s.replace(/,/g, "");
  const n = Number.parseFloat(s);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100);
}
