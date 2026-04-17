import {
  createEmptyJournalData,
  JOURNAL_SCHEMA_VERSION,
  nowIso,
} from "@/lib/journal/reducer";
import { assignMissingCompareLabelSlots } from "@/lib/journal/assign-missing-label-slots";
import { dedupeLegacyFundedConvertClones } from "@/lib/journal/dedupe-legacy-fund-convert";
import type { JournalDataV1 } from "@/lib/journal/types";

/** Legacy single-tenant key — migrated once into a per-user key on first load. */
export const LEGACY_JOURNAL_STORAGE_KEY = "prop-control-center:v1";

export function journalStorageKeyForUser(userId: string): string {
  return `${LEGACY_JOURNAL_STORAGE_KEY}:user:${userId}`;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function coerceJournalData(raw: unknown): JournalDataV1 | null {
  if (!isObject(raw)) return null;
  if (raw.schemaVersion !== JOURNAL_SCHEMA_VERSION) return null;

  const accounts = isObject(raw.accounts) ? raw.accounts : null;
  const pnlEntries = isObject(raw.pnlEntries) ? raw.pnlEntries : null;
  const feeEntries = isObject(raw.feeEntries) ? raw.feeEntries : null;
  const payoutEntries = isObject(raw.payoutEntries) ? raw.payoutEntries : null;
  const ui = isObject(raw.ui) ? raw.ui : {};
  if (!accounts || !pnlEntries || !feeEntries || !payoutEntries) return null;

  return {
    schemaVersion: JOURNAL_SCHEMA_VERSION,
    lastSavedAt: typeof raw.lastSavedAt === "string" ? raw.lastSavedAt : nowIso(),
    accounts: accounts as JournalDataV1["accounts"],
    pnlEntries: pnlEntries as JournalDataV1["pnlEntries"],
    feeEntries: feeEntries as JournalDataV1["feeEntries"],
    payoutEntries: payoutEntries as JournalDataV1["payoutEntries"],
    ui: ui as JournalDataV1["ui"],
  };
}

export function loadJournalData(userId: string | null): JournalDataV1 {
  if (typeof window === "undefined" || !userId) return createEmptyJournalData();
  try {
    const scoped = journalStorageKeyForUser(userId);
    let raw = window.localStorage.getItem(scoped);
    if (!raw) {
      const legacy = window.localStorage.getItem(LEGACY_JOURNAL_STORAGE_KEY);
      if (legacy) {
        window.localStorage.setItem(scoped, legacy);
        window.localStorage.removeItem(LEGACY_JOURNAL_STORAGE_KEY);
        raw = window.localStorage.getItem(scoped);
      }
    }
    if (!raw) return createEmptyJournalData();
    const parsed = JSON.parse(raw) as unknown;
    const coerced = coerceJournalData(parsed) ?? createEmptyJournalData();
    return assignMissingCompareLabelSlots(dedupeLegacyFundedConvertClones(coerced));
  } catch {
    return createEmptyJournalData();
  }
}

export function saveJournalData(data: JournalDataV1, userId: string | null): void {
  if (typeof window === "undefined" || !userId) return;
  window.localStorage.setItem(
    journalStorageKeyForUser(userId),
    JSON.stringify({
      ...data,
      lastSavedAt: nowIso(),
    })
  );
}

