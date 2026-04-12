"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { handleModalEnterToSubmit } from "@/components/journal/modal-enter-submit";
import type { FeeType } from "@/lib/journal/types";

const panelClass =
  "relative z-[210] w-full max-w-md rounded-2xl border border-white/[0.12] bg-[#0a0d14] shadow-[0_24px_80px_rgba(0,0,0,0.72),inset_0_1px_0_0_rgba(255,255,255,0.04)]";

const labelClass = "text-[11px] font-medium uppercase tracking-[0.14em] text-white/45";

const inputClass =
  "w-full rounded-xl border border-white/10 bg-zinc-950/80 px-3.5 py-2.5 text-sm text-white/92 outline-none transition placeholder:text-zinc-600 focus:border-sky-400/35 focus:shadow-[0_0_0_3px_rgba(56,189,248,0.12)]";

const FEE_OPTIONS: { value: FeeType; label: string }[] = [
  { value: "reset_fee", label: "Reset" },
  { value: "monthly_subscription", label: "Monthly Subscription" },
  { value: "other", label: "Other" },
];

export type AddAccountFeeSubmit = {
  type: FeeType;
  amountCents: number;
  date: string;
  note?: string;
};

type Props = {
  open: boolean;
  defaultDate: string;
  onClose: () => void;
  onConfirm: (payload: AddAccountFeeSubmit) => void;
};

function parseUsdToCents(raw: string): number | null {
  const t = raw.trim().replace(/\s/g, "").replace(",", ".");
  if (t === "") return null;
  const n = Number(t);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

export function AddAccountFeeModal({ open, defaultDate, onClose, onConfirm }: Props) {
  const [type, setType] = useState<FeeType>("reset_fee");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(defaultDate);
  const [note, setNote] = useState("");

  useEffect(() => {
    if (open) {
      setDate(defaultDate);
      setType("reset_fee");
      setAmount("");
      setNote("");
    }
  }, [open, defaultDate]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  const cents = parseUsdToCents(amount);
  const canSubmit = cents != null && cents > 0;

  function confirmFee() {
    if (!canSubmit || cents == null) return;
    onConfirm({
      type,
      amountCents: cents,
      date,
      note: note.trim() || undefined,
    });
    onClose();
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[205] flex items-center justify-center bg-black/70 p-4 backdrop-blur-[6px]"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={panelClass}
        role="dialog"
        aria-labelledby="add-fee-title"
        onMouseDown={(e) => e.stopPropagation()}
        onKeyDown={(e) => handleModalEnterToSubmit(e, confirmFee, !canSubmit)}
      >
        <div className="flex items-start justify-between gap-3 border-b border-white/[0.08] px-5 py-4">
          <h2 id="add-fee-title" className="text-lg font-semibold tracking-tight text-white">
            Add Fee
          </h2>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 text-white/50 transition hover:border-white/20 hover:bg-white/[0.05] hover:text-white"
          >
            ×
          </button>
        </div>
        <div className="space-y-4 px-5 py-5">
          <div>
            <label className={labelClass} htmlFor="fee-type">
              Type
            </label>
            <select
              id="fee-type"
              value={type}
              onChange={(e) => setType(e.target.value as FeeType)}
              className={`${inputClass} mt-1.5 cursor-pointer appearance-none bg-[url('data:image/svg+xml,%3Csvg%20xmlns=%27http://www.w3.org/2000/svg%27%20width=%2712%27%20height=%278%27%20fill=%27none%27%3E%3Cpath%20stroke=%27%23a1a1aa%27%20stroke-linecap=%27round%27%20d=%27M2%202l4%204%204-4%27/%3E%3C/svg%3E')] bg-[length:12px_8px] bg-[right_14px_center] bg-no-repeat pr-10`}
            >
              {FEE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value} className="bg-zinc-900">
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass} htmlFor="fee-amount">
              Amount ($)
            </label>
            <input
              id="fee-amount"
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className={`${inputClass} mt-1.5 tabular-nums`}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="fee-date">
              Date
            </label>
            <input
              id="fee-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={`${inputClass} mt-1.5 [color-scheme:dark]`}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="fee-note">
              Description (optional)
            </label>
            <input
              id="fee-note"
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g., First reset"
              className={`${inputClass} mt-1.5`}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-white/[0.08] px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/15 bg-white/[0.03] px-4 py-2.5 text-sm font-medium text-white/85 transition hover:border-white/25 hover:bg-white/[0.07]"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!canSubmit}
            onClick={confirmFee}
            className="rounded-xl bg-gradient-to-b from-sky-200/95 to-sky-400/90 px-5 py-2.5 text-sm font-semibold text-zinc-950 shadow-[0_0_24px_rgba(56,189,248,0.25)] transition hover:from-sky-100 hover:to-sky-300/95 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
          >
            Add Fee
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
