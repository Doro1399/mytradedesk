"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  SANDBOX_CONNECTIONS_STORAGE_KEY,
  type SandboxBrokerId,
  type SandboxConnectionRow,
  type SandboxConnectionStatus,
  type SandboxDiscoveredAccount,
} from "@/lib/dev/sandbox-connection-catalog";
import { SandboxConnectionModal } from "@/components/desk/sandbox-connection-modal";
import {
  RithmicLinkAccountModal,
  type RithmicCreateJournalAccountPayload,
} from "@/components/desk/rithmic-link-account-modal";
import {
  RithmicUnlinkAccountModal,
  type RithmicUnlinkContext,
} from "@/components/desk/rithmic-unlink-account-modal";
import {
  SandboxConnectionDeleteModal,
  type SandboxDeleteContext,
} from "@/components/desk/sandbox-connection-delete-modal";
import { useJournal } from "@/components/journal/journal-provider";
import {
  clearRithmicSessionPassword,
  notifySandboxConnectionsChanged,
  setRithmicSessionPassword,
} from "@/lib/dev/sandbox-rithmic-links";
import { platformLogoSrc } from "@/lib/platforms";
import type { JournalAccount } from "@/lib/journal/types";

/** Rithmic artwork (copied to `public/rithmic-attribution/` for Next.js). */
const POWERED_BY_OMNE_SRC = "/rithmic-attribution/powered-by-omne.png";
const TRADING_PLATFORM_BY_RITHMIC_SRC = "/rithmic-attribution/trading-platform-by-rithmic.png";
/** Optional wide strip on the Integrations card only (alongside TP + OMNE). */
const RITHMIC_MARKET_DATA_BANNER_SRC = "/brands/rithmic-market-data-banner.png";

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `sc-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function parseDiscoveredAccounts(raw: unknown): SandboxDiscoveredAccount[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const out: SandboxDiscoveredAccount[] = [];
  for (const a of raw) {
    if (!a || typeof a !== "object") continue;
    const o = a as Record<string, unknown>;
    const accountId = typeof o.accountId === "string" ? o.accountId : "";
    const accountName = typeof o.accountName === "string" ? o.accountName : "";
    if (!accountId || !accountName) continue;
    out.push({
      accountId,
      accountName,
      accountCurrency: typeof o.accountCurrency === "string" ? o.accountCurrency : undefined,
      fcmId: typeof o.fcmId === "string" ? o.fcmId : undefined,
      ibId: typeof o.ibId === "string" ? o.ibId : undefined,
      autoLiquidate: typeof o.autoLiquidate === "string" ? o.autoLiquidate : undefined,
      autoLiqThreshold: typeof o.autoLiqThreshold === "string" ? o.autoLiqThreshold : undefined,
      syncedAt: typeof o.syncedAt === "string" ? o.syncedAt : new Date().toISOString(),
      balance: typeof o.balance === "number" ? o.balance : undefined,
      livePnl: typeof o.livePnl === "number" ? o.livePnl : undefined,
      linkedJournalAccountId:
        typeof o.linkedJournalAccountId === "string" ? o.linkedJournalAccountId : undefined,
    });
  }
  return out;
}

function loadFromStorage(): SandboxConnectionRow[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(SANDBOX_CONNECTIONS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((r): r is Record<string, unknown> => r != null && typeof r === "object")
      .map((r) => {
        const rememberPassword = Boolean(r.rememberPassword);
        const storedPassword =
          rememberPassword && typeof r.password === "string" && r.password.length > 0
            ? r.password
            : undefined;
        return {
          id: String(r.id ?? newId()),
          broker: r.broker === "ninjatrader" ? "ninjatrader" : "rithmic",
          name: String(r.name ?? ""),
          username: String(r.username ?? ""),
          password: storedPassword,
          rememberPassword,
          server: String(r.server ?? ""),
          area: String(r.area ?? ""),
          // We never restore the row to "connected" on hydration: the WS session is gone.
          // Empreinte is preserved separately in `discoveredAccounts` / `lastSyncAt`.
          status: (["error"].includes(String(r.status))
            ? r.status
            : "disconnected") as SandboxConnectionStatus,
          autoConnectOnStartup: Boolean(r.autoConnectOnStartup),
          discoveredAccounts: parseDiscoveredAccounts(r.discoveredAccounts),
          lastSyncAt: typeof r.lastSyncAt === "string" ? r.lastSyncAt : undefined,
          lastUniqueUserId: typeof r.lastUniqueUserId === "string" ? r.lastUniqueUserId : undefined,
        };
      });
  } catch {
    return [];
  }
}

function saveToStorage(rows: SandboxConnectionRow[]) {
  const storable = rows.map((r) => {
    if (r.rememberPassword && typeof r.password === "string" && r.password.length > 0) {
      // Persist password ONLY when the user opted in. Plaintext, dev sandbox only.
      return r;
    }
    const { password: _p, ...rest } = r;
    return rest;
  });
  localStorage.setItem(SANDBOX_CONNECTIONS_STORAGE_KEY, JSON.stringify(storable));
}

function formatRelativeFromNow(iso: string): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "";
  const diffMs = Date.now() - then;
  if (diffMs < 0) return "just now";
  const sec = Math.floor(diffMs / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  return `${day}d ago`;
}

function StatusCell({ status }: { status: SandboxConnectionStatus }) {
  if (status === "connected") {
    return <span className="text-emerald-300/95">Connected</span>;
  }
  if (status === "error") {
    return <span className="text-red-300/95">Error</span>;
  }
  return <span className="text-white/45">Disconnected</span>;
}

type ConnectAccount = {
  accountId: string;
  accountName: string;
  accountCurrency?: string;
  fcmId?: string;
  ibId?: string;
  autoLiquidate?: string;
  autoLiqThreshold?: string;
};

type SyncResult = { ok: boolean; message: string };

export function SandboxIntegrations() {
  const journal = useJournal();
  const journalAccounts = journal.state.accounts;
  const journalDispatch = journal.dispatch;

  const [rows, setRows] = useState<SandboxConnectionRow[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [lastResults, setLastResults] = useState<Record<string, SyncResult>>({});

  const [modalOpen, setModalOpen] = useState(false);
  const [modalBroker, setModalBroker] = useState<SandboxBrokerId>("rithmic");
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  const [modalInitial, setModalInitial] = useState<SandboxConnectionRow | null>(null);

  /** State for the Rithmic link/create-account modal. */
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [linkTarget, setLinkTarget] = useState<{ rowId: string; rithmicAccountId: string } | null>(
    null
  );

  /** State for the Rithmic unlink confirmation modal. */
  const [unlinkContext, setUnlinkContext] = useState<RithmicUnlinkContext | null>(null);

  /** State for the sandbox connection delete confirmation modal. */
  const [deleteContext, setDeleteContext] = useState<SandboxDeleteContext | null>(null);

  useEffect(() => {
    setRows(loadFromStorage());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveToStorage(rows);
    // Notify Progress (and any other tab/component) that the canonical
    // sandbox-connections list has been updated. Used by `useSandboxRithmicLinks`.
    notifySandboxConnectionsChanged();
  }, [rows, hydrated]);

  const rithmicRows = useMemo(() => rows.filter((r) => r.broker === "rithmic"), [rows]);

  const ninjaRows = useMemo(() => rows.filter((r) => r.broker === "ninjatrader"), [rows]);

  /** Set of journal account IDs already linked to *any* Rithmic discovered account. */
  const alreadyLinkedJournalIds = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) {
      for (const a of r.discoveredAccounts ?? []) {
        if (a.linkedJournalAccountId) set.add(a.linkedJournalAccountId);
      }
    }
    return set;
  }, [rows]);

  const availableJournalAccountsForLinking = useMemo(() => {
    return Object.values(journalAccounts).filter(
      (a) => !a.isArchived && !alreadyLinkedJournalIds.has(a.id)
    );
  }, [journalAccounts, alreadyLinkedJournalIds]);

  const linkTargetRow: SandboxConnectionRow | null = useMemo(() => {
    if (!linkTarget) return null;
    return rows.find((r) => r.id === linkTarget.rowId) ?? null;
  }, [linkTarget, rows]);

  const linkTargetAccount: SandboxDiscoveredAccount | null = useMemo(() => {
    if (!linkTarget || !linkTargetRow) return null;
    return (
      linkTargetRow.discoveredAccounts?.find((a) => a.accountId === linkTarget.rithmicAccountId) ??
      null
    );
  }, [linkTarget, linkTargetRow]);

  const openAdd = useCallback((broker: SandboxBrokerId) => {
    setModalBroker(broker);
    setModalMode("add");
    setModalInitial(null);
    setModalOpen(true);
  }, []);

  const openEdit = useCallback((row: SandboxConnectionRow) => {
    setModalBroker(row.broker);
    setModalMode("edit");
    setModalInitial(row);
    setModalOpen(true);
  }, []);

  const onModalSave = useCallback(
    (payload: {
      name: string;
      username: string;
      password: string;
      server: string;
      area: string;
      autoConnectOnStartup: boolean;
      rememberPassword: boolean;
    }) => {
      if (modalMode === "add") {
        const id = newId();
        const row: SandboxConnectionRow = {
          id,
          broker: modalBroker,
          name: payload.name,
          username: payload.username,
          password: payload.password,
          rememberPassword: payload.rememberPassword,
          server: payload.server,
          area: payload.area,
          status: "disconnected",
          autoConnectOnStartup: payload.autoConnectOnStartup,
        };
        // Cache the just-typed password for this tab session so the user can
        // sync from Progress without re-typing, even when rememberPassword is off.
        if (payload.password) setRithmicSessionPassword(id, payload.password);
        setRows((prev) => [...prev, row]);
        return;
      }
      if (!modalInitial) return;
      // Edit mode — cache the new password (if any) for the session.
      if (payload.password) setRithmicSessionPassword(modalInitial.id, payload.password);
      setRows((prev) =>
        prev.map((r) => {
          if (r.id !== modalInitial.id) return r;
          const next: SandboxConnectionRow = {
            ...r,
            name: payload.name,
            username: payload.username,
            server: payload.server,
            area: payload.area,
            autoConnectOnStartup: payload.autoConnectOnStartup,
            rememberPassword: payload.rememberPassword,
          };
          if (payload.password) {
            // User typed a new password — always update.
            next.password = payload.password;
          } else if (!payload.rememberPassword) {
            // User unchecked "remember" without typing a new password —
            // forget any in-memory password as well; next sync will require Edit again.
            next.password = undefined;
            clearRithmicSessionPassword(modalInitial.id);
          }
          // else: kept blank but rememberPassword is true → keep existing r.password as-is.
          return next;
        })
      );
    },
    [modalMode, modalBroker, modalInitial]
  );

  const deleteRow = useCallback(
    (id: string) => {
      const row = rows.find((r) => r.id === id);
      if (!row) return;
      const discovered = row.discoveredAccounts ?? [];
      const linked = discovered.filter(
        (a) => typeof a.linkedJournalAccountId === "string" && a.linkedJournalAccountId
      );
      setDeleteContext({
        rowId: id,
        connectionName: row.name,
        brokerLabel: row.broker === "rithmic" ? "Rithmic" : "Tradovate",
        username: row.username,
        discoveredAccountsCount: discovered.length,
        linkedAccountsCount: linked.length,
        passwordRemembered: Boolean(row.rememberPassword),
      });
    },
    [rows]
  );

  const confirmDelete = useCallback(() => {
    if (!deleteContext) return;
    const id = deleteContext.rowId;
    clearRithmicSessionPassword(id);
    setRows((prev) => prev.filter((r) => r.id !== id));
    setDeleteContext(null);
  }, [deleteContext]);

  const cancelDelete = useCallback(() => {
    setDeleteContext(null);
  }, []);

  /**
   * "Sync now" — re-login + RequestAccountList + logout (server-side closes the WS).
   *
   * On success:
   *  - status → "connected"
   *  - row.discoveredAccounts is OVERWRITTEN with the fresh snapshot (existing
   *    `linkedJournalAccountId` mapping is preserved per accountId).
   *  - row.lastSyncAt and row.lastUniqueUserId are stamped.
   *
   * On failure: status → "error", empreinte (discoveredAccounts) is left untouched.
   */
  const runSync = useCallback(
    async (id: string) => {
      const row = rows.find((r) => r.id === id);
      if (!row) return;

      if (row.broker !== "rithmic") {
        setRows((prev) =>
          prev.map((r) => (r.id === id ? { ...r, status: "connected" as const } : r))
        );
        return;
      }

      if (!row.password) {
        setLastResults((prev) => ({
          ...prev,
          [id]: {
            ok: false,
            message:
              "Password not set in this session — click Edit to enter it again before syncing.",
          },
        }));
        return;
      }

      setSyncingId(id);
      setLastResults((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });

      try {
        const res = await fetch("/api/dev/rithmic/connect", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            user: row.username,
            password: row.password,
            systemName: row.server,
          }),
        });
        const data = (await res.json().catch(() => ({}))) as {
          ok?: boolean;
          uniqueUserId?: string;
          rpCode?: string[];
          error?: string;
          stage?: string;
          accounts?: ConnectAccount[];
        };
        if (res.ok && data.ok) {
          const now = new Date().toISOString();
          const incoming: ConnectAccount[] = Array.isArray(data.accounts) ? data.accounts : [];
          setRows((prev) =>
            prev.map((r) => {
              if (r.id !== id) return r;
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
            })
          );
          const count = incoming.length;
          setLastResults((prev) => ({
            ...prev,
            [id]: {
              ok: true,
              message:
                count > 0
                  ? `Synced — ${count} account${count > 1 ? "s" : ""} retrieved.`
                  : "Synced — login OK, no accounts returned.",
            },
          }));
        } else {
          const rp = (data.rpCode ?? []).join(" | ");
          setRows((prev) =>
            prev.map((r) => (r.id === id ? { ...r, status: "error" as const } : r))
          );
          const stage = data.stage ? ` at ${data.stage}` : "";
          setLastResults((prev) => ({
            ...prev,
            [id]: {
              ok: false,
              message: `Sync failed${stage}${rp ? ` (rpCode ${rp})` : ""}${
                data.error ? ` — ${data.error}` : ""
              }.`,
            },
          }));
        }
      } catch (e) {
        setRows((prev) =>
          prev.map((r) => (r.id === id ? { ...r, status: "error" as const } : r))
        );
        const message = e instanceof Error ? e.message : String(e);
        setLastResults((prev) => ({
          ...prev,
          [id]: { ok: false, message: `Network error — ${message}` },
        }));
      } finally {
        setSyncingId(null);
      }
    },
    [rows]
  );

  /**
   * "Forget" — set the row back to disconnected. The WS is already closed (server
   * logs out after each Sync); this is mostly a UX reset. We KEEP the empreinte
   * (discoveredAccounts, lastSyncAt) so the user still sees what was last synced.
   */
  const forgetSession = useCallback((id: string) => {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: "disconnected" as const } : r))
    );
    setLastResults((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const onLinkAccountClick = useCallback((rowId: string, accountId: string) => {
    setLinkTarget({ rowId, rithmicAccountId: accountId });
    setLinkModalOpen(true);
  }, []);

  /** Update the `linkedJournalAccountId` field on the matching discovered account. */
  const setLinkOnRow = useCallback(
    (rowId: string, rithmicAccountId: string, journalAccountId: string | undefined) => {
      setRows((prev) =>
        prev.map((r) => {
          if (r.id !== rowId) return r;
          const next = (r.discoveredAccounts ?? []).map((a) =>
            a.accountId === rithmicAccountId
              ? { ...a, linkedJournalAccountId: journalAccountId }
              : a
          );
          return { ...r, discoveredAccounts: next };
        })
      );
    },
    []
  );

  const handleLinkExisting = useCallback(
    (journalAccountId: string) => {
      if (!linkTarget) return;
      setLinkOnRow(linkTarget.rowId, linkTarget.rithmicAccountId, journalAccountId);
    },
    [linkTarget, setLinkOnRow]
  );

  const handleCreateAndLink = useCallback(
    (payload: RithmicCreateJournalAccountPayload) => {
      if (!linkTarget) return;
      const t = new Date().toISOString();
      const newId =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `acc-${Date.now()}-${Math.random().toString(16).slice(2)}`;

      const sizeNominalCents = (() => {
        const raw = Number(payload.sizeLabel.replace(/[^\d]/g, ""));
        if (!Number.isFinite(raw) || raw <= 0) return 50_000_00;
        return raw * 1000 * 100;
      })();

      const propFirm = {
        id: payload.firmName.toLowerCase().replace(/\s+/g, "-"),
        name: payload.firmName,
      };

      const account: JournalAccount = {
        id: newId,
        propFirm,
        accountType: payload.accountType,
        sizeLabel: payload.sizeLabel,
        sizeNominalCents,
        startDate: payload.startDate,
        evaluationStartedDate: payload.startDate,
        status: "active",
        isArchived: false,
        rulesSnapshot:
          payload.firmName.trim().toLowerCase() === "other"
            ? { otherRulesText: {} }
            : {},
        notes: payload.notes,
        displayAccountCode: payload.accountName,
        compareProgramName: payload.programName,
        createdAt: t,
        updatedAt: t,
      };

      journalDispatch({ type: "account/upsert", payload: account });

      // Activation fee — funded only (post-eval activation cost).
      if (
        payload.program === "funded" &&
        payload.activationFeeUsd &&
        payload.activationFeeUsd > 0
      ) {
        journalDispatch({
          type: "fee/upsert",
          payload: {
            id: `${newId}-activation-fee`,
            accountId: newId,
            date: payload.startDate,
            type: "activation_fee",
            amountCents: Math.round(payload.activationFeeUsd * 100),
            currency: "USD",
            note: "Created from Rithmic link flow",
            createdAt: t,
            updatedAt: t,
          },
        });
      }

      // Evaluation fee — kept on Eval AND Funded accounts (the latter to trace the
      // eval phase the user paid for before being funded).
      if (
        (payload.program === "eval" || payload.program === "funded") &&
        payload.challengeFeeUsd &&
        payload.challengeFeeUsd > 0
      ) {
        journalDispatch({
          type: "fee/upsert",
          payload: {
            id: `${newId}-challenge-fee`,
            accountId: newId,
            date: payload.startDate,
            type: "challenge_fee",
            amountCents: Math.round(payload.challengeFeeUsd * 100),
            currency: "USD",
            note: "Created from Rithmic link flow",
            createdAt: t,
            updatedAt: t,
          },
        });
      }

      // Direct (instant funding / live broker) — single fee stored as activation_fee.
      if (
        payload.program === "direct" &&
        payload.directFeeUsd &&
        payload.directFeeUsd > 0
      ) {
        journalDispatch({
          type: "fee/upsert",
          payload: {
            id: `${newId}-direct-fee`,
            accountId: newId,
            date: payload.startDate,
            type: "activation_fee",
            amountCents: Math.round(payload.directFeeUsd * 100),
            currency: "USD",
            note: "Created from Rithmic link flow (direct funding)",
            createdAt: t,
            updatedAt: t,
          },
        });
      }

      setLinkOnRow(linkTarget.rowId, linkTarget.rithmicAccountId, newId);
    },
    [linkTarget, journalDispatch, setLinkOnRow]
  );

  const handleUnlinkAccount = useCallback(
    (rowId: string, rithmicAccountId: string) => {
      const row = rows.find((r) => r.id === rowId) ?? null;
      const account = row?.discoveredAccounts?.find((a) => a.accountId === rithmicAccountId) ?? null;
      if (!row || !account) return;
      const linkedJournal = account.linkedJournalAccountId
        ? journalAccounts[account.linkedJournalAccountId]
        : undefined;
      const journalAccountLabel = linkedJournal
        ? `${linkedJournal.propFirm.name} · ${linkedJournal.sizeLabel}`
        : "";
      setUnlinkContext({
        rowId,
        rithmicAccountId,
        rithmicAccountName: account.accountName,
        connectionName: row.name,
        journalAccountLabel,
        journalAccountMissing: Boolean(account.linkedJournalAccountId) && !linkedJournal,
      });
    },
    [rows, journalAccounts]
  );

  const confirmUnlink = useCallback(() => {
    if (!unlinkContext) return;
    setLinkOnRow(unlinkContext.rowId, unlinkContext.rithmicAccountId, undefined);
    setUnlinkContext(null);
  }, [unlinkContext, setLinkOnRow]);

  const cancelUnlink = useCallback(() => {
    setUnlinkContext(null);
  }, []);

  const handleLinkModalClose = useCallback(() => {
    setLinkModalOpen(false);
    setLinkTarget(null);
  }, []);

  return (
    <div className="space-y-8">
      <BrokerCard
        broker="rithmic"
        title="Rithmic"
        connections={rithmicRows}
        syncingId={syncingId}
        lastResults={lastResults}
        journalAccounts={journalAccounts}
        onAdd={() => openAdd("rithmic")}
        onEdit={openEdit}
        onDelete={deleteRow}
        onSync={runSync}
        onForget={forgetSession}
        onLinkAccount={onLinkAccountClick}
        onUnlinkAccount={handleUnlinkAccount}
      />
      <BrokerCard
        broker="ninjatrader"
        title="Tradovate"
        logoSrc={platformLogoSrc.tradovate!}
        connections={ninjaRows}
        syncingId={syncingId}
        lastResults={lastResults}
        journalAccounts={journalAccounts}
        onAdd={() => openAdd("ninjatrader")}
        onEdit={openEdit}
        onDelete={deleteRow}
        onSync={runSync}
        onForget={forgetSession}
        onLinkAccount={onLinkAccountClick}
        onUnlinkAccount={handleUnlinkAccount}
      />

      <SandboxConnectionModal
        open={modalOpen}
        mode={modalMode}
        broker={modalBroker}
        initial={modalInitial}
        onClose={() => setModalOpen(false)}
        onSave={onModalSave}
      />

      <RithmicLinkAccountModal
        open={linkModalOpen}
        connectionName={linkTargetRow?.name ?? ""}
        rithmicAccount={linkTargetAccount}
        availableJournalAccounts={availableJournalAccountsForLinking}
        onClose={handleLinkModalClose}
        onLinkExisting={handleLinkExisting}
        onCreateAndLink={handleCreateAndLink}
      />

      <RithmicUnlinkAccountModal
        open={unlinkContext !== null}
        context={unlinkContext}
        onClose={cancelUnlink}
        onConfirm={confirmUnlink}
      />

      <SandboxConnectionDeleteModal
        open={deleteContext !== null}
        context={deleteContext}
        onClose={cancelDelete}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

function BrokerCard({
  broker,
  title,
  logoSrc,
  showPoweredByOmne,
  connections,
  syncingId,
  lastResults,
  journalAccounts,
  onAdd,
  onEdit,
  onDelete,
  onSync,
  onForget,
  onLinkAccount,
  onUnlinkAccount,
}: {
  broker: SandboxBrokerId;
  title: string;
  logoSrc?: string;
  showPoweredByOmne?: boolean;
  connections: SandboxConnectionRow[];
  syncingId: string | null;
  lastResults: Record<string, SyncResult>;
  journalAccounts: Record<string, JournalAccount>;
  onAdd: () => void;
  onEdit: (row: SandboxConnectionRow) => void;
  onDelete: (id: string) => void;
  onSync: (id: string) => void;
  onForget: (id: string) => void;
  onLinkAccount: (rowId: string, accountId: string) => void;
  onUnlinkAccount: (rowId: string, accountId: string) => void;
}) {
  const brokerColLabel = broker === "rithmic" ? "Rithmic" : "Tradovate";

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      <div className="flex flex-col gap-4 border-b border-white/10 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        {broker === "rithmic" ? (
          <div className="flex min-w-0 flex-1 flex-col items-start gap-2">
            <Image
              src={RITHMIC_MARKET_DATA_BANNER_SRC}
              alt="Rithmic Market Data"
              width={360}
              height={50}
              className="h-[1.512rem] w-auto max-w-full object-contain object-left sm:h-[1.728rem]"
              priority
            />
            <div className="flex w-full min-w-0 flex-wrap items-center gap-x-4 gap-y-2 pl-[2px]">
              <Image
                src={TRADING_PLATFORM_BY_RITHMIC_SRC}
                alt="Trading Platform by Rithmic"
                width={220}
                height={48}
                className="h-[2.268rem] w-auto max-w-[min(100%,18rem)] object-contain object-left opacity-95 sm:h-[2.59rem] sm:max-w-[21rem]"
                priority
              />
              <Image
                src={POWERED_BY_OMNE_SRC}
                alt="Powered by OMNE"
                width={202}
                height={65}
                className="h-[1.711rem] w-auto max-w-[8rem] object-contain object-left opacity-90 sm:h-[1.996rem] sm:max-w-[8.5rem]"
              />
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-3 sm:items-center">
            <div className="flex shrink-0 flex-col items-center gap-1.5">
              {logoSrc ? (
                <Image src={logoSrc} alt={title} width={36} height={36} className="h-9 w-9 object-contain" />
              ) : null}
              {showPoweredByOmne ? (
                <Image
                  src={POWERED_BY_OMNE_SRC}
                  alt="Powered by OMNE"
                  width={88}
                  height={28}
                  className="h-5 w-auto max-w-[5.75rem] object-contain opacity-90"
                />
              ) : null}
            </div>
            <div className="min-w-0 pt-0.5 sm:pt-0">
              <h2 className="text-base font-semibold tracking-tight text-white/90">{title}</h2>
            </div>
          </div>
        )}
        <button
          type="button"
          onClick={onAdd}
          className="shrink-0 rounded-xl bg-sky-500/90 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-sky-400"
        >
          Add connection
        </button>
      </div>

      <div className="overflow-x-auto px-2 pb-5 pt-4 sm:px-4">
        <table className="w-full min-w-[640px] border-collapse text-left text-[13px]">
          <thead>
            <tr className="border-b border-white/10 text-[11px] font-semibold uppercase tracking-wider text-white/40">
              <th className="px-3 py-2.5 font-medium">Status</th>
              <th className="px-3 py-2.5 font-medium">Name</th>
              <th className="px-3 py-2.5 font-medium">Broker</th>
              <th className="px-3 py-2.5 font-medium">Username</th>
              <th className="px-3 py-2.5 font-medium">Server / area</th>
              <th className="px-3 py-2.5 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {connections.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-10 text-center text-white/40">
                  No connections yet. Use <span className="text-white/60">Add connection</span>.
                </td>
              </tr>
            ) : (
              connections.flatMap((row) => {
                const isSyncing = syncingId === row.id;
                const result = lastResults[row.id];
                const accounts = row.discoveredAccounts ?? [];
                const showAccountsBlock = broker === "rithmic" && accounts.length > 0;
                const empreinteIsStale =
                  showAccountsBlock && row.status !== "connected";
                const primaryRow = (
                  <tr
                    key={`${row.id}-row`}
                    className="border-b border-white/[0.06] transition hover:bg-white/[0.03]"
                  >
                    <td className="px-3 py-3 align-top">
                      <StatusCell status={row.status} />
                    </td>
                    <td className="px-3 py-3 align-top font-medium text-white/88">
                      {row.name}
                    </td>
                    <td className="px-3 py-3 align-top text-white/55">{brokerColLabel}</td>
                    <td
                      className="max-w-[140px] truncate px-3 py-3 align-top text-white/70"
                      title={row.username}
                    >
                      {row.username}
                    </td>
                    <td
                      className="max-w-[260px] px-3 py-3 align-top text-white/55"
                      title={`${row.server} · ${row.area}`}
                    >
                      <span className="line-clamp-2 text-[12px] leading-snug">
                        {row.server}
                        <span className="text-white/35"> · </span>
                        {row.area}
                      </span>
                      {result ? (
                        <span
                          className={`mt-1 block break-words text-[11px] leading-snug ${
                            result.ok ? "text-emerald-300/90" : "text-red-300/90"
                          }`}
                        >
                          {result.message}
                        </span>
                      ) : null}
                      {row.lastSyncAt ? (
                        <span className="mt-1 block text-[11px] leading-snug text-white/40">
                          Last sync: {formatRelativeFromNow(row.lastSyncAt)}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-3 align-top">
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => onEdit(row)}
                          disabled={isSyncing}
                          className="rounded-lg px-2 py-1 text-xs font-medium text-sky-300/95 transition hover:bg-sky-500/15 hover:text-sky-200 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete(row.id)}
                          disabled={isSyncing}
                          className="rounded-lg px-2 py-1 text-xs font-medium text-red-300/90 transition hover:bg-red-500/10 hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Delete
                        </button>
                        {row.status === "connected" ? (
                          <button
                            type="button"
                            onClick={() => onForget(row.id)}
                            disabled={isSyncing}
                            className="rounded-lg border border-white/15 bg-white/[0.06] px-2.5 py-1 text-xs font-semibold text-white/85 transition hover:bg-white/[0.1] disabled:cursor-not-allowed disabled:opacity-50"
                            title="Reset the connected status. Empreinte (account snapshot) is kept."
                          >
                            Forget
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => onSync(row.id)}
                          disabled={isSyncing}
                          className="rounded-lg bg-sky-500/85 px-2.5 py-1 text-xs font-semibold text-slate-950 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {isSyncing ? "Syncing…" : "Sync now"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );

                if (!showAccountsBlock) return [primaryRow];

                const accountsRow = (
                  <tr
                    key={`${row.id}-accounts`}
                    className="border-b border-white/[0.06] bg-white/[0.015]"
                  >
                    <td colSpan={6} className="px-3 py-3 sm:px-5">
                      <div className="rounded-xl border border-white/10 bg-white/[0.025]">
                        <div className="flex items-center justify-between gap-3 border-b border-white/10 px-3 py-2 sm:px-4">
                          <div className="flex items-baseline gap-2">
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-white/55">
                              Accounts
                            </span>
                            <span className="text-[11px] text-white/35">{accounts.length}</span>
                          </div>
                          {empreinteIsStale ? (
                            <span
                              className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-white/45"
                              title="Saved list from a previous session — may not match Rithmic right now. Click Sync now to refresh."
                            >
                              Last known snapshot
                            </span>
                          ) : (
                            <span
                              className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-emerald-300/90"
                              title="This account list comes from your last successful Sync now while connected."
                            >
                              Synced
                            </span>
                          )}
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full min-w-[440px] border-collapse text-left text-[12px]">
                            <thead>
                              <tr className="border-b border-white/[0.06] text-[10px] font-semibold uppercase tracking-wider text-white/40">
                                <th className="px-3 py-2 font-medium">Account name</th>
                                <th className="px-3 py-2 font-medium">Account ID</th>
                                <th className="px-3 py-2 text-right font-medium">Balance</th>
                                <th className="px-3 py-2 text-right font-medium">Link</th>
                              </tr>
                            </thead>
                            <tbody>
                              {accounts.map((a) => {
                                const currency = a.accountCurrency ?? "USD";
                                const linkedJournal = a.linkedJournalAccountId
                                  ? journalAccounts[a.linkedJournalAccountId]
                                  : undefined;
                                return (
                                  <tr
                                    key={a.accountId}
                                    className="border-b border-white/[0.04] last:border-b-0"
                                  >
                                    <td className="px-3 py-2.5 align-middle font-medium text-white/90">
                                      {a.accountName}
                                      {a.fcmId || a.ibId ? (
                                        <span className="ml-2 text-[10px] text-white/35">
                                          {[a.fcmId, a.ibId].filter(Boolean).join(" / ")}
                                        </span>
                                      ) : null}
                                    </td>
                                    <td className="px-3 py-2.5 align-middle text-white/55">{a.accountId}</td>
                                    <td
                                      className="px-3 py-2.5 text-right align-middle text-white/55"
                                      title="Balance not yet available — pending PnL Plant protos from Rithmic."
                                    >
                                      <span className="text-white/40">—</span>{" "}
                                      <span className="text-white/35">{currency}</span>
                                    </td>
                                    <td className="px-3 py-2.5 text-right align-middle">
                                      {a.linkedJournalAccountId ? (
                                        linkedJournal ? (
                                          <div className="flex flex-col items-end gap-0.5">
                                            <span
                                              className="inline-flex items-center gap-1 rounded-md border border-emerald-400/25 bg-emerald-400/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-300/90"
                                              title={`Linked to journal account ${linkedJournal.id}`}
                                            >
                                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400/80" />
                                              {linkedJournal.propFirm.name}
                                              <span className="text-emerald-200/60">
                                                {linkedJournal.sizeLabel}
                                              </span>
                                            </span>
                                            <button
                                              type="button"
                                              onClick={() => onUnlinkAccount(row.id, a.accountId)}
                                              className="text-[10px] font-medium text-white/40 transition hover:text-red-300/90"
                                              title="Remove the link to this journal account."
                                            >
                                              Unlink
                                            </button>
                                          </div>
                                        ) : (
                                          <div className="flex flex-col items-end gap-0.5">
                                            <span
                                              className="inline-flex items-center rounded-md border border-amber-400/25 bg-amber-400/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-300/85"
                                              title="The linked journal account no longer exists (deleted ?)."
                                            >
                                              Linked (missing)
                                            </span>
                                            <button
                                              type="button"
                                              onClick={() => onUnlinkAccount(row.id, a.accountId)}
                                              className="text-[10px] font-medium text-white/40 transition hover:text-red-300/90"
                                            >
                                              Clear link
                                            </button>
                                          </div>
                                        )
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={() => onLinkAccount(row.id, a.accountId)}
                                          className="inline-flex min-h-[2.25rem] min-w-[5.5rem] cursor-pointer items-center justify-center rounded-lg border border-sky-400/55 bg-sky-500/25 px-3 py-2 text-xs font-semibold text-sky-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_4px_14px_rgba(14,165,233,0.18)] ring-1 ring-sky-400/25 transition hover:border-sky-300/65 hover:bg-sky-500/40 hover:text-white hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_6px_18px_rgba(14,165,233,0.28)] active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400/70"
                                        >
                                          Link
                                        </button>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                        <div className="border-t border-white/10 px-3 py-2 text-[10px] italic text-white/35 sm:px-4">
                          Balance / live PnL will be filled once Rithmic provides the PnL Plant
                          protos. Trades / fills will be added in a later phase.
                        </div>
                      </div>
                    </td>
                  </tr>
                );

                return [primaryRow, accountsRow];
              })
            )}
          </tbody>
        </table>
      </div>

    </section>
  );
}
