"use client";

import Image from "next/image";
import type { CSSProperties, MouseEvent, ReactNode } from "react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AccountRulesBanner } from "@/components/account-rules-banner";
import { CompareDetailModal } from "@/components/compare-detail-modal";
import { CompareFundedRulesModal } from "@/components/compare-funded-rules-modal";
import { FirmAccountCell } from "@/components/firm-account-cell";
import Navbar from "@/components/navbar";
import { PlatformLogos } from "@/components/platform-logos";
import type {
  AccountRulesBrief,
  DrawdownType,
  PaymentPlan,
  PropFirm,
} from "@/lib/prop-firms";
import {
  effectivePrice,
  evalStartupTotalUsd,
  formatUsdCompact,
  formatUsdWholeGrouped,
  isActivationFree,
  isTradeifySelectVariantCompareRow,
  propFirms,
} from "@/lib/prop-firms";
import {
  PROP_FIRM_SIDEBAR_COLLAPSED_COUNT,
  SIDEBAR_PROP_FIRMS,
} from "@/lib/prop-firm-sidebar";
import {
  platformLabels,
  platformLogoSrc,
  type PlatformId,
} from "@/lib/platforms";

/** Aligné journal Dashboard / Progress / Account — slate, sky discret, peu de glow. */
const COMPARE_KICKER =
  "text-[10px] font-semibold uppercase tracking-[0.2em] text-sky-400/90";

const COMPARE_PANEL =
  "rounded-2xl border border-slate-600/25 bg-gradient-to-b from-slate-800/40 via-slate-900/45 to-slate-950/55 shadow-[0_16px_40px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.08)]";

const COMPARE_TABLE_ROW =
  "overflow-hidden rounded-xl border border-white/10 bg-black/25 shadow-sm shadow-black/10 transition-[background-color,box-shadow,border-color] duration-200 hover:border-sky-500/30 hover:bg-black/32";

const ROUND_TRIP_PLATFORM_ORDER: PlatformId[] = [
  "tradovate",
  "rithmic",
  "dxfeed",
  "wealthcharts",
];

/** Fluid grid: fills the main area; Action column keeps room for wrapped CTA text. */
const COMPARE_TABLE_GRID_STYLE: CSSProperties = {
  gridTemplateColumns:
    "minmax(0, 2.35fr) repeat(10, minmax(0, 1fr)) minmax(0, 1fr)",
};

/** Extra left inset vs Size/Promo — shifts Price column (+8px vs prior inset at each bp). */
const COMPARE_PRICE_COL_INSET =
  "pl-12 sm:pl-[52px] md:pl-14 lg:pl-16 xl:pl-[68px]";

const COMPARE_PROMO_COL_INSET = "pl-1 sm:pl-2 md:pl-3";

/** Same pl-* nudge as Price — Size shifted +12px vs prior inset at each bp. */
const COMPARE_SIZE_COL_INSET =
  "pl-[92px] sm:pl-24 md:pl-[100px] lg:pl-[104px]";

const PLATFORM_FILTER_IDS: PlatformId[] = [
  "tradovate",
  "rithmic",
  "projectx",
  "dxfeed",
];

function RoundTripCell({ firm }: { firm: PropFirm }) {
  const rows = firm.roundTripByPlatform;
  if (rows?.length) {
    const sortedRows = [...rows].sort((a, b) => {
      const aRank = ROUND_TRIP_PLATFORM_ORDER.indexOf(a.platform);
      const bRank = ROUND_TRIP_PLATFORM_ORDER.indexOf(b.platform);
      const safeARank = aRank === -1 ? Number.MAX_SAFE_INTEGER : aRank;
      const safeBRank = bRank === -1 ? Number.MAX_SAFE_INTEGER : bRank;
      if (safeARank !== safeBRank) return safeARank - safeBRank;
      return platformLabels[a.platform].localeCompare(platformLabels[b.platform], "en");
    });
    return (
      <div className="flex min-w-0 flex-col gap-0.5">
        {sortedRows.map(({ platform, mnqNq }) => {
          const src = platformLogoSrc[platform];
          const label = platformLabels[platform];
          return (
            <div
              key={platform}
              className="flex items-center gap-1.5"
              title={`${label} ${mnqNq}`}
            >
              <span className="inline-flex h-[11px] w-[11px] shrink-0 items-center justify-center rounded border border-slate-600/30 bg-black/40 p-px shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                {src ? (
                  <Image
                    src={src}
                    alt=""
                    width={8}
                    height={8}
                    unoptimized
                    className="h-2 w-2 object-contain"
                  />
                ) : (
                  <span className="text-[6px] font-bold uppercase text-white/45">
                    {label.slice(0, 2)}
                  </span>
                )}
              </span>
              <span className="text-[11px] tabular-nums leading-none text-slate-400">
                {mnqNq}
              </span>
            </div>
          );
        })}
      </div>
    );
  }
  return (
    <div className="whitespace-pre-line text-[12px] leading-snug text-slate-400">
      {firm.roundTripMnqNq}
    </div>
  );
}

function scoreRingConfig(score: number) {
  const clamped = Math.max(0, Math.min(10, score));
  const filledAngle = (clamped / 10) * 360;

  if (score >= 8) {
    // High score → emerald ring
    return {
      filledAngle,
      fillColor: "rgba(16,185,129,0.9)",
      trackColor: "rgba(39,39,42,0.55)",
      innerClass: "bg-zinc-950 text-emerald-300",
    } as const;
  }
  if (score >= 7) {
    // Mid score → amber ring
    return {
      filledAngle,
      fillColor: "rgba(245,158,11,0.95)",
      trackColor: "rgba(39,39,42,0.55)",
      innerClass: "bg-zinc-950 text-amber-300",
    } as const;
  }
  if (score >= 4) {
    // Low-mid → orange ring
    return {
      filledAngle,
      fillColor: "rgba(249,115,22,0.95)",
      trackColor: "rgba(39,39,42,0.55)",
      innerClass: "bg-zinc-950 text-orange-300",
    } as const;
  }
  // Very low → red ring
  return {
    filledAngle,
    fillColor: "rgba(239,68,68,0.95)",
    trackColor: "rgba(39,39,42,0.55)",
    innerClass: "bg-zinc-950 text-red-300",
  } as const;
}

type ScoreTier = "high" | "mid" | "low";

/** Filtres — actif sky discret (sans halo fort), inactif glass sobre. */
function filterPill(active: boolean) {
  return active
    ? "border-sky-500/35 bg-sky-500/15 text-white shadow-sm shadow-black/20"
    : "border-white/10 bg-white/[0.04] text-slate-500 hover:border-white/14 hover:bg-white/[0.06] hover:text-white/85";
}

