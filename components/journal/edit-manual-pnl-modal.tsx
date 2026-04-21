"use client";

import { useEffect, useState, type AnimationEvent } from "react";
import { handleModalEnterToSubmit } from "@/components/journal/modal-enter-submit";
import { parseUsdInputToCents } from "@/lib/journal/parse-usd-input";
import type { ISODate, JournalAccount, JournalId, JournalPnlEntry } from "@/lib/journal/types";
import { resolveAccountDisplayName } from "@/components/journal/account-auto-labels";

const MODAL_EXIT_UNMOUNT_MS = 460;

const panelClass =
  "relative z-10 w-full max-w-md flex-col overflow-hidden rounded-2xl border border-zinc-800/60 bg-[#0c0c0e] shadow-[0_24px_80px_rgba(0,0,0,0.65)] [will-change:transform,opacity]";

const headerBtnClass =
  "flex h-9 w-9 items-center justify-center rounded-[10px] border border-white/10 text-xl leading-none text-white/60 transition hover:border-white/20 hover:bg-white/[0.05] hover:text-white/80";

const inputClass =
  "w-full rounded-xl border border-white/12 bg-black/50 px-3 py-2.5 text-sm text-white outline-none focus:border-sky-500/40 focus:ring-2 focus:ring-sky-500/20";

const labelClass = "block text-[11px] font-medium uppercase tracking-wider text-white/40";

export type ManualPnlEditSave = {
  id: JournalId;
  accountId: JournalId;
  date: ISODate;
  pnlCents: number;
  note: string;
};

type Props = {
  open: boolean;
  entry: JournalPnlEntry | null;
  accounts: JournalAccount[];
  labelByAccountId: Map<string, string>;
  onClose: () => void;
  onSave: (payload: ManualPnlEditSave) => void;
};

function centsToAmountInput(cents: number): string {
  return (cents / 100).toFixed(2);
}

export function EditManualPnlModal({ open, entry, accounts, labelByAccountId, onClose, onSave }: Props) {
  const canShow = open && entry != null && entry.source === "manual";
  const [mounted, setMounted] = useState(false);
  const [closing, setClosing] = useState(false);

  const [date, setDate] = useState<ISODate>("");
  const [accountId, setAccountId] = useState<JournalId | "">("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (canShow && entry) {
      setDate(entry.date);
      setAccountId(entry.accountId);
      setAmount(centsToAmountInput(entry.pnlCents));
      const n = entry.note?.trim() ?? "";
      setNote(n && n !== "Manual entry" ? n : "");
      setError(null);
    }
  }, [canShow, entry]);

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

  const submit = () => {
    if (!entry) return;
    setError(null);
    if (!date) {
      setError("Choose a date.");
      return;
    }
    if (!accountId) {
      setError("Choose an account.");
      return;
    }
    const cents = parseUsdInputToCents(amount);
    if (cents == null) {
      setError("Enter a valid P&L amount.");
      return;
    }
    const trimmedNote = note.trim();
    onSave({
      id: entry.id,
      accountId: accountId as JournalId,
      date,
      pnlCents: cents,
      note: trimmedNote.length > 0 ? trimmedNote : "Manual entry",
    });
    onClose();
  };

  if (!mounted || !entry || entry.source !== "manual") return null;

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
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-manual-pnl-title"
        className={`flex ${panelClass} ${panelAnim}`}
        onClick={(e) => e.stopPropagation()}
        onAnimationEnd={onPanelAnimationEnd}
        onKeyDown={(e) => handleModalEnterToSubmit(e, submit, false)}
      >
        <header className="flex shrink-0 items-center justify-between border-b border-white/[0.06] px-5 py-4">
          <h2 id="edit-manual-pnl-title" className="text-lg font-semibold tracking-tight text-white/92">
            Edit manual P&amp;L
          </h2>
          <button type="button" onClick={onClose} className={headerBtnClass} aria-label="Close">
            ×
          </button>
        </header>
        <div className="max-h-[min(70vh,28rem)] space-y-4 overflow-y-auto overscroll-y-contain px-5 py-5 [scrollbar-width:thin]">
          <p className="text-xs text-white/45">
            Update date, net P&amp;L, account, or note. The line keeps the same id (calendar and totals stay
            consistent).
          </p>
          <div className="space-y-1.5">
            <label htmlFor="edit-manual-pnl-date" className={labelClass}>
              Date
            </label>
            <input
              id="edit-manual-pnl-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value as ISODate)}
              className={inputClass}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="edit-manual-pnl-account" className={labelClass}>
              Account
            </label>
            <select
              id="edit-manual-pnl-account"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value as JournalId | "")}
              className={inputClass}
            >
              <option value="">— Select account —</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {resolveAccountDisplayName(a, labelByAccountId)}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="edit-manual-pnl-amount" className={labelClass}>
              Net P&amp;L (USD)
            </label>
            <input
              id="edit-manual-pnl-amount"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className={`${inputClass} font-mono`}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="edit-manual-pnl-note" className={labelClass}>
              Note (optional)
            </label>
            <input
              id="edit-manual-pnl-note"
              type="text"
              placeholder="Session recap, adjustment…"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className={inputClass}
            />
          </div>
          {error ? (
            <div className="rounded-xl border border-rose-500/25 bg-rose-500/10 px-3 py-2 text-sm text-rose-100/90">
              {error}
            </div>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-white/[0.06] px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-[10px] border border-white/10 bg-zinc-900/55 px-4 py-2.5 text-sm font-medium text-white/88 transition hover:border-white/18 hover:bg-zinc-800/75"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            className="rounded-[10px] border border-sky-500/45 bg-sky-600/90 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_0_24px_rgba(2,132,199,0.2)] transition hover:border-sky-400/60 hover:bg-sky-500"
          >
            Save changes
          </button>
        </div>
      </div>
    </div>
  );
}
