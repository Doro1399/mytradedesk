"use client";

/* eslint-disable react-hooks/set-state-in-effect -- exit animation matches compare modals */

import {
  useEffect,
  useState,
  type AnimationEvent,
} from "react";
import { handleModalEnterToSubmit } from "@/components/journal/modal-enter-submit";

const MODAL_EXIT_UNMOUNT_MS = 460;

const panelClass =
  "relative z-10 w-full max-w-md flex-col overflow-hidden rounded-2xl border border-zinc-800/60 bg-[#0c0c0e] shadow-[0_24px_80px_rgba(0,0,0,0.65)] [will-change:transform,opacity]";

const headerBtnClass =
  "flex h-9 w-9 items-center justify-center rounded-[10px] border border-white/10 text-xl leading-none text-white/60 transition hover:border-white/20 hover:bg-white/[0.05] hover:text-white";

type Props = {
  open: boolean;
  accountIds: string[];
  onClose: () => void;
  onConfirm: () => void;
};

export function DeleteAccountsModal({
  open,
  accountIds,
  onClose,
  onConfirm,
}: Props) {
  const count = accountIds.length;
  const canShow = open && count > 0;
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

  if (!mounted || count === 0) return null;

  const backdropAnim = closing
    ? "compare-modal-backdrop--out"
    : "compare-modal-backdrop--in";
  const panelAnim = closing ? "compare-modal-panel--out" : "compare-modal-panel--in";

  const accountWord = count === 1 ? "account" : "accounts";
  const deleteLabel =
    count === 1 ? "Delete 1 Account" : `Delete ${count} Accounts`;

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
        aria-labelledby="delete-accounts-title"
        aria-describedby="delete-accounts-desc"
        className={`flex ${panelClass} ${panelAnim}`}
        onClick={(e) => e.stopPropagation()}
        onAnimationEnd={onPanelAnimationEnd}
        onKeyDown={(e) => handleModalEnterToSubmit(e, onConfirm, false)}
      >
        <header className="flex shrink-0 items-center justify-between border-b border-white/[0.06] px-5 py-4">
          <h2
            id="delete-accounts-title"
            className="text-lg font-semibold tracking-tight text-white/92"
          >
            Delete Accounts
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
            id="delete-accounts-desc"
            className="text-[14px] leading-relaxed text-zinc-400"
          >
            Are you sure you want to delete {count} {accountWord}? This action cannot be
            undone. All associated fees, payouts, and trades will also be deleted.
          </p>
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
              onClick={() => {
                onConfirm();
              }}
              className="rounded-[10px] border border-red-500/45 bg-red-600/85 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_0_24px_rgba(220,38,38,0.25)] transition hover:bg-red-500 hover:border-red-400/60"
            >
              {deleteLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
