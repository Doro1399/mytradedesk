"use client";

import { createPortal } from "react-dom";
import { memo, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { AccountStatus, JournalAccount } from "@/lib/journal/types";

const STATUS_OPTIONS: { value: AccountStatus; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "passed", label: "Passed" },
  { value: "failed", label: "Blown" },
];

function statusPillClass(status: AccountStatus): string {
  switch (status) {
    case "passed":
      return "border-emerald-400/50 bg-gradient-to-b from-emerald-500/28 to-emerald-600/12 text-emerald-50 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08),0_0_20px_rgba(16,185,129,0.2)]";
    case "failed":
      return "border-red-500/50 bg-gradient-to-b from-red-500/25 to-red-900/15 text-red-50 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06),0_0_18px_rgba(239,68,68,0.16)]";
    case "active":
      /* Flat fill avoids subpixel color fringing on “Active” vs layered gradients */
      return "border-white/16 bg-zinc-800/85 text-zinc-100 antialiased";
    case "closed":
      return "border-white/14 bg-gradient-to-b from-white/[0.09] to-white/[0.03] text-white/88 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]";
    default:
      return "border-white/14 bg-gradient-to-b from-white/[0.09] to-white/[0.03] text-white/88 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]";
  }
}

function accountStatusLabel(status: JournalAccount["status"]): string {
  switch (status) {
    case "active":
      return "Active";
    case "passed":
      return "Passed";
    case "failed":
      return "Blown";
    case "closed":
      return "Closed";
    case "archived":
      return "Archived";
    default:
      return status;
  }
}

function AccountStatusDropdownInner({
  accountId,
  account,
  onSelect,
  labelForStatus = accountStatusLabel,
  classNameForStatus = statusPillClass,
  planReadOnly = false,
}: {
  /** Must match `account.id` — used for dispatch so updates never target the wrong row */
  accountId: string;
  account: JournalAccount;
  onSelect: (accountId: string, next: AccountStatus) => void;
  labelForStatus?: (s: AccountStatus) => string;
  classNameForStatus?: (s: AccountStatus) => string;
  /** Lite overflow: account is view-only — status cannot be changed. */
  planReadOnly?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ top: 0, left: 0, minWidth: 0 });

  useLayoutEffect(() => {
    if (!open || !wrapRef.current) return;
    const r = wrapRef.current.getBoundingClientRect();
    setCoords({
      top: r.bottom + 5,
      left: r.left,
      minWidth: Math.max(r.width, 128),
    });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onScroll = () => setOpen(false);
    window.addEventListener("scroll", onScroll, true);
    return () => window.removeEventListener("scroll", onScroll, true);
  }, [open]);

  const statusLocked = account.status === "failed";
  const menuLocked = statusLocked || planReadOnly;

  useEffect(() => {
    if (menuLocked) setOpen(false);
  }, [menuLocked]);

  function toggleMenu() {
    if (menuLocked) return;
    setOpen((o) => !o);
  }

  /** Passed accounts may only move to Blown — not back to Active. */
  const menuOptions =
    account.status === "passed"
      ? STATUS_OPTIONS.filter((o) => o.value === "passed" || o.value === "failed")
      : STATUS_OPTIONS;

  const menu =
    !menuLocked &&
    open &&
    typeof document !== "undefined"
      ? createPortal(
          <>
            <button
              type="button"
              aria-label="Close menu"
              className="fixed inset-0 z-[140]"
              onClick={() => setOpen(false)}
            />
            <ul
              role="listbox"
              className="fixed z-[150] max-h-[min(280px,70vh)] overflow-y-auto rounded-xl border border-white/10 bg-zinc-950/98 py-1 shadow-[0_18px_50px_rgba(0,0,0,0.55)] backdrop-blur-md"
              style={{
                top: coords.top,
                left: coords.left,
                minWidth: coords.minWidth,
              }}
            >
              {menuOptions.map((opt) => {
                const selected = account.status === opt.value;
                return (
                  <li key={opt.value} role="option" aria-selected={selected}>
                    <button
                      type="button"
                      className={`flex w-full items-center px-2.5 py-1.5 text-left text-[12px] transition ${
                        selected
                          ? "bg-white/10 text-white"
                          : "text-white/80 hover:bg-white/[0.07]"
                      }`}
                      onClick={() => {
                        setOpen(false);
                        if (opt.value !== account.status) {
                          onSelect(accountId, opt.value);
                        }
                      }}
                    >
                      {opt.label}
                    </button>
                  </li>
                );
              })}
            </ul>
          </>,
          document.body,
          `journal-status-menu-${accountId}`
        )
      : null;

  return (
    <div
      ref={wrapRef}
      onClick={(e) => e.stopPropagation()}
      className={
        menuLocked
          ? "inline-flex max-w-full items-center gap-1"
          : /* Décale pilule + chevron vers la droite pour aligner le corps de la pilule sur « Blown » (sans chevron) */
            "inline-flex max-w-full translate-x-[8px] items-center gap-1"
      }
      data-account-id={accountId}
    >
      {menuLocked ? (
        <span
          className={`inline-flex min-h-[1.85rem] min-w-[5.5rem] max-w-[11rem] shrink-0 cursor-default items-center justify-center rounded-full border px-3 py-1.5 text-[11px] font-semibold leading-tight tracking-tight ${classNameForStatus(
            account.status
          )}`}
          title={planReadOnly ? "View only on your current plan" : "Status locked"}
        >
          <span className="min-w-0 truncate whitespace-nowrap text-center">
            {labelForStatus(account.status)}
          </span>
        </span>
      ) : (
        <>
          <button
            type="button"
            aria-haspopup="listbox"
            aria-expanded={open}
            onClick={(e) => {
              e.stopPropagation();
              toggleMenu();
            }}
            className={`inline-flex min-h-[1.85rem] min-w-[5.5rem] max-w-[11rem] shrink-0 items-center justify-center rounded-full border px-3 py-1.5 text-[11px] font-semibold leading-tight tracking-tight transition hover:opacity-[0.97] ${classNameForStatus(
              account.status
            )}`}
          >
            <span className="min-w-0 truncate whitespace-nowrap text-center">
              {labelForStatus(account.status)}
            </span>
          </button>
          <button
            type="button"
            aria-label="Open status menu"
            aria-expanded={open}
            onClick={(e) => {
              e.stopPropagation();
              toggleMenu();
            }}
            className="inline-flex shrink-0 items-center justify-center p-0.5 text-white/45 transition hover:text-white/80"
          >
            <svg
              viewBox="0 0 12 12"
              className={`h-3.5 w-3.5 transition ${open ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              aria-hidden
            >
              <path d="M2.5 4.5L6 8l3.5-3.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </>
      )}
      {menu}
    </div>
  );
}

export const AccountStatusDropdown = memo(AccountStatusDropdownInner);
