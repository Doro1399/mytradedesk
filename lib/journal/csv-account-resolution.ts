import { effectivePlatformAccountNameForMatch } from "@/lib/journal/default-account-display-name";
import type { JournalAccount, JournalId } from "@/lib/journal/types";

/** Same rules as `resolveAccountDisplayName` (auto labels + id fallback) — kept in lib for server-safe CSV matching. */
function accountDisplayNameForMatch(acc: JournalAccount, labelByAccountId: Map<string, string>): string {
  const explicit = effectivePlatformAccountNameForMatch(acc.displayAccountCode);
  if (explicit) return explicit;
  const auto = labelByAccountId.get(acc.id);
  if (auto) return auto;
  const compact = acc.id.replace(/[^a-fA-F0-9]/g, "");
  return compact.slice(0, 14).toUpperCase() || acc.id.slice(0, 12).toUpperCase();
}

/** Normalize broker CSV account cells for matching (trim, collapse spaces, lowercase). */
export function normalizeCsvAccountLabel(raw: string): string {
  return raw.trim().replace(/\s+/g, " ").toLowerCase();
}

export type CsvImportAccountResolution =
  | { kind: "no_account_column" }
  | {
      kind: "resolved";
      /** normalized CSV label → workspace account */
      labelToAccountId: Map<string, JournalId>;
    }
  | {
      kind: "unmatched";
      /** CSV labels (normalized) with no workspace account match */
      unmatchedNormalized: string[];
      /** First-seen display string per normalized label (for UI) */
      displayByNormalized: Map<string, string>;
      /** Labels that already matched (map each manually for the rest). */
      partialLabelToAccountId: Map<string, JournalId>;
    }
  | {
      kind: "ambiguous";
      csvDisplay: string;
      normalized: string;
      candidateAccountIds: JournalId[];
    };

function accountMatchesCsvLabel(
  acc: JournalAccount,
  normalizedCsv: string,
  labelByAccountId: Map<string, string>
): boolean {
  const code = effectivePlatformAccountNameForMatch(acc.displayAccountCode);
  if (code && normalizeCsvAccountLabel(code) === normalizedCsv) return true;
  const shown = accountDisplayNameForMatch(acc, labelByAccountId);
  return normalizeCsvAccountLabel(shown) === normalizedCsv;
}

/**
 * Map CSV `Account` / `Account name` values to workspace accounts.
 * Priority: **Platform account name** (`displayAccountCode`) then default display label (`Program #n`).
 */
export function resolveCsvImportAccountLabels(
  uniqueNormalizedLabels: string[],
  displayByNormalized: Map<string, string>,
  eligibleAccounts: JournalAccount[],
  labelByAccountId: Map<string, string>
): CsvImportAccountResolution {
  if (uniqueNormalizedLabels.length === 0) {
    return { kind: "no_account_column" };
  }

  const labelToAccountId = new Map<string, JournalId>();

  for (const norm of uniqueNormalizedLabels) {
    const matches = eligibleAccounts.filter((a) => accountMatchesCsvLabel(a, norm, labelByAccountId));
    if (matches.length === 1) {
      labelToAccountId.set(norm, matches[0]!.id);
    } else if (matches.length > 1) {
      return {
        kind: "ambiguous",
        normalized: norm,
        csvDisplay: displayByNormalized.get(norm) ?? norm,
        candidateAccountIds: matches.map((m) => m.id),
      };
    }
  }

  const unmatched: string[] = [];
  for (const norm of uniqueNormalizedLabels) {
    if (!labelToAccountId.has(norm)) unmatched.push(norm);
  }

  if (unmatched.length > 0) {
    return {
      kind: "unmatched",
      unmatchedNormalized: unmatched,
      displayByNormalized,
      partialLabelToAccountId: labelToAccountId,
    };
  }

  return { kind: "resolved", labelToAccountId };
}

/** Build unique label maps from parsed CSV rows (non-empty `csvAccountLabel` only). */
export function collectCsvAccountLabelsFromRows(
  rows: { csvAccountLabel?: string }[]
): {
  uniqueNormalized: string[];
  displayByNormalized: Map<string, string>;
} {
  const displayByNormalized = new Map<string, string>();
  for (const r of rows) {
    const raw = r.csvAccountLabel?.trim();
    if (!raw) continue;
    const n = normalizeCsvAccountLabel(raw);
    if (!displayByNormalized.has(n)) displayByNormalized.set(n, raw);
  }
  const uniqueNormalized = [...displayByNormalized.keys()].sort((a, b) => a.localeCompare(b));
  return { uniqueNormalized, displayByNormalized };
}

export function applyManualAccountMappings(
  resolvedMap: Map<string, JournalId>,
  /** normalized CSV label → account id (only for previously unmatched keys) */
  manual: Record<string, JournalId | undefined>
): Map<string, JournalId> {
  const out = new Map(resolvedMap);
  for (const [k, id] of Object.entries(manual)) {
    if (id) out.set(k, id);
  }
  return out;
}
