"use client";

/**
 * Shared helpers around the Rithmic-side of the sandbox connections store.
 *
 * The source of truth for the row list is `localStorage`, written by
 * `SandboxIntegrations` (under `SANDBOX_CONNECTIONS_STORAGE_KEY`). This module
 * lets other features (notably the Progress view's "Sync now" button) read
 * those rows, look up Rithmic ↔ journal-account links, and re-trigger a sync
 * without going back to Settings.
 *
 * Password handling:
 * - When the user opted into "Remember password", the password is in the row
 *   itself (plaintext localStorage — dev-sandbox only).
 * - Otherwise, we keep an in-tab `sessionStorage` cache so a sync from
 *   Progress (after typing the password once during this session) doesn't
 *   require re-entering it on every click. sessionStorage clears on tab
 *   close, which is the intentional security trade-off for the dev sandbox.
 *
 * Notifications:
 * - In-tab updates broadcast a custom `mtd-sandbox-connections-changed`
 *   event so React subscribers refresh.
 * - Cross-tab updates already go through the native `storage` event.
 */

import { useCallback, useEffect, useState } from "react";
import {
  SANDBOX_CONNECTIONS_STORAGE_KEY,
  type SandboxConnectionRow,
  type SandboxDiscoveredAccount,
} from "./sandbox-connection-catalog";

const SESSION_PASSWORDS_KEY = "mtd-desk-sandbox-rithmic-passwords-v1";
const CHANGE_EVENT = "mtd-sandbox-connections-changed";

// ---------------------------------------------------------------------------
// Change notifications
// ---------------------------------------------------------------------------

/** Broadcast that the sandbox connections list changed (in this tab). */
export function notifySandboxConnectionsChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

// ---------------------------------------------------------------------------
// Session password cache (sessionStorage)
// ---------------------------------------------------------------------------

function loadSessionPasswords(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = sessionStorage.getItem(SESSION_PASSWORDS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === "object") {
      return parsed as Record<string, string>;
    }
    return {};
  } catch {
    return {};
  }
}

function saveSessionPasswords(map: Record<string, string>): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(SESSION_PASSWORDS_KEY, JSON.stringify(map));
  } catch {
    // sessionStorage quota / private mode — silently ignore.
  }
}

/** Cache the password for a row in this tab's sessionStorage. */
export function setRithmicSessionPassword(rowId: string, password: string): void {
  if (!rowId || !password) return;
  const m = loadSessionPasswords();
  m[rowId] = password;
  saveSessionPasswords(m);
}

/** Read the cached session password for a row, if any. */
export function getRithmicSessionPassword(rowId: string): string | undefined {
  const m = loadSessionPasswords();
  return m[rowId];
}

/** Clear cached password (for one row, or all rows when `rowId` is omitted). */
export function clearRithmicSessionPassword(rowId?: string): void {
  if (typeof window === "undefined") return;
  if (rowId == null) {
    try {
      sessionStorage.removeItem(SESSION_PASSWORDS_KEY);
    } catch {
      // ignore
    }
    return;
  }
  const m = loadSessionPasswords();
  delete m[rowId];
  saveSessionPasswords(m);
}

// ---------------------------------------------------------------------------
// Row reading (localStorage)
// ---------------------------------------------------------------------------

