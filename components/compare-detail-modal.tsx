"use client";

import Image from "next/image";
import {
  useEffect,
  useState,
  type AnimationEvent,
  type ReactNode,
} from "react";
import { PlatformLogos } from "@/components/platform-logos";
import type { DrawdownType, PaymentPlan, PropFirm } from "@/lib/prop-firms";
import {
  formatUsdCompact,
  formatUsdWholeGrouped,
  isActivationFree,
} from "@/lib/prop-firms";
import {
  platformLabels,
  platformLogoSrc,
  type PlatformId,
} from "@/lib/platforms";
import { handleModalEnterToSubmit } from "@/components/journal/modal-enter-submit";

const ROUND_TRIP_PLATFORM_ORDER: PlatformId[] = [
  "tradovate",
  "rithmic",
  "dxfeed",
  "wealthcharts",
];

const DRAWDOWN_LABEL: Record<DrawdownType, string> = {
  EOD: "EOD",
  EOT: "EOT",
  Trailing: "Trail",
  Static: "Static",
};

function normalizeConsistency(value: string): string {
  const v = value.trim();
  return v === "-" || v === "—" || v === "–" ? "100%" : value;
}

/** Label / value — slate discret, aligné Dashboard / Account. */
const labelCardClass =
  "flex min-h-[52px] items-center gap-2.5 rounded-xl border border-white/10 bg-black/25 px-3 py-2.5 shadow-sm shadow-black/10 transition-[border-color,background-color] duration-200 group-hover/compare-row:border-sky-500/30 group-hover/compare-row:bg-black/35";

const valueCardClass =
  "flex min-h-[52px] min-w-0 flex-col items-center justify-center rounded-xl border border-white/10 bg-black/25 px-3 py-2.5 text-center text-[13px] leading-snug text-white/85 shadow-sm shadow-black/10 transition-[border-color,background-color] duration-200 group-hover/compare-row:border-sky-500/25 group-hover/compare-row:bg-black/32";

const promoPillClass =
  "rounded-lg border border-white/12 bg-white/[0.05] px-2.5 py-1 text-[12px] font-semibold uppercase tracking-wide text-white/82";

const MODAL_KICKER =
  "text-[10px] font-semibold uppercase tracking-[0.2em] text-sky-400/90";

/** Exit animation length + buffer — safety unmount if `animationend` is missed */
const MODAL_EXIT_UNMOUNT_MS = 460;

function RowIcon({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex h-[18px] w-[18px] shrink-0 text-sky-400/75" aria-hidden>
      {children}
    </span>
  );
}

function Label({
  icon,
  children,
}: {
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className={labelCardClass}>
      <RowIcon>{icon}</RowIcon>
      <span className="text-[10px] font-semibold uppercase tracking-wider text-white/45">
        {children}
      </span>
    </div>
  );
}

function CompareRow({
  gridTemplateColumns,
  children,
}: {
  gridTemplateColumns: string;
  children: ReactNode;
}) {
  return (
    <div
      className="group/compare-row grid w-full gap-2"
      style={{ gridTemplateColumns }}
    >
      {children}
    </div>
  );
}

function scoreRingConfig(score: number) {
  const clamped = Math.max(0, Math.min(10, score));
  const filledAngle = (clamped / 10) * 360;
  if (score >= 8) {
    return {
      filledAngle,
      fillColor: "rgba(16,185,129,0.9)",
      trackColor: "rgba(39,39,42,0.55)",
      innerClass: "bg-black text-emerald-300",
    } as const;
  }
  if (score >= 7) {
    return {
      filledAngle,
      fillColor: "rgba(245,158,11,0.95)",
      trackColor: "rgba(39,39,42,0.55)",
      innerClass: "bg-black text-amber-300",
    } as const;
  }
  if (score >= 4) {
    return {
      filledAngle,
      fillColor: "rgba(249,115,22,0.95)",
      trackColor: "rgba(39,39,42,0.55)",
      innerClass: "bg-black text-orange-300",
    } as const;
  }
  return {
    filledAngle,
    fillColor: "rgba(239,68,68,0.95)",
    trackColor: "rgba(39,39,42,0.55)",
    innerClass: "bg-black text-red-300",
  } as const;
}

