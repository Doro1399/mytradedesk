import {
  createEmptyJournalData,
  JOURNAL_SCHEMA_VERSION,
  nowIso,
} from "@/lib/journal/reducer";
import { assignMissingCompareLabelSlots } from "@/lib/journal/assign-missing-label-slots";
import { dedupeLegacyFundedConvertClones } from "@/lib/journal/dedupe-legacy-fund-convert";
import type { JournalDataV1 } from "@/lib/journal/types";

export const JOURNAL_STORAGE_KEY = "prop-control-center:v1";

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

export function loadJournalData(): JournalDataV1 {
  if (typeof window === "undefined") return createEmptyJournalData();
  try {
    const raw = window.localStorage.getItem(JOURNAL_STORAGE_KEY);
    if (!raw) return createEmptyJournalData();
    const parsed = JSON.parse(raw) as unknown;
    const coerced = coerceJournalData(parsed) ?? createEmptyJournalData();
    return assignMissingCompareLabelSlots(dedupeLegacyFundedConvertClones(coerced));
  } catch {
    return createEmptyJournalData();
  }
}

export function saveJournalData(data: JournalDataV1): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    JOURNAL_STORAGE_KEY,
    JSON.stringify({
      ...data,
      lastSavedAt: nowIso(),
    })
  );
}

