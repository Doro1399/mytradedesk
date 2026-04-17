"use client";

import Image from "next/image";
import type { CSSProperties } from "react";
import { FirmAccountCell } from "@/components/firm-account-cell";
import { PlatformLogos } from "@/components/platform-logos";
import type { DrawdownType, PaymentPlan, PropFirm } from "@/lib/prop-firms";
import { propFirmReviewUrl } from "@/lib/prop-firm-review-url";
import {
  evalStartupTotalUsd,
  formatUsdCompact,
  formatUsdWholeGrouped,
  isActivationFree,
  propFirms,
} from "@/lib/prop-firms";
import {
  platformLabels,
  platformLogoSrc,
  type PlatformId,
} from "@/lib/platforms";

const COMPARE_KICKER =
  "text-[10px] font-semibold uppercase tracking-[0.2em] text-sky-400/90";

const COMPARE_PANEL =
  "rounded-2xl border border-slate-600/25 bg-gradient-to-b from-slate-800/40 via-slate-900/45 to-slate-950/55 shadow-[0_16px_40px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.08)]";

const COMPARE_TABLE_ROW =
  "overflow-hidden rounded-xl border border-white/10 bg-black/25 shadow-sm shadow-black/10 transition-[background-color,box-shadow,border-color] duration-200 hover:border-sky-500/30 hover:bg-black/32";

const COMPARE_PRICE_COL_INSET =
  "pl-12 sm:pl-[52px] md:pl-14 lg:pl-16 xl:pl-[68px]";

const COMPARE_PROMO_COL_INSET = "pl-1 sm:pl-2 md:pl-3";

const COMPARE_SIZE_COL_INSET =
  "pl-[92px] sm:pl-24 md:pl-[100px] lg:pl-[104px]";

const COMPARE_TABLE_GRID_STYLE: CSSProperties = {
  gridTemplateColumns:
    "minmax(0, 2.35fr) repeat(10, minmax(0, 1fr)) minmax(0, 1fr)",
};

const DRAWDOWN_PILL_CLASS =
  "border-slate-500/30 bg-violet-500/8 text-violet-200/90";

const DRAWDOWN_SIDEBAR_LABEL: Record<DrawdownType, string> = {
  EOD: "EOD",
  EOT: "EOT",
  Trailing: "Trail",
  Static: "Static",
};

const ROUND_TRIP_PLATFORM_ORDER: PlatformId[] = [
  "tradovate",
  "rithmic",
  "dxfeed",
  "wealthcharts",
];

function paymentPlanLabel(plan: PaymentPlan): string {
  return plan === "subscription" ? "Subscription" : "One-time payment";
}

function calcDiscountPct(regular: number, discounted: number): number {
  if (regular <= 0 || discounted >= regular) return 0;
  return Math.round((1 - discounted / regular) * 100);
}

function formatPromoExpiryLabel(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const lastDay = new Date(year, month + 1, 0).getDate();
  const mm = String(month + 1).padStart(2, "0");
  return `${String(lastDay).padStart(2, "0")}/${mm}`;
}

function scoreRingConfig(score: number) {
  const clamped = Math.max(0, Math.min(10, score));
  const filledAngle = (clamped / 10) * 360;

  if (score >= 8) {
    return {
      filledAngle,
      fillColor: "rgba(16,185,129,0.9)",
      trackColor: "rgba(39,39,42,0.55)",
      innerClass: "bg-zinc-950 text-emerald-300",
    } as const;
  }
  if (score >= 7) {
    return {
      filledAngle,
      fillColor: "rgba(245,158,11,0.95)",
      trackColor: "rgba(39,39,42,0.55)",
      innerClass: "bg-zinc-950 text-amber-300",
    } as const;
  }
  if (score >= 4) {
    return {
      filledAngle,
      fillColor: "rgba(249,115,22,0.95)",
      trackColor: "rgba(39,39,42,0.55)",
      innerClass: "bg-zinc-950 text-orange-300",
    } as const;
  }
  return {
    filledAngle,
    fillColor: "rgba(239,68,68,0.95)",
    trackColor: "rgba(39,39,42,0.55)",
    innerClass: "bg-zinc-950 text-red-300",
  } as const;
}

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

const LANDING_COMPARE_ROW_IDS = [76, 82, 34] as const;

function noop() {}

