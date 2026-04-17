import { DEFAULT_ACCOUNTS_LIMIT } from "@/lib/auth/constants";
import type { UserProfileRow } from "@/lib/auth/profile";
import { getEffectiveAccountsCap, isPremiumPaidActive, isTrialActive } from "@/lib/auth/plan";
import type { JournalAction } from "@/lib/journal/reducer";
import type { JournalDataV1, JournalId, JournalPnlEntry } from "@/lib/journal/types";

const STORAGE_PREFIX = "mytradedesk:lite-editable-ids:v1:user:";

type StoredSelection = {
  version: 1;
  accountIds: [JournalId, JournalId];
};

function storageKey(userId: string): string {
  return `${STORAGE_PREFIX}${userId}`;
}

export function loadLiteEditablePair(userId: string | null): [JournalId, JournalId] | null {
  if (typeof window === "undefined" || !userId) return null;
  try {
    const raw = window.localStorage.getItem(storageKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    const o = parsed as Partial<StoredSelection>;
    if (o.version !== 1 || !Array.isArray(o.accountIds) || o.accountIds.length !== 2) return null;
    const [a, b] = o.accountIds;
    if (typeof a !== "string" || typeof b !== "string" || a === b) return null;
    return [a, b];
  } catch {
    return null;
  }
}

export function saveLiteEditablePair(userId: string | null, pair: [JournalId, JournalId]): void {
  if (typeof window === "undefined" || !userId) return;
  const payload: StoredSelection = { version: 1, accountIds: pair };
  window.localStorage.setItem(storageKey(userId), JSON.stringify(payload));
}

/**
 * When plan caps accounts (Lite) but the user has more accounts than allowed,
 * they must pick exactly two editable accounts. Selection is stored locally and cannot be changed later.
 */
export function needsLiteAccountSelection(
  profile: UserProfileRow | null,
  accountIds: string[],
  userId: string | null,
  now: Date = new Date()
): boolean {
  if (!userId || !profile) return false;
  if (isPremiumPaidActive(profile) || isTrialActive(profile, now)) return false;
  const cap = getEffectiveAccountsCap(profile, now);
  if (accountIds.length <= cap) return false;
  if (cap > DEFAULT_ACCOUNTS_LIMIT) return false;
  const pair = loadLiteEditablePair(userId);
  if (!pair) return true;
  const set = new Set(accountIds);
  const aOk = set.has(pair[0]);
  const bOk = set.has(pair[1]);
  if (aOk && bOk) return false;
  /* One or both picks were deleted — no second selection; partial is allowed. */
  if (aOk || bOk) return false;
  /* Stored pair no longer exists at all — require a fresh pick. */
  return true;
}

/** `null` = every account editable. */
export function getLiteEditableAccountSet(
  profile: UserProfileRow | null,
  accountIds: string[],
  userId: string | null,
  now: Date = new Date()
): Set<string> | null {
  if (!userId || !profile) return null;
  if (isPremiumPaidActive(profile) || isTrialActive(profile, now)) return null;
  const cap = getEffectiveAccountsCap(profile, now);
  if (accountIds.length <= cap) return null;
  if (cap > DEFAULT_ACCOUNTS_LIMIT) return null;
  const pair = loadLiteEditablePair(userId);
  if (!pair) return new Set();
  const set = new Set(accountIds);
  const out = new Set<string>();
  if (set.has(pair[0])) out.add(pair[0]);
  if (set.has(pair[1])) out.add(pair[1]);
  return out;
}

export function isAccountEditable(
  accountId: string,
  profile: UserProfileRow | null,
  accountIds: string[],
  userId: string | null,
  now: Date = new Date()
): boolean {
  const restricted = getLiteEditableAccountSet(profile, accountIds, userId, now);
  if (restricted === null) return true;
  if (restricted.size === 0) return false;
  return restricted.has(accountId);
}

export const LITE_ACCOUNT_READ_ONLY_EVENT = "mtd-lite-account-read-only";

function entryAccountId(state: JournalDataV1, entryId: JournalId, map: "fee" | "payout"): JournalId | null {
  const e =
    map === "fee" ? state.feeEntries[entryId] : state.payoutEntries[entryId];
  return e?.accountId ?? null;
}

/** Returns true if the action should be applied; false if blocked (read-only). */
export function isJournalActionAllowedForLiteLock(
  action: JournalAction,
  state: JournalDataV1,
  editable: Set<string> | null
): boolean {
  if (editable === null) return true;

  const ok = (accountId: string) => editable.has(accountId);

  switch (action.type) {
    case "journal/hydrate":
    case "ui/set":
    case "ui/reset":
      return true;

    case "account/delete":
      return true;

    case "account/upsert": {
      const id = action.payload.id;
      if (state.accounts[id]) return ok(id);
      return true;
    }

    case "account/archive":
      return ok(action.payload.accountId);

    case "pnl/upsert":
      return ok(action.payload.accountId);

    case "pnl/delete": {
      const e = state.pnlEntries[action.payload.entryId];
      return e ? ok(e.accountId) : true;
    }

    case "pnl/syncFromTrades": {
      for (const id of action.payload.deleteIds) {
        const e = state.pnlEntries[id];
        if (e && !ok(e.accountId)) return false;
      }
      for (const u of action.payload.upserts) {
        if (!ok(u.accountId)) return false;
      }
      return true;
    }

    case "fee/upsert":
      return ok(action.payload.accountId);

    case "fee/delete": {
      const aid = entryAccountId(state, action.payload.entryId, "fee");
      return aid ? ok(aid) : true;
    }

    case "payout/upsert":
      return ok(action.payload.accountId);

    case "payout/delete": {
      const aid = entryAccountId(state, action.payload.entryId, "payout");
      return aid ? ok(aid) : true;
    }

    default:
      return true;
  }
}

export function filterPnlSyncForEditableAccounts(
  payload: { deleteIds: JournalId[]; upserts: JournalPnlEntry[] },
  state: JournalDataV1,
  editable: Set<string> | null
): { deleteIds: JournalId[]; upserts: JournalPnlEntry[] } {
  if (editable === null) return payload;

  const deleteIds = payload.deleteIds.filter((id) => {
    const e = state.pnlEntries[id];
    if (!e) return false;
    return editable.has(e.accountId);
  });
  const upserts = payload.upserts.filter((u) => editable.has(u.accountId));

  return { deleteIds, upserts };
}
