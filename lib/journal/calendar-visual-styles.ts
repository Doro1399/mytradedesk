import type { CSSProperties } from "react";
import type { DayAggregate } from "@/lib/journal/calendar-aggregates";
import { dayHasCalendarActivity } from "@/lib/journal/calendar-aggregates";

export type MonthPnlExtents = {
  maxProfit: number;
  minProfit: number;
  maxLossAbs: number;
  minLossAbs: number;
};

/** Min/max wins & losses in the viewed month (cents) — scales cell colors. */
export function computeMonthPnlExtents(
  daily: Map<string, DayAggregate>,
  viewYear: number,
  viewMonth: number
): MonthPnlExtents {
  const prefix = `${viewYear}-${String(viewMonth).padStart(2, "0")}`;
  let maxProfit = 0;
  let minProfit = Number.POSITIVE_INFINITY;
  let maxLossAbs = 0;
  let minLossAbs = Number.POSITIVE_INFINITY;
  for (const [iso, agg] of daily) {
    if (!iso.startsWith(prefix)) continue;
    if (!dayHasCalendarActivity(agg)) continue;
    if (agg.cents > 0) {
      maxProfit = Math.max(maxProfit, agg.cents);
      minProfit = Math.min(minProfit, agg.cents);
    }
    if (agg.cents < 0) {
      const a = -agg.cents;
      maxLossAbs = Math.max(maxLossAbs, a);
      minLossAbs = Math.min(minLossAbs, a);
    }
  }
  if (minProfit === Number.POSITIVE_INFINITY) minProfit = 0;
  if (minLossAbs === Number.POSITIVE_INFINITY) minLossAbs = 0;
  return { maxProfit, minProfit, maxLossAbs, minLossAbs };
}

/**
 * 0…1 intensity for wins: log1p spread so $150 vs $2k differ even when the month has a $5k outlier.
 */
export function profitIntensityT(cents: number, minP: number, maxP: number): number {
  if (maxP <= 0 || cents <= 0) return 0;
  if (minP >= maxP) return 1;
  const lo = Math.log1p(minP);
  const hi = Math.log1p(maxP);
  const x = Math.log1p(cents);
  if (hi <= lo) return 1;
  return Math.min(1, Math.max(0, (x - lo) / (hi - lo)));
}

export function lossIntensityT(absCents: number, minA: number, maxA: number): number {
  if (maxA <= 0 || absCents <= 0) return 0;
  if (minA >= maxA) return 1;
  const lo = Math.log1p(minA);
  const hi = Math.log1p(maxA);
  const x = Math.log1p(absCents);
  if (hi <= lo) return 1;
  return Math.min(1, Math.max(0, (x - lo) / (hi - lo)));
}

/**
 * Forest / leafy greens: small wins stay a bit lighter and muted; large wins go deeper
 * (reference ~#386633 / #2d5a27), not washed-out pastel.
 */
export function calendarProfitCellStyle(cents: number, ext: MonthPnlExtents, dimmed: boolean): CSSProperties {
  const dim = dimmed ? 0.52 : 1;
  if (ext.maxProfit <= 0) {
    return {
      backgroundColor: `rgba(45, 95, 52, ${0.2 * dim})`,
      borderColor: `rgba(56, 115, 62, ${0.32 * dim})`,
    };
  }
  const t = profitIntensityT(cents, ext.minProfit, ext.maxProfit);
  const h = 126 - t * 10;
  const s = 22 + t * 22;
  const l = 30 - t * 9;
  const alpha = (0.2 + t * 0.32) * dim;
  return {
    backgroundColor: `hsl(${h} ${s}% ${l}% / ${alpha})`,
    borderColor: `hsl(${h} ${Math.min(48, s + 8)}% ${Math.max(14, l - 5)}% / ${(0.24 + t * 0.26) * dim})`,
  };
}

/** Darker red when t → 1 (larger loss within month distribution). */
export function calendarLossCellStyle(absCents: number, ext: MonthPnlExtents, dimmed: boolean): CSSProperties {
  const dim = dimmed ? 0.52 : 1;
  if (ext.maxLossAbs <= 0) {
    return {
      backgroundColor: `rgba(244, 63, 94, ${0.12 * dim})`,
      borderColor: `rgba(251, 113, 133, ${0.22 * dim})`,
    };
  }
  const t = lossIntensityT(absCents, ext.minLossAbs, ext.maxLossAbs);
  const L = 56 - t * 30;
  const S = 38 + t * 32;
  const alpha = (0.22 + t * 0.3) * dim;
  return {
    backgroundColor: `hsl(350 ${S}% ${L}% / ${alpha})`,
    borderColor: `hsl(350 ${S}% ${Math.max(20, L - 12)}% / ${(0.22 + t * 0.3) * dim})`,
  };
}

/** High-contrast lime on dark forest cells (~#4ade80 family). */
export function calendarProfitAmountStyle(t: number): CSSProperties {
  const h = 142 - t * 6;
  const s = 66 + t * 12;
  const l = 54 + t * 6;
  return { color: `hsl(${h} ${s}% ${l}%)` };
}

/**
 * Loss day amount: keep text light as cell fill intensifies (t→1), so we never get
 * dark red glyphs on saturated red fills (readability on large loss days).
 */
export function calendarLossAmountStyle(t: number): CSSProperties {
  const L = 86 + t * 11;
  const S = Math.max(12, 46 - t * 34);
  return { color: `hsl(348 ${S}% ${L}%)` };
}
