import {
  createEmptyJournalData,
  JOURNAL_SCHEMA_VERSION,
  nowIso,
} from "@/lib/journal/reducer";
import { assignMissingCompareLabelSlots } from "@/lib/journal/assign-missing-label-slots";
import { dedupeLegacyFundedConvertClones } from "@/lib/journal/dedupe-legacy-fund-convert";
import type { JournalDataV1 } from "@/lib/journal/types";
import {
  getWorkspaceJournalMemory,
  setWorkspaceJournalMemory,
} from "@/lib/journal/workspace-memory-cache";

/** Legacy single-tenant key — utilisé uniquement pour migration one-shot puis suppression. */
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

/** Lit le cache mémoire (hydraté depuis Supabase au bootstrap). */
export function loadJournalData(userId: string | null): JournalDataV1 {
  if (typeof window === "undefined" || !userId) return createEmptyJournalData();
  const mem = getWorkspaceJournalMemory(userId);
  if (mem) return mem;
  return createEmptyJournalData();
}

/** Met à jour le cache mémoire uniquement (pas de localStorage métier). */
export function saveJournalData(data: JournalDataV1, userId: string | null): void {
  if (typeof window === "undefined" || !userId) return;
  setWorkspaceJournalMemory(userId, {
    ...data,
    lastSavedAt: nowIso(),
  });
}

/** Migration : chaîne brute localStorage (clé scopée ou legacy), sans toucher au cache mémoire. */
export function peekJournalLocalStorageRaw(userId: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    const scoped = journalStorageKeyForUser(userId);
    let raw = window.localStorage.getItem(scoped);
    if (!raw) raw = window.localStorage.getItem(LEGACY_JOURNAL_STORAGE_KEY);
    return raw;
  } catch {
    return null;
  }
}

export function parseJournalFromStorageRaw(raw: string): JournalDataV1 | null {
  try {
    const parsed = JSON.parse(raw) as unknown;
    const coerced = coerceJournalData(parsed);
    if (!coerced) return null;
    return assignMissingCompareLabelSlots(dedupeLegacyFundedConvertClones(coerced));
  } catch {
    return null;
  }
}

/** Supprime les anciennes clés journal métier (après migration ou chargement Supabase). */
export function clearJournalBusinessLocalStorageKeys(userId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(journalStorageKeyForUser(userId));
    window.localStorage.removeItem(LEGACY_JOURNAL_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
