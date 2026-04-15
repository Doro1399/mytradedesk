"use client";

import { useCallback, useLayoutEffect, useMemo, useState } from "react";
import { nowIso, type JournalAction } from "@/lib/journal/reducer";
import {
  journalPayoutDisplayCents,
  journalPayoutGrossCentsFromDisplayInput,
} from "@/lib/journal/payout-display";
import { handleModalEnterToSubmit } from "@/components/journal/modal-enter-submit";
import type { JournalAccount, JournalPayoutEntry } from "@/lib/journal/types";
import { formatUsdWholeGrouped } from "@/lib/prop-firms";

const panelClass =
  "relative z-10 flex w-full max-w-lg max-h-[min(90vh,560px)] flex-col overflow-hidden rounded-2xl border border-zinc-800/60 bg-[#0c0c0e] shadow-[0_24px_80px_rgba(0,0,0,0.65)]";

const headerBtnClass =
  "flex h-9 w-9 items-center justify-center rounded-[10px] border border-white/10 text-xl leading-none text-white/60 transition hover:border-white/20 hover:bg-white/[0.05] hover:text-white";

const fieldLabelClass = "text-[11px] font-medium uppercase tracking-wide text-zinc-500";

const inputClass =
  "w-full rounded-lg border border-white/10 bg-zinc-950/70 px-3 py-2 text-sm text-white/90 outline-none transition placeholder:text-zinc-600 focus:border-sky-400/40 focus:ring-1 focus:ring-sky-400/20";

