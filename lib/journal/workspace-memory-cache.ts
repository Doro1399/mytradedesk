import type { JournalDataV1 } from "@/lib/journal/types";

/**
 * Cache runtime par `user_id` — seule copie « locale » du journal + trades desk
 * (plus de persistance métier dans localStorage).
 */
const journalByUser = new Map<string, JournalDataV1>();
const tradesByUser = new Map<string, unknown>();

export function getWorkspaceJournalMemory(userId: string | null): JournalDataV1 | undefined {
  if (!userId) return undefined;
  return journalByUser.get(userId);
}

export function setWorkspaceJournalMemory(userId: string, data: JournalDataV1): void {
  journalByUser.set(userId, data);
}

export function getWorkspaceTradesMemory(userId: string | null): unknown {
  if (!userId) return undefined;
  return tradesByUser.get(userId);
}

export function setWorkspaceTradesMemory(userId: string, data: unknown): void {
  tradesByUser.set(userId, data);
}

export function clearWorkspaceMemoryForUser(userId: string): void {
  journalByUser.delete(userId);
  tradesByUser.delete(userId);
}

export function clearAllWorkspaceMemory(): void {
  journalByUser.clear();
  tradesByUser.clear();
}
