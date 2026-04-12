"use client";

import { useMemo } from "react";
import type { JournalAccount } from "@/lib/journal/types";

function shortenLabel(name: string): string {
  const t = name.trim();
  if (!t) return "Account";
  if (t.length <= 26) return t;
  return `${t.slice(0, 24)}…`;
}

/**
 * Default labels `Program #n` using stable `compareLabelSlot` (unchanged when other accounts delete).
 * Accounts without a slot use legacy sequential numbering until migration assigns a slot.
 */
export function useAutoAccountLabelById(accounts: JournalAccount[]) {
  return useMemo(() => {
    const visible = accounts.filter((a) => !a.isArchived);
    const map = new Map<string, string>();

    for (const a of visible) {
      const prefix = shortenLabel(a.compareProgramName?.trim() || a.propFirm.name);
      if (a.compareLabelSlot != null && a.compareLabelSlot >= 1) {
        map.set(a.id, `${prefix} #${a.compareLabelSlot}`);
      }
    }

    const legacy = visible.filter(
      (a) => a.compareLabelSlot == null || a.compareLabelSlot < 1
    );
    const perGroup = new Map<string, number>();
    const sortedLegacy = [...legacy].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    for (const a of sortedLegacy) {
      const firmKey = a.propFirm.id.trim().toLowerCase();
      const programKey = (a.compareProgramName?.trim() || a.propFirm.name).trim().toLowerCase();
      const group = `${firmKey}::${programKey}`;
      const n = (perGroup.get(group) ?? 0) + 1;
      perGroup.set(group, n);
      const prefix = shortenLabel(a.compareProgramName?.trim() || a.propFirm.name);
      map.set(a.id, `${prefix} #${n}`);
    }

    return map;
  }, [accounts]);
}

export function resolveAccountDisplayName(
  acc: JournalAccount,
  autoById: Map<string, string>
): string {
  if (acc.displayAccountCode?.trim()) return acc.displayAccountCode.trim();
  const auto = autoById.get(acc.id);
  if (auto) return auto;
  const compact = acc.id.replace(/[^a-fA-F0-9]/g, "");
  return compact.slice(0, 14).toUpperCase() || acc.id.slice(0, 12).toUpperCase();
}