function calcDiscountPct(regular: number, discounted: number): number {
  if (regular <= 0 || discounted >= regular) return 0;
  return Math.round((1 - discounted / regular) * 100);
}

function paymentPlanLabel(plan: PaymentPlan): string {
  return plan === "subscription" ? "Subscription" : "One-time payment";
}

function accountTypeLabel(type: PropFirm["accountType"]): string {
  return type === "Eval" ? "Evaluation" : "Direct";
}

function splitRoundTripLines<T>(items: T[]): T[][] {
  const n = items.length;
  if (n === 0) return [];
  if (n <= 2) return [items];
  if (n === 3) return [items.slice(0, 2), items.slice(2, 3)];
  return [items.slice(0, 2), items.slice(2)];
}

function RoundTripItem({
  platform,
  mnqNq,
}: {
  platform: PlatformId;
  mnqNq: string;
}) {
  const src = platformLogoSrc[platform];
  const label = platformLabels[platform];
  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded border border-slate-600/30 bg-black/40 p-px shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
        {src ? (
          <Image
            src={src}
            alt=""
            width={16}
            height={16}
            unoptimized
            className="h-4 w-4 object-contain"
          />
        ) : (
          <span className="text-[6px] font-bold uppercase text-white/45">
            {label.slice(0, 2)}
          </span>
        )}
      </span>
      <span className="min-w-0 whitespace-nowrap text-[12px] tabular-nums leading-snug text-white/75">
        {mnqNq}
      </span>
    </div>
  );
}

