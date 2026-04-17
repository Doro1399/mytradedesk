"use client";

import { useEffect, useMemo } from "react";
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

  if (!account) {
    return (
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
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[160] flex items-stretch justify-center p-0 sm:items-center sm:p-[clamp(8px,2vw,24px)] md:p-[clamp(12px,3vw,32px)]">
      <button
        type="button"
        aria-label="Close account view"
        className="absolute inset-0 bg-black/60 backdrop-blur-md"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Account ${resolvedName}`}
        className="relative z-10 flex h-full max-h-[100dvh] w-full min-h-0 min-w-0 flex-col overflow-hidden border-0 bg-gradient-to-b from-[#0a0c10] via-[#080a0e] to-[#06080c] pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)] shadow-[0_16px_48px_rgba(0,0,0,0.55)] sm:h-auto sm:max-h-[min(94dvh,min(56rem,calc(100dvh-2rem)))] sm:max-w-[min(96vw,72rem)] sm:border sm:border-slate-600/25 sm:pb-0 sm:pt-0 md:max-w-[min(94vw,80rem)] lg:max-w-[min(92vw,90rem)] xl:max-w-[min(90vw,96rem)] sm:rounded-2xl sm:ring-1 sm:ring-white/[0.06]"
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
    </div>
  );
}
