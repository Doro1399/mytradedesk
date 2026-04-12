/**
 * Flag assets in /public/flags/{code}.{ext} (ISO 3166-1 alpha-2).
 * Currently round PNG icons for US / AE; add entries as you collect assets.
 */
const FLAG_ASSET_BY_CODE: Record<string, string> = {
  /** `v` avoids stale browser cache when replacing assets (same filename). */
  US: "/flags/us.png?v=2",
  AE: "/flags/ae.png?v=2",
  GI: "/flags/gi.png?v=2",
  CY: "/flags/cy.png?v=2",
};

/** Public URL for a flag image, or null → use emoji fallback. */
export function countryFlagAssetSrc(iso3166Alpha2: string): string | null {
  const code = iso3166Alpha2.trim().toUpperCase();
  return FLAG_ASSET_BY_CODE[code] ?? null;
}

/** Regional-indicator flag emoji from ISO 3166-1 alpha-2 (e.g. "US", "GI"). */
export function countryFlagEmoji(iso3166Alpha2: string): string {
  const code = iso3166Alpha2.trim().toUpperCase();
  if (code.length !== 2 || !/^[A-Z]{2}$/.test(code)) {
    return "";
  }
  const base = 0x1f1e6;
  const chars = [...code].map((c) => base + (c.charCodeAt(0) - 65));
  return String.fromCodePoint(...chars);
}