function FilterCheckbox({
  checked,
  onCheckedChange,
}: {
  checked: boolean;
  onCheckedChange: () => void;
}) {
  return (
    <span className="relative grid h-[18px] w-[18px] shrink-0 place-items-center">
      <input
        type="checkbox"
        checked={checked}
        onChange={() => onCheckedChange()}
        className="peer absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
      />
      <span
        className="pointer-events-none col-start-1 row-start-1 flex h-[18px] w-[18px] items-center justify-center rounded-[5px] border border-white/15 bg-black/50 transition duration-200 peer-focus-visible:ring-2 peer-focus-visible:ring-sky-500/30 peer-checked:border-sky-500/40 peer-checked:bg-sky-500/10 peer-checked:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]"
        aria-hidden
      >
        <svg
          viewBox="0 0 12 12"
          fill="none"
          className={`h-2.5 w-2.5 stroke-white transition duration-150 ${
            checked ? "scale-100 opacity-100" : "scale-50 opacity-0"
          }`}
          strokeWidth={2.2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m2.5 6 2.5 2.5L9.5 3.5" />
        </svg>
      </span>
    </span>
  );
}

function isNoDailyLossListed(rules: AccountRulesBrief): boolean {
  const s = rules.dailyLossLimit.trim();
  if (s === "" || s === "—" || s === "-" || s === "–") {
    return true;
  }
  return /^n\/?a$/i.test(s);
}

function scoreMatchesTiers(score: number, tiers: ScoreTier[]): boolean {
  if (tiers.length === 0) {
    return true;
  }
  const high = score >= 8;
  const mid = score >= 4 && score <= 7;
  const low = score <= 3;
  return (
    (tiers.includes("high") && high) ||
    (tiers.includes("mid") && mid) ||
    (tiers.includes("low") && low)
  );
}

function FilterSection({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="border-b border-slate-600/15 py-5 first:pt-0 last:border-b-0 last:pb-0">
      <p className={COMPARE_KICKER}>{title}</p>
      {hint ? (
        <p className="mt-1 text-[10px] leading-relaxed text-slate-500">{hint}</p>
      ) : null}
      <div className="mt-3.5">{children}</div>
    </div>
  );
}

type SortKey = "price" | "score" | "size" | "propfirm" | "activation";

const SIZE_RANK: Record<PropFirm["size"], number> = {
  "10k": 10,
  "25k": 25,
  "50k": 50,
  "75k": 75,
  "100k": 100,
  "150k": 150,
  "200k": 200,
  "250k": 250,
  "300k": 300,
};

function defaultSortDir(key: SortKey): "asc" | "desc" {
  return key === "score" ? "desc" : "asc";
}

/** Initial + Reset: meilleurs scores en premier (desc). */
const DEFAULT_COMPARE_TABLE_SORT: SortKey = "score";

function activationFeeSortValue(firm: { activationFeeUsd: number | null }): number {
  if (firm.activationFeeUsd === null || firm.activationFeeUsd === 0) {
    return 0;
  }
  return firm.activationFeeUsd;
}

function calcDiscountPct(regular: number, discounted: number): number {
  if (regular <= 0 || discounted >= regular) return 0;
  return Math.round((1 - discounted / regular) * 100);
}

function formatPromoExpiryLabel(): string {
  // Same behavior as screenshot: end of current month (e.g. 31/03).
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-based
  const lastDay = new Date(year, month + 1, 0).getDate();
  const mm = String(month + 1).padStart(2, "0");
  return `${String(lastDay).padStart(2, "0")}/${mm}`;
}

function paymentPlanLabel(plan: PaymentPlan): string {
  return plan === "subscription" ? "Subscription" : "One-time payment";
}

function compareFirmsForSort(
  a: (typeof propFirms)[number],
  b: (typeof propFirms)[number],
  key: SortKey,
  dir: "asc" | "desc"
): number {
  const sign = dir === "asc" ? 1 : -1;
  let delta = 0;
  switch (key) {
    case "price":
      delta = effectivePrice(a) - effectivePrice(b);
      break;
    case "score":
      delta = a.score - b.score;
      break;
    case "size":
      delta = SIZE_RANK[a.size] - SIZE_RANK[b.size];
      break;
    case "propfirm":
      delta =
        a.name.localeCompare(b.name, "en") ||
        a.accountName.localeCompare(b.accountName, "en");
      break;
    case "activation":
      delta = activationFeeSortValue(a) - activationFeeSortValue(b);
      break;
    default:
      delta = 0;
  }
  if (delta !== 0) {
    return delta * sign;
  }
  return effectivePrice(a) - effectivePrice(b);
}

function CompareIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0 opacity-80"
      aria-hidden
    >
      <rect x="3" y="4" width="8" height="8" rx="1.5" />
      <rect x="13" y="12" width="8" height="8" rx="1.5" />
      <path d="M11 8h2M8 11v2M16 13h2M13 16v2" />
    </svg>
  );
}

/** Drawdown — accent violet atténué, lisible sur fond slate. */
const DRAWDOWN_PILL_CLASS =
  "border-slate-500/30 bg-violet-500/8 text-violet-200/90";

function withAffiliateTracking(
  url: string,
  firm: {
    id: number;
    name: string;
    size: string;
    drawdown: DrawdownType;
    affiliateUrlAnchor?: string;
  }
) {
  const trackedUrl = new URL(url);
  trackedUrl.searchParams.set("utm_source", "mytradedesk");
  trackedUrl.searchParams.set("utm_medium", "comparator");
  trackedUrl.searchParams.set("utm_campaign", "affiliate");
  const slug = `${firm.id}-${firm.name.toLowerCase().replaceAll(" ", "-")}-${firm.size}-${firm.drawdown.toLowerCase()}`;
  trackedUrl.searchParams.set("utm_content", slug);
  if (firm.affiliateUrlAnchor) {
    trackedUrl.hash = firm.affiliateUrlAnchor.replace(/^#/, "");
  }
  return trackedUrl.toString();
}

const QUICK_SORTS: { key: SortKey; label: string }[] = [
  { key: "price", label: "Price" },
  { key: "score", label: "Score" },
  { key: "size", label: "Size" },
  { key: "propfirm", label: "PROPFIRM" },
  { key: "activation", label: "Activation" },
];

function toggleListItem<T>(list: T[], item: T): T[] {
  const idx = list.indexOf(item);
  if (idx === -1) {
    return [...list, item];
  }
  return list.filter((_, i) => i !== idx);
}

const ACCOUNT_SIZES = ["25k", "50k", "75k", "100k", "150k", "200k", "250k", "300k"] as const satisfies readonly PropFirm["size"][];
const DRAWDOWN_FILTERS: DrawdownType[] = ["EOD", "EOT", "Trailing", "Static"];

const DRAWDOWN_SIDEBAR_LABEL: Record<DrawdownType, string> = {
  EOD: "EOD",
  EOT: "EOT",
  Trailing: "Trail",
  Static: "Static",
};

/** Pill label: sentence case; EOD/EOT full caps; account sizes → `25k` style. */
function formatFilterChipLabel(label: string): string {
  const s = label.trim();
  if (!s) return label;
  if (s.toUpperCase() === "EOD") return "EOD";
  if (s.toUpperCase() === "EOT") return "EOT";
  const sizeMatch = /^(\d+)[kK]$/.exec(s);
  if (sizeMatch) {
    return `${sizeMatch[1]}k`;
  }
  const letters = s.replace(/[^A-Za-zÀ-ÿ]/g, "");
  if (letters.length > 0 && s === s.toUpperCase() && /[A-Z]/.test(s)) {
    return s.charAt(0) + s.slice(1).toLowerCase();
  }
  return s;
}

function ActiveFilterChip({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) {
  const shown = formatFilterChipLabel(label);
  return (
    <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full border border-sky-500/30 bg-sky-500/10 py-0.5 pl-2 pr-0.5 text-[10px] font-medium leading-tight tracking-normal text-white/88">
      <span className="whitespace-nowrap">{shown}</span>
      <button
        type="button"
        onClick={onRemove}
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] text-white/45 transition hover:bg-white/12 hover:text-white"
        aria-label={`Remove filter ${shown}`}
      >
        ×
      </button>
    </span>
  );
}

/** Rules panel: grid height + enter/exit keyframes (see globals.css). */
function CompareRulesDrawerSlot({
  firmId,
  rules,
  expandedRowId,
  exitingRowId,
  onExitComplete,
  onOpenFundedRules,
}: {
  firmId: number;
  rules: AccountRulesBrief;
  expandedRowId: number | null;
  exitingRowId: number | null;
  onExitComplete: (id: number) => void;
  onOpenFundedRules: () => void;
}) {
  const show = expandedRowId === firmId || exitingRowId === firmId;
  const isExit = exitingRowId === firmId;

  useEffect(() => {
    if (!isExit) return;
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }
    onExitComplete(firmId);
  }, [isExit, firmId, onExitComplete]);

  return (
    <div
      className={`compare-rules-grid-slot grid overflow-hidden transition-[grid-template-rows] duration-[30ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
        show ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
      }`}
    >
      <div className="min-h-0 overflow-hidden">
        {show ? (
          <div
            className={
              isExit ? "compare-rules-banner-exit" : "compare-rules-banner-enter"
            }
            onAnimationEnd={(e) => {
              if (!isExit) return;
              if (e.target !== e.currentTarget) return;
              onExitComplete(firmId);
            }}
          >
            <AccountRulesBanner rules={rules} onFundedRules={onOpenFundedRules} />
          </div>
        ) : null}
      </div>
    </div>
  );
}

