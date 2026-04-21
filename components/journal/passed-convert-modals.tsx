"use client";

/* Modal mount/exit and snapshot timing mirror `components/compare-detail-modal.tsx` (compare modal). */

import {
  useEffect,
  useState,
  type AnimationEvent,
} from "react";
import { isoDateLocal } from "@/lib/journal/local-iso-date";
import type { ISODate, JournalAccount } from "@/lib/journal/types";
import {
  findEvalCompareRow,
  findFundedCompareRow,
} from "@/lib/journal/compare-account-helpers";
import { isActivationFree, type PropFirm } from "@/lib/prop-firms";
import { handleModalEnterToSubmit } from "@/components/journal/modal-enter-submit";

export { findFundedCompareRow } from "@/lib/journal/compare-account-helpers";

const MODAL_EXIT_UNMOUNT_MS = 460;

/** Align with compare detail modal + journal zinc / sky primary actions */
const panelClass =
  "relative z-10 flex w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-zinc-800/60 bg-[#0c0c0e] shadow-[0_24px_80px_rgba(0,0,0,0.65)] [will-change:transform,opacity]";

const headerBtnClass =
  "flex h-9 w-9 items-center justify-center rounded-[10px] border border-white/10 text-xl leading-none text-white/60 transition hover:border-white/20 hover:bg-white/[0.05] hover:text-white";

const btnSecondary =
  "rounded-[10px] border border-white/10 bg-zinc-900/55 px-4 py-2 text-sm font-medium text-white/88 transition hover:border-white/18 hover:bg-zinc-800/75";

const btnPrimary =
  "rounded-[10px] border border-sky-400/40 bg-sky-500/[0.16] px-4 py-2 text-sm font-semibold text-sky-50 shadow-[0_0_28px_rgba(56,189,248,0.18)] transition hover:border-sky-400/55 hover:bg-sky-500/25";

const fieldLabelClass = "text-[11px] font-medium uppercase tracking-wide text-zinc-500";

const inputEditableClass =
  "w-full rounded-lg border border-white/10 bg-zinc-950/70 px-3 py-2 text-sm text-white/90 outline-none transition placeholder:text-zinc-600 focus:border-sky-400/40 focus:ring-1 focus:ring-sky-400/20";

const recapBoxClass =
  "rounded-lg border border-white/[0.06] bg-zinc-950/40 px-3 py-2 text-sm tabular-nums text-white/65";

export type PassedConvertFlow =
  | null
  | { accountId: string; phase: "intro" | "convert" };

/**
 * Préremplissage depuis `propFirms` (CSV) : frais d’activation de la ligne Direct correspondante,
 * sinon de la ligne Eval (même programme / taille que le journal). Évite les faux $0 quand aucune
 * ligne Direct n’existe pour l’éval (ex. Bluesky Launch) ou qu’une ligne Direct sans frais était
 * résolue par erreur via un autre produit.
 */
export function activationFeeFromCompare(acc: JournalAccount): string {
  const funded = findFundedCompareRow(acc);
  const evalRow = findEvalCompareRow(acc);

  const usdFrom = (row: PropFirm | null): number | null => {
    if (!row) return null;
    if (!isActivationFree(row) && row.activationFeeUsd != null) {
      return row.activationFeeUsd;
    }
    return null;
  };

  const fromFunded = usdFrom(funded);
  if (fromFunded != null) return String(fromFunded);

  // Direct résolu dans le compare et activation gratuite : ne pas reprendre les frais d’achat éval.
  if (funded != null && isActivationFree(funded)) {
    return "0";
  }

  const fromEval = usdFrom(evalRow);
  if (fromEval != null) return String(fromEval);

  return "0";
}