function loadRowsFromStorage(): SandboxConnectionRow[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(SANDBOX_CONNECTIONS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    // We don't deeply validate here: SandboxIntegrations is the source of
    // truth and writes well-formed rows.
    return parsed as SandboxConnectionRow[];
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Link lookup
// ---------------------------------------------------------------------------

export type RithmicLinkInfo = {
  rowId: string;
  rowName: string;
  /** Connection username (for display in re-prompt modals). */
  rowUsername: string;
  rithmicAccountId: string;
  rithmicAccountName: string;
  /** ISO timestamp of the last successful sync of this account, if any. */
  lastSyncAt?: string;
  lastUniqueUserId?: string;
  /** True if a password is available to sync without re-prompting the user. */
  hasPassword: boolean;
};

/** Internal: compute whether a password is available for this row right now. */
function rowHasUsablePassword(row: SandboxConnectionRow): boolean {
  if (row.rememberPassword && typeof row.password === "string" && row.password.length > 0) {
    return true;
  }
  const cached = getRithmicSessionPassword(row.id);
  return typeof cached === "string" && cached.length > 0;
}

/**
 * React hook returning the current rows + a helper to look up the Rithmic link
 * (if any) for a journal account id. Subscribes to in-tab and cross-tab
 * change events.
 */
export function useSandboxRithmicLinks(): {
  rows: SandboxConnectionRow[];
  getLinkForJournalAccount: (journalAccountId: string) => RithmicLinkInfo | null;
  refresh: () => void;
} {
  const [rows, setRows] = useState<SandboxConnectionRow[]>([]);

  useEffect(() => {
    setRows(loadRowsFromStorage());
    if (typeof window === "undefined") return;
    const onChange = () => setRows(loadRowsFromStorage());
    const onStorage = (e: StorageEvent) => {
      if (e.key === SANDBOX_CONNECTIONS_STORAGE_KEY) onChange();
    };
    window.addEventListener(CHANGE_EVENT, onChange);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(CHANGE_EVENT, onChange);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const refresh = useCallback(() => setRows(loadRowsFromStorage()), []);

  const getLinkForJournalAccount = useCallback(
    (journalAccountId: string): RithmicLinkInfo | null => {
      if (!journalAccountId) return null;
      for (const r of rows) {
        if (r.broker !== "rithmic") continue;
        for (const a of r.discoveredAccounts ?? []) {
          if (a.linkedJournalAccountId === journalAccountId) {
            return {
              rowId: r.id,
              rowName: r.name,
              rowUsername: r.username,
              rithmicAccountId: a.accountId,
              rithmicAccountName: a.accountName,
              lastSyncAt: a.syncedAt ?? r.lastSyncAt,
              lastUniqueUserId: r.lastUniqueUserId,
              hasPassword: rowHasUsablePassword(r),
            };
          }
        }
      }
      return null;
    },
    [rows]
  );

  return { rows, getLinkForJournalAccount, refresh };
}

// ---------------------------------------------------------------------------
// Trigger sync (writes back to localStorage and broadcasts)
// ---------------------------------------------------------------------------

export type TriggerSyncOutcome = {
  ok: boolean;
  message: string;
  /** True when no password is available — caller should prompt the user. */
  passwordRequired?: boolean;
  /** Number of accounts returned by Rithmic on success. */
  syncedAccountsCount?: number;
};

type ConnectApiAccount = {
  accountId: string;
  accountName: string;
  accountCurrency?: string;
  fcmId?: string;
  ibId?: string;
  autoLiquidate?: string;
  autoLiqThreshold?: string;
};

/**
 * Trigger a sync for a Rithmic row, from anywhere in the app.
 *
 * - Looks up the row by id from localStorage.
 * - Picks the password from `args.password`, then `row.password` (if
 *   rememberPassword), then sessionStorage. If nothing is available, returns
 *   `{ ok: false, passwordRequired: true }`.
 * - On success, rewrites the row in localStorage with fresh
 *   `discoveredAccounts` (preserving each `linkedJournalAccountId`) and
 *   stamps `lastSyncAt` / `lastUniqueUserId`.
 * - Always broadcasts via `notifySandboxConnectionsChanged()`.
 */
export async function triggerRithmicSync(args: {
  rowId: string;
  /** Optional explicit password from a re-prompt. Cached to sessionStorage when provided. */
  password?: string;
}): Promise<TriggerSyncOutcome> {
  if (typeof window === "undefined") {
    return { ok: false, message: "Not available server-side." };
  }

  const rows = loadRowsFromStorage();
  const row = rows.find((r) => r.id === args.rowId);
  if (!row) return { ok: false, message: "Connection not found." };
  if (row.broker !== "rithmic") {
    return { ok: false, message: "Not a Rithmic connection." };
  }

  const password =
    args.password ??
    (row.rememberPassword ? row.password : undefined) ??
    getRithmicSessionPassword(args.rowId);

  if (!password) {
    return {
      ok: false,
      passwordRequired: true,
      message: "Password required to sync.",
    };
  }

  if (args.password) {
    setRithmicSessionPassword(args.rowId, args.password);
  }

  let res: Response;
  try {
    res = await fetch("/api/dev/rithmic/connect", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        user: row.username,
        password,
        systemName: row.server,
      }),
    });
  } catch (e) {
    persistRowUpdate(args.rowId, (r) => ({ ...r, status: "error" as const }));
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, message: `Network error — ${message}` };
  }

  const data = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    uniqueUserId?: string;
    rpCode?: string[];
    error?: string;
    stage?: string;
    accounts?: ConnectApiAccount[];
  };

  if (!res.ok || !data.ok) {
    persistRowUpdate(args.rowId, (r) => ({ ...r, status: "error" as const }));
    const rp = (data.rpCode ?? []).join(" | ");
    const stage = data.stage ? ` at ${data.stage}` : "";
    const reason = data.error ? ` — ${data.error}` : "";
    const rpInfo = rp ? ` (rpCode ${rp})` : "";
    return { ok: false, message: `Sync failed${stage}${rpInfo}${reason}.` };
  }

  const now = new Date().toISOString();
  const incoming = Array.isArray(data.accounts) ? data.accounts : [];

  persistRowUpdate(args.rowId, (r) => {
    const previousLinks = new Map<string, string | undefined>(
      (r.discoveredAccounts ?? []).map((a) => [a.accountId, a.linkedJournalAccountId])
    );
    const refreshed: SandboxDiscoveredAccount[] = incoming.map((a) => ({
      accountId: a.accountId,
      accountName: a.accountName,
      accountCurrency: a.accountCurrency,
      fcmId: a.fcmId,
      ibId: a.ibId,
      autoLiquidate: a.autoLiquidate,
      autoLiqThreshold: a.autoLiqThreshold,
      syncedAt: now,
      linkedJournalAccountId: previousLinks.get(a.accountId),
    }));
    return {
      ...r,
      status: "connected" as const,
      discoveredAccounts: refreshed,
      lastSyncAt: now,
      lastUniqueUserId: data.uniqueUserId ?? r.lastUniqueUserId,
    };
  });

  return {
    ok: true,
    syncedAccountsCount: incoming.length,
    message: "Synced",
  };
}

