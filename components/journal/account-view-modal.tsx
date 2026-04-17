"use client";

import { useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { AccountOverviewContent } from "@/components/journal/account-overview-content";
import { resolveAccountDisplayName, useAutoAccountLabelById } from "@/components/journal/account-auto-labels";
import { useJournal } from "@/components/journal/journal-provider";
import { handleModalEnterToSubmit } from "@/components/journal/modal-enter-submit";
import type { JournalId } from "@/lib/journal/types";

type Props = {
  accountId: JournalId | null;
  onClose: () => void;
};

export function AccountViewModal({ accountId, onClose }: Props) {
  const { state, dispatch, hydrated, isAccountEditable } = useJournal();
  const accounts = useMemo(() => Object.values(state.accounts), [state.accounts]);
  const labelById = useAutoAccountLabelById(accounts);
  const account = accountId ? state.accounts[accountId] : undefined;
  const resolvedName = account ? resolveAccountDisplayName(account, labelById) : "";

  useEffect(() => {
    if (!accountId || !hydrated) return;
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
  }, [accountId, hydrated, onClose]);

  if (!accountId || !hydrated) return null;

  if (typeof document === "undefined") return null;

  if (!account) {
    return createPortal(
      <div className="fixed inset-0 z-[160] flex items-center justify-center p-4">
        <button
          type="button"
          aria-label="Close"
          className="absolute inset-0 bg-black/60 backdrop-blur-md"
          onClick={onClose}
        />
        <div
          role="dialog"
          aria-modal="true"
          className="relative z-10 w-full max-w-md rounded-2xl border border-slate-600/30 bg-gradient-to-b from-slate-900/90 to-black/90 p-6 shadow-[0_16px_40px_rgba(0,0,0,0.45)] ring-1 ring-white/[0.04]"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => handleModalEnterToSubmit(e, onClose, false)}
        >
          <p className="text-center text-sm font-medium text-white/88">Account not found.</p>
          <button
            type="button"
            onClick={onClose}
            className="mt-5 w-full rounded-xl border border-sky-500/35 bg-sky-500/15 py-2.5 text-sm font-semibold text-sky-100 transition hover:bg-sky-500/25"
          >
            Close
          </button>
        </div>
      </div>,
      document.body
    );
  }

  return createPortal(
    <div className="fixed inset-0 z-[160] flex min-h-0 items-center justify-center overflow-y-auto overflow-x-hidden p-3 sm:p-4">
      <button
        type="button"
        aria-label="Close account view"
        className="fixed inset-0 bg-black/60 backdrop-blur-md"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Account ${resolvedName}`}
        className="relative z-10 my-auto flex w-full min-w-0 max-w-[min(72rem,calc(100vw-1.5rem))] max-h-[min(92dvh,calc(100dvh-1.5rem))] flex-col overflow-hidden rounded-2xl border border-slate-600/25 bg-gradient-to-b from-[#0a0c10] via-[#080a0e] to-[#06080c] pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)] shadow-[0_16px_48px_rgba(0,0,0,0.55)] ring-1 ring-white/[0.06]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain [scrollbar-color:rgba(255,255,255,0.12)_transparent] [scrollbar-width:thin]">
          <AccountOverviewContent
            account={account}
            state={state}
            resolvedName={resolvedName}
            dispatch={dispatch}
            onClose={onClose}
            readOnly={!isAccountEditable(account.id)}
          />
        </div>
      </div>
    </div>,
    document.body
  );
}
