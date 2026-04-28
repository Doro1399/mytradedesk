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

export type RithmicUnlinkContext = {
  rowId: string;
  rithmicAccountId: string;
  /** Rithmic-side account name to display (e.g. `Julien Zucchero`). */
  rithmicAccountName: string;
  /** Connection label (e.g. `Rithmic Test`). */
  connectionName: string;
  /** Display label for the journal account currently linked (e.g. `Apex 50k`). Empty when missing. */
  journalAccountLabel: string;
  /** True if the link points to a journal account that no longer exists. */
  journalAccountMissing: boolean;
};

type Props = {
  open: boolean;
  context: RithmicUnlinkContext | null;
  onClose: () => void;
  onConfirm: () => void;
};

export function RithmicUnlinkAccountModal({ open, context, onClose, onConfirm }: Props) {
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
        aria-labelledby="rithmic-unlink-title"
        aria-describedby="rithmic-unlink-desc"
        className={`flex ${panelClass} ${panelAnim}`}
        onClick={(e) => e.stopPropagation()}
        onAnimationEnd={onPanelAnimationEnd}
      >
        <header className="flex shrink-0 items-center justify-between border-b border-white/[0.06] px-5 py-4">
          <h2
            id="rithmic-unlink-title"
            className="text-lg font-semibold tracking-tight text-white/92"
          >
            Unlink Rithmic account
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
            id="rithmic-unlink-desc"
            className="text-[14px] leading-relaxed text-zinc-400"
          >
            {context.journalAccountMissing
              ? "The journal account this Rithmic account was linked to no longer exists."
              : "Remove the link between this Rithmic account and your journal account."}
          </p>

          <dl className="mt-4 grid grid-cols-1 gap-y-2 rounded-[10px] border border-white/[0.06] bg-white/[0.02] px-3 py-3 text-[12px] sm:grid-cols-[auto_1fr] sm:gap-x-4">
            <dt className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
              Connection
            </dt>
            <dd className="text-white/85">{context.connectionName}</dd>

            <dt className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
              Rithmic account
            </dt>
            <dd className="text-white/85">{context.rithmicAccountName}</dd>

            <dt className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
              Journal account
            </dt>
            <dd className={context.journalAccountMissing ? "text-amber-300/85" : "text-white/85"}>
              {context.journalAccountMissing
                ? "Missing (deleted ?)"
                : context.journalAccountLabel}
            </dd>
          </dl>

          <p className="mt-3 text-[12px] leading-relaxed text-white/55">
            The journal account itself will not be deleted — only the link is removed. You can
            link it again later from the discovered accounts table.
          </p>

          <div className="mt-6 flex flex-wrap justify-end gap-2">
            <button type="button" onClick={onClose} className={cancelBtnClass}>
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                onConfirm();
              }}
              className={dangerBtnClass}
            >
              {context.journalAccountMissing ? "Clear link" : "Unlink"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
