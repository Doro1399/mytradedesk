"use client";

import { useEffect, useState, type AnimationEvent } from "react";

const MODAL_EXIT_UNMOUNT_MS = 460;

const panelClass =
  "relative z-10 w-full max-w-md flex-col overflow-hidden rounded-2xl border border-zinc-800/60 bg-[#0c0c0e] shadow-[0_24px_80px_rgba(0,0,0,0.65)] [will-change:transform,opacity]";

const headerBtnClass =
  "flex h-9 w-9 items-center justify-center rounded-[10px] border border-white/10 text-xl leading-none text-white/60 transition hover:border-white/20 hover:bg-white/[0.05] hover:text-white";

const cancelBtnClass =
  "rounded-[10px] border border-white/10 bg-zinc-900/55 px-4 py-2.5 text-sm font-medium text-white/88 transition hover:border-white/18 hover:bg-zinc-800/75";

const dangerBtnClass =
  "rounded-[10px] border border-red-500/45 bg-red-600/85 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_0_24px_rgba(220,38,38,0.25)] transition hover:bg-red-500 hover:border-red-400/60";

export type SandboxDeleteContext = {
  rowId: string;
  /** Connection label (e.g. `Rithmic Test`). */
  connectionName: string;
  /** Broker label (e.g. `Rithmic`, `NinjaTrader`). */
  brokerLabel: string;
  /** Rithmic username for context display. */
  username: string;
  /** Count of discovered Rithmic accounts in the persisted snapshot. */
  discoveredAccountsCount: number;
  /** Count of those accounts currently linked to a journal account. */
  linkedAccountsCount: number;
  /** True if the password is persisted in localStorage (rememberPassword). */
  passwordRemembered: boolean;
};

type Props = {
  open: boolean;
  context: SandboxDeleteContext | null;
  onClose: () => void;
  onConfirm: () => void;
};

export function SandboxConnectionDeleteModal({
  open,
  context,
  onClose,
  onConfirm,
}: Props) {
  const canShow = open && context !== null;
  const [mounted, setMounted] = useState(false);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (canShow) {
      setMounted(true);
      setClosing(false);
    } else if (mounted) {
      setClosing(true);
    }
  }, [canShow, mounted]);

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
    const onKey = (e: KeyboardEvent) => {
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

  const onPanelAnimationEnd = (e: AnimationEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    if (!closing) return;
    if (!String(e.animationName).includes("compare-modal-panel-out")) return;
    setMounted(false);
    setClosing(false);
  };

  if (!mounted || !context) return null;

  const backdropAnim = closing
    ? "compare-modal-backdrop--out"
    : "compare-modal-backdrop--in";
  const panelAnim = closing ? "compare-modal-panel--out" : "compare-modal-panel--in";

  const hasDiscovered = context.discoveredAccountsCount > 0;
  const hasLinked = context.linkedAccountsCount > 0;

  return (
    <div className="fixed inset-0 z-[170] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close"
        className={`absolute inset-0 bg-black/50 backdrop-blur-xl backdrop-saturate-150 ${backdropAnim}`}
        onClick={onClose}
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="sandbox-delete-title"
        aria-describedby="sandbox-delete-desc"
        className={`flex ${panelClass} ${panelAnim}`}
        onClick={(e) => e.stopPropagation()}
        onAnimationEnd={onPanelAnimationEnd}
      >
        <header className="flex shrink-0 items-center justify-between border-b border-white/[0.06] px-5 py-4">
          <h2
            id="sandbox-delete-title"
            className="text-lg font-semibold tracking-tight text-white/92"
          >
            Remove sandbox connection
          </h2>
          <button
            type="button"
            onClick={onClose}
            className={headerBtnClass}
            aria-label="Close"
          >
            ×
          </button>
        </header>
        <div className="px-5 py-5">
          <p
            id="sandbox-delete-desc"
            className="text-[14px] leading-relaxed text-zinc-400"
          >
            Remove this connection from the sandbox list. The remote broker
            account is not affected.
          </p>

          <dl className="mt-4 grid grid-cols-1 gap-y-2 rounded-[10px] border border-white/[0.06] bg-white/[0.02] px-3 py-3 text-[12px] sm:grid-cols-[auto_1fr] sm:gap-x-4">
            <dt className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
              Connection
            </dt>
            <dd className="text-white/85">{context.connectionName}</dd>

            <dt className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
              Broker
            </dt>
            <dd className="text-white/85">{context.brokerLabel}</dd>

            <dt className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
              Username
            </dt>
            <dd className="truncate text-white/85" title={context.username}>
              {context.username || "—"}
            </dd>

            {hasDiscovered ? (
              <>
                <dt className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
                  Discovered
                </dt>
                <dd className="text-white/85">
                  {context.discoveredAccountsCount} account
                  {context.discoveredAccountsCount > 1 ? "s" : ""}
                  {hasLinked ? (
                    <span className="text-white/55">
                      {" "}
                      · {context.linkedAccountsCount} linked
                    </span>
                  ) : null}
                </dd>
              </>
            ) : null}
          </dl>

          <ul className="mt-3 list-disc space-y-1 pl-5 text-[12px] leading-relaxed text-white/55 marker:text-white/30">
            <li>Saved snapshot of discovered accounts will be lost.</li>
            {hasLinked ? (
              <li>
                Existing journal accounts stay intact, but they will no longer
                be linked to a Rithmic source.
              </li>
            ) : null}
            {context.passwordRemembered ? (
              <li>The remembered password (localStorage) will be cleared.</li>
            ) : null}
          </ul>

          <div className="mt-6 flex flex-wrap justify-end gap-2">
            <button type="button" onClick={onClose} className={cancelBtnClass}>
              Cancel
            </button>
            <button type="button" onClick={onConfirm} className={dangerBtnClass}>
              Remove
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
