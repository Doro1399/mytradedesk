import type { CSSProperties } from "react";
import {
  dayHasCalendarActivity,
  monthlyTotalsFromDaily,
  weeklyRollupsFromGrid,
} from "@/lib/journal/calendar-aggregates";
import {
  calendarLossAmountStyle,
  calendarLossCellStyle,
  calendarProfitAmountStyle,
  calendarProfitCellStyle,
  computeMonthPnlExtents,
  lossIntensityT,
  profitIntensityT,
} from "@/lib/journal/calendar-visual-styles";
import { buildLandingFeb2026CalendarDemo } from "@/lib/landing/landing-feb-2026-calendar-demo";

const CARD =
  "rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.07] to-white/[0.02] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-sm";

const SECTION_LABEL = "text-[10px] font-semibold uppercase tracking-[0.2em] text-sky-400/85";

const LANDING_FEB_2026_CAL = buildLandingFeb2026CalendarDemo();

function formatUsdCalendarCents(cents: number): string {
  const n = cents / 100;
  const abs = Math.abs(n);
  if (abs >= 1000) {
    const k = abs / 1000;
    const t = k >= 10 ? k.toFixed(0) : (Math.round(k * 10) / 10).toFixed(1).replace(/\.0$/, "");
    const sign = n < 0 ? "-" : "";
    return `${sign}$${t}k`;
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

function formatUsdCalendarSummaryCents(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

/** February 2026 workspace-style calendar (synthetic weekday P&amp;L) for the landing page. */
export function LandingFebruary2026CalendarPreview() {
  const { grid, daily } = LANDING_FEB_2026_CAL;
  const monthPnlExtents = computeMonthPnlExtents(daily, 2026, 2);
  const { totalCents, activeDays } = monthlyTotalsFromDaily(daily, 2026, 2);
  const weekRollups = weeklyRollupsFromGrid(grid, daily, { onlyInMonthCells: true });

  return (
    <div className="rounded-2xl bg-[#070b13] p-3 sm:p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3 sm:mb-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40">MyTradeDesk</p>
          <p className="text-base font-semibold text-white sm:text-lg">February 2026</p>
          <p className="text-[11px] text-white/45">Trades (P&amp;L)</p>
        </div>
        <div className="text-right">
          <p
            className={`text-lg font-semibold tabular-nums sm:text-xl ${
              totalCents >= 0 ? "text-emerald-300/95" : "text-rose-300/95"
            }`}
          >
            {formatUsdCalendarSummaryCents(totalCents)}
          </p>
          <p className="text-[10px] text-white/40 sm:text-[11px]">{activeDays} days · snapshot</p>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4 lg:flex-row lg:items-start lg:gap-5">
        <div className={`${CARD} min-w-0 flex-1 overflow-visible p-0`}>
          <div className="grid grid-cols-5 border-b border-white/10 bg-white/[0.04] text-center text-[10px] font-semibold uppercase tracking-[0.1em] text-white/45 sm:grid-cols-7 sm:text-[11px]">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d, i) => (
              <div
                key={d}
                className={`border-r border-white/[0.06] py-2 last:border-r-0 sm:py-2.5 ${i >= 5 ? "hidden sm:block" : ""}`}
              >
                {d}
              </div>
            ))}
          </div>
          <div className="divide-y divide-white/[0.06]">
            {grid.map((week, wi) => (
              <div
                key={wi}
                className="grid grid-cols-5 divide-x divide-white/[0.06] overflow-visible sm:grid-cols-7"
              >
                {week.cells.map((cell, ci) => {
                  const agg = daily.get(cell.dateIso);
                  const has = agg != null && dayHasCalendarActivity(agg);
                  const profit = has && agg!.cents > 0;
                  const loss = has && agg!.cents < 0;
                  const tradesShown = has ? (agg!.storedTradeCount ?? 0) : 0;
                  const isPadding = !cell.inMonth;
                  const baseCell =
                    "relative min-h-[4.5rem] p-1.5 transition-colors sm:min-h-[6.25rem] sm:p-2.5";
                  let cellClass = `${baseCell} border bg-[#0a0f16]/90 border-transparent`;
                  let cellStyle: CSSProperties | undefined;

                  if (cell.inMonth && !has) {
                    cellClass = `${baseCell} border bg-black/35 border-white/[0.06]`;
                  } else if (cell.inMonth && has && profit) {
                    cellClass = `${baseCell} border`;
                    cellStyle = calendarProfitCellStyle(agg!.cents, monthPnlExtents, false);
                  } else if (cell.inMonth && has && loss) {
                    cellClass = `${baseCell} border`;
                    cellStyle = calendarLossCellStyle(-agg!.cents, monthPnlExtents, false);
                  } else if (isPadding && !has) {
                    cellClass = `${baseCell} border border-transparent bg-black/55 opacity-[0.45]`;
                  } else if (isPadding && has && profit) {
                    cellClass = `${baseCell} border opacity-[0.95]`;
                    cellStyle = calendarProfitCellStyle(agg!.cents, monthPnlExtents, true);
                  } else if (isPadding && has && loss) {
                    cellClass = `${baseCell} border opacity-[0.95]`;
                    cellStyle = calendarLossCellStyle(-agg!.cents, monthPnlExtents, true);
                  } else if (isPadding && has && !profit && !loss) {
                    cellClass = `${baseCell} border border-white/[0.08] bg-white/[0.03] opacity-[0.48]`;
                  }

                  const tProf = profit
                    ? profitIntensityT(agg!.cents, monthPnlExtents.minProfit, monthPnlExtents.maxProfit)
                    : 0;
                  const tLoss = loss
                    ? lossIntensityT(-agg!.cents, monthPnlExtents.minLossAbs, monthPnlExtents.maxLossAbs)
                    : 0;
                  const amountStyle: CSSProperties | undefined = profit
                    ? calendarProfitAmountStyle(tProf)
                    : loss
                      ? calendarLossAmountStyle(tLoss)
                      : undefined;

                  const isWeekendCol = ci >= 5;
                  return (
                    <div
                      key={`${wi}-${ci}`}
                      className={`${cellClass}${isWeekendCol ? " hidden sm:block" : ""}`}
                      style={cellStyle}
                    >
                      <div
                        className={`text-left text-[11px] font-medium tabular-nums sm:text-xs ${
                          cell.inMonth ? "text-white/75" : "text-white/40"
                        }`}
                      >
                        {cell.dayNum}
                      </div>
                      {has ? (
                        <div
                          className={`mt-0.5 flex flex-col items-center justify-center gap-0.5 text-center sm:mt-1 sm:gap-1 ${
                            isPadding ? "opacity-90" : ""
                          }`}
                        >
                          <span
                            className={`text-xs font-semibold tabular-nums sm:text-sm sm:text-[15px] ${
                              amountStyle ? "" : "text-white/70"
                            }`}
                            style={amountStyle}
                          >
                            {formatUsdCalendarCents(agg!.cents)}
                          </span>
                          {tradesShown > 0 && !isPadding ? (
                            <span className="hidden items-center gap-1 rounded-full border border-white/10 bg-black/30 px-1 py-0.5 text-[9px] font-medium text-white/55 sm:inline-flex sm:px-1.5 sm:text-[10px]">
                              <span className="text-white/35">●</span>
                              <span className="tabular-nums">
                                {tradesShown} {tradesShown === 1 ? "trade" : "trades"}
                              </span>
                            </span>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 border-t border-white/10 px-3 py-2 text-[10px] text-white/45 sm:gap-4 sm:px-4 sm:py-3 sm:text-[11px]">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-sm bg-rose-700 sm:h-2.5 sm:w-2.5" />
              Loss
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-sm bg-[#3d6b3a] sm:h-2.5 sm:w-2.5" />
              Profit
            </span>
          </div>
        </div>

        <aside className="hidden w-full shrink-0 flex-col gap-2 sm:flex lg:w-[200px] xl:w-[220px]">
          <p className={`${SECTION_LABEL} px-1`}>Weeks</p>
          {weekRollups.map((w, i) => (
            <div key={i} className={`${CARD} flex flex-col gap-1 px-3 py-2.5 sm:px-4 sm:py-3`}>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40 sm:text-[11px]">
                Week {i + 1}
              </p>
              <p
                className={`text-base font-semibold tabular-nums sm:text-lg ${
                  w.cents >= 0 ? "text-emerald-300/95" : "text-rose-300/95"
                }`}
              >
                {formatUsdCalendarSummaryCents(w.cents)}
              </p>
              <p className="text-[11px] text-white/38 sm:text-xs">{w.activeDays} days</p>
            </div>
          ))}
        </aside>
      </div>
    </div>
  );
}