function parseFeeUsd(input: string): number {
  const t = input.trim().replace(/\s/g, "").replace(",", ".");
  if (t === "") return 0;
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

type Props = {
  flow: PassedConvertFlow;
  account: JournalAccount | null;
  formatAccountLabel: (acc: JournalAccount) => string;
  open: boolean;
  onClose: () => void;
  onIntroMaybeLater: () => void;
  onIntroConvertNow: () => void;
  onConfirmConvert: (payload: {
    newDisplayName: string;
    activationFeeUsd: number;
    /** Date enregistrée sur la ligne de frais d’activation et dates de compte funded. */
    fundedConversionDate: ISODate;
    /** Tradeify Select (éval unifiée) → funded Daily ou Flex. */
    tradeifySelectFundedVariant?: "daily" | "flex";
  }) => void;
};

function isTradeifySelectUnifiedChallenge(acc: JournalAccount): boolean {
  return (
    acc.propFirm.name.trim() === "Tradeify" &&
    acc.accountType === "challenge" &&
    acc.compareProgramName?.trim() === "Tradeify Select"
  );
}

export function PassedConvertModalHost({
  flow,
  account,
  formatAccountLabel,
  open,
  onClose,
  onIntroMaybeLater,
  onIntroConvertNow,
  onConfirmConvert,
}: Props) {
  const [snapshot, setSnapshot] = useState<{
    account: JournalAccount;
    flow: NonNullable<PassedConvertFlow>;
  } | null>(null);

  useEffect(() => {
    if (account && flow) {
      setSnapshot({ account, flow });
    }
  }, [account, flow]);

  const acc = account ?? snapshot?.account ?? null;
  const fl = flow ?? snapshot?.flow ?? null;

  const [mounted, setMounted] = useState(false);
  const [closing, setClosing] = useState(false);

  const [newName, setNewName] = useState("");
  /** Unique editable fee field; drives recap + confirm */
  const [applyAllAmount, setApplyAllAmount] = useState("");
  const [fundedConversionDate, setFundedConversionDate] = useState<ISODate>(() =>
    isoDateLocal()
  );
  const [tradeifySelectVariant, setTradeifySelectVariant] = useState<"daily" | "flex">("daily");

  useEffect(() => {
    if (open) {
      setMounted(true);
      setClosing(false);
    } else if (mounted) {
      setClosing(true);
    }
  }, [open, mounted]);

  useEffect(() => {
    if (!closing || !mounted) return;
    const t = window.setTimeout(() => {
      setMounted(false);
      setClosing(false);
      setSnapshot(null);
    }, MODAL_EXIT_UNMOUNT_MS);
    return () => clearTimeout(t);
  }, [closing, mounted]);

  const onPanelAnimationEnd = (e: AnimationEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    if (!closing) return;
    if (!String(e.animationName).includes("compare-modal-panel-out")) return;
    setMounted(false);
    setClosing(false);
    setSnapshot(null);
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

  useEffect(() => {
    if (fl?.phase === "convert" && acc) {
      const fee = activationFeeFromCompare(acc);
      setNewName(formatAccountLabel(acc));
      setApplyAllAmount(fee);
      setFundedConversionDate(isoDateLocal());
      setTradeifySelectVariant("daily");
    }
  }, [fl?.phase, fl?.accountId, acc, formatAccountLabel]);

  if (!mounted || !acc || !fl) return null;

  const backdropAnim = closing
    ? "compare-modal-backdrop--out"
    : "compare-modal-backdrop--in";
  const panelAnim = closing ? "compare-modal-panel--out" : "compare-modal-panel--in";

  const isIntro = fl.phase === "intro";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close"
        className={`absolute inset-0 bg-black/50 backdrop-blur-xl backdrop-saturate-150 ${backdropAnim}`}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="passed-modal-title"
        className={`${panelClass} ${panelAnim}`}
        onClick={(e) => e.stopPropagation()}
        onAnimationEnd={onPanelAnimationEnd}
        onKeyDown={(e) => {
          if (isIntro) {
            handleModalEnterToSubmit(e, onIntroConvertNow, false);
          } else {
            handleModalEnterToSubmit(
              e,
              () => {
                onConfirmConvert({
                  newDisplayName: newName.trim() || formatAccountLabel(acc),
                  activationFeeUsd: parseFeeUsd(applyAllAmount),
                  fundedConversionDate,
                  ...(isTradeifySelectUnifiedChallenge(acc)
                    ? { tradeifySelectFundedVariant: tradeifySelectVariant }
                    : {}),
                });
              },
              false
            );
          }
        }}
      >
        {isIntro ? (
          <>
            <header className="flex shrink-0 items-center justify-between border-b border-white/[0.06] px-5 py-4">
              <h2
                id="passed-modal-title"
                className="text-lg font-semibold tracking-tight text-white/92"
              >
                Evaluation passed!
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
              <p className="text-[14px] leading-relaxed text-zinc-400">
                Congratulations! Would you like to convert this evaluation to a funded account
                now?
              </p>
              <div className="mt-6 flex flex-wrap justify-end gap-2">
                <button type="button" onClick={onIntroMaybeLater} className={btnSecondary}>
                  Maybe Later
                </button>
                <button type="button" onClick={onIntroConvertNow} className={btnPrimary}>
                  Convert Now
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            <header className="flex shrink-0 items-center justify-between border-b border-white/[0.06] px-5 py-4">
              <h2
                id="passed-modal-title"
                className="text-lg font-semibold tracking-tight text-white/92"
              >
                Convert to Funded
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
            <div className="max-h-[min(70dvh,calc(100dvh-8rem))] overflow-y-auto px-5 py-4">
              <p className="text-sm text-zinc-500">
                Convert 1 evaluation(s) to funded accounts.
              </p>

              <div className="mt-4 rounded-xl border border-white/[0.06] bg-zinc-950/35 p-4">
                <label className={`flex flex-wrap items-center gap-2 ${fieldLabelClass}`}>
                  <span className="normal-case text-zinc-400">Apply fee to all</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="Amount"
                    value={applyAllAmount}
                    onChange={(e) => setApplyAllAmount(e.target.value)}
                    className={`min-w-[5rem] flex-1 ${inputEditableClass}`}
                  />
                  <span className="text-[12px] font-normal normal-case text-zinc-500">USD</span>
                </label>
              </div>

              <div className="mt-4 rounded-xl border border-white/[0.06] bg-zinc-950/25 p-4">
                <label className={`block ${fieldLabelClass}`}>
                  {formatAccountLabel(acc)} → New name
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className={`mt-1.5 ${inputEditableClass}`}
                />
                <p className={`mt-3 ${fieldLabelClass}`}>Activation fee (recap)</p>
                <div className={`mt-1.5 ${recapBoxClass}`}>
                  {formatUsdRecap(applyAllAmount)}
                </div>
                <label className={`mt-4 block ${fieldLabelClass}`}>Activation fee date</label>
                <input
                  type="date"
                  value={fundedConversionDate}
                  onChange={(e) => setFundedConversionDate(e.target.value as ISODate)}
                  className={`mt-1.5 ${inputEditableClass}`}
                />
                <p className="mt-1.5 text-[11px] text-zinc-600">
                  Applied to the activation fee ledger line and funded account start dates.
                </p>
                <p className="mt-3 text-[11px] text-zinc-600">
                  {acc.propFirm.name} · {formatUsdSize(acc)}
                </p>

                {isTradeifySelectUnifiedChallenge(acc) ? (
                  <fieldset className="mt-4 rounded-xl border border-white/[0.06] bg-zinc-950/25 p-4">
                    <legend className={`px-1 ${fieldLabelClass}`}>Funded program</legend>
                    <p className="mt-1 text-[12px] text-zinc-500">
                      Tradeify Select — choose Daily or Flex for your funded account rules.
                    </p>
                    <div className="mt-3 flex flex-col gap-2">
                      <label className="flex cursor-pointer items-center gap-2 text-sm text-white/85">
                        <input
                          type="radio"
                          name="tradeify-select-variant"
                          checked={tradeifySelectVariant === "daily"}
                          onChange={() => setTradeifySelectVariant("daily")}
                          className="accent-sky-500"
                        />
                        Select Daily
                      </label>
                      <label className="flex cursor-pointer items-center gap-2 text-sm text-white/85">
                        <input
                          type="radio"
                          name="tradeify-select-variant"
                          checked={tradeifySelectVariant === "flex"}
                          onChange={() => setTradeifySelectVariant("flex")}
                          className="accent-sky-500"
                        />
                        Select Flex
                      </label>
                    </div>
                  </fieldset>
                ) : null}
              </div>

              <div className="mt-6 flex flex-wrap justify-end gap-2">
                <button type="button" onClick={onClose} className={btnSecondary}>
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onConfirmConvert({
                      newDisplayName: newName.trim() || formatAccountLabel(acc),
                      activationFeeUsd: parseFeeUsd(applyAllAmount),
                      fundedConversionDate,
                      ...(isTradeifySelectUnifiedChallenge(acc)
                        ? { tradeifySelectFundedVariant: tradeifySelectVariant }
                        : {}),
                    });
                  }}
                  className={btnPrimary}
                >
                  Convert 1 Account(s)
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function formatUsdRecap(raw: string): string {
  const n = parseFeeUsd(raw);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n);
}

function formatUsdSize(acc: JournalAccount): string {
  const usd = acc.sizeNominalCents / 100;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(usd);
}
