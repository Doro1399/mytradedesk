import { propFirms } from "./prop-firms";

export type SidebarPropFirm = { name: string; logoSrc: string | null };

/** Unique prop firms (by name) for the compare sidebar filter — logos from first matching row. */
const byName = new Map<string, string | null>();
for (const f of propFirms) {
  if (!byName.has(f.name)) {
    byName.set(f.name, f.firmLogoSrc);
  }
}

export const SIDEBAR_PROP_FIRMS: SidebarPropFirm[] = [...byName.entries()]
  .map(([name, logoSrc]) => ({ name, logoSrc }))
  .sort((a, b) => a.name.localeCompare(b.name));

/** Collapsed sidebar: how many firm rows show before “Show more”. */
export const PROP_FIRM_SIDEBAR_COLLAPSED_COUNT = 3;
