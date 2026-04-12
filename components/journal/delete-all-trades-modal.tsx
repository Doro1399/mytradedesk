"use client";

/* eslint-disable react-hooks/set-state-in-effect -- exit animation matches compare modals */

import { useEffect, useState, type AnimationEvent } from "react";
import { handleModalEnterToSubmit } from "@/components/journal/modal-enter-submit";

const MODAL_EXIT_UNMOUNT_MS = 460;

const panelClass =
  "relative z-10 w-full max-w-md flex-col overflow-hidden rounded-2xl border border-zinc-800/60 bg-[#0c0c0e] shadow-[0_24px_80px_rgba(0,0,0,0.65)] [will-change:transform,opacity]";

const headerBtnClass =
  "flex h-9 w-9 items-center justify-center rounded-[10px] border border-white/10 text-xl leading-none text-white/60 transition hover:border-white/20 hover:bg-white/[0.05] hover:text-white/80";

export type DeleteAllTradesOptions = {
  deleteTrades: boolean;
  deleteManualPnl: boolean;
};

type Props = {
  open: boolean;
  tradeCount: number;
  /** Manual journal P&amp;L lines (`source: manual`) — same as in the Trades table. */
  manualPnlCount: number;
  onClose: () => void;
  onConfirm: (options: DeleteAllTradesOptions) => void;
};

export function DeleteAllTradesModal({
  open,
  tradeCount,
  manualPnlCount,
  onClose,
  onConfirm,
}: Props) {
  const total = tradeCount + manualPnlCount;
  const canShow = open && total > 0;

  const [optTrades, setOptTrades] = useState(() => tradeCount > 0);
  const [optManual, setOptManual] = useState(() => manualPnlCount > 0);

  useEffect(() => {
    if (open && total > 0) {
      setOptTrades(tradeCount > 0);
      setOptManual(manualPnlCount > 0);
    }
  }, [open, total, tradeCount, manualPnlCount]);
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
    return () => clearTimeout(t);
  }, [closing, mounted]);

  const onPanelAnimationEnd = (e: AnimationEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    if (!closing) return;
    if (!String(e.animationName).includes("compare-modal-panel-out")) return;
    setMounted(false);
    setClosing(false);
  };

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

  if (!mounted || total === 0) return null;

  const canSubmit = optTrades || optManual;

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
        aria-labelledby="delete-all-trades-title"
        aria-describedby="delete-all-trades-desc"
        className={`flex ${panelClass} ${panelAnim}`}
        onClick={(e) => e.stopPropagation()}
        onAnimationEnd={onPanelAnimationEnd}
        onKeyDown={(e) =>
          handleModalEnterToSubmit(
            e,
            () => {
              if (!canSubmit) return;
              onConfirm({ deleteTrades: optTrades, deleteManualPnl: optManual });
              onClose();
            },
            !canSubmit
          )
        }
      >
        <header className="flex shrink-0 items-center justify-between border-b border-white/[0.06] px-5 py-4">
          <h2
            id="delete-all-trades-title"
            className="text-lg font-semibold tracking-tight text-white/92"
          >
            {tradeCount > 0 && manualPnlCount > 0
              ? "Delete trades & manual P&L"
              : manualPnlCount > 0
                ? "Delete manual P&L"
                : "Delete all imported trades"}
          </h2>
          <button type="button" onClick={onClose} className={headerBtnClass} aria-label="Close">
            ×
          </button>
        </header>
        <div className="px-5 py-5">
          <p
            id="delete-all-trades-desc"
            className="text-[14px] leading-relaxed text-zinc-400"
          >
            Choose what to remove. This cannot be undone.
          </p>
          <ul className="mt-4 space-y-3">
            {tradeCount > 0 ? (
              <li className="flex gap-3 rounded-xl border border-white/[0.06] bg-zinc-900/40 px-3 py-3">
                <input
                  id="delete-all-opt-trades"
                  type="checkbox"
                  checked={optTrades}
                  onChange={(e) => setOptTrades(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-white/25 bg-black/50 text-sky-500 focus:ring-sky-400/40"
                />
                <label htmlFor="delete-all-opt-trades" className="min-w-0 cursor-pointer text-[13px] leading-snug text-zinc-300">
                  <span className="font-semibold text-white/88">Imported trade rows</span>{" "}
                  <span className="text-zinc-500">
                    ({tradeCount === 1 ? "1 row" : `${tradeCount} rows`}) — local storage, including CSV snapshots used
                    for P&amp;L alignment with Calendar / Progress.
                  </span>
                </label>
              </li>
            ) : null}
            {manualPnlCount > 0 ? (
              <li className="flex gap-3 rounded-xl border border-white/[0.06] bg-zinc-900/40 px-3 py-3">
                <input
                  id="delete-all-opt-manual"
                  type="checkbox"
                  checked={optManual}
                  onChange={(e) => setOptManual(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-white/25 bg-black/50 text-sky-500 focus:ring-sky-400/40"
                />
                <label htmlFor="delete-all-opt-manual" className="min-w-0 cursor-pointer text-[13px] leading-snug text-zinc-300">
                  <span className="font-semibold text-white/88">Manual P&amp;L lines</span>{" "}
                  <span className="text-zinc-500">
                    ({manualPnlCount === 1 ? "1 line" : `${manualPnlCount} lines`}) — entries added via the import modal
                    or elsewhere with source &quot;manual&quot;; they appear in this table and sync to the calendar.
                  </span>
                </label>
              </li>
            ) : null}
          </ul>
          <div className="mt-6 flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-[10px] border border-white/10 bg-zinc-900/55 px-4 py-2.5 text-sm font-medium text-white/88 transition hover:border-white/18 hover:bg-zinc-800/75"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!canSubmit}
              onClick={() => {
                if (!canSubmit) return;
                onConfirm({ deleteTrades: optTrades, deleteManualPnl: optManual });
                onClose();
              }}
              className="rounded-[10px] border border-red-500/45 bg-red-600/85 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_0_24px_rgba(220,38,38,0.25)] transition hover:border-red-400/60 hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Delete selected
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
