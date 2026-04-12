import type { JournalAccount } from "@/lib/journal/types";

/**
 * Funded rules for **passed** accounts (post-eval / funded track).
 * Populated from `data/passed-funded-targets.txt` — extend the file and mirror here until import is automated.
 */
type PassedFundedRule = {
  profitTargetLabel: string;
  maxDrawdownUsd: number;
};

/** Lucid Pro — passed funded target + DD by eval size (Apr 2026). */
const LUCID_PRO_PASSED: Record<string, PassedFundedRule> = {
  "25k": { profitTargetLabel: "$1,600", maxDrawdownUsd: 1000 },
  "50k": { profitTargetLabel: "$2,600", maxDrawdownUsd: 2000 },
  "100k": { profitTargetLabel: "$3,100", maxDrawdownUsd: 3000 },
  "150k": { profitTargetLabel: "$4,600", maxDrawdownUsd: 4500 },
};

function normalizeSizeKey(sizeLabel: string): string {
  return sizeLabel.trim().toLowerCase();
}

/**
 * When `status === "passed"`, returns funded target + max DD for the journal table
 * if we have a mapping for this firm / compare program / size.
 */
export function resolvePassedFundedRules(acc: JournalAccount): {
  profitTargetLabel: string;
  maxDrawdownCents: number;
} | null {
  if (acc.status !== "passed") return null;

  const firm = acc.propFirm.name.trim();
  const program = acc.compareProgramName?.trim() ?? "";
  const sizeKey = normalizeSizeKey(acc.sizeLabel);

  if (firm === "Lucid Trading" && program === "LucidPro") {
    const rule = LUCID_PRO_PASSED[sizeKey];
    if (!rule) return null;
    return {
      profitTargetLabel: rule.profitTargetLabel,
      maxDrawdownCents: Math.round(rule.maxDrawdownUsd * 100),
    };
  }

  return null;
}
