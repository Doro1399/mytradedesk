import {
  isTradeifySelectVariantCompareRow,
  propFirms,
  type PropFirm,
} from "@/lib/prop-firms";
import { SIDEBAR_PROP_FIRMS, type SidebarPropFirm } from "@/lib/prop-firm-sidebar";
import type { AccountType } from "@/lib/journal/types";

/**
 * Wizard ordering for Tradeify programmes.
 *
 * Compare rows are not always in display order in `propFirms`, so this constant
 * forces the order users expect when they pick a Tradeify programme.
 */
export const TRADEIFY_PROGRAM_ORDER = [
  "Tradeify Growth",
  "Tradeify Ligthning",
  "Tradeify Select",
  "Tradeify Select Daily",
  "Tradeify Select Flex",
] as const;

/** Matches compare / `propFirms` grouping for DayTraders (incl. EOD from Day Traders Rules.csv). */
export const DAYTRADERS_PROGRAM_ORDER = [
  "DayTraders Trail",
  "DayTraders Static",
  "DayTraders Core Plan",
  "DayTraders Edge Plan",
  "DayTraders Ultra Plan",
  "DayTraders EOD",
  "DayTraders S2F",
] as const;

/** "Other" placeholder for users whose firm isn't in the catalog. */
export const OTHER_FIRM_NAME = "Other" as const;

/** Sentinel firm entry rendered alongside the catalog firms in firm pickers. */
export const OTHER_FIRM_ENTRY: SidebarPropFirm = {
  name: OTHER_FIRM_NAME,
  logoSrc: null,
};

/** All firms users can pick from (catalog + "Other"). */
export const ALL_FIRM_OPTIONS: SidebarPropFirm[] = [
  ...SIDEBAR_PROP_FIRMS,
  OTHER_FIRM_ENTRY,
];

/**
 * Wizard programme — describes *how* a user trades the firm:
 * - `eval`   : pre-funded evaluation
 * - `funded` : passed-eval account (post-evaluation)
 * - `direct` : instant funding / live broker (no evaluation phase)
 *
 * Maps to the journal's `AccountType` via {@link programKindToAccountType}.
 */
export type ProgramKind = "eval" | "funded" | "direct";

export const PROGRAM_KIND_OPTIONS: { value: ProgramKind; label: string }[] = [
  { value: "eval", label: "Eval" },
  { value: "funded", label: "Funded" },
  { value: "direct", label: "Direct" },
];

export function programKindToAccountType(kind: ProgramKind): AccountType {
  if (kind === "direct") return "live";
  if (kind === "funded") return "funded";
  return "challenge";
}

/** Sort programme names according to firm-specific wizard ordering. */
export function sortProgramNamesForJournalFirm(
  firmName: string,
  names: string[]
): string[] {
  if (firmName === "Tradeify") {
    const rank = (n: string) => {
      const i = (TRADEIFY_PROGRAM_ORDER as readonly string[]).indexOf(n);
      return i === -1 ? 999 : i;
    };
    return [...names].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
  }
  if (firmName === "DayTraders") {
    const rank = (n: string) => {
      const i = (DAYTRADERS_PROGRAM_ORDER as readonly string[]).indexOf(n);
      return i === -1 ? 999 : i;
    };
    return [...names].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
  }
  return [...names].sort((a, b) => a.localeCompare(b));
}

/** All compare rows for a given firm name. Empty for "Other" or unknown firms. */
export function getCompareRowsForFirm(firmName: string): PropFirm[] {
  if (!firmName || firmName === OTHER_FIRM_NAME) return [];
  return propFirms.filter((f) => f.name === firmName);
}

/**
 * Account types ("plans") available for a firm + programme combo.
 *
 * Tradeify rules (per product convention):
 * - eval   → "Tradeify Growth", "Tradeify Select" (excludes Lightning = Direct, excludes Daily/Flex = funded-only variants).
 * - funded → "Tradeify Growth", "Tradeify Select Daily", "Tradeify Select Flex" (replaces plain "Tradeify Select" with the funded variants).
 * - direct → "Tradeify Ligthning".
 */
export function getTypeOptions(firmName: string, program: ProgramKind): string[] {
  const rows = getCompareRowsForFirm(firmName);
  if (!rows.length) return [];

  let filtered: PropFirm[];
  if (program === "direct") {
    filtered = rows.filter((r) => r.accountType === "Direct");
  } else if (program === "funded") {
    filtered = rows.filter((r) => {
      if (r.accountType !== "Eval") return false;
      // Funded view replaces the plain "Tradeify Select" eval row with its funded variants.
      if (firmName === "Tradeify" && r.accountName === "Tradeify Select") return false;
      return true;
    });
  } else {
    // Eval — exclude funded-only variants (Tradeify Select Daily / Flex).
    filtered = rows.filter(
      (r) => r.accountType === "Eval" && !isTradeifySelectVariantCompareRow(r)
    );
  }

  const unique = [...new Set(filtered.map((r) => r.accountName))];
  return sortProgramNamesForJournalFirm(firmName, unique);
}

/** Available sizes for a firm + programme + account type combo. */
export function getSizeOptions(
  firmName: string,
  program: ProgramKind,
  typeName: string
): string[] {
  const rows = getCompareRowsForFirm(firmName);
  if (!rows.length || !typeName) return [];

  const matching = rows.filter((r) => {
    if (r.accountName !== typeName) return false;
    if (program === "direct") return r.accountType === "Direct";
    return r.accountType === "Eval";
  });
  return [...new Set(matching.map((r) => r.size))];
}

/** Default activation/instant fee (USD) suggested for a firm + programme + type + size combo. */
export function getSuggestedActivationFeeUsd(
  firmName: string,
  program: ProgramKind,
  typeName: string,
  sizeLabel: string
): number | null {
  const rows = getCompareRowsForFirm(firmName);
  if (!rows.length) return null;

  const match =
    rows.find(
      (r) =>
        r.accountName === typeName &&
        r.size === (sizeLabel as PropFirm["size"]) &&
        (program === "direct" ? r.accountType === "Direct" : r.accountType === "Eval")
    ) ?? null;

  if (!match) return null;
  return match.activationFeeUsd ?? null;
}