const MOBILE_FIELD_DT =
  "text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500";
const MOBILE_FIELD_DD = "min-w-0 text-right text-[13px] font-medium text-white/88";

function CompareFirmMobileCard({
  firm,
  carpetActive,
  staggerMs,
  expanded,
  expandedRowId,
  exitingRowId,
  compareMode,
  compareSelected,
  onRowClick,
  onToggleRow,
  onToggleCompare,
  onCopyPromo,
  onOpenFundedRules,
  onRulesExit,
}: {
  firm: PropFirm;
  carpetActive: boolean;
  staggerMs: number;
  expanded: boolean;
  expandedRowId: number | null;
  exitingRowId: number | null;
  compareMode: boolean;
  compareSelected: boolean;
  onRowClick: (id: number, event: MouseEvent<HTMLDivElement>) => void;
  onToggleRow: (id: number) => void;
  onToggleCompare: (id: number) => void;
  onCopyPromo: (code: string) => void;
  onOpenFundedRules: () => void;
  onRulesExit: (id: number) => void;
}) {
  const cfg = scoreRingConfig(firm.score);
  const ringBackground = `conic-gradient(from 270deg, ${cfg.fillColor} 0deg, ${cfg.fillColor} ${cfg.filledAngle}deg, ${cfg.trackColor} ${cfg.filledAngle}deg, ${cfg.trackColor} 360deg)`;

  return (
    <div
      id={`firm-row-${firm.id}`}
      className={`${COMPARE_TABLE_ROW} ${carpetActive ? "compare-table-row-carpet" : ""}`}
      style={
        carpetActive
          ? {
              animation: `compare-table-carpet 0.4s cubic-bezier(0.22, 1, 0.36, 1) ${staggerMs}ms both`,
            }
          : undefined
      }
    >
      <div
        className="cursor-pointer px-3 py-3.5"
        onClick={(event) => onRowClick(firm.id, event)}
      >
        <div className="flex min-w-0 items-start justify-between gap-2 border-b border-white/[0.07] pb-3">
          <div className="min-w-0 flex-1" data-account-cell="true">
            <FirmAccountCell
              accountName={firm.accountName}
              firmName={firm.name}
              countryCode={firm.countryCode}
              sinceYear={firm.sinceYear}
              firmLogoSrc={firm.firmLogoSrc}
              expanded={expanded}
              onToggleExpand={compareMode ? undefined : () => onToggleRow(firm.id)}
              compareMode={compareMode}
              compareSelected={compareSelected}
              onCompareToggle={() => onToggleCompare(firm.id)}
            />
          </div>
          <div
            className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full shadow-[0_0_10px_rgba(0,0,0,0.35)]"
            style={{ backgroundImage: ringBackground }}
          >
            <div className="absolute inset-[2px] rounded-full border border-black/70" />
            <div
              className={`relative flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-semibold ${cfg.innerClass}`}
            >
              {firm.score}
            </div>
          </div>
        </div>

        <dl className="mt-3 grid grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] gap-x-3 gap-y-2.5 text-left">
          <dt className={MOBILE_FIELD_DT}>Size</dt>
          <dd className={`${MOBILE_FIELD_DD} text-white`}>{firm.size}</dd>

          <dt className={MOBILE_FIELD_DT}>Price</dt>
          <dd className={`${MOBILE_FIELD_DD} tabular-nums`}>
            {firm.discountedPrice != null && firm.discountedPrice < firm.regularPrice ? (
              <div className="flex flex-col items-end gap-0.5">
                <div className="flex flex-wrap items-center justify-end gap-1">
                  <span className="font-semibold text-emerald-300/95">
                    {formatUsdCompact(firm.discountedPrice)}
                  </span>
                  <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-300/85">
                    <Image
                      src="/discount-tag.png"
                      alt=""
                      unoptimized
                      width={14}
                      height={11}
                      className="h-[11px] w-[14px] object-contain opacity-90"
                    />
                    -{calcDiscountPct(firm.regularPrice, firm.discountedPrice)}%
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 line-through">
                  {formatUsdCompact(firm.regularPrice)}
                </span>
              </div>
            ) : (
              <span className="text-white/85">{formatUsdCompact(firm.regularPrice)}</span>
            )}
          </dd>

          <dt className={MOBILE_FIELD_DT}>Promo</dt>
          <dd className={MOBILE_FIELD_DD}>
            {firm.promo ? (
              <button
                type="button"
                data-row-click-ignore="true"
                onClick={() => {
                  void onCopyPromo(firm.promo);
                }}
                className="rounded-lg border border-white/12 bg-white/[0.05] px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-white/82 transition hover:border-sky-500/30 hover:bg-sky-500/10"
              >
                {firm.promo}
              </button>
            ) : (
              <span className="text-white/45">{firm.promo ?? "—"}</span>
            )}
          </dd>

          <dt className={MOBILE_FIELD_DT}>Billing</dt>
          <dd className={`${MOBILE_FIELD_DD} text-white/70`}>{paymentPlanLabel(firm.paymentPlan)}</dd>

          <dt className={MOBILE_FIELD_DT}>Activation</dt>
          <dd className={`${MOBILE_FIELD_DD} tabular-nums`}>
            {isActivationFree(firm) ? (
              <span className="font-medium text-emerald-300/90">FREE</span>
            ) : (
              <span className="font-medium text-red-300/90">
                {formatUsdCompact(firm.activationFeeUsd ?? 0)}
              </span>
            )}
            <p className="mt-0.5 text-[10px] font-normal text-slate-500">
              Total {formatUsdCompact(evalStartupTotalUsd(firm))}
            </p>
          </dd>

          <dt className={MOBILE_FIELD_DT}>Data feed</dt>
          <dd className={`${MOBILE_FIELD_DD} flex justify-end`}>
            <div className="origin-center scale-[0.72]">
              <PlatformLogos platforms={firm.platforms} />
            </div>
          </dd>

          <dt className={MOBILE_FIELD_DT}>Drawdown</dt>
          <dd className={`${MOBILE_FIELD_DD} flex flex-col items-end gap-1`}>
            <span className="tabular-nums text-white/65">
              {formatUsdWholeGrouped(firm.maxDrawdownLimitUsd)}
            </span>
            <span
              className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium ${DRAWDOWN_PILL_CLASS}`}
            >
              {DRAWDOWN_SIDEBAR_LABEL[firm.drawdown]}
            </span>
          </dd>

          <dt className={MOBILE_FIELD_DT}>Target</dt>
          <dd className={`${MOBILE_FIELD_DD} text-white/65`}>{firm.target}</dd>
        </dl>

        <div className="mt-2 border-t border-white/[0.06] pt-2">
          <p className={`${MOBILE_FIELD_DT} mb-1.5`}>Round trip (MNQ / NQ)</p>
          <div className="flex justify-end">
            <RoundTripCell firm={firm} />
          </div>
        </div>

        <a
          href={withAffiliateTracking(firm.affiliateUrl, firm)}
          target="_blank"
          rel="noreferrer"
          data-row-click-ignore="true"
          className="mt-4 flex w-full items-center justify-center rounded-xl border border-white/12 bg-white/[0.08] px-4 py-3 text-center text-[12px] font-semibold text-white shadow-sm shadow-black/25 transition hover:border-sky-500/35 hover:bg-sky-500/12"
        >
          Start Evaluation
        </a>
      </div>
      <CompareRulesDrawerSlot
        firmId={firm.id}
        rules={firm.rules}
        expandedRowId={expandedRowId}
        exitingRowId={exitingRowId}
        onExitComplete={onRulesExit}
        onOpenFundedRules={onOpenFundedRules}
      />
    </div>
  );
}

export default function ComparePage() {
  const [query, setQuery] = useState("");
  /** Empty = all account sizes. */
  const [selectedSizes, setSelectedSizes] = useState<PropFirm["size"][]>([]);
  /** Empty = all drawdown types. */
  const [selectedDrawdowns, setSelectedDrawdowns] = useState<DrawdownType[]>(
    []
  );
  /** Empty = any platform (no platform filter). */
  const [selectedPlatforms, setSelectedPlatforms] = useState<PlatformId[]>(
    []
  );
  /** Empty = all firms in the dataset. */
  const [selectedFirmNames, setSelectedFirmNames] = useState<string[]>([]);
  /** Empty = eval + direct. */
  const [selectedAccountTypes, setSelectedAccountTypes] = useState<
    ("Eval" | "Direct")[]
  >([]);
  /** Empty = all score bands. */
  const [selectedScoreTiers, setSelectedScoreTiers] = useState<ScoreTier[]>(
    []
  );
  const [maxPriceUsd, setMaxPriceUsd] = useState("");
  const [dailyLossFilter, setDailyLossFilter] = useState<
    "all" | "none" | "with"
  >("all");
  const [sortKey, setSortKey] = useState<SortKey>(
    DEFAULT_COMPARE_TABLE_SORT
  );
  const [sortDir, setSortDir] = useState<"asc" | "desc">(() =>
    defaultSortDir(DEFAULT_COMPARE_TABLE_SORT)
  );
  /**
   * Incremented only by Reset — keeps `filterFingerprint` distinct when filters
   * were already default so the table roll still runs (same as a full reset).
   */
  const [filterResetNonce, setFilterResetNonce] = useState(0);
  /** At most one rules banner open at a time. */
  const [expandedRowId, setExpandedRowId] = useState<number | null>(null);
  /** Row whose rules panel is playing the close (drawer + spring) animation. */
  const [exitingRowId, setExitingRowId] = useState<number | null>(null);
  const [propFirmListExpanded, setPropFirmListExpanded] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [compareIds, setCompareIds] = useState<number[]>([]);
  const [compareDetailOpen, setCompareDetailOpen] = useState(false);
  const [fundedRulesFirm, setFundedRulesFirm] = useState<PropFirm | null>(null);

  const compareDetailFirms = useMemo(() => {
    return compareIds
      .map((id) => propFirms.find((f) => f.id === id))
      .filter((f): f is PropFirm => f != null);
  }, [compareIds]);
  const [copiedPromoCode, setCopiedPromoCode] = useState<string | null>(null);

  const toggleCompareId = useCallback((id: number) => {
    setCompareIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((x) => x !== id);
      }
      if (prev.length >= 4) {
        return prev;
      }
      return [...prev, id];
    });
  }, []);

  const copyPromoToClipboard = useCallback(async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedPromoCode(code);
      window.setTimeout(() => {
        setCopiedPromoCode((current) => (current === code ? null : current));
      }, 2000);
    } catch {
      // Ignore clipboard errors silently
    }
  }, []);

  const totalFirms = propFirms.length;

  const visiblePropFirms =
    propFirmListExpanded ||
    SIDEBAR_PROP_FIRMS.length <= PROP_FIRM_SIDEBAR_COLLAPSED_COUNT
      ? SIDEBAR_PROP_FIRMS
      : SIDEBAR_PROP_FIRMS.slice(0, PROP_FIRM_SIDEBAR_COLLAPSED_COUNT);
  const showPropFirmToggle =
    SIDEBAR_PROP_FIRMS.length > PROP_FIRM_SIDEBAR_COLLAPSED_COUNT;

  const clearRulesExit = useCallback((id: number) => {
    setExitingRowId((current) => (current === id ? null : current));
  }, []);

  const toggleRow = useCallback((id: number) => {
    setExpandedRowId((prev) => {
      if (prev === id) {
        setExitingRowId(id);
        return null;
      }
      if (prev !== null && prev !== id) {
        setExitingRowId(prev);
      } else if (prev === null) {
        setExitingRowId(null);
      }
      return id;
    });
  }, []);

  const handleRowClick = useCallback(
    (id: number, event: React.MouseEvent<HTMLDivElement>) => {
      const target = event.target as HTMLElement;
      if (
        target.closest(
          'button, a, input, label, [data-row-click-ignore="true"]'
        )
      ) {
        return;
      }
      if (compareMode) {
        toggleCompareId(id);
        return;
      }
      toggleRow(id);
    },
    [compareMode, toggleCompareId, toggleRow]
  );

  const filteredFirms = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const maxParsed = maxPriceUsd.trim();
    const maxN =
      maxParsed === "" ? NaN : Number.parseFloat(maxParsed.replace(",", "."));
    const hasMaxFilter =
      maxParsed !== "" && Number.isFinite(maxN) && maxN >= 0;

    const base = propFirms.filter((firm) => {
      const queryMatch =
        normalizedQuery.length === 0 ||
        firm.name.toLowerCase().includes(normalizedQuery) ||
        firm.accountName.toLowerCase().includes(normalizedQuery) ||
        firm.roundTripMnqNq.toLowerCase().includes(normalizedQuery);
      const firmMatch =
        selectedFirmNames.length === 0 ||
        selectedFirmNames.includes(firm.name);
      const accountTypeMatch =
        selectedAccountTypes.length === 0 ||
        selectedAccountTypes.includes(firm.accountType);
      const sizeMatch =
        selectedSizes.length === 0 || selectedSizes.includes(firm.size);
      const drawdownMatch =
        selectedDrawdowns.length === 0 ||
        selectedDrawdowns.includes(firm.drawdown);
      const platformMatch =
        selectedPlatforms.length === 0 ||
        selectedPlatforms.some((p) => firm.platforms.includes(p));
      const scoreMatch = scoreMatchesTiers(firm.score, selectedScoreTiers);
      const priceMatch =
        !hasMaxFilter || effectivePrice(firm) <= maxN;
      const dailyMatch =
        dailyLossFilter === "all" ||
        (dailyLossFilter === "none" && isNoDailyLossListed(firm.rules)) ||
        (dailyLossFilter === "with" && !isNoDailyLossListed(firm.rules));
      const tradeifySelectDup =
        firm.name === "Tradeify" && isTradeifySelectVariantCompareRow(firm);
      return (
        queryMatch &&
        firmMatch &&
        accountTypeMatch &&
        sizeMatch &&
        drawdownMatch &&
        platformMatch &&
        scoreMatch &&
        priceMatch &&
        dailyMatch &&
        !tradeifySelectDup
      );
    });

    const sorted = [...base];
    sorted.sort((a, b) => compareFirmsForSort(a, b, sortKey, sortDir));
    return sorted;
  }, [
    dailyLossFilter,
    maxPriceUsd,
    query,
    selectedAccountTypes,
    selectedDrawdowns,
    selectedFirmNames,
    selectedPlatforms,
    selectedScoreTiers,
    selectedSizes,
    sortDir,
    sortKey,
  ]);

  /**
   * Full snapshot of everything that defines “which accounts + how ordered”.
   * Bumping the table roll on fingerprint change replays the carpet on the
   * entire list for every filter add/remove (including prop firms), not only
   * when the id list string happens to differ.
   */
  const filterFingerprint = useMemo(
    () =>
      JSON.stringify({
        q: query.trim(),
        sizes: [...selectedSizes].slice().sort(),
        drawdowns: [...selectedDrawdowns].slice().sort(),
        platforms: [...selectedPlatforms].slice().sort(),
        propFirms: [...selectedFirmNames].slice().sort(),
        accountTypes: [...selectedAccountTypes].slice().sort(),
        scoreTiers: [...selectedScoreTiers].slice().sort(),
        maxPrice: maxPriceUsd.trim(),
        dailyLoss: dailyLossFilter,
        sortKey,
        sortDir,
        resetNonce: filterResetNonce,
      }),
    [
      query,
      selectedSizes,
      selectedDrawdowns,
      selectedPlatforms,
      selectedFirmNames,
      selectedAccountTypes,
      selectedScoreTiers,
      maxPriceUsd,
      dailyLossFilter,
      sortKey,
      sortDir,
      filterResetNonce,
    ]
  );

  /**
   * Bump before paint so the first filter change never paints with epoch 0 (no animation).
   * Rows use `key={epoch-firm.id}` so every line remounts on each change — same as reset,
   * the whole list replays the carpet (not only newly visible rows).
   */
  const [tableRollEpoch, setTableRollEpoch] = useState(0);
  const prevFilterFingerprintRef = useRef<string | null>(null);

  useLayoutEffect(() => {
    if (prevFilterFingerprintRef.current === null) {
      prevFilterFingerprintRef.current = filterFingerprint;
      return;
    }
    if (prevFilterFingerprintRef.current === filterFingerprint) {
      return;
    }
    prevFilterFingerprintRef.current = filterFingerprint;
    setTableRollEpoch((n) => n + 1);
  }, [filterFingerprint]);

  const clearFilters = useCallback(() => {
    setFilterResetNonce((n) => n + 1);
    setQuery("");
    setSelectedSizes([]);
    setSelectedDrawdowns([]);
    setSelectedPlatforms([]);
    setSelectedFirmNames([]);
    setSelectedAccountTypes([]);
    setSelectedScoreTiers([]);
    setMaxPriceUsd("");
    setDailyLossFilter("all");
    setSortKey(DEFAULT_COMPARE_TABLE_SORT);
    setSortDir(defaultSortDir(DEFAULT_COMPARE_TABLE_SORT));
    setCompareMode(false);
    setCompareIds([]);
    setCompareDetailOpen(false);
    setExpandedRowId(null);
    setExitingRowId(null);
  }, []);

  const selectSort = useCallback(
    (key: SortKey) => {
      if (key === sortKey) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        return;
      }
      setSortKey(key);
      setSortDir(defaultSortDir(key));
    },
    [sortKey]
  );

  return (
    <main className="relative flex w-full flex-col bg-gradient-to-b from-[#0a0c10] via-[#080a0e] to-black text-white">
      {/*
        lg+: sidebar and navbar share the same top row (Filters aligns with nav).
        Navbar only spans the main column, not the filter column.
      */}
      <div className="flex min-h-0 w-full max-w-[100vw] flex-col lg:flex-row">
        <aside className="hidden border-r border-slate-600/20 bg-gradient-to-b from-[#080a0e] to-[#06080c] lg:sticky lg:top-0 lg:flex lg:h-full lg:max-h-full lg:min-h-0 lg:w-[clamp(220px,22vw,300px)] lg:shrink-0 lg:self-start lg:flex-col lg:overflow-hidden xl:w-[clamp(240px,20vw,320px)]">
            <div className="flex min-h-0 flex-1 flex-col">
            <div className="shrink-0 border-b border-slate-600/20 bg-slate-950/40 px-5 pb-3 pt-4">
              <header className="mb-0">
                <p className={COMPARE_KICKER}>Refine</p>
                <h2 className="mt-2 text-xl font-semibold tracking-tight text-white">
                  Filters
                </h2>
                <p className="mt-1.5 text-[11px] leading-relaxed text-slate-500">
                  Combine filters freely. Leaving a group empty includes every
                  option in that group.
                </p>
              </header>
            </div>
            <div
              className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-transparent px-5 pb-7 pt-4 [scrollbar-color:rgba(255,255,255,0.12)_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/12 [&_button]:transition-transform [&_button]:duration-200 [&_button:hover]:-translate-y-px [&_label]:transition-transform [&_label]:duration-200 [&_label:hover]:-translate-y-px [&_input]:transition-transform [&_input]:duration-200 [&_input:hover]:-translate-y-px [&_input:focus]:-translate-y-px"
            >
            <div className="flex flex-col pb-2">
              <FilterSection title="Search">
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search…"
                  className="w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2.5 text-sm text-white/90 placeholder:text-slate-600 transition focus:border-sky-500/35 focus:outline-none focus:ring-1 focus:ring-sky-500/20"
                />
              </FilterSection>

              <FilterSection title="Prop firm">
                <div className="space-y-0.5">
                  {visiblePropFirms.map(({ name, logoSrc: logo }) => (
                    <label
                      key={name}
                      className="group flex cursor-pointer items-center gap-3 rounded-xl border border-transparent px-2 py-2 transition hover:border-slate-600/25 hover:bg-white/[0.04]"
                    >
                      <FilterCheckbox
                        checked={selectedFirmNames.includes(name)}
                        onCheckedChange={() =>
                          setSelectedFirmNames((prev) =>
                            toggleListItem(prev, name)
                          )
                        }
                      />
                      {logo ? (
                        <Image
                          src={logo}
                          alt=""
                          width={24}
                          height={24}
                          unoptimized
                          className="h-[23.4px] w-[23.4px] shrink-0 rounded-md object-contain ring-1 ring-white/10"
                        />
                      ) : (
                        <span className="flex h-[23.4px] w-[23.4px] shrink-0 items-center justify-center rounded-md bg-white/[0.06] text-[10px] font-bold uppercase text-white/45 ring-1 ring-white/12">
                          {name.slice(0, 1)}
                        </span>
                      )}
                      <span className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap text-[13px] text-white/50 [scrollbar-width:none] group-hover:text-white [&::-webkit-scrollbar]:hidden">
                        {name}
                      </span>
                    </label>
                  ))}
                </div>
                {showPropFirmToggle ? (
                  <button
                    type="button"
                    onClick={() =>
                      setPropFirmListExpanded((prev) => !prev)
                    }
                    className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl border border-transparent py-2 text-[11px] font-medium text-slate-500 transition hover:border-slate-600/25 hover:bg-white/[0.04] hover:text-white/75"
                  >
                    {propFirmListExpanded ? (
                      <>
                        <svg
                          className="h-3 w-3 shrink-0"
                          viewBox="0 0 12 12"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden
                        >
                          <path d="M2 7.5L6 3.5L10 7.5" />
                        </svg>
                        Collapse
                      </>
                    ) : (
                      <>
                        <svg
                          className="h-3 w-3 shrink-0"
                          viewBox="0 0 12 12"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden
                        >
                          <path d="M2 4.5L6 8.5L10 4.5" />
                        </svg>
                        Show all
                      </>
                    )}
                  </button>
                ) : null}
              </FilterSection>

              <FilterSection title="Account size">
                <div className="grid grid-cols-2 gap-2">
                  {ACCOUNT_SIZES.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() =>
                        setSelectedSizes((prev) => toggleListItem(prev, item))
                      }
                      className={`rounded-xl border px-3 py-2.5 text-sm font-semibold tabular-nums tracking-wide transition duration-200 ${filterPill(
                        selectedSizes.includes(item)
                      )}`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </FilterSection>

              <FilterSection title="Account type">
                <div className="grid grid-cols-2 gap-2">
                  {(["Eval", "Direct"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() =>
                        setSelectedAccountTypes((prev) =>
                          prev.includes(t) ? [] : [t]
                        )
                      }
                      className={`rounded-xl border px-3 py-2.5 text-center text-[11px] font-semibold uppercase tracking-[0.08em] transition duration-200 ${filterPill(
                        selectedAccountTypes.includes(t)
                      )}`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </FilterSection>

              <FilterSection title="Drawdown type">
                <div className="grid grid-cols-2 gap-2">
                  {DRAWDOWN_FILTERS.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() =>
                        setSelectedDrawdowns((prev) =>
                          toggleListItem(prev, item)
                        )
                      }
                      className={`rounded-xl border px-2 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wide transition duration-200 ${filterPill(
                        selectedDrawdowns.includes(item)
                      )}`}
                    >
                      {DRAWDOWN_SIDEBAR_LABEL[item]}
                    </button>
                  ))}
                </div>
              </FilterSection>

              <FilterSection title="Platform">
                <div className="space-y-0.5">
                  {PLATFORM_FILTER_IDS.map((pid) => {
                    const src = platformLogoSrc[pid];
                    return (
                      <label
                        key={pid}
                        className="group flex cursor-pointer items-center gap-3 rounded-xl border border-transparent px-2 py-2 transition hover:border-slate-600/25 hover:bg-white/[0.04]"
                      >
                        <FilterCheckbox
                          checked={selectedPlatforms.includes(pid)}
                          onCheckedChange={() =>
                            setSelectedPlatforms((prev) =>
                              toggleListItem(prev, pid)
                            )
                          }
                        />
                        {src ? (
                          <Image
                            src={src}
                            alt=""
                            width={22}
                            height={22}
                            className="object-contain"
                          />
                        ) : (
                          <span className="flex h-[22px] w-[22px] items-center justify-center rounded-md bg-white/[0.06] text-[9px] font-bold text-white/45">
                            {platformLabels[pid].slice(0, 1)}
                          </span>
                        )}
                        <span className="text-[13px] text-white/50 group-hover:text-white">
                          {platformLabels[pid]}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </FilterSection>

              <FilterSection title="Daily loss limit">
                <div className="grid grid-cols-3 gap-1.5">
                  {(
                    [
                      { id: "all" as const, label: "Any" },
                      { id: "none" as const, label: "None" },
                      { id: "with" as const, label: "Set" },
                    ] as const
                  ).map(({ id, label }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setDailyLossFilter(id)}
                      className={`rounded-xl border px-1.5 py-2 text-center text-[10px] font-semibold uppercase tracking-wide transition duration-200 ${filterPill(
                        dailyLossFilter === id
                      )}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </FilterSection>

              <FilterSection title="Score">
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => setSelectedScoreTiers([])}
                    className={`w-full rounded-xl border px-2 py-2.5 text-center text-[11px] font-semibold transition duration-200 ${filterPill(
                      selectedScoreTiers.length === 0
                    )}`}
                  >
                    All scores
                  </button>
                  <div className="grid grid-cols-3 gap-2">
                    {(
                      [
                        { id: "high" as const, label: "High 8–10" },
                        { id: "mid" as const, label: "Mid 4–7" },
                        { id: "low" as const, label: "Low 1–3" },
                      ] as const
                    ).map(({ id, label }) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() =>
                          setSelectedScoreTiers((prev) =>
                            prev.includes(id) ? [] : [id]
                          )
                        }
                        className={`rounded-xl border px-2 py-2.5 text-center text-[11px] font-semibold transition duration-200 ${filterPill(
                          selectedScoreTiers.includes(id)
                        )}`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </FilterSection>

              <FilterSection title="Max price ($)">
                <input
                  value={maxPriceUsd}
                  onChange={(e) => setMaxPriceUsd(e.target.value)}
                  inputMode="decimal"
                  placeholder="e.g. 150"
                  className="w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2.5 text-sm tabular-nums text-white/90 placeholder:text-slate-600 transition focus:border-sky-500/35 focus:outline-none focus:ring-1 focus:ring-sky-500/20"
                />
              </FilterSection>

              <div className="pt-4">
                <button
                  type="button"
                  onClick={clearFilters}
                  className="w-full rounded-xl border border-rose-500/25 bg-rose-500/8 px-3 py-3 text-sm font-medium text-rose-200/95 transition hover:border-rose-400/35 hover:bg-rose-500/12 hover:text-rose-100"
                >
                  Reset all filters
                </button>
              </div>
            </div>
            </div>
            </div>
        </aside>

        <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden">
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute right-[10%] top-32 h-64 w-64 rounded-full bg-white/[0.03] blur-3xl" />
          </div>

          <div className="relative z-[1] flex min-h-0 min-w-0 flex-1 flex-col">
          <Navbar />

          {copiedPromoCode ? (
            <div
              className={`pointer-events-none fixed inset-x-0 flex justify-center px-4 ${
                compareDetailOpen
                  ? "top-24 z-[110]"
                  : "top-20 z-50"
              }`}
            >
              <div className="pointer-events-auto rounded-xl border border-slate-200 bg-white/95 px-4 py-2.5 text-xs font-medium text-slate-900 shadow-[0_14px_40px_rgba(0,0,0,0.35)]">
                {`Code "${copiedPromoCode}" copied!`}
              </div>
            </div>
          ) : null}

        <section className="min-h-0 min-w-0 flex-1">
          <div className="px-4 py-4 md:px-6">
            <div className={`${COMPARE_PANEL} p-5`}>
              <div className="flex flex-col gap-5">
                <div>
                  <p className={COMPARE_KICKER}>Comparator</p>
                  <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white md:text-3xl">
                    Compare prop firms based on real trading constraints
                  </h1>
                  <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-500">
                    Stop reading marketing pages. Compare payout logic, scaling
                    limits, activation costs, drawdown models, and trader-relevant
                    rules in one place.
                  </p>
                </div>

              </div>
            </div>

            <div className={`sticky top-[73px] z-40 mt-6 flex min-w-0 flex-col gap-3 px-5 pt-4 pb-4 backdrop-blur-xl ${COMPARE_PANEL} bg-slate-950/80`}>
              {(query.trim() !== "" ||
                selectedFirmNames.length > 0 ||
                selectedAccountTypes.length > 0 ||
                selectedSizes.length > 0 ||
                selectedDrawdowns.length > 0 ||
                selectedPlatforms.length > 0 ||
                selectedScoreTiers.length > 0 ||
                maxPriceUsd.trim() !== "" ||
                dailyLossFilter !== "all") && (
                <div className="-mx-1 flex flex-nowrap gap-1.5 overflow-x-auto border-b border-slate-600/20 px-1 pb-3 [scrollbar-width:thin]">
                  {query.trim() !== "" ? (
                    <ActiveFilterChip
                      label={`Search: ${query.trim()}`}
                      onRemove={() => setQuery("")}
                    />
                  ) : null}
                  {selectedFirmNames.map((n) => (
                    <ActiveFilterChip
                      key={`firm-${n}`}
                      label={n}
                      onRemove={() =>
                        setSelectedFirmNames((prev) =>
                          prev.filter((x) => x !== n)
                        )
                      }
                    />
                  ))}
                  {selectedAccountTypes.map((t) => (
                    <ActiveFilterChip
                      key={`atype-${t}`}
                      label={`${t} account`}
                      onRemove={() =>
                        setSelectedAccountTypes((prev) =>
                          prev.filter((x) => x !== t)
                        )
                      }
                    />
                  ))}
                  {selectedSizes.map((s) => (
                    <ActiveFilterChip
                      key={`size-${s}`}
                      label={s}
                      onRemove={() =>
                        setSelectedSizes((prev) =>
                          prev.filter((x) => x !== s)
                        )
                      }
                    />
                  ))}
                  {selectedDrawdowns.map((d) => (
                    <ActiveFilterChip
                      key={`drawdown-${d}`}
                      label={d}
                      onRemove={() =>
                        setSelectedDrawdowns((prev) =>
                          prev.filter((x) => x !== d)
                        )
                      }
                    />
                  ))}
                  {selectedPlatforms.map((p) => (
                    <ActiveFilterChip
                      key={`platform-${p}`}
                      label={platformLabels[p]}
                      onRemove={() =>
                        setSelectedPlatforms((prev) =>
                          prev.filter((x) => x !== p)
                        )
                      }
                    />
                  ))}
                  {selectedScoreTiers.map((tier) => (
                    <ActiveFilterChip
                      key={`tier-${tier}`}
                      label={
                        tier === "high"
                          ? "Score 8–10"
                          : tier === "mid"
                            ? "Score 4–7"
                            : "Score 1–3"
                      }
                      onRemove={() =>
                        setSelectedScoreTiers((prev) =>
                          prev.filter((x) => x !== tier)
                        )
                      }
                    />
                  ))}
                  {maxPriceUsd.trim() !== "" ? (
                    <ActiveFilterChip
                      label={`Max $${maxPriceUsd.trim()}`}
                      onRemove={() => setMaxPriceUsd("")}
                    />
                  ) : null}
                  {dailyLossFilter !== "all" ? (
                    <ActiveFilterChip
                      label={
                        dailyLossFilter === "none"
                          ? "Daily loss: none listed"
                          : "Daily loss: amount set"
                      }
                      onRemove={() => setDailyLossFilter("all")}
                    />
                  ) : null}
                </div>
              )}

              <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="flex min-w-0 flex-wrap items-end gap-5">
                <div>
                  <p className={COMPARE_KICKER}>Results</p>
                  <p className="mt-2 flex items-baseline gap-1.5">
                    <span className="text-3xl font-semibold tabular-nums tracking-tight text-white">
                      {filteredFirms.length}
                    </span>
                    <span className="text-sm tabular-nums text-slate-500">
                      / {totalFirms}
                    </span>
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCompareMode((prev) => !prev);
                      setCompareIds([]);
                      setCompareDetailOpen(false);
                    }}
                    className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${
                      compareMode
                        ? "border-emerald-500/35 bg-emerald-500/12 text-emerald-50 shadow-sm shadow-black/15"
                        : "border-white/12 bg-white/[0.05] text-white/90 hover:border-sky-500/30 hover:bg-sky-500/10"
                    }`}
                  >
                    <CompareIcon />
                    {compareMode ? "Cancel compare" : "Compare"}
                  </button>
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="rounded-xl border border-rose-500/25 bg-rose-500/8 px-4 py-2.5 text-sm font-semibold text-rose-200/95 transition hover:border-rose-400/35 hover:bg-rose-500/12"
                  >
                    Reset
                  </button>
                </div>
              </div>

              <div
                className="-mx-1 flex flex-nowrap gap-1.5 overflow-x-auto px-1 sm:gap-2 lg:justify-end [scrollbar-width:thin]"
                role="group"
                aria-label="Quick sort"
              >
                {QUICK_SORTS.map(({ key, label }) => {
                  const active = sortKey === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => selectSort(key)}
                      className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl border px-3.5 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] transition ${
                        active
                          ? "border-sky-500/35 bg-sky-500/15 text-white shadow-sm shadow-black/15"
                          : "border-white/10 bg-white/[0.04] text-slate-500 hover:border-white/14 hover:bg-white/[0.06] hover:text-white/88"
                      }`}
                    >
                      {label}
                      {active ? (
                        <span className="text-[10px] opacity-80" aria-hidden>
                          {sortDir === "asc" ? "▲" : "▼"}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
            </div>

            <div id="compare-table" className="mt-6 w-full min-w-0 scroll-mt-28">
              <div className="flex w-full min-w-0 flex-col gap-3 px-1 lg:hidden">
                {filteredFirms.map((firm, rowIndex) => {
                  const expanded = expandedRowId === firm.id;
                  const carpetActive = tableRollEpoch > 0;
                  const staggerMs = Math.min(rowIndex * 22, 640);
                  return (
                    <CompareFirmMobileCard
                      key={`m-${tableRollEpoch}-${firm.id}`}
                      firm={firm}
                      carpetActive={carpetActive}
                      staggerMs={staggerMs}
                      expanded={expanded}
                      expandedRowId={expandedRowId}
                      exitingRowId={exitingRowId}
                      compareMode={compareMode}
                      compareSelected={compareIds.includes(firm.id)}
                      onRowClick={handleRowClick}
                      onToggleRow={toggleRow}
                      onToggleCompare={toggleCompareId}
                      onCopyPromo={copyPromoToClipboard}
                      onOpenFundedRules={() => setFundedRulesFirm(firm)}
                      onRulesExit={clearRulesExit}
                    />
                  );
                })}
              </div>
              <div className="hidden w-full min-w-0 lg:block">
                <div className="w-full min-w-0 overflow-x-auto">
                <div className="w-max min-w-full lg:w-full lg:min-w-0">
                  {/*
                    Single horizontal gutter: header + row grids share the same origin so
                    column centers line up with cell content (no double px-3 on body).
                  */}
                  <div className="px-3">
                  <div
                    className="grid items-center gap-x-2 border-b border-slate-600/25 pb-2 pt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 sm:gap-x-3 md:gap-x-4 md:text-[11px]"
                    style={COMPARE_TABLE_GRID_STYLE}
                  >
                    <div className="flex min-w-0 items-center self-center pl-3 sm:pl-4 md:pl-6">
                      Prop firm
                    </div>
                    <div
                      className={`flex min-w-0 items-center justify-center text-center ${COMPARE_SIZE_COL_INSET}`}
                    >
                      Size
                    </div>
                    <div
                      className={`flex min-w-0 items-center justify-start text-left ${COMPARE_PRICE_COL_INSET}`}
                    >
                      Price
                    </div>
                    <div
                      className={`flex min-w-0 items-center justify-center text-center ${COMPARE_PROMO_COL_INSET}`}
                    >
                      Promo
                    </div>
                    <div className="flex min-w-0 items-center justify-center text-center">
                      Billing
                    </div>
                    <div className="flex min-w-0 items-center justify-center text-center">
                      Activation
                    </div>
                    <div className="flex min-w-0 items-center justify-center text-center">
                      Data feed
                    </div>
                    <div className="flex min-w-0 items-center justify-center text-center">
                      Drawdown
                    </div>
                    <div className="flex min-w-0 items-center justify-center text-center">
                      Target
                    </div>
                    <div className="flex min-w-0 flex-col items-center justify-center text-center leading-snug">
                      <span className="max-w-[6.5rem]">
                        Round trip
                        <span className="mt-0.5 block text-[10px] font-normal normal-case tracking-normal text-slate-500">
                          MNQ / NQ
                        </span>
                      </span>
                    </div>
                    <div className="flex min-w-0 items-center justify-center text-center">
                      Score
                    </div>
                    <div className="flex min-w-0 items-center justify-center text-center">
                      Action
                    </div>
                  </div>

                  <div className="flex flex-col gap-[7px] pb-2 pt-0">
                  {filteredFirms.map((firm, rowIndex) => {
                    const expanded = expandedRowId === firm.id;
                    const carpetActive = tableRollEpoch > 0;
                    const staggerMs = Math.min(rowIndex * 22, 640);
                    return (
                    <div
                      key={`${tableRollEpoch}-${firm.id}`}
                      id={`firm-row-${firm.id}`}
                      className={`${COMPARE_TABLE_ROW} ${
                        carpetActive ? "compare-table-row-carpet" : ""
                      }`}
                      style={
                        carpetActive
                          ? {
                              animation: `compare-table-carpet 0.4s cubic-bezier(0.22, 1, 0.36, 1) ${staggerMs}ms both`,
                            }
                          : undefined
                      }
                    >
                    <div
                      className="grid cursor-pointer items-center gap-x-2 py-1.5 sm:gap-x-3 md:gap-x-4 [&>div:not(:first-child)]:min-w-0"
                      style={COMPARE_TABLE_GRID_STYLE}
                      onClick={(event) => handleRowClick(firm.id, event)}
                    >
                      <div className="min-w-min">
                        <div
                          className="flex min-w-min items-stretch gap-2"
                          data-account-cell="true"
                        >
                          <FirmAccountCell
                            accountName={firm.accountName}
                            firmName={firm.name}
                            countryCode={firm.countryCode}
                            sinceYear={firm.sinceYear}
                            firmLogoSrc={firm.firmLogoSrc}
                            expanded={expanded}
                            onToggleExpand={
                              compareMode
                                ? undefined
                                : () => toggleRow(firm.id)
                            }
                            compareMode={compareMode}
                            compareSelected={compareIds.includes(firm.id)}
                            onCompareToggle={() => toggleCompareId(firm.id)}
                          />
                        </div>
                      </div>

                      <div
                        className={`flex min-w-0 items-center justify-center text-center text-[14px] font-semibold leading-snug tracking-[-0.02em] text-white ${COMPARE_SIZE_COL_INSET}`}
                      >
                        {firm.size}
                      </div>

                      <div
                        className={`flex min-w-0 items-center justify-start text-left text-[13px] leading-tight tabular-nums ${COMPARE_PRICE_COL_INSET}`}
                      >
                        {firm.discountedPrice != null &&
                        firm.discountedPrice < firm.regularPrice ? (
                          <div className="flex max-w-full flex-col items-start gap-0.5">
                            <div className="relative inline-flex items-center justify-start">
                              <span className="font-semibold text-emerald-300/95">
                                {formatUsdCompact(firm.discountedPrice)}
                              </span>
                              {(() => {
                                const pct = calcDiscountPct(
                                  firm.regularPrice,
                                  firm.discountedPrice
                                );
                                const tooltipSecondLine =
                                  firm.discountTooltipFooter ??
                                  `Expires on ${
                                    firm.promoExpiry ??
                                    formatPromoExpiryLabel()
                                  }`;
                                return (
                                  <span
                                    className="group absolute left-full top-1/2 ml-1 inline-flex -translate-y-1/2 shrink-0 items-center"
                                    data-row-click-ignore="true"
                                  >
                                    <span className="relative inline-flex h-[13.3px] w-[16.8px] items-center justify-center">
                                      <Image
                                        src="/discount-tag.png"
                                        alt=""
                                        unoptimized
                                        width={17}
                                        height={13}
                                        className="h-[13.3px] w-[16.8px] object-contain"
                                      />
                                    </span>

                                    <span
                                      className="pointer-events-none absolute left-full top-1/2 z-10 ml-2 w-[180px] -translate-y-1/2 rounded-xl border border-slate-600/30 bg-slate-950/95 px-3 py-2.5 text-[11px] text-zinc-200 opacity-0 shadow-[0_18px_40px_rgba(0,0,0,0.45)] backdrop-blur-sm transition group-hover:opacity-100"
                                    >
                                      <div className="flex items-center justify-between gap-3">
                                        <span className="text-zinc-200/85">
                                          Discount
                                        </span>
                                        <span className="font-semibold text-emerald-300/95">
                                          -{pct}%
                                        </span>
                                      </div>
                                      <div className="mt-1 text-center text-zinc-400">
                                        {tooltipSecondLine}
                                      </div>
                                    </span>
                                  </span>
                                );
                              })()}
                            </div>
                            <span className="text-left text-[12px] text-slate-500 line-through">
                              {formatUsdCompact(firm.regularPrice)}
                            </span>
                          </div>
                        ) : (
                          <span className="font-medium text-white/85">
                            {formatUsdCompact(firm.regularPrice)}
                          </span>
                        )}
                      </div>

                      <div
                        className={`flex min-w-0 items-center justify-center text-center text-[13px] text-white/70 ${COMPARE_PROMO_COL_INSET}`}
                      >
                        {firm.promo ? (
                          <button
                            type="button"
                            data-row-click-ignore="true"
                            onClick={() => {
                              void copyPromoToClipboard(firm.promo);
                            }}
                            className="rounded-lg border border-white/12 bg-white/[0.05] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-white/82 transition hover:border-sky-500/30 hover:bg-sky-500/10 hover:text-white"
                          >
                            {firm.promo}
                          </button>
                        ) : (
                          <span>{firm.promo}</span>
                        )}
                      </div>

                      <div className="flex items-center justify-center text-center text-[13px] text-white/70">
                        {paymentPlanLabel(firm.paymentPlan)}
                      </div>

                      <div className="flex flex-col items-center justify-center text-center text-[13px] tabular-nums leading-tight">
                        {isActivationFree(firm) ? (
                          <>
                            <span className="font-medium text-emerald-300/90">
                              FREE
                            </span>
                            {firm.activationNote ? (
                              <p className="mt-0.5 text-[11px] text-emerald-300/90">
                                {firm.activationNote}
                              </p>
                            ) : null}
                          </>
                        ) : (
                          <span className="font-medium text-red-300/90">
                            {formatUsdCompact(firm.activationFeeUsd ?? 0)}
                          </span>
                        )}
                        <p className="mt-1 text-[11px] text-slate-500">
                          Total:{" "}
                          <span className="text-slate-400">
                            {formatUsdCompact(evalStartupTotalUsd(firm))}
                          </span>
                        </p>
                      </div>

                      <div className="flex min-w-0 origin-center scale-[0.63] items-center justify-center">
                        <PlatformLogos platforms={firm.platforms} />
                      </div>

                      <div className="flex min-w-0 flex-col items-center justify-center gap-1.5 text-center">
                        <span className="text-[12px] font-medium tabular-nums text-white/60">
                          {formatUsdWholeGrouped(firm.maxDrawdownLimitUsd)}
                        </span>
                        <span
                          className={`inline-flex shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${DRAWDOWN_PILL_CLASS}`}
                        >
                          {DRAWDOWN_SIDEBAR_LABEL[firm.drawdown]}
                        </span>
                      </div>

                      <div className="flex min-w-0 items-center justify-center text-center text-[13px] text-white/65">
                        {firm.target}
                      </div>

                      <div className="flex min-w-0 items-center justify-center text-center">
                        <RoundTripCell firm={firm} />
                      </div>

                      <div className="flex origin-center scale-90 items-center justify-center">
                        {(() => {
                          const cfg = scoreRingConfig(firm.score);
                          const backgroundImage = `conic-gradient(from 270deg, ${cfg.fillColor} 0deg, ${cfg.fillColor} ${cfg.filledAngle}deg, ${cfg.trackColor} ${cfg.filledAngle}deg, ${cfg.trackColor} 360deg)`;
                          return (
                            <div
                              className="relative inline-flex h-9 w-9 items-center justify-center rounded-full shadow-[0_0_12px_rgba(0,0,0,0.35)]"
                              style={{ backgroundImage }}
                            >
                              <div className="absolute inset-[2px] rounded-full border border-black/70" />
                              <div
                                className={`relative flex h-6 w-6 items-center justify-center rounded-full text-[12px] font-semibold ${cfg.innerClass}`}
                              >
                                {firm.score}
                              </div>
                            </div>
                          );
                        })()}
                      </div>

                      <div className="flex w-full min-w-0 items-center justify-center px-2 py-0.5 sm:px-3">
                        <a
                          href={withAffiliateTracking(firm.affiliateUrl, firm)}
                          target="_blank"
                          rel="noreferrer"
                          data-row-click-ignore="true"
                          className="inline-flex max-w-[min(100%,25rem)] shrink-0 items-center justify-center whitespace-nowrap rounded-xl border border-white/12 bg-white/[0.08] px-10 py-2.5 text-center text-[11px] font-semibold leading-tight tracking-[-0.01em] text-white shadow-sm shadow-black/25 transition-[transform,box-shadow,border-color,background-color] duration-200 ease-out hover:-translate-y-0.5 hover:border-sky-500/35 hover:bg-sky-500/12 active:translate-y-0"
                        >
                          Start Evaluation
                        </a>
                      </div>
                    </div>
                    <CompareRulesDrawerSlot
                      firmId={firm.id}
                      rules={firm.rules}
                      expandedRowId={expandedRowId}
                      exitingRowId={exitingRowId}
                      onExitComplete={clearRulesExit}
                      onOpenFundedRules={() => setFundedRulesFirm(firm)}
                    />
                    </div>
                    );
                  })}
                  </div>
                  </div>
                </div>
                </div>
              </div>
            </div>
            {compareMode ? (
              <div className="fixed inset-x-0 bottom-6 z-40 flex justify-center px-4">
                <div className={`inline-flex items-center justify-between gap-3 px-5 py-2.5 backdrop-blur-xl ${COMPARE_PANEL} bg-slate-950/90`}>
                  <div className="text-sm text-slate-400">
                    <span className="font-semibold text-white">
                      {compareIds.length}
                    </span>{" "}
                    / 4 selected
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={compareIds.length < 2}
                      onClick={() => {
                        if (compareIds.length < 2) return;
                        setCompareDetailOpen(true);
                      }}
                      className={`rounded-xl px-5 py-2 text-sm font-semibold transition ${
                        compareIds.length < 2
                          ? "cursor-not-allowed border border-white/8 bg-white/[0.06] text-white/35"
                          : "border border-sky-500/35 bg-sky-500/15 text-sky-50 hover:bg-sky-500/22"
                      }`}
                    >
                      Compare
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCompareMode(false);
                        setCompareIds([]);
                        setCompareDetailOpen(false);
                      }}
                      className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/12 text-slate-400 transition hover:border-sky-500/30 hover:bg-sky-500/10 hover:text-white"
                      aria-label="Close compare selection"
                    >
                      ×
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

            <CompareDetailModal
              open={compareDetailOpen}
              onClose={() => setCompareDetailOpen(false)}
              firms={compareDetailFirms}
              onPromoCopy={(code) => {
                void copyPromoToClipboard(code);
              }}
            />
            <CompareFundedRulesModal
              open={fundedRulesFirm != null}
              firm={fundedRulesFirm}
              onClose={() => setFundedRulesFirm(null)}
            />
          </div>
        </section>
          </div>
        </div>
      </div>
    </main>
  );
}