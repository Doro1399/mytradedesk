"use client";

import Image from "next/image";
import { useEffect, useState, type FormEvent, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { handleModalEnterToSubmit } from "@/components/journal/modal-enter-submit";
import {
  NINJATRADER_AREA_OPTIONS,
  NINJATRADER_DEFAULT_AREA,
  NINJATRADER_DEFAULT_SERVER,
  NINJATRADER_SERVER_OPTIONS,
  RITHMIC_AREA_OPTIONS,
  RITHMIC_DEFAULT_AREA,
  RITHMIC_DEFAULT_SERVER,
  RITHMIC_SERVER_OPTIONS,
  type SandboxBrokerId,
  type SandboxConnectionRow,
} from "@/lib/dev/sandbox-connection-catalog";
import { platformLogoSrc } from "@/lib/platforms";

const MODAL_EXIT_UNMOUNT_MS = 460;

const panelClass =
  "relative z-10 flex w-full max-w-md flex-col overflow-hidden rounded-2xl border border-zinc-800/60 bg-[#0c0c0e] shadow-[0_24px_80px_rgba(0,0,0,0.65)] [will-change:transform,opacity]";

const headerBtnClass =
  "flex h-9 w-9 items-center justify-center rounded-[10px] border border-white/10 text-xl leading-none text-white/60 transition hover:border-white/20 hover:bg-white/[0.05] hover:text-white/80";

const inputClass =
  "w-full rounded-xl border border-white/12 bg-black/40 px-3 py-2.5 text-[13px] text-white/88 outline-none transition placeholder:text-white/35 focus:border-sky-400/40 focus:ring-1 focus:ring-sky-400/25";

const selectClass =
  "w-full rounded-xl border border-white/12 bg-black/40 px-3 py-2.5 text-[13px] text-white/88 outline-none transition focus:border-sky-400/40 focus:ring-1 focus:ring-sky-400/25";

type Mode = "add" | "edit";

type Props = {
  open: boolean;
  mode: Mode;
  broker: SandboxBrokerId;
  initial: SandboxConnectionRow | null;
  onClose: () => void;
  onSave: (payload: {
    name: string;
    username: string;
    password: string;
    server: string;
    area: string;
    autoConnectOnStartup: boolean;
  }) => void;
};

export function SandboxConnectionModal({ open, mode, broker, initial, onClose, onSave }: Props) {
  const [mounted, setMounted] = useState(false);
  const [closing, setClosing] = useState(false);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [server, setServer] = useState("");
  const [area, setArea] = useState("");
  const [autoConnectOnStartup, setAutoConnectOnStartup] = useState(false);

  const servers = broker === "rithmic" ? RITHMIC_SERVER_OPTIONS : NINJATRADER_SERVER_OPTIONS;
  const areas = broker === "rithmic" ? RITHMIC_AREA_OPTIONS : NINJATRADER_AREA_OPTIONS;
  const logoSrc =
    broker === "rithmic" ? platformLogoSrc.rithmic! : platformLogoSrc.tradovate!;
  const brokerLabel = broker === "rithmic" ? "Rithmic" : "Tradovate";

  useEffect(() => {
    if (open) {
      if (mode === "edit" && initial) {
        setName(initial.name);
        setUsername(initial.username);
        setPassword("");
        setServer(initial.server);
        setArea(initial.area);
        setAutoConnectOnStartup(initial.autoConnectOnStartup);
      } else {
        setName("");
        setUsername("");
        setPassword("");
        if (broker === "rithmic") {
          setServer(RITHMIC_DEFAULT_SERVER);
          setArea(RITHMIC_DEFAULT_AREA);
        } else {
          setServer(NINJATRADER_DEFAULT_SERVER);
          setArea(NINJATRADER_DEFAULT_AREA);
        }
        setAutoConnectOnStartup(false);
      }
      setMounted(true);
      setClosing(false);
    } else if (mounted) {
      setClosing(true);
    }
  }, [open, mounted, mode, initial, broker]);

  useEffect(() => {
    if (!closing || !mounted) return;
    const t = window.setTimeout(() => {
      setMounted(false);
      setClosing(false);
    }, MODAL_EXIT_UNMOUNT_MS);
    return () => window.clearTimeout(t);
  }, [closing, mounted]);

  useEffect(() => {
    if (!mounted) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [mounted, onClose]);

  if (!mounted) return null;

  const backdropAnim = closing ? "compare-modal-backdrop--out" : "compare-modal-backdrop--in";
  const panelAnim = closing ? "compare-modal-panel--out" : "compare-modal-panel--in";

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || !username.trim()) return;
    if (mode === "add" && !password.trim()) return;
    if (!server || !area) return;
    onSave({
      name: name.trim(),
      username: username.trim(),
      password: password.trim(),
      server,
      area,
      autoConnectOnStartup,
    });
    onClose();
  }

  const canSave =
    name.trim().length > 0 &&
    username.trim().length > 0 &&
    (mode === "edit" || password.trim().length > 0) &&
    server.length > 0 &&
    area.length > 0;

  return (
    <div
      className={`fixed inset-0 z-[500] flex items-center justify-center bg-black/70 px-4 py-8 ${backdropAnim}`}
      role="presentation"
      onMouseDown={(ev) => {
        if (ev.target === ev.currentTarget) onClose();
      }}
    >
      <div
        className={`${panelClass} ${panelAnim} max-h-[min(92vh,640px)]`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="sandbox-conn-modal-title"
      >
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <h2 id="sandbox-conn-modal-title" className="text-sm font-semibold tracking-tight text-white/90">
            Connection
          </h2>
          <button type="button" className={headerBtnClass} aria-label="Close" onClick={onClose}>
            ×
          </button>
        </div>

        <form
          className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-5"
          onSubmit={submit}
          onKeyDown={(e: ReactKeyboardEvent<HTMLFormElement>) =>
            handleModalEnterToSubmit(e, () => {
              if (canSave) e.currentTarget.requestSubmit();
            }, !canSave)
          }
        >
          <div className="mb-5 flex items-center gap-3 border-b border-white/[0.06] pb-5">
            <Image
              src={logoSrc}
              alt={brokerLabel}
              width={40}
              height={40}
              className="h-10 w-10 object-contain"
            />
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-white/40">Provider</p>
              <p className="text-sm font-semibold text-white/90">{brokerLabel}</p>
            </div>
          </div>

          <div className="space-y-4">
            <label className="block space-y-1.5">
              <span className="text-[11px] font-medium uppercase tracking-wider text-white/40">
                Connection name
              </span>
              <input
                className={inputClass}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. APEX_R"
                autoComplete="off"
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-[11px] font-medium uppercase tracking-wider text-white/40">
                Username
              </span>
              <input
                className={inputClass}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-[11px] font-medium uppercase tracking-wider text-white/40">
                Password
              </span>
              <input
                type="password"
                className={inputClass}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === "edit" ? "Leave blank to keep unchanged" : ""}
                autoComplete={mode === "add" ? "new-password" : "current-password"}
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-[11px] font-medium uppercase tracking-wider text-white/40">Server</span>
              <select
                className={selectClass}
                value={server}
                onChange={(e) => setServer(e.target.value)}
                required
              >
                <option value="">— Select server —</option>
                {servers.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-1.5">
              <span className="text-[11px] font-medium uppercase tracking-wider text-white/40">Area</span>
              <select className={selectClass} value={area} onChange={(e) => setArea(e.target.value)} required>
                <option value="">— Select area —</option>
                {areas.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex cursor-pointer items-center gap-2.5 pt-1">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-white/20 bg-black/50 text-sky-500 focus:ring-sky-400/40"
                checked={autoConnectOnStartup}
                onChange={(e) => setAutoConnectOnStartup(e.target.checked)}
              />
              <span className="text-[13px] text-white/70">Auto connect on startup</span>
            </label>
          </div>

          <div className="mt-6 flex flex-col gap-3 border-t border-white/[0.06] pt-5">
            <button
              type="submit"
              disabled={!canSave}
              className="w-full rounded-xl bg-sky-500/90 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Save connection
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