function parseUsdInput(raw: string): number | null {
  const t = raw.trim().replace(/\s/g, "").replace(",", ".");
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function sortPayoutsNewestFirst(payouts: JournalPayoutEntry[]): JournalPayoutEntry[] {
  return [...payouts].sort((a, b) => {
    const da = a.paidDate ?? a.requestedDate;
    const db = b.paidDate ?? b.requestedDate;
    const c = db.localeCompare(da);
    return c !== 0 ? c : b.createdAt.localeCompare(a.createdAt);
  });
}

function formatListDate(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso + "T12:00:00");
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

type Props = {
  open: boolean;
  account: JournalAccount;
  payouts: JournalPayoutEntry[];
  /** Ouvre directement l’édition de ce payout (sinon liste si plusieurs). */
  initialPayoutId?: string | null;
  onClose: () => void;
  dispatch: (a: JournalAction) => void;
};

export function EditPayoutFlowModal({
  open,
  account,
  payouts,
  initialPayoutId,
  onClose,
  dispatch,
}: Props) {
  const sorted = useMemo(() => sortPayoutsNewestFirst(payouts), [payouts]);
  const [phase, setPhase] = useState<"pick" | "edit">("pick");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useLayoutEffect(() => {
    if (!open || sorted.length === 0) return;
    if (initialPayoutId && sorted.some((p) => p.id === initialPayoutId)) {
      setSelectedId(initialPayoutId);
      setPhase("edit");
      return;
    }
    if (sorted.length === 1) {
      setSelectedId(sorted[0]!.id);
      setPhase("edit");
      return;
    }
    setSelectedId(null);
    setPhase("pick");
  }, [open, initialPayoutId, sorted]);

  const selected = useMemo(
    () => (selectedId ? sorted.find((p) => p.id === selectedId) ?? null : null),
    [sorted, selectedId]
  );

  const handleSaved = useCallback(() => {
    onClose();
  }, [onClose]);

  if (!open || sorted.length === 0) return null;

  return (
    <div className="fixed inset-0 z-[175] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/55 backdrop-blur-xl backdrop-saturate-150"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-payout-flow-title"
        className={panelClass}
        onClick={(e) => e.stopPropagation()}
      >
        {phase === "pick" ? (
          <>
            <header className="flex shrink-0 items-center justify-between border-b border-white/[0.06] px-5 py-4">
              <h2
                id="edit-payout-flow-title"
                className="text-lg font-semibold tracking-tight text-white/92"
              >
                Edit payout
              </h2>
              <button type="button" onClick={onClose} className={headerBtnClass} aria-label="Close">
                ×
              </button>
            </header>
            <p className="px-5 pt-4 text-[13px] leading-relaxed text-zinc-400">
              Several payouts for{" "}
              <span className="font-medium text-white/88">{account.displayAccountCode?.trim() || account.sizeLabel}</span>.
              Pick one — amounts match what you see on the account.
            </p>
            <ul className="max-h-[min(50vh,22rem)] min-h-0 flex-1 overflow-y-auto overscroll-contain divide-y divide-white/[0.06] px-5 py-3 [scrollbar-color:rgba(255,255,255,0.12)_transparent] [scrollbar-width:thin]">
              {sorted.map((p) => {
                const d = p.paidDate ?? p.requestedDate;
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between gap-3 py-3 text-left transition hover:bg-white/[0.04]"
                      onClick={() => {
                        setSelectedId(p.id);
                        setPhase("edit");
                      }}
                    >
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium text-white/90">{formatListDate(d)}</p>
                        {p.note ? (
                          <p className="truncate text-[11px] text-zinc-500">{p.note}</p>
                        ) : null}
                      </div>
                      <span className="shrink-0 tabular-nums text-sm font-semibold text-amber-200/95">
                        +{formatUsdWholeGrouped(journalPayoutDisplayCents(p, account) / 100)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        ) : selected ? (
          <EditPayoutForm
            key={selected.id}
            account={account}
            payout={selected}
            showBack={sorted.length > 1}
            onBack={() => {
              setPhase("pick");
              setSelectedId(null);
            }}
            onClose={onClose}
            onSaved={handleSaved}
            dispatch={dispatch}
          />
        ) : null}
      </div>
    </div>
  );
}

function EditPayoutForm({
  account,
  payout,
  showBack,
  onBack,
  onClose,
  onSaved,
  dispatch,
}: {
  account: JournalAccount;
  payout: JournalPayoutEntry;
  showBack: boolean;
  onBack: () => void;
  onClose: () => void;
  onSaved: () => void;
  dispatch: (a: JournalAction) => void;
}) {
  const [amountStr, setAmountStr] = useState("");
  const [date, setDate] = useState("");
  const [note, setNote] = useState("");

  useLayoutEffect(() => {
    setAmountStr((journalPayoutDisplayCents(payout, account) / 100).toFixed(2));
    setDate(payout.paidDate ?? payout.requestedDate);
    setNote(payout.note ?? "");
  }, [payout, account]);

  const amountUsd = parseUsdInput(amountStr);
  const invalid = amountUsd === null;
  const saveDisabled = invalid || !date.trim();

  function save() {
    if (saveDisabled) return;
    const displayCents = Math.round(amountUsd * 100);
    const grossCents = journalPayoutGrossCentsFromDisplayInput(displayCents, account);
    if (grossCents <= 0) return;
    const t = nowIso();
    dispatch({
      type: "payout/upsert",
      payload: {
        ...payout,
        grossAmountCents: grossCents,
        netAmountCents: grossCents,
        requestedDate: date.trim(),
        paidDate: date.trim(),
        note: note.trim() || undefined,
        updatedAt: t,
      },
    });
    onSaved();
  }

  return (
    <>
      <header className="flex shrink-0 items-center justify-between border-b border-white/[0.06] px-5 py-4">
        <div className="flex min-w-0 items-center gap-2">
          {showBack ? (
            <button
              type="button"
              onClick={onBack}
              className="shrink-0 rounded-lg border border-white/10 px-2 py-1 text-xs font-medium text-white/75 transition hover:bg-white/[0.06]"
            >
              Back
            </button>
          ) : null}
          <h2 className="truncate text-lg font-semibold tracking-tight text-white/92">Edit payout</h2>
        </div>
        <button type="button" onClick={onClose} className={headerBtnClass} aria-label="Close">
          ×
        </button>
      </header>
      <p className="shrink-0 px-5 pt-4 text-[13px] leading-relaxed text-zinc-400">
        Same number as on the account page (after split for TopStep / Take Profit Trader). Saving updates
        the wallet amount stored in the workspace accordingly.
      </p>
      <div
        className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4"
        onKeyDown={(e) => handleModalEnterToSubmit(e, save, saveDisabled)}
      >
        <div>
          <label className={fieldLabelClass} htmlFor="edit-payout-amount">
            Amount (USD)
          </label>
          <input
            id="edit-payout-amount"
            type="text"
            inputMode="decimal"
            className={`${inputClass} mt-1.5`}
            value={amountStr}
            onChange={(e) => setAmountStr(e.target.value)}
            autoComplete="off"
          />
        </div>
        <div>
          <label className={fieldLabelClass} htmlFor="edit-payout-date">
            Date
          </label>
          <input
            id="edit-payout-date"
            type="date"
            className={`${inputClass} mt-1.5 [color-scheme:dark]`}
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <div>
          <label className={fieldLabelClass} htmlFor="edit-payout-note">
            Notes (optional)
          </label>
          <input
            id="edit-payout-note"
            type="text"
            className={`${inputClass} mt-1.5`}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            autoComplete="off"
          />
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-white/[0.06] bg-[#0a0a0c] px-5 py-4">
        <button
          type="button"
          onClick={onClose}
          className="rounded-[10px] border border-white/10 bg-zinc-900/55 px-4 py-2.5 text-sm font-medium text-white/88 transition hover:border-white/18 hover:bg-zinc-800/75"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={save}
          disabled={saveDisabled}
          className="rounded-[10px] border border-white/15 bg-white/90 px-4 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-45"
        >
          Save
        </button>
      </div>
    </>
  );
}
