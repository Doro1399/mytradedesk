"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  SANDBOX_CONNECTIONS_STORAGE_KEY,
  type SandboxBrokerId,
  type SandboxConnectionRow,
  type SandboxConnectionStatus,
} from "@/lib/dev/sandbox-connection-catalog";
import { SandboxConnectionModal } from "@/components/desk/sandbox-connection-modal";
import { platformLogoSrc } from "@/lib/platforms";

/** Rithmic artwork (copied to `public/rithmic-attribution/` for Next.js). */
const POWERED_BY_OMNE_SRC = "/rithmic-attribution/powered-by-omne.png";

/** Wide Rithmic brand banner (`public/brands/`). */
const RITHMIC_BANNER_SRC = "/brands/rithmic-market-data-banner.png";

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `sc-${Date.now()}-${Math.random().toString(16).slice(2)}`;
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
      .map((r) => ({
        id: String(r.id ?? newId()),
        broker: r.broker === "ninjatrader" ? "ninjatrader" : "rithmic",
        name: String(r.name ?? ""),
        username: String(r.username ?? ""),
        server: String(r.server ?? ""),
        area: String(r.area ?? ""),
        status: (["connected", "error", "disconnected"].includes(String(r.status))
          ? r.status
          : "disconnected") as SandboxConnectionStatus,
        autoConnectOnStartup: Boolean(r.autoConnectOnStartup),
      }));
  } catch {
    return [];
  }
}

function saveToStorage(rows: SandboxConnectionRow[]) {
  const storable = rows.map(({ password: _p, ...rest }) => rest);
  localStorage.setItem(SANDBOX_CONNECTIONS_STORAGE_KEY, JSON.stringify(storable));
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

export function SandboxIntegrations() {
  const [rows, setRows] = useState<SandboxConnectionRow[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [filterRithmic, setFilterRithmic] = useState("");
  const [filterNinja, setFilterNinja] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [modalBroker, setModalBroker] = useState<SandboxBrokerId>("rithmic");
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  const [modalInitial, setModalInitial] = useState<SandboxConnectionRow | null>(null);

  useEffect(() => {
    setRows(loadFromStorage());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveToStorage(rows);
  }, [rows, hydrated]);

  const rithmicRows = useMemo(
    () =>
      rows.filter(
        (r) =>
          r.broker === "rithmic" &&
          r.name.toLowerCase().includes(filterRithmic.trim().toLowerCase())
      ),
    [rows, filterRithmic]
  );

  const ninjaRows = useMemo(
    () =>
      rows.filter(
        (r) =>
          r.broker === "ninjatrader" &&
          r.name.toLowerCase().includes(filterNinja.trim().toLowerCase())
      ),
    [rows, filterNinja]
  );

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
    }) => {
      if (modalMode === "add") {
        const row: SandboxConnectionRow = {
          id: newId(),
          broker: modalBroker,
          name: payload.name,
          username: payload.username,
          password: payload.password,
          server: payload.server,
          area: payload.area,
          status: "disconnected",
          autoConnectOnStartup: payload.autoConnectOnStartup,
        };
        setRows((prev) => [...prev, row]);
        return;
      }
      if (!modalInitial) return;
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
          };
          if (payload.password) next.password = payload.password;
          return next;
        })
      );
    },
    [modalMode, modalBroker, modalInitial]
  );

  const deleteRow = useCallback((id: string) => {
    if (!window.confirm("Remove this connection from the sandbox list?")) return;
    setRows((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const toggleConnect = useCallback((id: string) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        if (r.status === "connected") {
          return { ...r, status: "disconnected" as const };
        }
        return { ...r, status: "connected" as const };
      })
    );
  }, []);

  return (
    <div className="space-y-8">
      <BrokerCard
        broker="rithmic"
        title="Rithmic"
        bannerSrc={RITHMIC_BANNER_SRC}
        filter={filterRithmic}
        onFilterChange={setFilterRithmic}
        connections={rithmicRows}
        onAdd={() => openAdd("rithmic")}
        onEdit={openEdit}
        onDelete={deleteRow}
        onToggleConnect={toggleConnect}
      />
      <BrokerCard
        broker="ninjatrader"
        title="Tradovate"
        logoSrc={platformLogoSrc.tradovate!}
        filter={filterNinja}
        onFilterChange={setFilterNinja}
        connections={ninjaRows}
        onAdd={() => openAdd("ninjatrader")}
        onEdit={openEdit}
        onDelete={deleteRow}
        onToggleConnect={toggleConnect}
      />

      <SandboxConnectionModal
        open={modalOpen}
        mode={modalMode}
        broker={modalBroker}
        initial={modalInitial}
        onClose={() => setModalOpen(false)}
        onSave={onModalSave}
      />
    </div>
  );
}