/**
 * Mutate one row in localStorage (mirroring the password-persistence policy
 * used by `SandboxIntegrations.saveToStorage`) and broadcast the change.
 */
function persistRowUpdate(
  rowId: string,
  updater: (r: SandboxConnectionRow) => SandboxConnectionRow
): void {
  if (typeof window === "undefined") return;
  const rows = loadRowsFromStorage();
  let changed = false;
  const next = rows.map((r) => {
    if (r.id !== rowId) return r;
    changed = true;
    return updater(r);
  });
  if (!changed) return;
  const storable = next.map((r) => {
    if (r.rememberPassword && typeof r.password === "string" && r.password.length > 0) {
      return r;
    }
    const { password: _p, ...rest } = r;
    return rest;
  });
  try {
    localStorage.setItem(SANDBOX_CONNECTIONS_STORAGE_KEY, JSON.stringify(storable));
    notifySandboxConnectionsChanged();
  } catch {
    // ignore quota errors
  }
}

// ---------------------------------------------------------------------------
// Misc helpers
// ---------------------------------------------------------------------------

/**
 * Format an ISO timestamp as a relative "just now" / "X min ago" string.
 * Returns null when the input is missing/invalid.
 */
export function formatRelativeFromIso(iso: string | undefined): string | null {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return null;
  const diffMs = Date.now() - then;
  if (diffMs < 0) return "just now";
  const sec = Math.floor(diffMs / 1000);
  if (sec < 30) return "just now";
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  return `${day}d ago`;
}
