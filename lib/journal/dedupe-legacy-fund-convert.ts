import type { JournalDataV1, JournalId } from "@/lib/journal/types";
import { nowIso } from "@/lib/journal/reducer";

function countByAccount(
  entries: Record<JournalId, { accountId: JournalId }>,
  accountId: JournalId
): number {
  let n = 0;
  for (const e of Object.values(entries)) {
    if (e.accountId === accountId) n += 1;
  }
  return n;
}

/**
 * Older journal versions created a **new** funded account on “Convert to funded” while also
 * updating the original challenge row — leaving two rows with the same label.
 * Merges the **newest** funded clone into the **oldest** when the clone has no P&amp;L / payouts.
 * Run again on next load if more than one duplicate remained.
 */
export function dedupeLegacyFundedConvertClones(data: JournalDataV1): JournalDataV1 {
  let accounts = { ...data.accounts };
  let feeEntries = { ...data.feeEntries };
  const pnlEntries = { ...data.pnlEntries };
  const payoutEntries = { ...data.payoutEntries };

  const funded = Object.values(accounts).filter(
    (a) => !a.isArchived && (a.accountType === "funded" || a.accountType === "live")
  );

  const byKey = new Map<string, typeof funded>();
  for (const a of funded) {
    const key = `${a.propFirm.id}\0${a.sizeLabel.trim().toLowerCase()}\0${(a.compareProgramName ?? "").trim().toLowerCase()}`;
    const arr = byKey.get(key) ?? [];
    arr.push(a);
    byKey.set(key, arr);
  }

  for (const [, group] of byKey) {
    if (group.length < 2) continue;
    const sorted = [...group].sort((x, y) => x.createdAt.localeCompare(y.createdAt));
    const keep = sorted[0];
    const remove = sorted[sorted.length - 1];
    if (keep.id === remove.id) continue;
    if (countByAccount(pnlEntries, remove.id) > 0) continue;
    if (countByAccount(payoutEntries, remove.id) > 0) continue;

    for (const [fid, e] of Object.entries(feeEntries)) {
      if (e.accountId !== remove.id) continue;
      feeEntries = {
        ...feeEntries,
        [fid]: { ...e, accountId: keep.id, updatedAt: nowIso() },
      };
    }
    const restAcc = { ...accounts };
    delete restAcc[remove.id];
    accounts = restAcc;
  }

  return {
    ...data,
    accounts,
    feeEntries,
    pnlEntries,
    payoutEntries,
    lastSavedAt: nowIso(),
  };
}
