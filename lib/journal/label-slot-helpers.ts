import type { JournalAccount } from "@/lib/journal/types";

export function labelGroupKey(a: Pick<JournalAccount, "propFirm" | "compareProgramName">): string {
  const firmKey = a.propFirm.id.trim().toLowerCase();
  const programKey = (a.compareProgramName?.trim() || a.propFirm.name).trim().toLowerCase();
  return `${firmKey}::${programKey}`;
}

/** Highest compareLabelSlot in the same firm+program group (non-archived). */
export function maxCompareLabelSlotInGroup(
  accounts: Record<string, JournalAccount>,
  groupKey: string
): number {
  let m = 0;
  for (const a of Object.values(accounts)) {
    if (a.isArchived) continue;
    if (labelGroupKey(a) !== groupKey) continue;
    if (a.compareLabelSlot != null && a.compareLabelSlot > m) m = a.compareLabelSlot;
  }
  return m;
}
