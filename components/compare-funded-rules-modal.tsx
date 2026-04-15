"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ApexFundedRulesSection,
  RuleCell,
} from "@/components/journal/apex-funded-rules-panel";
import type { ApexEvalRulesLayout } from "@/lib/journal/apex-journal-rules";
import { resolveCompareRowFundedRulesCard } from "@/lib/journal/compare-funded-rules-resolve";
import { formatUsdWholeGrouped, type PropFirm } from "@/lib/prop-firms";
import { handleModalEnterToSubmit } from "@/components/journal/modal-enter-submit";

const MODAL_KICKER =
  "text-[10px] font-semibold uppercase tracking-[0.2em] text-sky-400/90";

const PANEL_SHELL =
  "relative overflow-hidden rounded-2xl border border-slate-600/25 bg-gradient-to-b from-slate-800/40 via-slate-900/45 to-slate-950/55 shadow-[0_16px_40px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.08)]";

function Panel({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={`${PANEL_SHELL} ${className}`}>
      <div
        className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-white/[0.05] blur-2xl"
        aria-hidden
      />
      <div className="relative">{children}</div>
    </div>
  );
}

function formatDrawdownFromCompare(d: PropFirm["drawdown"] | undefined): string {
  if (!d) return "—";
  const map: Record<PropFirm["drawdown"], string> = {
    EOD: "EOD",
    EOT: "EOT",
    Trailing: "Trail",
    Static: "Static",
  };
  return map[d] ?? d.toUpperCase();
}

function normalizeConsistency(value: string): string {
  const v = value.trim();
  return v === "-" || v === "—" || v === "–" ? "100%" : value;
}

function ApexEvalRulesSection({ layout }: { layout: ApexEvalRulesLayout }) {
  const {
    rules,
    drawdownType,
    sizing,
    profitTarget,
    tradingNews,
    drawdown,
    overnight,
    dll,
  } = layout;

  return (
    <>
      <div className="col-span-full flex flex-col gap-4 sm:hidden">
        <RuleCell
          label={rules.label}
          value={rules.value}
          multiline={rules.multiline}
          labelInfoTooltip={rules.labelInfoPopover ? undefined : rules.labelInfoTooltip}
          labelInfoPopover={rules.labelInfoPopover}
        />
        <RuleCell label={drawdownType.label} value={drawdownType.value} />
        <RuleCell label={sizing.label} value={sizing.value} multiline={sizing.multiline} />
        <RuleCell label={tradingNews.label} value={tradingNews.value} />
        <RuleCell label={drawdown.label} value={drawdown.value} />
        <RuleCell label={profitTarget.label} value={profitTarget.value} />
        <RuleCell label={overnight.label} value={overnight.value} />
        <RuleCell label={dll.label} value={dll.value} />
      </div>
      <div className="col-span-full hidden gap-x-8 gap-y-4 sm:grid sm:grid-cols-3 sm:grid-rows-3">
        <div className="sm:col-start-1 sm:row-start-1">
          <RuleCell
            label={rules.label}
            value={rules.value}
            multiline={rules.multiline}
            labelInfoTooltip={rules.labelInfoPopover ? undefined : rules.labelInfoTooltip}
            labelInfoPopover={rules.labelInfoPopover}
          />
        </div>
        <div className="sm:col-start-2 sm:row-start-1">
          <RuleCell label={drawdownType.label} value={drawdownType.value} />
        </div>
        <div className="sm:col-start-3 sm:row-start-1">
          <RuleCell label={sizing.label} value={sizing.value} multiline={sizing.multiline} />
        </div>
        <div className="sm:col-start-1 sm:row-start-2">
          <RuleCell label={tradingNews.label} value={tradingNews.value} />
        </div>
        <div className="sm:col-start-2 sm:row-start-2">
          <RuleCell label={drawdown.label} value={drawdown.value} />
        </div>
        <div className="sm:col-start-3 sm:row-start-2">
          <RuleCell label={profitTarget.label} value={profitTarget.value} />
        </div>
        <div className="sm:col-start-1 sm:row-start-3">
          <RuleCell label={overnight.label} value={overnight.value} />
        </div>
        <div className="sm:col-start-2 sm:row-start-3">
          <RuleCell label={dll.label} value={dll.value} />
        </div>
        <div className="sm:col-start-3 sm:row-start-3" aria-hidden />
      </div>
    </>
  );
}

type Props = {
  open: boolean;
  firm: PropFirm | null;
  onClose: () => void;
};

export function CompareFundedRulesModal({ open, firm, onClose }: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const card = useMemo(
    () => (firm ? resolveCompareRowFundedRulesCard(firm) : null),
    [firm]
  );

  if (!mounted || !open || !firm) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-2 sm:p-4">
      <button
        type="button"
        aria-label="Close funded rules"
        className="absolute inset-0 bg-black/60 backdrop-blur-xl backdrop-saturate-150"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="compare-funded-rules-title"
        className="relative z-10 flex max-h-[min(92dvh,880px)] w-[min(720px,calc(100vw-1rem))] flex-col overflow-hidden rounded-2xl border border-slate-600/25 bg-gradient-to-b from-[#0a0c10] via-[#080a0e] to-[#06080c] shadow-[0_16px_48px_rgba(0,0,0,0.55)] ring-1 ring-white/[0.06]"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => handleModalEnterToSubmit(e, onClose, false)}
      >
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-600/20 bg-slate-950/35 px-5 py-4">
          <div className="min-w-0">
            <p className={MODAL_KICKER}>Funded rules</p>
            <h2
              id="compare-funded-rules-title"
              className="mt-2 truncate text-lg font-semibold tracking-tight text-white sm:text-xl"
            >
              {firm.accountName}
            </h2>
            <p className="mt-1 truncate text-sm text-slate-500">
              {firm.name} · {firm.size}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/12 text-xl leading-none text-slate-400 transition hover:border-sky-500/35 hover:bg-sky-500/10 hover:text-white"
            aria-label="Close"
          >
            ×
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-5 pt-4 [scrollbar-color:rgba(255,255,255,0.12)_transparent] [scrollbar-width:thin]">
          <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-sky-400/90">
            Rules
          </p>
          <Panel className="p-4">
            <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
              {card?.phase === "funded" ? (
                <ApexFundedRulesSection layout={card.fundedLayout} />
              ) : card?.phase === "eval" ? (
                <>
                  <p className="col-span-full mb-1 text-xs text-slate-500">
                    No separate funded sheet for this program in the workspace — showing evaluation
                    rules for reference.
                  </p>
                  <ApexEvalRulesSection layout={card.evalLayout} />
                </>
              ) : (
                <>
                  <RuleCell label="Daily loss limit" value={firm.rules.dailyLossLimit} />
                  <RuleCell label="Sizing" value={firm.rules.sizing} multiline />
                  <RuleCell
                    label="Consistency"
                    value={normalizeConsistency(firm.rules.consistency)}
                  />
                  <RuleCell label="Minimum days" value={firm.rules.minDays} />
                  <RuleCell label="Scalping" value={firm.rules.scalping} />
                  <RuleCell label="Max accounts" value={firm.rules.maxAccounts} />
                  <RuleCell
                    label="Max drawdown"
                    value={formatUsdWholeGrouped(firm.maxDrawdownLimitUsd)}
                  />
                  <RuleCell
                    label="Drawdown type"
                    value={formatDrawdownFromCompare(firm.drawdown)}
                  />
                  <RuleCell
                    label="Note"
                    value="Detailed funded rules for this firm are not wired in the workspace yet."
                    multiline
                  />
                </>
              )}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