export function LandingCompareFeaturePreview() {
  const firms = LANDING_COMPARE_ROW_IDS.map((id) => propFirms.find((f) => f.id === id)).filter(
    (f): f is PropFirm => f != null
  );

  return (
    <div className={`${COMPARE_PANEL} w-full min-w-0`}>
      <div className="border-b border-slate-600/25 px-4 py-3 sm:px-5">
        <p className={COMPARE_KICKER}>Comparator</p>
      </div>

      <div className="w-full min-w-0 overflow-x-auto overscroll-x-contain px-3 pb-5 pt-3 [-webkit-overflow-scrolling:touch] sm:px-4 sm:pb-6 sm:pt-4">
        <div className="w-max min-w-full lg:w-full lg:min-w-0">
          <div className="px-0.5 sm:px-1">
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
              <div className="flex min-w-0 items-center justify-center text-center">Billing</div>
              <div className="flex min-w-0 items-center justify-center text-center">Activation</div>
              <div className="flex min-w-0 items-center justify-center text-center">Data feed</div>
              <div className="flex min-w-0 items-center justify-center text-center">Drawdown</div>
              <div className="flex min-w-0 items-center justify-center text-center">Target</div>
              <div className="flex min-w-0 flex-col items-center justify-center text-center leading-snug">
                <span className="max-w-[6.5rem]">
                  Round trip
                  <span className="mt-0.5 block text-[10px] font-normal normal-case tracking-normal text-slate-500">
                    MNQ / NQ
                  </span>
                </span>
              </div>
              <div className="flex min-w-0 items-center justify-center text-center">Score</div>
              <div className="flex min-w-0 items-center justify-center text-center">Action</div>
            </div>

            <div className="flex flex-col gap-2.5 pb-2 pt-1.5 sm:gap-3">
              {firms.map((firm) => (
                <div key={firm.id} className={COMPARE_TABLE_ROW}>
                  <div
                    className="grid cursor-default items-center gap-x-2 py-1.5 sm:gap-x-3 md:gap-x-4 [&>div:not(:first-child)]:min-w-0"
                    style={COMPARE_TABLE_GRID_STYLE}
                  >
                    <div className="min-w-min">
                      <div className="flex min-w-min items-stretch gap-2">
                        <FirmAccountCell
                          accountName={firm.accountName}
                          firmName={firm.name}
                          countryCode={firm.countryCode}
                          sinceYear={firm.sinceYear}
                          firmLogoSrc={firm.firmLogoSrc}
                          expanded={false}
                          onToggleExpand={noop}
                          compareMode={false}
                          firmDetailHref={propFirmReviewUrl(firm.name)}
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
                              const pct = calcDiscountPct(firm.regularPrice, firm.discountedPrice);
                              const tooltipSecondLine =
                                firm.discountTooltipFooter ??
                                `Expires on ${firm.promoExpiry ?? formatPromoExpiryLabel()}`;
                              return (
                                <span className="group absolute left-full top-1/2 ml-1 inline-flex -translate-y-1/2 shrink-0 items-center">
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
                                  <span className="pointer-events-none absolute left-full top-1/2 z-10 ml-2 w-[180px] -translate-y-1/2 rounded-xl border border-slate-600/30 bg-slate-950/95 px-3 py-2.5 text-[11px] text-zinc-200 opacity-0 shadow-[0_18px_40px_rgba(0,0,0,0.45)] backdrop-blur-sm transition group-hover:opacity-100">
                                    <div className="flex items-center justify-between gap-3">
                                      <span className="text-zinc-200/85">Discount</span>
                                      <span className="font-semibold text-emerald-300/95">-{pct}%</span>
                                    </div>
                                    <div className="mt-1 text-center text-zinc-400">{tooltipSecondLine}</div>
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
                        <span className="rounded-lg border border-white/12 bg-white/[0.05] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-white/82">
                          {firm.promo}
                        </span>
                      ) : (
                        <span>—</span>
                      )}
                    </div>

                    <div className="flex items-center justify-center text-center text-[13px] text-white/70">
                      {paymentPlanLabel(firm.paymentPlan)}
                    </div>

                    <div className="flex flex-col items-center justify-center text-center text-[13px] tabular-nums leading-tight">
                      {isActivationFree(firm) ? (
                        <>
                          <span className="font-medium text-emerald-300/90">FREE</span>
                          {firm.activationNote ? (
                            <p className="mt-0.5 text-[11px] text-emerald-300/90">{firm.activationNote}</p>
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
                      <span className="inline-flex max-w-[min(100%,25rem)] shrink-0 items-center justify-center whitespace-nowrap rounded-xl border border-white/12 bg-white/[0.08] px-6 py-2.5 text-center text-[11px] font-semibold leading-tight tracking-[-0.01em] text-white/90">
                        Start
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
