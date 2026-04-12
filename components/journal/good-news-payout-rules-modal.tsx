"use client";

import { useEffect, useId, useMemo } from "react";
import { createPortal } from "react-dom";
import { ApexFundedRulesSection } from "@/components/journal/apex-funded-rules-panel";
import { resolveApexAccountRulesCard } from "@/lib/journal/apex-journal-rules";
import { resolveBulenoxAccountRulesCard } from "@/lib/journal/bulenox-journal-rules";
import { resolveTopStepAccountRulesCard } from "@/lib/journal/topstep-journal-rules";
import { resolveTptAccountRulesCard } from "@/lib/journal/tpt-journal-rules";
import { resolveLucidAccountRulesCard } from "@/lib/journal/lucid-journal-rules";
import { handleModalEnterToSubmit } from "@/components/journal/modal-enter-submit";
import { resolveFundedFuturesNetworkAccountRulesCard } from "@/lib/journal/funded-futures-network-journal-rules";
import { resolveFundedNextAccountRulesCard } from "@/lib/journal/funded-next-journal-rules";
import { resolveTradeifyAccountRulesCard } from "@/lib/journal/tradeify-journal-rules";
import type { JournalAccount, JournalDataV1 } from "@/lib/journal/types";

const panelClass =
  "relative z-10 flex w-full max-w-4xl max-h-[min(90dvh,760px)] flex-col overflow-hidden rounded-2xl border border-zinc-800/60 bg-[#0c0c0e] shadow-[0_24px_80px_rgba(0,0,0,0.65)]";

const headerBtnClass =
  "flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border border-white/10 text-xl leading-none text-white/60 transition hover:border-white/20 hover:bg-white/[0.05] hover:text-white";

const rulesCardClass =
  "rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.05] to-white/[0.02] p-4 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04),0_12px_40px_rgba(0,0,0,0.35)] backdrop-blur-sm";

const scrollClass =
  "min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4 [scrollbar-color:rgba(255,255,255,0.12)_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/10";

type Props = {
  open: boolean;
  onClose: () => void;
  state: JournalDataV1;
  account: JournalAccount;
  calloutText: string;
};

export function GoodNewsPayoutRulesModal({ open, onClose, state, account, calloutText }: Props) {
  const titleId = useId();
  const card = useMemo(
    () =>
      resolveApexAccountRulesCard(state, account) ??
      resolveTopStepAccountRulesCard(state, account) ??
      resolveBulenoxAccountRulesCard(state, account) ??
      resolveTradeifyAccountRulesCard(state, account) ??
      resolveFundedNextAccountRulesCard(state, account) ??
      resolveFundedFuturesNetworkAccountRulesCard(state, account) ??
      resolveTptAccountRulesCard(state, account) ??
      resolveLucidAccountRulesCard(state, account),
    [state, account]
  );

  useEffect(() => {
    if (!open) return;
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
  }, [open, onClose]);

  if (!open) return null;
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[170] flex items-center justify-center p-4"
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/60 backdrop-blur-md"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={panelClass}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => handleModalEnterToSubmit(e, onClose, false)}
      >
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-white/10 px-5 py-4">
          <div className="min-w-0 pr-2">
            <p id={titleId} className="text-[9px] font-bold uppercase tracking-[0.22em] text-amber-200/95">
              Good news
            </p>
            <p className="mt-1 text-base font-semibold leading-snug tracking-tight text-amber-50">
              {calloutText}
            </p>
            <p className="mt-1 text-xs text-amber-200/65">If payout rules are respected.</p>
          </div>
          <button
            type="button"
            className={headerBtnClass}
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            aria-label="Close dialog"
          >
            ×
          </button>
        </header>
        <div className={scrollClass}>
          {card?.phase === "funded" ? (
            <div className={`${rulesCardClass} grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3`}>
              <h2 className="col-span-full text-sm font-semibold tracking-tight text-white/92">
                Account rules
              </h2>
              <ApexFundedRulesSection layout={card.fundedLayout} />
            </div>
          ) : (
            <p className="text-sm text-white/55">
              Payout rules for this account are not available in the journal yet.
            </p>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