function ModalRoundTrip({ firm }: { firm: PropFirm }) {
  const rows = firm.roundTripByPlatform;
  if (rows?.length) {
    const sortedRows = [...rows].sort((a, b) => {
      const aRank = ROUND_TRIP_PLATFORM_ORDER.indexOf(a.platform);
      const bRank = ROUND_TRIP_PLATFORM_ORDER.indexOf(b.platform);
      const safeARank = aRank === -1 ? Number.MAX_SAFE_INTEGER : aRank;
      const safeBRank = bRank === -1 ? Number.MAX_SAFE_INTEGER : bRank;
      if (safeARank !== safeBRank) return safeARank - safeBRank;
      return platformLabels[a.platform].localeCompare(
        platformLabels[b.platform],
        "en"
      );
    });
    const lines = splitRoundTripLines(sortedRows);
    return (
      <div className="flex min-w-0 flex-col items-center gap-1.5">
        {lines.map((line, lineIdx) => (
          <div
            key={lineIdx}
            className="flex max-w-full justify-center overflow-x-auto"
          >
            <div className="flex flex-nowrap items-center justify-center gap-x-2">
              {line.map(({ platform, mnqNq }) => (
                <RoundTripItem
                  key={platform}
                  platform={platform}
                  mnqNq={mnqNq}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }
  return (
    <p className="whitespace-pre-line text-[12px] leading-snug text-slate-400">
      {firm.roundTripMnqNq}
    </p>
  );
}

function ScoreRing({ score }: { score: number }) {
  const cfg = scoreRingConfig(score);
  const backgroundImage = `conic-gradient(from 270deg, ${cfg.fillColor} 0deg, ${cfg.fillColor} ${cfg.filledAngle}deg, ${cfg.trackColor} ${cfg.filledAngle}deg, ${cfg.trackColor} 360deg)`;
  return (
    <div
      className="relative inline-flex h-10 w-10 items-center justify-center rounded-full shadow-[0_0_10px_rgba(0,0,0,0.45)]"
      style={{ backgroundImage }}
    >
      <div className="absolute inset-[2px] rounded-full border border-black/70" />
      <div
        className={`relative flex h-7 w-7 items-center justify-center rounded-full text-[12px] font-semibold ${cfg.innerClass}`}
      >
        {score}
      </div>
    </div>
  );
}

function HeaderCard({ firm }: { firm: PropFirm }) {
  const initial = firm.name.trim().charAt(0).toUpperCase() || "?";
  return (
    <div className="flex min-w-0 flex-col items-center gap-1.5 px-1 pb-1 text-center">
      <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-lg">
        {firm.firmLogoSrc ? (
          <Image
            src={firm.firmLogoSrc}
            alt=""
            width={36}
            height={36}
            className="h-9 w-9 object-cover"
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center bg-gradient-to-br from-amber-500/30 to-amber-700/20 text-[10px] font-bold text-amber-100">
            {initial}
          </span>
        )}
      </div>
      <p className="line-clamp-2 w-full text-[14px] font-semibold leading-tight tracking-[-0.02em] text-white">
        {firm.name}
      </p>
      <p
        className="w-full truncate text-[12px] leading-snug text-slate-500"
        title={firm.accountName}
      >
        {firm.accountName}
      </p>
    </div>
  );
}

type Props = {
  open: boolean;
  onClose: () => void;
  firms: PropFirm[];
  /** Copies promo to clipboard; parent shows toast (e.g. “Code copied!”). */
  onPromoCopy: (code: string) => void;
};

export function CompareDetailModal({ open, onClose, firms, onPromoCopy }: Props) {
  const canShow = open && firms.length >= 2;
  const [mounted, setMounted] = useState(false);
  const [closing, setClosing] = useState(false);

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
    return () => clearTimeout(t);
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

  if (!mounted || firms.length < 2) return null;

  const n = firms.length;
  const gridCols = `minmax(124px,158px) repeat(${n}, minmax(0, 1fr))`;

  const i = {
    size: (
      <svg viewBox="0 0 16 16" fill="none" className="h-[15px] w-[15px]" stroke="currentColor" strokeWidth="1.25">
        <path d="M2 6h12M2 10h8M6 2v12" strokeLinecap="round" />
      </svg>
    ),
    type: (
      <svg viewBox="0 0 16 16" fill="none" className="h-[15px] w-[15px]" stroke="currentColor" strokeWidth="1.25">
        <rect x="2.5" y="2.5" width="5" height="5" rx="1" />
        <rect x="8.5" y="8.5" width="5" height="5" rx="1" />
      </svg>
    ),
    card: (
      <svg viewBox="0 0 16 16" fill="none" className="h-[15px] w-[15px]" stroke="currentColor" strokeWidth="1.25">
        <rect x="2" y="3" width="12" height="10" rx="1.5" />
        <path d="M2 6h12" />
      </svg>
    ),
    dollar: (
      <svg viewBox="0 0 16 16" fill="none" className="h-[15px] w-[15px]" stroke="currentColor" strokeWidth="1.25">
        <path d="M8 2v12M5.5 5.5a2.5 2.5 0 0 1 5 0c0 2-5 2-5 4a2.5 2.5 0 0 0 5 0" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    bolt: (
      <svg viewBox="0 0 16 16" fill="none" className="h-[15px] w-[15px]" stroke="currentColor" strokeWidth="1.25">
        <path d="M9 2L4 9h4l-1 5 6-8H9L9 2z" strokeLinejoin="round" />
      </svg>
    ),
    tag: (
      <svg viewBox="0 0 16 16" fill="none" className="h-[15px] w-[15px]" stroke="currentColor" strokeWidth="1.25">
        <path d="M2 8l6-6h4v4L6 12l-4-4z" strokeLinejoin="round" />
        <circle cx="11" cy="5" r="0.75" fill="currentColor" />
      </svg>
    ),
    grid: (
      <svg viewBox="0 0 16 16" fill="none" className="h-[15px] w-[15px]" stroke="currentColor" strokeWidth="1.25">
        <rect x="2" y="2" width="5" height="5" rx="0.5" />
        <rect x="9" y="2" width="5" height="5" rx="0.5" />
        <rect x="2" y="9" width="5" height="5" rx="0.5" />
        <rect x="9" y="9" width="5" height="5" rx="0.5" />
      </svg>
    ),
    target: (
      <svg viewBox="0 0 16 16" fill="none" className="h-[15px] w-[15px]" stroke="currentColor" strokeWidth="1.25">
        <circle cx="8" cy="8" r="6" />
        <circle cx="8" cy="8" r="3" />
        <circle cx="8" cy="8" r="1" fill="currentColor" />
      </svg>
    ),
    chart: (
      <svg viewBox="0 0 16 16" fill="none" className="h-[15px] w-[15px]" stroke="currentColor" strokeWidth="1.25">
        <path d="M2 13h12M4 10l3-3 2 2 4-5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    calendar: (
      <svg viewBox="0 0 16 16" fill="none" className="h-[15px] w-[15px]" stroke="currentColor" strokeWidth="1.25">
        <rect x="2.5" y="3.5" width="11" height="10" rx="1" />
        <path d="M5 2v3M11 2v3M2.5 7h11" />
      </svg>
    ),
    shield: (
      <svg viewBox="0 0 16 16" fill="none" className="h-[15px] w-[15px]" stroke="currentColor" strokeWidth="1.25">
        <path d="M8 14s5-2.5 5-7V3L8 2 3 3v4c0 4.5 5 7 5 7z" strokeLinejoin="round" />
      </svg>
    ),
    activity: (
      <svg viewBox="0 0 16 16" fill="none" className="h-[15px] w-[15px]" stroke="currentColor" strokeWidth="1.25">
        <path d="M2 8h3l2-5 2 10 2-5h3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    box: (
      <svg viewBox="0 0 16 16" fill="none" className="h-[15px] w-[15px]" stroke="currentColor" strokeWidth="1.25">
        <path d="M2 5l6-2 6 2v6l-6 2-6-2V5z" strokeLinejoin="round" />
        <path d="M2 5l6 2 6-2M8 7v6" />
      </svg>
    ),
    users: (
      <svg viewBox="0 0 16 16" fill="none" className="h-[15px] w-[15px]" stroke="currentColor" strokeWidth="1.25">
        <circle cx="5.5" cy="5" r="2" />
        <path d="M2 13v-1a3 3 0 0 1 3-3h1" />
        <circle cx="11" cy="5" r="2" />
        <path d="M14 13v-1a3 3 0 0 0-3-3h-0.5" />
      </svg>
    ),
    license: (
      <svg viewBox="0 0 16 16" fill="none" className="h-[15px] w-[15px]" stroke="currentColor" strokeWidth="1.25">
        <path d="M5 2h6v4l-3 2-3-2V2z" strokeLinejoin="round" />
        <path d="M5 6v8h6V6" />
      </svg>
    ),
    swap: (
      <svg viewBox="0 0 16 16" fill="none" className="h-[15px] w-[15px]" stroke="currentColor" strokeWidth="1.25">
        <path d="M4 5h10M4 5l2-2M4 5l2 2M12 11H2M12 11l-2 2M12 11l-2-2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    star: (
      <svg viewBox="0 0 16 16" fill="none" className="h-[15px] w-[15px]" stroke="currentColor" strokeWidth="1.25">
        <path d="M8 2l1.8 4.2L14 7l-3.5 2.6L11.8 14 8 11.7 4.2 14l1.3-4.4L2 7l4.2-.8L8 2z" strokeLinejoin="round" />
      </svg>
    ),
  };

  const backdropAnim = closing
    ? "compare-modal-backdrop--out"
    : "compare-modal-backdrop--in";
  const panelAnim = closing ? "compare-modal-panel--out" : "compare-modal-panel--in";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
      <button
        type="button"
        aria-label="Close comparison"
        className={`absolute inset-0 bg-black/60 backdrop-blur-xl backdrop-saturate-150 ${backdropAnim}`}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="compare-detail-title"
        className={`relative z-10 flex max-h-[calc(100dvh-1rem)] w-[min(1360px,calc(100vw-1rem))] flex-col overflow-hidden rounded-2xl border border-slate-600/25 bg-gradient-to-b from-[#0a0c10] via-[#080a0e] to-[#06080c] shadow-[0_16px_48px_rgba(0,0,0,0.55)] ring-1 ring-white/[0.06] [will-change:transform,opacity] ${panelAnim}`}
        onClick={(e) => e.stopPropagation()}
        onAnimationEnd={onPanelAnimationEnd}
        onKeyDown={(e) => handleModalEnterToSubmit(e, onClose, false)}
      >
        <header className="flex shrink-0 items-center justify-between border-b border-slate-600/20 bg-slate-950/35 px-5 py-4">
          <div className="min-w-0">
            <p className={MODAL_KICKER}>Comparator</p>
            <h2
              id="compare-detail-title"
              className="mt-2 text-lg font-semibold tracking-tight text-white sm:text-xl"
            >
              Detailed comparison
            </h2>
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

        <div className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4 pt-3 [scrollbar-color:rgba(255,255,255,0.12)_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/12">
          <div className="relative z-[1]">
          <div
            className="mb-7 grid w-full gap-3"
            style={{ gridTemplateColumns: gridCols }}
          >
            <div className="min-w-0" aria-hidden />
            {firms.map((firm) => (
              <HeaderCard key={firm.id} firm={firm} />
            ))}
          </div>

          <div className="flex flex-col gap-2">
            <CompareRow gridTemplateColumns={gridCols}>
              <Label icon={i.size}>Size</Label>
              {firms.map((firm) => (
                <div key={firm.id} className={valueCardClass}>
                  <span className="tabular-nums">{firm.size}</span>
                </div>
              ))}
            </CompareRow>

            <CompareRow gridTemplateColumns={gridCols}>
              <Label icon={i.type}>Type</Label>
              {firms.map((firm) => (
                <div key={firm.id} className={valueCardClass}>
                  {accountTypeLabel(firm.accountType)}
                </div>
              ))}
            </CompareRow>

            <CompareRow gridTemplateColumns={gridCols}>
              <Label icon={i.card}>Billing</Label>
              {firms.map((firm) => (
                <div key={firm.id} className={valueCardClass}>
                  {paymentPlanLabel(firm.paymentPlan)}
                </div>
              ))}
            </CompareRow>

            <CompareRow gridTemplateColumns={gridCols}>
              <Label icon={i.dollar}>Price</Label>
              {firms.map((firm) => (
                <div key={firm.id} className={valueCardClass}>
                  {firm.discountedPrice != null &&
                  firm.discountedPrice < firm.regularPrice ? (
                    <div className="flex max-w-full flex-nowrap items-center justify-center gap-2 overflow-x-auto">
                      <span className="shrink-0 font-semibold whitespace-nowrap text-emerald-300/95">
                        {formatUsdCompact(firm.discountedPrice)}
                      </span>
                      <span className="shrink-0 whitespace-nowrap text-[12px] text-slate-500 line-through">
                        {formatUsdCompact(firm.regularPrice)}
                      </span>
                      <span className="shrink-0 whitespace-nowrap text-[12px] text-slate-400">
                        −
                        {calcDiscountPct(firm.regularPrice, firm.discountedPrice)}
                        %
                      </span>
                    </div>
                  ) : (
                    <span className="font-medium text-white/85">
                      {formatUsdCompact(firm.regularPrice)}
                    </span>
                  )}
                </div>
              ))}
            </CompareRow>

            <CompareRow gridTemplateColumns={gridCols}>
              <Label icon={i.bolt}>Activation</Label>
              {firms.map((firm) => (
                <div key={firm.id} className={valueCardClass}>
                  {isActivationFree(firm) ? (
                    <>
                      <span className="font-medium text-emerald-300/90">Free</span>
                      {firm.activationNote ? (
                        <p className="mt-0.5 text-center text-[12px] text-emerald-300/75">
                          {firm.activationNote}
                        </p>
                      ) : null}
                    </>
                  ) : (
                    <span className="font-medium text-red-300/90">
                      {formatUsdCompact(firm.activationFeeUsd ?? 0)}
                    </span>
                  )}
                </div>
              ))}
            </CompareRow>

            <CompareRow gridTemplateColumns={gridCols}>
              <Label icon={i.tag}>Promo code</Label>
              {firms.map((firm) => (
                <div key={firm.id} className={valueCardClass}>
                  {firm.promo.trim() ? (
                    <button
                      type="button"
                      onClick={() => onPromoCopy(firm.promo.trim())}
                      className={`${promoPillClass} cursor-pointer transition hover:border-sky-500/30 hover:bg-sky-500/10 hover:text-white`}
                    >
                      {firm.promo.trim()}
                    </button>
                  ) : (
                    <span className="text-slate-500">-</span>
                  )}
                </div>
              ))}
            </CompareRow>

            <CompareRow gridTemplateColumns={gridCols}>
              <Label icon={i.grid}>Data feed</Label>
              {firms.map((firm) => (
                <div
                  key={firm.id}
                  className={`${valueCardClass} items-center justify-center`}
                >
                  <div className="flex flex-wrap justify-center gap-1">
                    <PlatformLogos platforms={firm.platforms} compact size={22} />
                  </div>
                </div>
              ))}
            </CompareRow>

            <CompareRow gridTemplateColumns={gridCols}>
              <Label icon={i.chart}>Drawdown</Label>
              {firms.map((firm) => (
                <div key={firm.id} className={valueCardClass}>
                  <span className="tabular-nums text-white/80">
                    {DRAWDOWN_LABEL[firm.drawdown]}{" "}
                    {formatUsdWholeGrouped(firm.maxDrawdownLimitUsd)}
                  </span>
                </div>
              ))}
            </CompareRow>

            <CompareRow gridTemplateColumns={gridCols}>
              <Label icon={i.target}>Profit target</Label>
              {firms.map((firm) => (
                <div key={firm.id} className={valueCardClass}>
                  {firm.target}
                </div>
              ))}
            </CompareRow>

            <CompareRow gridTemplateColumns={gridCols}>
              <Label icon={i.chart}>Consistency</Label>
              {firms.map((firm) => (
                <div key={firm.id} className={valueCardClass}>
                  {normalizeConsistency(firm.rules.consistency)}
                </div>
              ))}
            </CompareRow>

            <CompareRow gridTemplateColumns={gridCols}>
              <Label icon={i.calendar}>Minimum days</Label>
              {firms.map((firm) => (
                <div key={firm.id} className={valueCardClass}>
                  {firm.rules.minDays}
                </div>
              ))}
            </CompareRow>

            <CompareRow gridTemplateColumns={gridCols}>
              <Label icon={i.shield}>Daily loss limit</Label>
              {firms.map((firm) => (
                <div key={firm.id} className={valueCardClass}>
                  {firm.rules.dailyLossLimit}
                </div>
              ))}
            </CompareRow>

            <CompareRow gridTemplateColumns={gridCols}>
              <Label icon={i.activity}>Scalping</Label>
              {firms.map((firm) => (
                <div key={firm.id} className={valueCardClass}>
                  <span className="text-emerald-300/90">{firm.rules.scalping}</span>
                  {firm.rules.scalpingDetail ? (
                    <p className="mt-0.5 text-center text-[12px] text-slate-500">
                      {firm.rules.scalpingDetail}
                    </p>
                  ) : null}
                </div>
              ))}
            </CompareRow>

            <CompareRow gridTemplateColumns={gridCols}>
              <Label icon={i.box}>Sizing</Label>
              {firms.map((firm) => (
                <div key={firm.id} className={valueCardClass}>
                  <span className="whitespace-pre-line text-center">
                    {firm.rules.sizing}
                  </span>
                </div>
              ))}
            </CompareRow>

            <CompareRow gridTemplateColumns={gridCols}>
              <Label icon={i.users}>Max accounts</Label>
              {firms.map((firm) => (
                <div key={firm.id} className={valueCardClass}>
                  <span>{firm.rules.maxAccounts}</span>
                  {firm.rules.maxAccountsDetail ? (
                    <p className="mt-0.5 text-center text-[12px] text-slate-500">
                      {firm.rules.maxAccountsDetail}
                    </p>
                  ) : null}
                </div>
              ))}
            </CompareRow>

            <CompareRow gridTemplateColumns={gridCols}>
              <Label icon={i.license}>License</Label>
              {firms.map((firm) => (
                <div
                  key={firm.id}
                  className={`${valueCardClass} items-center justify-center`}
                >
                  <div className="flex flex-wrap justify-center gap-1">
                    <PlatformLogos
                      platforms={firm.rules.licensePlatforms}
                      compact
                      size={22}
                    />
                  </div>
                </div>
              ))}
            </CompareRow>

            <CompareRow gridTemplateColumns={gridCols}>
              <Label icon={i.swap}>Round trip MNQ / NQ</Label>
              {firms.map((firm) => (
                <div key={firm.id} className={valueCardClass}>
                  <ModalRoundTrip firm={firm} />
                </div>
              ))}
            </CompareRow>

            <CompareRow gridTemplateColumns={gridCols}>
              <Label icon={i.star}>Score</Label>
              {firms.map((firm) => (
                <div key={firm.id} className={valueCardClass}>
                  <ScoreRing score={firm.score} />
                </div>
              ))}
            </CompareRow>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}
