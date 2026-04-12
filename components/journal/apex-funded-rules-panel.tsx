"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type {
  ApexFundedRulesLayout,
  ApexRulesRow,
  RuleLabelInfoPopover,
} from "@/lib/journal/apex-journal-rules";

const fundedRulesGapClass = "flex flex-col gap-y-4";

const POPOVER_HIDE_MS = 160;


/** Cercle + « i » serif / italique (style proche d’une vignette classique). */
function StylizedInfoIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={className} aria-hidden>
      <circle cx="10" cy="10" r="7.85" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <text
        x="10"
        y="13.85"
        textAnchor="middle"
        fill="currentColor"
        fontSize="12.5"
        fontFamily="Georgia, 'Times New Roman', Times, serif"
        fontStyle="italic"
        fontWeight="600"
      >
        i
      </text>
    </svg>
  );
}

function LabelInfoTrigger({ info }: { info: RuleLabelInfoPopover }) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const [mounted, setMounted] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => setMounted(true), []);
  useEffect(
    () => () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    },
    []
  );

  useEffect(() => {
    if (!open) return;
    const onOutside = (e: PointerEvent) => {
      const t = e.target as Node;
      if (wrapRef.current?.contains(t)) return;
      if ((e.target as HTMLElement).closest?.("[data-label-info-panel]")) return;
      setOpen(false);
    };
    document.addEventListener("pointerdown", onOutside, true);
    return () => document.removeEventListener("pointerdown", onOutside, true);
  }, [open]);

  const clearHideTimer = () => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
  };

  const scheduleHide = () => {
    clearHideTimer();
    hideTimer.current = setTimeout(() => setOpen(false), POPOVER_HIDE_MS);
  };

  const panel =
    mounted && open ? (
      <div
        data-label-info-panel
        className="fixed z-[200] w-[min(19rem,calc(100vw-1.5rem))] rounded-xl border border-white/14 bg-[#0a0e16]/[0.98] px-3.5 py-3 text-left shadow-[0_14px_44px_rgba(0,0,0,0.5)] ring-1 ring-black/45 backdrop-blur-md"
        style={{
          left: coords.x + 14,
          top: Math.max(6, coords.y - 8),
        }}
        role="tooltip"
        onMouseEnter={clearHideTimer}
        onMouseLeave={scheduleHide}
      >
        <p className="text-[11px] font-semibold leading-snug text-white/92">{info.lead}</p>
        <dl className="mt-2.5 space-y-2 text-white/80">
          {info.entries.map((e) => (
            <div
              key={e.label}
              className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] gap-x-3 gap-y-0.5"
            >
              <dt className="text-[9px] font-semibold uppercase leading-snug tracking-[0.12em] text-white/42">
                {e.label}
              </dt>
              <dd className="text-[13px] font-medium leading-snug text-white/88">{e.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    ) : null;

  return (
    <>
      <span
        ref={wrapRef}
        className="relative inline-flex shrink-0 align-middle"
        onMouseEnter={(e) => {
          clearHideTimer();
          setCoords({ x: e.clientX, y: e.clientY });
          setOpen(true);
        }}
        onMouseMove={(e) => {
          setCoords({ x: e.clientX, y: e.clientY });
        }}
        onMouseLeave={scheduleHide}
      >
        <button
          type="button"
          className="rounded-full text-white/48 outline-none transition hover:text-sky-300/95 focus-visible:ring-2 focus-visible:ring-sky-400/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[#080b12]"
          aria-label="More information"
          aria-expanded={open}
          aria-haspopup="true"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            clearHideTimer();
            const el = e.currentTarget;
            const rect = el.getBoundingClientRect();
            setCoords({
              x: rect.left + rect.width / 2,
              y: rect.top + rect.height / 2,
            });
            setOpen((v) => !v);
          }}
        >
          <StylizedInfoIcon className="h-[17px] w-[17px]" />
        </button>
      </span>
      {panel ? createPortal(panel, document.body) : null}
    </>
  );
}

export function RuleCell({
  label,
  value,
  multiline,
  multilinePreserveLines,
  labelInfoTooltip,
  labelInfoPopover,
}: {
  label: string;
  value: string;
  multiline?: boolean;
  /** Si true avec `multiline` : `white-space: pre` + défilement horizontal si besoin. */
  multilinePreserveLines?: boolean;
  labelInfoTooltip?: string;
  labelInfoPopover?: RuleLabelInfoPopover;
}) {
  return (
    <div>
      <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/38">
        <span>{label}</span>
        {labelInfoPopover ? (
          <LabelInfoTrigger info={labelInfoPopover} />
        ) : labelInfoTooltip ? (
          <span className="group/intip relative inline-flex shrink-0 align-middle">
            <span
              className="cursor-help text-white/48 transition group-hover/intip:text-sky-300/95"
              title={labelInfoTooltip}
              role="img"
              aria-label="Information"
            >
              <StylizedInfoIcon className="h-[17px] w-[17px]" />
            </span>
          </span>
        ) : null}
      </p>
      <p
        className={`mt-1.5 text-sm font-medium text-white/88 ${
          multiline
            ? multilinePreserveLines
              ? "whitespace-pre"
              : "whitespace-pre-line break-words"
            : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}

/** Grille 3 colonnes identique à la section « Account rules » funded de la vue compte. */
export function ApexFundedRulesSection({ layout }: { layout: ApexFundedRulesLayout }) {
  const { column1, column2, column3 } = layout;
  const maxLen = Math.max(column1.length, column2.length, column3.length);
  const mobileOrder: ApexRulesRow[] = [];
  for (let i = 0; i < maxLen; i++) {
    if (column1[i]) mobileOrder.push(column1[i]!);
    if (column2[i]) mobileOrder.push(column2[i]!);
    if (column3[i]) mobileOrder.push(column3[i]!);
  }

  const rowProps = (row: ApexRulesRow) => ({
    label: row.label,
    value: row.value,
    multiline: row.multiline,
    multilinePreserveLines: row.multilinePreserveLines,
    labelInfoTooltip: row.labelInfoPopover ? undefined : row.labelInfoTooltip,
    labelInfoPopover: row.labelInfoPopover,
  });

  return (
    <>
      <div className="col-span-full flex flex-col gap-4 sm:hidden">
        {mobileOrder.map((row, i) => (
          <RuleCell key={`funded-m-${row.label}-${i}`} {...rowProps(row)} />
        ))}
      </div>
      <div className="col-span-full hidden items-start gap-x-8 sm:grid sm:grid-cols-3">
        <div className={fundedRulesGapClass}>
          {column1.map((row, i) => (
            <RuleCell key={`funded-c1-${row.label}-${i}`} {...rowProps(row)} />
          ))}
        </div>
        <div className={fundedRulesGapClass}>
          {column2.map((row, i) => (
            <RuleCell key={`funded-c2-${row.label}-${i}`} {...rowProps(row)} />
          ))}
        </div>
        <div className={fundedRulesGapClass}>
          {column3.map((row, i) => (
            <RuleCell key={`funded-c3-${row.label}-${i}`} {...rowProps(row)} />
          ))}
        </div>
      </div>
    </>
  );
}
