"use client";

import { createPortal } from "react-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import type { AccountType, JournalAccount } from "@/lib/journal/types";
import { handleModalEnterToSubmit } from "@/components/journal/modal-enter-submit";

const KIND_OPTIONS: { value: AccountType; label: string }[] = [
  { value: "challenge", label: "Evaluation" },
  { value: "funded", label: "Funded" },
  { value: "live", label: "Live" },
];

export type AccountRowSavePayload = {
  displayName: string;
  accountType: AccountType;
};

type Props = {
  account: JournalAccount;
  open: boolean;
  anchorRect: DOMRect | null;
  resolvedName: string;
  onClose: () => void;
  /** Single write so `accountType` and display name are not overwritten by two stale dispatches */
  onSave: (payload: AccountRowSavePayload) => void;
};

export function AccountRowEditPopover({
  account,
  open,
  anchorRect,
  resolvedName,
  onClose,
  onSave,
}: Props) {
  const [draft, setDraft] = useState(
    () => account.displayAccountCode?.trim() ?? resolvedName
  );
  const draftRef = useRef(draft);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const el = panelRef.current;
      if (el && !el.contains(e.target as Node)) {
        onSave({
          displayName: draftRef.current.trim(),
          accountType: account.accountType,
        });
        onClose();
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onSave({
          displayName: draftRef.current.trim(),
          accountType: account.accountType,
        });
        onClose();
      }
    };
    const t = window.setTimeout(() => {
      document.addEventListener("mousedown", onDoc);
      window.addEventListener("keydown", onKey);
    }, 0);
    return () => {
      clearTimeout(t);
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose, onSave, account.accountType]);

  const pos = useMemo(() => {
    if (!open || !anchorRect) return { top: 0, left: 0, maxW: 280 };
    const vw = typeof window !== "undefined" ? window.innerWidth : 1200;
    const maxW = 280;
    let left = anchorRect.left;
    if (left + maxW > vw - 12) left = Math.max(12, vw - maxW - 12);
    return {
      top: anchorRect.bottom + 6,
      left,
      maxW,
    };
  }, [open, anchorRect]);

  if (!open || !anchorRect || typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={panelRef}
      role="dialog"
      aria-label="Edit account"
      className="fixed z-[160] rounded-xl border border-white/12 bg-[#0e1014] p-3 shadow-[0_20px_60px_rgba(0,0,0,0.65)] backdrop-blur-md"
      style={{ top: pos.top, left: pos.left, width: pos.maxW }}
      onKeyDown={(e) =>
        handleModalEnterToSubmit(
          e,
          () => {
            onSave({
              displayName: draft.trim(),
              accountType: account.accountType,
            });
            onClose();
          },
          false
        )
      }
    >
      <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
        Display name
      </p>
      <input
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        className="mt-1.5 w-full rounded-lg border border-white/10 bg-zinc-950/80 px-2.5 py-1.5 text-[13px] text-white outline-none focus:border-sky-400/40 focus:ring-1 focus:ring-sky-400/25"
      />
      <p className="mt-3 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
        Account type
      </p>
      <div className="mt-1.5 flex flex-wrap gap-1">
        {KIND_OPTIONS.map((opt) => {
          const active = account.accountType === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onSave({
                  displayName: draftRef.current.trim(),
                  accountType: opt.value,
                });
                onClose();
              }}
              className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition ${
                active
                  ? "border-sky-400/45 bg-sky-500/15 text-sky-100"
                  : "border-white/10 bg-zinc-950/50 text-zinc-400 hover:border-white/18 hover:text-zinc-200"
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>,
    document.body
  );
}
