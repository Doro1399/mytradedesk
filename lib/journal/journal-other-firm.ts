import type { JournalAccount } from "@/lib/journal/types";

export function isJournalOtherPropFirm(account: Pick<JournalAccount, "propFirm">): boolean {
  return account.propFirm.name.trim().toLowerCase() === "other";
}
