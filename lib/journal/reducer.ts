import type {
  JournalAccount,
  JournalDataV1,
  JournalFeeEntry,
  JournalId,
  JournalPayoutEntry,
  JournalPnlEntry,
  JournalUiState,
} from "@/lib/journal/types";

export const JOURNAL_SCHEMA_VERSION = 1 as const;

export function nowIso(): string {
  return new Date().toISOString();
}

export function createEmptyJournalData(): JournalDataV1 {
  return {
    schemaVersion: JOURNAL_SCHEMA_VERSION,
    lastSavedAt: nowIso(),
    accounts: {},
    pnlEntries: {},
    feeEntries: {},
    payoutEntries: {},
    ui: {},
  };
}

function touch<T extends { updatedAt: string }>(item: T): T {
  return { ...item, updatedAt: nowIso() };
}

export type JournalAction =
  | { type: "journal/hydrate"; payload: JournalDataV1 }
  | { type: "account/upsert"; payload: JournalAccount }
  | { type: "account/archive"; payload: { accountId: JournalId; archived: boolean } }
  | { type: "account/delete"; payload: { accountId: JournalId } }
  | { type: "pnl/upsert"; payload: JournalPnlEntry }
  | /** Suppressions + mises à jour trade-sync en une transition (évite états incohérents entre plusieurs dispatch). */
    { type: "pnl/syncFromTrades"; payload: { deleteIds: JournalId[]; upserts: JournalPnlEntry[] } }
  | { type: "pnl/delete"; payload: { entryId: JournalId } }
  | { type: "fee/upsert"; payload: JournalFeeEntry }
  | { type: "fee/delete"; payload: { entryId: JournalId } }
  | { type: "payout/upsert"; payload: JournalPayoutEntry }
  | { type: "payout/delete"; payload: { entryId: JournalId } }
  | { type: "ui/set"; payload: Partial<JournalUiState> }
  | { type: "ui/reset" };

export function journalReducer(state: JournalDataV1, action: JournalAction): JournalDataV1 {
  switch (action.type) {
    case "journal/hydrate":
      return {
        ...action.payload,
        lastSavedAt: nowIso(),
      };

    case "account/upsert": {
      const payload = touch(action.payload);
      return {
        ...state,
        accounts: {
          ...state.accounts,
          [payload.id]: payload,
        },
        lastSavedAt: nowIso(),
      };
    }

    case "account/archive": {
      const existing = state.accounts[action.payload.accountId];
      if (!existing) return state;
      return {
        ...state,
        accounts: {
          ...state.accounts,
          [existing.id]: touch({
            ...existing,
            isArchived: action.payload.archived,
            status: action.payload.archived ? "archived" : existing.status,
          }),
        },
        lastSavedAt: nowIso(),
      };
    }

    case "account/delete": {
      const remainingAccounts = { ...state.accounts };
      delete remainingAccounts[action.payload.accountId];
      const remainingPnl = Object.fromEntries(
        Object.entries(state.pnlEntries).filter(([, e]) => e.accountId !== action.payload.accountId)
      );
      const remainingFees = Object.fromEntries(
        Object.entries(state.feeEntries).filter(([, e]) => e.accountId !== action.payload.accountId)
      );
      const remainingPayouts = Object.fromEntries(
        Object.entries(state.payoutEntries).filter(([, e]) => e.accountId !== action.payload.accountId)
      );
      return {
        ...state,
        accounts: remainingAccounts,
        pnlEntries: remainingPnl,
        feeEntries: remainingFees,
        payoutEntries: remainingPayouts,
        lastSavedAt: nowIso(),
      };
    }

    case "pnl/upsert": {
      const payload = touch(action.payload);
      return {
        ...state,
        pnlEntries: {
          ...state.pnlEntries,
          [payload.id]: payload,
        },
        lastSavedAt: nowIso(),
      };
    }

    case "pnl/syncFromTrades": {
      const { deleteIds, upserts } = action.payload;
      if (deleteIds.length === 0 && upserts.length === 0) return state;
      const drop = new Set(deleteIds);
      const next: Record<JournalId, JournalPnlEntry> = {};
      for (const [id, e] of Object.entries(state.pnlEntries)) {
        if (drop.has(id)) continue;
        next[id] = e;
      }
      for (const e of upserts) {
        const p = touch(e);
        next[p.id] = p;
      }
      return {
        ...state,
        pnlEntries: next,
        lastSavedAt: nowIso(),
      };
    }

    case "pnl/delete": {
      const remaining = { ...state.pnlEntries };
      delete remaining[action.payload.entryId];
      return {
        ...state,
        pnlEntries: remaining,
        lastSavedAt: nowIso(),
      };
    }

    case "fee/upsert": {
      const payload = touch(action.payload);
      return {
        ...state,
        feeEntries: {
          ...state.feeEntries,
          [payload.id]: payload,
        },
        lastSavedAt: nowIso(),
      };
    }

    case "fee/delete": {
      const remaining = { ...state.feeEntries };
      delete remaining[action.payload.entryId];
      return {
        ...state,
        feeEntries: remaining,
        lastSavedAt: nowIso(),
      };
    }

    case "payout/upsert": {
      const payload = touch(action.payload);
      return {
        ...state,
        payoutEntries: {
          ...state.payoutEntries,
          [payload.id]: payload,
        },
        lastSavedAt: nowIso(),
      };
    }

    case "payout/delete": {
      const remaining = { ...state.payoutEntries };
      delete remaining[action.payload.entryId];
      return {
        ...state,
        payoutEntries: remaining,
        lastSavedAt: nowIso(),
      };
    }

    case "ui/set":
      return {
        ...state,
        ui: {
          ...state.ui,
          ...action.payload,
        },
      };

    case "ui/reset":
      return {
        ...state,
        ui: {},
      };

    default:
      return state;
  }
}

