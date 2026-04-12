import type { JournalDataV1, JournalId } from "@/lib/journal/types";
import { labelGroupKey } from "@/lib/journal/label-slot-helpers";
import { nowIso } from "@/lib/journal/reducer";

/**
 * Assigns `compareLabelSlot` to accounts that do not have one yet (migration + edge cases).
 * Within each firm+program group, sorts by `createdAt` and assigns max+1 per missing account so
 * numbers never reuse deleted slots.
 */
export function assignMissingCompareLabelSlots(data: JournalDataV1): JournalDataV1 {
  let accounts = { ...data.accounts };
  const byGroup = new Map<string, JournalId[]>();

  for (const [id, a] of Object.entries(accounts)) {
    if (a.isArchived) continue;
    const key = labelGroupKey(a);
    const arr = byGroup.get(key) ?? [];
    arr.push(id);
    byGroup.set(key, arr);
  }

  for (const [, ids] of byGroup) {
    const sorted = [...ids].sort(
      (idA, idB) => accounts[idA].createdAt.localeCompare(accounts[idB].createdAt)
    );
    let maxSlot = 0;
    for (const id of sorted) {
      const s = accounts[id].compareLabelSlot;
      if (s != null && s >= 1) maxSlot = Math.max(maxSlot, s);
    }
    for (const id of sorted) {
      const a = accounts[id];
      if (a.compareLabelSlot != null && a.compareLabelSlot >= 1) continue;
      maxSlot += 1;
      accounts = {
        ...accounts,
        [id]: { ...a, compareLabelSlot: maxSlot, updatedAt: nowIso() },
      };
    }
  }

  return { ...data, accounts, lastSavedAt: nowIso() };
}