function BrokerCard({
  broker,
  title,
  logoSrc,
  bannerSrc,
  showPoweredByOmne,
  filter,
  onFilterChange,
  connections,
  onAdd,
  onEdit,
  onDelete,
  onToggleConnect,
}: {
  broker: SandboxBrokerId;
  title: string;
  logoSrc?: string;
  /** When set, header shows only this wide banner (no platform tile / title / OMNE stack). */
  bannerSrc?: string;
  showPoweredByOmne?: boolean;
  filter: string;
  onFilterChange: (v: string) => void;
  connections: SandboxConnectionRow[];
  onAdd: () => void;
  onEdit: (row: SandboxConnectionRow) => void;
  onDelete: (id: string) => void;
  onToggleConnect: (id: string) => void;
}) {
  const brokerColLabel = broker === "rithmic" ? "Rithmic" : "Tradovate";

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      <div className="flex flex-col gap-4 border-b border-white/10 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        {bannerSrc ? (
          <div className="flex min-w-0 flex-1 flex-col items-start gap-1">
            <Image
              src={bannerSrc}
              alt="Rithmic — market data and trading infrastructure"
              width={360}
              height={50}
              className="h-[1.512rem] w-auto max-w-full object-contain object-left sm:h-[1.728rem]"
              priority
            />
            <Image
              src={POWERED_BY_OMNE_SRC}
              alt="Powered by OMNE"
              width={202}
              height={65}
              className="ml-[6px] h-[1.711rem] w-auto max-w-[7.416rem] object-contain object-left opacity-90 sm:h-[1.996rem] sm:max-w-[7.98rem]"
            />
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

      <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center">
        <input
          type="search"
          value={filter}
          onChange={(e) => onFilterChange(e.target.value)}
          placeholder="Filter by name"
          className="w-full rounded-xl border border-white/12 bg-black/35 px-3 py-2 text-[13px] text-white/88 outline-none transition placeholder:text-white/35 focus:border-sky-400/40 focus:ring-1 focus:ring-sky-400/25 sm:max-w-xs"
        />
      </div>

      <div className="overflow-x-auto px-2 pb-5 sm:px-4">
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
              connections.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-white/[0.06] transition hover:bg-white/[0.03]"
                >
                  <td className="px-3 py-3">
                    <StatusCell status={row.status} />
                  </td>
                  <td className="px-3 py-3 font-medium text-white/88">{row.name}</td>
                  <td className="px-3 py-3 text-white/55">{brokerColLabel}</td>
                  <td className="max-w-[140px] truncate px-3 py-3 text-white/70" title={row.username}>
                    {row.username}
                  </td>
                  <td className="max-w-[220px] px-3 py-3 text-white/55" title={`${row.server} · ${row.area}`}>
                    <span className="line-clamp-2 text-[12px] leading-snug">
                      {row.server}
                      <span className="text-white/35"> · </span>
                      {row.area}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => onEdit(row)}
                        className="rounded-lg px-2 py-1 text-xs font-medium text-sky-300/95 transition hover:bg-sky-500/15 hover:text-sky-200"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(row.id)}
                        className="rounded-lg px-2 py-1 text-xs font-medium text-red-300/90 transition hover:bg-red-500/10 hover:text-red-200"
                      >
                        Delete
                      </button>
                      {row.status === "connected" ? (
                        <button
                          type="button"
                          onClick={() => onToggleConnect(row.id)}
                          className="rounded-lg border border-white/15 bg-white/[0.06] px-2.5 py-1 text-xs font-semibold text-white/85 transition hover:bg-white/[0.1]"
                        >
                          Disconnect
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onToggleConnect(row.id)}
                          className="rounded-lg bg-sky-500/85 px-2.5 py-1 text-xs font-semibold text-slate-950 transition hover:bg-sky-400"
                        >
                          Connect
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {broker === "rithmic" ? (
        <div className="border-t border-white/10 px-5 py-4">
          <p className="text-center text-[11px] leading-relaxed text-white/42">
            The R | Protocol API™ software is Copyright © 2026 by Rithmic, LLC. All rights reserved.
          </p>
        </div>
      ) : null}
    </section>
  );
}
