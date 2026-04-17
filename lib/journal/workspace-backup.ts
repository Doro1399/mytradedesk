import {
  createEmptyJournalData,
  JOURNAL_SCHEMA_VERSION,
  nowIso,
} from "@/lib/journal/reducer";
import { assignMissingCompareLabelSlots } from "@/lib/journal/assign-missing-label-slots";
import { dedupeLegacyFundedConvertClones } from "@/lib/journal/dedupe-legacy-fund-convert";
import type { JournalDataV1 } from "@/lib/journal/types";
import { emptyTradesStore, type TradesStoreV1 } from "@/lib/journal/trades-storage";

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function journalFromUnknown(raw: unknown): JournalDataV1 | null {
  if (!isObject(raw)) return null;
  if (raw.schemaVersion !== JOURNAL_SCHEMA_VERSION) return null;
  const accounts = isObject(raw.accounts) ? raw.accounts : null;
  const pnlEntries = isObject(raw.pnlEntries) ? raw.pnlEntries : null;
  const feeEntries = isObject(raw.feeEntries) ? raw.feeEntries : null;
  const payoutEntries = isObject(raw.payoutEntries) ? raw.payoutEntries : null;
  const ui = isObject(raw.ui) ? raw.ui : {};
  if (!accounts || !pnlEntries || !feeEntries || !payoutEntries) return null;
  const coerced: JournalDataV1 = {
    schemaVersion: JOURNAL_SCHEMA_VERSION,
    lastSavedAt: typeof raw.lastSavedAt === "string" ? raw.lastSavedAt : nowIso(),
    accounts: accounts as JournalDataV1["accounts"],
    pnlEntries: pnlEntries as JournalDataV1["pnlEntries"],
    feeEntries: feeEntries as JournalDataV1["feeEntries"],
    payoutEntries: payoutEntries as JournalDataV1["payoutEntries"],
    ui: ui as JournalDataV1["ui"],
  };
  return assignMissingCompareLabelSlots(dedupeLegacyFundedConvertClones(coerced));
}

function parseModalNetMap(raw: unknown): Record<string, number> | undefined {
  if (!isObject(raw)) return undefined;
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (typeof v === "number" && Number.isFinite(v)) out[k] = v;
  }
  return Object.keys(out).length ? out : undefined;
}

function parseModalDailyMap(raw: unknown): Record<string, Record<string, number>> | undefined {
  if (!isObject(raw)) return undefined;
  const out: Record<string, Record<string, number>> = {};
  for (const [acc, inner] of Object.entries(raw)) {
    if (!isObject(inner)) continue;
    const dm: Record<string, number> = {};
    for (const [date, v] of Object.entries(inner)) {
      if (typeof v === "number" && Number.isFinite(v)) dm[date] = v;
    }
    if (Object.keys(dm).length) out[acc] = dm;
  }
  return Object.keys(out).length ? out : undefined;
}

function tradesStoreFromUnknown(raw: unknown): TradesStoreV1 | null {
  if (!isObject(raw) || raw.schemaVersion !== 1) return null;
  const trades = raw.trades;
  if (!Array.isArray(trades)) return null;
  return {
    schemaVersion: 1,
    trades: trades as TradesStoreV1["trades"],
    lastImportAt: typeof raw.lastImportAt === "string" ? raw.lastImportAt : undefined,
    csvModalNetByAccount: parseModalNetMap(raw.csvModalNetByAccount),
    csvModalDailyByAccount: parseModalDailyMap(raw.csvModalDailyByAccount),
  };
}

export type WorkspaceBackupParseResult =
  | { ok: true; journal: JournalDataV1; tradesStore: TradesStoreV1; backupUserId: string | null }
  | { ok: false; error: string };

/**
 * Validates a JSON object from “Export backup” (`mytradedesk-workspace-backup` v1).
 */
export function parseWorkspaceBackupJson(parsed: unknown): WorkspaceBackupParseResult {
  if (!isObject(parsed)) return { ok: false, error: "Invalid file: expected a JSON object." };
  if (parsed.format !== "mytradedesk-workspace-backup") {
    return { ok: false, error: "Unrecognized backup format." };
  }
  if (parsed.version !== 1) {
    return { ok: false, error: `Unsupported backup version: ${String(parsed.version)}` };
  }
  const journal = journalFromUnknown(parsed.journal);
  if (!journal) return { ok: false, error: "Invalid or missing journal data in backup." };
  const tradesRaw = tradesStoreFromUnknown(parsed.tradesStore);
  const tradesStore = tradesRaw ?? emptyTradesStore();
  const backupUserId = typeof parsed.userId === "string" ? parsed.userId : null;
  return { ok: true, journal, tradesStore, backupUserId };
}
