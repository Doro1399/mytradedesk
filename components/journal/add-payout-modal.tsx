"use client";

/* eslint-disable react-hooks/set-state-in-effect -- exit animation matches compare modals */

import {
  useEffect,
  useMemo,
  useState,
  type AnimationEvent,
} from "react";
import type { JournalAccount } from "@/lib/journal/types";
import {
  journalPayoutDashboardHintFromGrossUsd,
  journalTraderDisplayCentsFromGrossCents,
} from "@/lib/journal/payout-display";
import { getTptFundedPayoutFeeWarning } from "@/lib/journal/tpt-funded-payout-state";
import { handleModalEnterToSubmit } from "@/components/journal/modal-enter-submit";

const MODAL_EXIT_UNMOUNT_MS = 460;

const panelClass =
  "relative z-10 flex w-full max-w-lg max-h-[min(90vh,640px)] flex-col overflow-hidden rounded-2xl border border-zinc-800/60 bg-[#0c0c0e] shadow-[0_24px_80px_rgba(0,0,0,0.65)] [will-change:transform,opacity]";

const headerBtnClass =
  "flex h-9 w-9 items-center justify-center rounded-[10px] border border-white/10 text-xl leading-none text-white/60 transition hover:border-white/20 hover:bg-white/[0.05] hover:text-white";

const fieldLabelClass = "text-[11px] font-medium uppercase tracking-wide text-zinc-500";

const inputClass =
  "w-full rounded-lg border border-white/10 bg-zinc-950/70 px-3 py-2 text-sm text-white/90 outline-none transition placeholder:text-zinc-600 focus:border-sky-400/40 focus:ring-1 focus:ring-sky-400/20";

const amountInputClass =
  "w-[7.25rem] shrink-0 rounded-lg border border-white/10 bg-zinc-950/70 px-2.5 py-1.5 text-right text-sm tabular-nums text-white/90 outline-none transition placeholder:text-zinc-600 focus:border-sky-400/40 focus:ring-1 focus:ring-sky-400/20";

/** Matches compare modals: thin dark thumb, no harsh track (Firefox + WebKit). */
const scrollAreaClass =
  "min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-3 [scrollbar-color:rgba(255,255,255,0.12)_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:transition-colors [&::-webkit-scrollbar-thumb:hover]:bg-white/[0.16]";

export type PayoutModalAccountLine = {
  id: string;
  label: string;
  firmName: string;
  /** Si présent : saisie = montant **brut** retiré du compte ; ligne d’aide split dashboard. */
  journalAccount?: JournalAccount;
};

type Props = {
  open: boolean;
  accounts: PayoutModalAccountLine[];
  defaultDate: string;
  onClose: () => void;
  /** Same UI as bulk add; copy targets one named account (account detail page). */
  variant?: "multi" | "singleAccount";
  /**
   * Préremplit le montant (USD) par compte à l’ouverture — ex. max indicatif depuis la runway Progress.
   */
  suggestedAmountUsdByAccountId?: Record<string, number>;
  /** Bandeau d’avertissement (ex. rappel dashboard prop firm). */
  confirmBanner?: string | null;
  onConfirm: (payload: {
    date: string;
    note: string;
    perAccount: { accountId: string; netUsd: number }[];
  }) => void;
};

function parseUsdInput(raw: string): number | null {
  const t = raw.trim().replace(/\s/g, "").replace(",", ".");
  if (t === "") return 0;
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function formatUsd2(n: number): string {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function amountInitFromSuggestion(usd: number | undefined): string {
  if (usd == null || !Number.isFinite(usd) || usd <= 0) return "";
  return usd.toFixed(2);
}

export function AddPayoutModal({
  open,
  accounts,
  defaultDate,
  onClose,
  variant = "multi",
  suggestedAmountUsdByAccountId,
  confirmBanner,
  onConfirm,
}: Props) {
  const canShow = open && accounts.length > 0;
  const [mounted, setMounted] = useState(false);
  const [closing, setClosing] = useState(false);
  /** Raw string per account for controlled inputs */
  const [amountByAccountId, setAmountByAccountId] = useState<Record<string, string>>({});
  const [date, setDate] = useState(defaultDate);
  const [note, setNote] = useState("");

  const accountsKey = useMemo(() => accounts.map((a) => a.id).join("\0"), [accounts]);
  const suggestionKey = useMemo(() => {
    if (!suggestedAmountUsdByAccountId) return "";
    return accounts
      .map((a) => `${a.id}:${suggestedAmountUsdByAccountId[a.id] ?? ""}`)
      .join("|");
  }, [accounts, suggestedAmountUsdByAccountId]);

  useEffect(() => {
    if (canShow) {
      setMounted(true);
      setClosing(false);
      const init: Record<string, string> = {};
      for (const a of accounts) {
        init[a.id] = amountInitFromSuggestion(suggestedAmountUsdByAccountId?.[a.id]);
      }
      setAmountByAccountId(init);
      setDate(defaultDate);
      setNote("");
    } else if (mounted) {
      setClosing(true);
    }
  }, [canShow, mounted, defaultDate, accountsKey, accounts, suggestionKey]);

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

  const totalUsd = useMemo(() => {
    let sum = 0;
    for (const raw of Object.values(amountByAccountId)) {
      const n = parseUsdInput(raw);
      if (n === null) return null;
      sum += n;
    }
    return sum;
  }, [amountByAccountId]);

  /** Somme des montants enregistrés sur le dashboard (part trader après split), par ligne. */
  const totalEffectiveUsd = useMemo(() => {
    let sumCents = 0;
    for (const a of accounts) {
      const raw = amountByAccountId[a.id] ?? "";
      const n = parseUsdInput(raw);
      if (n === null) return null;
      const grossCents = Math.round(n * 100);
      if (a.journalAccount) {
        sumCents += journalTraderDisplayCentsFromGrossCents(grossCents, a.journalAccount);
      } else {
        sumCents += grossCents;
      }
    }
    return sumCents / 100;
  }, [accounts, amountByAccountId]);

  if (!mounted || accounts.length === 0) return null;

  const backdropAnim = closing
    ? "compare-modal-backdrop--out"
    : "compare-modal-backdrop--in";
  const panelAnim = closing ? "compare-modal-panel--out" : "compare-modal-panel--in";

  const acctWord = accounts.length === 1 ? "account" : "accounts";
  const totalInvalid = totalUsd === null;

  const submitDisabled = totalInvalid || totalUsd === 0;

  function submit() {
    if (submitDisabled) return;
    const perAccount: { accountId: string; netUsd: number }[] = [];
    for (const a of accounts) {
      const raw = amountByAccountId[a.id] ?? "";
      const n = parseUsdInput(raw);
      if (n === null) return;
      if (n > 0) perAccount.push({ accountId: a.id, netUsd: n });
    }
    if (perAccount.length === 0) return;
    onConfirm({
      date: date.trim(),
      note: note.trim(),
      perAccount,
    });
  }

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
        aria-labelledby="add-payout-title"
        className={`${panelClass} ${panelAnim}`}
        onClick={(e) => e.stopPropagation()}
        onAnimationEnd={onPanelAnimationEnd}
        onKeyDown={(e) => handleModalEnterToSubmit(e, submit, submitDisabled)}
      >
        <header className="flex shrink-0 items-center justify-between border-b border-white/[0.06] px-5 py-4">
          <h2
            id="add-payout-title"
            className="text-lg font-semibold tracking-tight text-white/92"
          >
            Add Payout
          </h2>
          <button type="button" onClick={onClose} className={headerBtnClass} aria-label="Close">
            ×
          </button>
        </header>

        <p className="shrink-0 px-5 pt-4 text-[13px] leading-relaxed text-zinc-400">
          {variant === "singleAccount" && accounts[0] ? (
            <>
              Enter the <span className="text-white/75">gross</span> payout (full amount withdrawn from
              the prop account) for{" "}
              <span className="font-medium text-white/88">{accounts[0].label}</span>. Only amounts greater
              than zero are saved.
            </>
          ) : (
            <>
              Enter the <span className="text-white/75">gross</span> payout per funded {acctWord}{" "}
              (withdrawn from the account). Only rows &gt; 0 are saved.
            </>
          )}
        </p>

        {confirmBanner?.trim() ? (
          <p
            className="mx-5 mt-3 rounded-lg border border-amber-400/35 bg-amber-500/[0.12] px-3 py-2.5 text-[11px] leading-snug text-amber-100/95"
            role="note"
          >
            {confirmBanner.trim()}
          </p>
        ) : null}

        <div className={scrollAreaClass}>
          <ul className="divide-y divide-white/[0.06]">
            {accounts.map((a) => {
              const rawAmt = amountByAccountId[a.id] ?? "";
              const parsed = parseUsdInput(rawAmt);
              const hint =
                a.journalAccount != null && parsed != null && parsed > 0
                  ? journalPayoutDashboardHintFromGrossUsd(parsed, a.journalAccount)
                  : null;
              const tptFeeWarn =
                a.journalAccount != null && parsed != null && parsed > 0
                  ? getTptFundedPayoutFeeWarning(a.journalAccount, parsed)
                  : { show: false as boolean, message: "" };
              return (
                <li key={a.id} className="flex flex-col gap-1 py-3 first:pt-1">
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px] font-medium text-white/90">{a.label}</div>
                      <div className="truncate text-[11px] text-zinc-500">{a.firmName}</div>
                    </div>
                    <label className="sr-only" htmlFor={`payout-amt-${a.id}`}>
                      Gross payout for {a.label}
                    </label>
                    <input
                      id={`payout-amt-${a.id}`}
                      type="text"
                      inputMode="decimal"
                      className={amountInputClass}
                      placeholder="0.00"
                      autoComplete="off"
                      value={rawAmt}
                      onChange={(e) =>
                        setAmountByAccountId((prev) => ({
                          ...prev,
                          [a.id]: e.target.value,
                        }))
                      }
                    />
                  </div>
                  {hint ? (
                    <p className="pl-0 text-[11px] leading-snug text-zinc-500 sm:pl-[calc(min(100%,18rem)+0.75rem)]">
                      {hint}
                    </p>
                  ) : null}
                  {tptFeeWarn.show ? (
                    <p className="pl-0 text-[11px] leading-snug text-amber-200/85 sm:pl-[calc(min(100%,18rem)+0.75rem)]">
                      {tptFeeWarn.message}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>

        <div className="shrink-0 space-y-3 border-t border-white/[0.06] bg-[#0a0a0c] px-5 py-4">
          <div className="flex items-baseline justify-between gap-3">
            <span className={fieldLabelClass}>Effective total</span>
            <span
              className={`text-lg font-semibold tabular-nums tracking-tight ${
                totalInvalid ? "text-red-400" : "text-white/92"
              }`}
              title="Sum recorded on the dashboard (trader share after split)"
            >
              {totalInvalid ? "—" : `$${formatUsd2(totalEffectiveUsd!)}`}
            </span>
          </div>
          <div>
            <label className={fieldLabelClass} htmlFor="payout-date">
              Date
            </label>
            <input
              id="payout-date"
              type="date"
              className={`${inputClass} mt-1.5 [color-scheme:dark]`}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div>
            <label className={fieldLabelClass} htmlFor="payout-note">
              Notes (optional)
            </label>
            <input
              id="payout-note"
              type="text"
              className={`${inputClass} mt-1.5`}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g., Weekly payout"
              autoComplete="off"
            />
          </div>
          <div className="flex flex-wrap justify-end gap-2 pt-1">
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
              disabled={submitDisabled}
              className="rounded-[10px] border border-white/15 bg-white/90 px-4 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-45"
            >
              Add Payout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
