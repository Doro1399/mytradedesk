"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useJournal } from "@/components/journal/journal-provider";
import { getDashboardFinancialMetrics } from "@/lib/journal/selectors";
import {
  getCycleStats,
  getFirmBreakdownRows,
  getMonthlyPayoutsCentsForYear,
  getPnlPulseStatsFromTradesStore,
  getCapitalBreakdownCents,
  getTopAccountsByNetCash,
  getYearsWithPayoutData,
  pickFirmInsightLine,
} from "@/lib/journal/dashboard-stats";
import {
  loadTradesStore,
  TRADES_STORAGE_KEY,
  TRADES_STORE_CHANGED_EVENT,
  type TradesStoreV1,
} from "@/lib/journal/trades-storage";
import { resolveAccountDisplayName, useAutoAccountLabelById } from "@/components/journal/account-auto-labels";

/** Aligné sur Mission control (progress) : sobre, lisible, léger relief. */
const SECTION_LABEL = "text-[10px] font-semibold uppercase tracking-[0.2em] text-sky-400/90";

/** Panneau type carte Progress — pas de halos colorés plein cadre. */
const PANEL_BASE =
  "relative overflow-hidden rounded-2xl border border-slate-600/25 bg-gradient-to-b from-slate-800/40 via-slate-900/45 to-slate-950/55 shadow-[0_16px_40px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.08)]";

function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`${PANEL_BASE} ${className}`}>
      <div
        className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-white/[0.05] blur-2xl"
        aria-hidden
      />
      <div className="relative">{children}</div>
    </div>
  );
}

/** Pastille discrète (remplace les badges « gamified » très contrastés). */
const KICKER =
  "rounded-lg border border-white/10 bg-slate-800/60 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-slate-400/90";

function formatUsd0(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function formatUsdSigned(cents: number): string {
  const sign = cents > 0 ? "+" : "";
  return sign + formatUsd0(cents);
}

/** Tight labels under 12 month columns (dashboard chart). */
function formatUsdCompactSigned(cents: number): string {
  if (cents === 0) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
    signDisplay: "always",
  }).format(cents / 100);
}

function formatPctOne(x: number): string {
  return `${x.toFixed(1)}%`;
}

/**
 * Short hint under Evaluations — driven only by active vs blown challenge accounts (not “passed”).
 * Replaces the old “Tough stretch…” line that compared failed vs passed and read oddly.
 */
function challengeFootnote(c: ReturnType<typeof getCycleStats>): string {
  if (c.challengeFailed === 0) {
    return "No blown evals on the board.";
  }
  if (c.challengeFailed > c.challengeOngoing) {
    return "Blown evals outnumber active ones — revisit size and rules before the next purchase.";
  }
  if (c.challengeFailed === c.challengeOngoing && c.challengeOngoing > 0) {
    return "Even split between active and blown — keep risk flat eval to eval.";
  }
  return "You have blown evals in the mix — stay consistent with your plan.";
}

function netProfitTagline(netCents: number, investedCents: number): string {
  if (investedCents <= 0) {
    return netCents >= 0 ? "Log fees to benchmark ROI." : "Track spend to size the picture.";
  }
  if (netCents > 0) return "Payouts are outpacing what you paid in.";
  if (netCents < 0) return "Still underwater versus total fees — normal early on.";
  return "Break-even on cash in vs cash out.";
}

/** Evaluations ou funded : chiffre actifs en tête, pastilles rouges pour blown (même logique que la colonne funded). */
function ActiveBlownColumnCell({
  active,
  blown,
  kind,
}: {
  active: number;
  blown: number;
  kind: "eval" | "funded";
}) {
  const total = active + blown;
  if (total === 0) {
    return <span className="text-white/35">—</span>;
  }
  const cap = 6;
  const bShow = Math.min(blown, cap);
  const bExtra = blown - bShow;
  const topTitle =
    kind === "eval"
      ? `${active} evaluation active · ${blown} evaluation blown`
      : `${active} funded active · ${blown} funded blown`;
  const dotsTitle = kind === "eval" ? `${blown} evaluation blown` : `${blown} funded blown`;
  return (
    <div className="flex flex-col items-center justify-center gap-1.5 py-0.5">
      <span
        className={`inline-flex h-6 w-6 items-center justify-center rounded-full border text-[11px] font-semibold tabular-nums sm:h-8 sm:w-8 sm:text-sm ${
          active > 0
            ? "border-emerald-400/30 bg-emerald-500/12 text-emerald-200/90"
            : "border-white/12 bg-white/[0.04] text-white/45"
        }`}
        title={topTitle}
      >
        {active}
      </span>
      {blown > 0 ? (
        <span
          className="inline-flex max-w-full flex-wrap items-center justify-center gap-0.5"
          title={dotsTitle}
        >
          {Array.from({ length: bShow }).map((_, i) => (
            <span
              key={`ab-${kind}-${i}`}
              className="h-2 w-2 shrink-0 rounded-full bg-rose-400/75 shadow-[0_0_6px_rgba(251,113,133,0.15)]"
            />
          ))}
          {bExtra > 0 ? (
            <span className="text-[10px] font-medium text-white/45">+{bExtra}</span>
          ) : null}
        </span>
      ) : null}
    </div>
  );
}

export function JournalDashboard() {
  const { state, dispatch, hydrated } = useJournal();
  const accounts = useMemo(
    () => Object.values(state.accounts).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [state.accounts]
  );
  const autoById = useAutoAccountLabelById(accounts);

  useEffect(() => {
    if (!hydrated) return;
    for (const account of Object.values(state.accounts)) {
      const isDemo =
        account.propFirm.id === "demo" ||
        account.propFirm.name.toLowerCase().includes("démo") ||
        (account.notes ?? "").toLowerCase().includes("démonstration");
      if (!isDemo) continue;
      dispatch({ type: "account/delete", payload: { accountId: account.id } });
    }
  }, [hydrated, state.accounts, dispatch]);

  const [tradesStore, setTradesStore] = useState<TradesStoreV1>(() => loadTradesStore());

  useEffect(() => {
    const onTradesChanged = () => {
      setTradesStore(loadTradesStore());
    };
    window.addEventListener(TRADES_STORE_CHANGED_EVENT, onTradesChanged);
    const onStorage = (e: StorageEvent) => {
      if (e.key === TRADES_STORAGE_KEY) setTradesStore(loadTradesStore());
    };
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(TRADES_STORE_CHANGED_EVENT, onTradesChanged);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const dash = useMemo(() => getDashboardFinancialMetrics(state), [state]);
  const cycle = useMemo(() => getCycleStats(state), [state]);
  const pulse = useMemo(
    () => getPnlPulseStatsFromTradesStore(tradesStore, state),
    [tradesStore, state]
  );
  const capitalBreakdown = useMemo(() => getCapitalBreakdownCents(state), [state.accounts]);
  const firmRows = useMemo(() => getFirmBreakdownRows(state), [state]);
  const insight = useMemo(() => pickFirmInsightLine(firmRows), [firmRows]);
  const topAccounts = useMemo(
    () =>
      getTopAccountsByNetCash(state, 1, (acc) => resolveAccountDisplayName(acc, autoById)),
    [state, autoById]
  );

  const payoutYears = useMemo(() => getYearsWithPayoutData(state), [state]);
  const chartYears = payoutYears;
  const calendarYear = new Date().getFullYear();
  const maxChartYear = chartYears.length ? Math.max(calendarYear, ...chartYears) : calendarYear;
  const minChartYear = chartYears.length ? Math.min(...chartYears) : calendarYear;
  /** Wider than data bounds so you can scroll prior empty years. */
  const minNavYear = useMemo(() => {
    const spanBack = calendarYear - 15;
    return chartYears.length ? Math.min(spanBack, minChartYear) : spanBack;
  }, [chartYears.length, calendarYear, minChartYear]);
  const maxNavYear = maxChartYear;
  const [chartYear, setChartYear] = useState(calendarYear);
  useEffect(() => {
    if (!chartYears.length) return;
    const monthlyThisYear = getMonthlyPayoutsCentsForYear(state, calendarYear);
    const hasPayoutsThisYear = monthlyThisYear.some((c) => c !== 0);
    if (chartYears.includes(calendarYear) && hasPayoutsThisYear) {
      setChartYear(calendarYear);
      return;
    }
    const sortedDesc = [...chartYears].sort((a, b) => b - a);
    for (const y of sortedDesc) {
      const m = getMonthlyPayoutsCentsForYear(state, y);
      if (m.some((c) => c !== 0)) {
        setChartYear(y);
        return;
      }
    }
    setChartYear(chartYears[chartYears.length - 1]!);
  }, [chartYears, calendarYear, state]);

  const monthly = useMemo(
    () => getMonthlyPayoutsCentsForYear(state, chartYear),
    [state, chartYear]
  );
  const maxAbs = useMemo(() => {
    const m = Math.max(...monthly.map((c) => c), 1);
    return m;
  }, [monthly]);

  const hasMonthlyPayouts = useMemo(() => monthly.some((c) => c !== 0), [monthly]);

  const payoutYearStats = useMemo(() => {
    let yearNet = 0;
    let bestI = -1;
    let softestI = -1;
    for (let i = 0; i < 12; i++) {
      const c = monthly[i]!;
      yearNet += c;
      if (c > 0) {
        if (bestI < 0 || c > monthly[bestI]!) bestI = i;
        if (softestI < 0 || c < monthly[softestI]!) softestI = i;
      }
    }
    return { yearNet, bestI, softestI };
  }, [monthly]);

  const topFirmsForChart = useMemo(() => {
    const positive = firmRows.filter((r) => r.netCents > 0 || r.feesCents > 0);
    const sorted = [...positive].sort((a, b) => b.netCents - a.netCents);
    return sorted.slice(0, 5);
  }, [firmRows]);
  const maxFirmNet = useMemo(
    () => Math.max(...topFirmsForChart.map((r) => Math.max(r.netCents, 1)), 1),
    [topFirmsForChart]
  );

  const roiMain =
    dash.totalInvestedCents > 0
      ? (dash.netProfitCents / dash.totalInvestedCents) * 100
      : null;

  const monthLabels = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) =>
        new Date(2000, i, 1).toLocaleString("en-US", { month: "short" })
      ),
    []
  );

  if (!hydrated) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center px-6">
        <div className={`${PANEL_BASE} max-w-md px-6 py-10 text-center text-sm text-slate-500`}>
          Loading your journal…
        </div>
      </div>
    );
  }

  const hasAccounts = accounts.length > 0;

  return (
    <>
      <header className="shrink-0 border-b border-white/10 bg-black/55 px-[clamp(16px,2.5vw,40px)] py-[clamp(14px,1.8vw,24px)] backdrop-blur-xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className={`${SECTION_LABEL}`}>Workspace</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">Dashboard</h1>
            <p className="mt-2 max-w-xl text-sm text-slate-500">
              One read on fees, payouts, and how each prop firm contributes — built from the accounts you track.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/compare"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl border border-white/12 bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-white/85 transition hover:border-sky-400/30 hover:bg-sky-500/10 hover:text-sky-100"
            >
              Start a new challenge
            </Link>
            <Link
              href="/journal/accounts"
              className="rounded-xl border border-sky-500/35 bg-sky-500/15 px-4 py-2.5 text-sm font-semibold text-sky-100 transition hover:bg-sky-500/25"
            >
              Accounts
            </Link>
          </div>
        </div>
      </header>

      <div className="min-w-0 w-full flex-1 space-y-8 px-[clamp(12px,2.5vw,40px)] py-[clamp(18px,3vw,40px)]">
        {!hasAccounts ? (
          <div className="rounded-2xl border border-dashed border-white/15 bg-black/20 px-8 py-16 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <p className="text-lg font-medium text-white/90">Start your journal</p>
            <p className="mt-2 text-sm text-slate-500">
              Add a prop account to unlock payouts, fees, and firm-level roll-ups.
            </p>
            <Link
              href="/journal/accounts?new=1"
              className="mt-6 inline-flex rounded-xl border border-sky-500/35 bg-sky-500/15 px-5 py-2.5 text-sm font-semibold text-sky-100 transition hover:bg-sky-500/25"
            >
              Add an account
            </Link>
            <p className="mt-8 text-xs text-slate-500">No firm picked yet?</p>
            <Link
              href="/compare"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex text-sm font-semibold text-sky-300/90 transition hover:text-sky-200"
            >
              Choose the best prop firm for your next evaluation
            </Link>
          </div>
        ) : (
          <>
            {/* Capital snapshot — id used by scripts/capture-landing-assets.mjs */}
            <section id="landing-capture-capital-snapshot">
              <p className={SECTION_LABEL}>Capital snapshot</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <Panel className="flex min-h-[11.5rem] flex-col p-5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-white/45">Fees</p>
                    <span className={KICKER}>Paid in</span>
                  </div>
                  <p className="mt-3 text-[11px] font-medium uppercase tracking-wide text-slate-500">Total fees</p>
                  <p className="mt-1.5 text-2xl font-bold tabular-nums tracking-tight text-white/92">
                    {formatUsd0(dash.totalInvestedCents)}
                  </p>
                  <div className="flex-1" />
                  <p className="mt-3 text-xs leading-snug text-slate-400/90">
                    Evals, resets, data — everything logged as fees.
                  </p>
                </Panel>
                <Panel className="flex min-h-[11.5rem] flex-col p-5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-white/45">Payouts</p>
                    <span className={KICKER}>Out</span>
                  </div>
                  <p className="mt-3 text-[11px] font-medium uppercase tracking-wide text-slate-500">Total payouts</p>
                  <p className="mt-1.5 text-2xl font-bold tabular-nums tracking-tight text-amber-200/95">
                    {formatUsd0(dash.totalPayoutsCents)}
                  </p>
                  <div className="flex-1" />
                  <p className="mt-3 text-xs leading-snug text-slate-400/90">
                    Withdrawals recorded in the journal.
                  </p>
                </Panel>
                <Panel className="flex min-h-[11.5rem] flex-col p-5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-white/45">Net</p>
                    <span
                      className={`${KICKER} ${
                        dash.netProfitCents > 0
                          ? "border-emerald-400/25 text-emerald-200/85"
                          : dash.netProfitCents < 0
                            ? "border-rose-400/25 text-rose-200/80"
                            : ""
                      }`}
                    >
                      {dash.netProfitCents > 0 ? "Positive" : dash.netProfitCents < 0 ? "Negative" : "Flat"}
                    </span>
                  </div>
                  <p className="mt-3 text-[11px] font-medium uppercase tracking-wide text-slate-500">Net cash</p>
                  <p
                    className={`mt-1.5 text-2xl font-bold tabular-nums tracking-tight ${
                      dash.netProfitCents >= 0 ? "text-emerald-300/95" : "text-rose-300/90"
                    }`}
                  >
                    {formatUsdSigned(dash.netProfitCents)}
                  </p>
                  <div className="flex-1" />
                  <div className="mt-3 flex min-h-[1.375rem] flex-wrap items-baseline gap-2">
                    {roiMain != null ? (
                      <span className="rounded-lg border border-white/10 bg-black/30 px-2 py-0.5 text-sm font-semibold tabular-nums text-white/80">
                        ROI {formatPctOne(roiMain)}
                      </span>
                    ) : (
                      <span className="text-sm text-white/40">ROI —</span>
                    )}
                  </div>
                  <p className="mt-2 text-xs leading-snug text-slate-400/90">
                    {netProfitTagline(dash.netProfitCents, dash.totalInvestedCents)}
                  </p>
                </Panel>
              </div>
            </section>

            {/* Pipeline */}
            <section>
              <p className={SECTION_LABEL}>Evaluation & funded</p>
              <div className="mt-3 grid gap-3 lg:grid-cols-2">
                <Panel className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-white/45">Challenge</p>
                    <span className={KICKER}>Evaluations</span>
                  </div>
                  <p className="mt-3 text-sm font-semibold text-white/88">Evaluations</p>
                  <p className="mt-1 text-4xl font-bold tabular-nums tracking-tight text-white">{cycle.challengeTotal}</p>
                  <p className="mt-3 text-sm text-slate-400/95">
                    <span className="font-medium text-sky-300/90">{cycle.challengeOngoing} active</span>
                    <span className="mx-1.5 text-white/25">·</span>
                    <span className="font-medium text-rose-300/85">{cycle.challengeFailed} blown</span>
                  </p>
                  {(cycle.challengeTotal ?? 0) < 1 || cycle.challengeOngoing === 0 ? (
                    <div className="relative z-10 mt-4 rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-sm leading-relaxed text-white/75">
                      <Link
                        href="/compare"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-sky-300/90 transition hover:text-sky-200"
                      >
                        Choose the best prop firm for your next evaluation
                      </Link>
                    </div>
                  ) : (
                    <p className="mt-4 text-xs text-slate-500">{challengeFootnote(cycle)}</p>
                  )}
                </Panel>
                <Panel className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-white/45">Funded</p>
                    <span className={KICKER}>Pipeline</span>
                  </div>
                  <div className="mb-4 mt-3 h-2 overflow-hidden rounded-full bg-slate-800/80 ring-1 ring-slate-600/30">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-sky-600/90 to-cyan-400/70 transition-all duration-500"
                      style={{
                        width: `${cycle.evalToFundedRatePct != null ? Math.min(100, cycle.evalToFundedRatePct) : 0}%`,
                      }}
                    />
                  </div>
                  <p className="text-sm font-semibold text-white/88">Funded accounts</p>
                  <p className="mt-1 text-4xl font-bold tabular-nums tracking-tight text-white">{cycle.fundedTotal}</p>
                  <div className="mt-4 rounded-xl border border-white/10 bg-black/25 px-3 py-3">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                        Success rate
                      </span>
                      {cycle.evalToFundedRatePct != null ? (
                        <span className="text-xl font-bold tabular-nums text-emerald-300/95">
                          {formatPctOne(cycle.evalToFundedRatePct)}
                        </span>
                      ) : (
                        <span className="text-sm text-white/40">—</span>
                      )}
                    </div>
                  </div>
                  <p className="mt-4 text-sm text-slate-400/95">
                    <span className="font-medium text-emerald-300/90">{cycle.fundedActive} running</span>
                    <span className="mx-1.5 text-white/25">·</span>
                    <span className="font-medium text-rose-300/80">{cycle.fundedLost} blown</span>
                  </p>
                </Panel>
              </div>
            </section>

            {/* Capital under management */}
            <section>
              <p className={SECTION_LABEL}>Capital under management</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <Panel className="p-5">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-white/45">Notional</p>
                  <p className="mt-2 text-[11px] font-medium uppercase tracking-wide text-slate-500">Total</p>
                  <p className="mt-1 text-2xl font-bold tabular-nums tracking-tight text-white/92">
                    {formatUsd0(capitalBreakdown.totalCents)}
                  </p>
                </Panel>
                <Panel className="p-5">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-white/45">Funded &amp; live</p>
                  <p className="mt-2 text-[11px] font-medium uppercase tracking-wide text-slate-500">In play</p>
                  <p className="mt-1 text-2xl font-bold tabular-nums tracking-tight text-emerald-200/95">
                    {formatUsd0(capitalBreakdown.fundedCents)}
                  </p>
                </Panel>
                <Panel className="p-5">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-white/45">Evaluations</p>
                  <p className="mt-2 text-[11px] font-medium uppercase tracking-wide text-slate-500">In play</p>
                  <p className="mt-1 text-2xl font-bold tabular-nums tracking-tight text-sky-200/95">
                    {formatUsd0(capitalBreakdown.evalCents)}
                  </p>
                </Panel>
              </div>
            </section>

            {/* PnL pulse */}
            <section>
              <p className={SECTION_LABEL}>Logged P&amp;L</p>
              <Panel className="mt-2 overflow-hidden p-0">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-white/45">Trade pulse</p>
                  <span className={KICKER}>Imports</span>
                </div>
                <div className="grid gap-px bg-white/[0.06] sm:grid-cols-3">
                  <div className="bg-black/30 px-4 py-4 text-center sm:text-left">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Net</p>
                    <p
                      className={`mt-1.5 text-lg font-bold tabular-nums ${
                        pulse.netPnlCents >= 0 ? "text-emerald-300/95" : "text-rose-300/90"
                      }`}
                    >
                      {formatUsdSigned(pulse.netPnlCents)}
                    </p>
                  </div>
                  <div className="bg-black/25 px-4 py-4 text-center sm:text-left">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Win rate</p>
                    <p className="mt-1.5 text-lg font-bold tabular-nums text-white/90">
                      {formatPctOne(pulse.winRatePct)}
                    </p>
                  </div>
                  <div className="bg-black/30 px-4 py-4 text-center sm:text-left">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Trades</p>
                    <p className="mt-1.5 text-lg font-bold tabular-nums text-white/90">
                      {pulse.entryCount} · {pulse.wins}W / {pulse.losses}L
                    </p>
                  </div>
                </div>
                <div className="border-t border-white/10 bg-black/20 px-4 py-3">
                  <Link
                    href="/journal/accounts"
                    className="group inline-flex items-center gap-2 text-xs font-semibold text-sky-300/90 transition hover:text-sky-200"
                  >
                    Open accounts for detail
                    <span className="transition group-hover:translate-x-0.5" aria-hidden>
                      →
                    </span>
                  </Link>
                </div>
              </Panel>
            </section>

            {/* Analytics row — payout panel id used by scripts/capture-landing-assets.mjs */}
            <section>
              <p className={SECTION_LABEL}>Analytics</p>
              <div className="mt-3 grid gap-4 lg:grid-cols-2">
                <div id="landing-capture-payout-ledger" className="min-w-0">
                <Panel className="p-5">
                  <div className="relative flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-white/45">
                        Payout ledger
                      </p>
                      <p className="mt-1.5 text-base font-semibold tracking-tight text-white/92">
                        Monthly payouts · {chartYear}
                      </p>
                    </div>
                    <span
                      className={`${KICKER} ${
                        payoutYearStats.yearNet > 0 ? "border-amber-400/25 text-amber-200/85" : ""
                      }`}
                    >
                      {payoutYearStats.yearNet > 0 ? "Activity" : "Quiet"}
                    </span>
                  </div>
                  <div className="relative mt-4 flex flex-wrap items-end justify-between gap-4 border-t border-white/10 pt-4">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Year payouts</p>
                      <p
                        className={`mt-1 text-2xl font-bold tabular-nums tracking-tight ${
                          payoutYearStats.yearNet > 0 ? "text-amber-200/95" : "text-white/70"
                        }`}
                      >
                        {formatUsdSigned(payoutYearStats.yearNet)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 text-[11px]">
                      {payoutYearStats.bestI >= 0 ? (
                        <span className="rounded-lg border border-white/10 bg-black/25 px-2 py-1 font-medium text-amber-200/85">
                          Peak {monthLabels[payoutYearStats.bestI]!.slice(0, 3)}{" "}
                          <span className="tabular-nums text-amber-100/90">
                            {formatUsdSigned(monthly[payoutYearStats.bestI]!)}
                          </span>
                        </span>
                      ) : null}
                      {payoutYearStats.softestI >= 0 &&
                      payoutYearStats.softestI !== payoutYearStats.bestI ? (
                        <span className="rounded-lg border border-white/10 bg-black/20 px-2 py-1 font-medium text-slate-400">
                          Light {monthLabels[payoutYearStats.softestI]!.slice(0, 3)}{" "}
                          <span className="tabular-nums text-white/65">
                            {formatUsdSigned(monthly[payoutYearStats.softestI]!)}
                          </span>
                        </span>
                      ) : null}
                    </div>
                  </div>
                  {!hasMonthlyPayouts ? (
                    <div className="relative mt-5 flex min-h-[148px] items-center justify-center rounded-xl border border-dashed border-white/15 bg-black/20 px-5 py-8 text-center">
                      <p className="max-w-sm text-sm leading-relaxed text-slate-400/95">
                        No payouts in <span className="font-semibold text-white/80">{chartYear}</span> yet. Log
                        withdrawals on Accounts to see your rhythm here.
                      </p>
                    </div>
                  ) : (
                    <div className="relative mt-5 flex min-h-[180px] items-end justify-between gap-1 px-0.5 pb-0.5">
                      {monthly.map((cents, i) => {
                        const h = Math.max(8, (cents / maxAbs) * 100);
                        const has = cents > 0;
                        return (
                          <div key={i} className="flex min-h-0 min-w-0 flex-1 flex-col items-center gap-1">
                            <div className="flex h-[120px] w-full flex-col justify-end">
                              <div
                                className={`mx-auto w-full max-w-[2rem] rounded-t-md transition-all ${
                                  has
                                    ? "bg-gradient-to-t from-amber-600/75 to-amber-500/50"
                                    : "bg-gradient-to-t from-slate-700/70 to-slate-600/45"
                                }`}
                                style={{ height: `${h}%`, minHeight: cents !== 0 ? 6 : 4 }}
                                title={`${monthLabels[i]}: ${formatUsdSigned(cents)}`}
                              />
                            </div>
                            <span className="text-[9px] font-medium uppercase tracking-wide text-slate-500">
                              {monthLabels[i]!.slice(0, 3)}
                            </span>
                            <span
                              className={`max-w-full text-center text-[9px] font-bold tabular-nums leading-tight sm:text-[11px] ${
                                cents === 0 ? "text-white/35" : "text-amber-200/90"
                              }`}
                            >
                              {formatUsdCompactSigned(cents)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <div className="relative mt-4 flex items-center justify-center gap-3">
                    <button
                      type="button"
                      className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-lg text-white/65 transition hover:border-sky-400/30 hover:bg-sky-500/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
                      onClick={() => setChartYear((y) => y - 1)}
                      disabled={chartYear <= minNavYear}
                      aria-label="Previous year"
                    >
                      ‹
                    </button>
                    <span className="min-w-[5.5rem] rounded-xl border border-white/10 bg-black/30 px-4 py-2 text-center text-sm font-bold tabular-nums tracking-tight text-white/90">
                      {chartYear}
                    </span>
                    <button
                      type="button"
                      className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-lg text-white/65 transition hover:border-sky-400/30 hover:bg-sky-500/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
                      onClick={() => setChartYear((y) => y + 1)}
                      disabled={chartYear >= maxNavYear}
                      aria-label="Next year"
                    >
                      ›
                    </button>
                  </div>
                </Panel>
                </div>

                <Panel className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-white/45">Leaderboard</p>
                      <p className="mt-1.5 text-sm font-semibold text-white/88">Firms by net cash</p>
                    </div>
                    <span className={KICKER}>Top 5</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">Fees vs payouts rolled up per prop.</p>
                  <ul className="mt-5 space-y-4">
                    {topFirmsForChart.length === 0 ? (
                      <li className="text-sm text-white/45">No firm data yet.</li>
                    ) : (
                      topFirmsForChart.map((r, idx) => {
                        const barPct = Math.min(100, Math.max(8, (r.netCents / maxFirmNet) * 100));
                        return (
                          <li key={r.key}>
                            <div className="flex items-center justify-between gap-2 text-sm">
                              <span className="flex min-w-0 items-center gap-2">
                                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-black/30 text-[10px] font-bold tabular-nums text-slate-300">
                                  {idx + 1}
                                </span>
                                <span className="min-w-0 truncate font-semibold text-white/90">{r.firmName}</span>
                              </span>
                            </div>
                            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-800/80 ring-1 ring-slate-600/30">
                              <div
                                className={`h-full rounded-full ${
                                  r.netCents >= 0
                                    ? "bg-gradient-to-r from-emerald-600/85 to-emerald-500/65"
                                    : "bg-gradient-to-r from-rose-600/80 to-rose-500/55"
                                }`}
                                style={{ width: `${barPct}%` }}
                              />
                            </div>
                            <div className="mt-1.5 flex flex-wrap gap-x-3 text-[11px] text-slate-500">
                              <span>
                                Fees{" "}
                                <span className="font-semibold text-rose-300/75">{formatUsd0(r.feesCents)}</span>
                              </span>
                              <span>
                                Net{" "}
                                <span
                                  className={`font-bold tabular-nums ${
                                    r.netCents >= 0 ? "text-emerald-300/90" : "text-rose-300/85"
                                  }`}
                                >
                                  {formatUsdSigned(r.netCents)}
                                </span>
                              </span>
                            </div>
                          </li>
                        );
                      })
                    )}
                  </ul>
                </Panel>
              </div>
            </section>

            {/* Top account */}
            {topAccounts[0] ? (
              <section>
                <p className={SECTION_LABEL}>Standout account</p>
                <Link
                  href={`/journal/accounts/${topAccounts[0]!.accountId}`}
                  className="group mt-3 block"
                >
                  <Panel className="p-5 transition duration-200 group-hover:border-slate-500/40">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-white/45">
                        Standout account
                      </p>
                      <span className={KICKER}>Best net</span>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-lg font-bold tracking-tight text-white">{topAccounts[0]!.label}</p>
                        <p className="mt-1 text-sm text-slate-500">{topAccounts[0]!.subline}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold tabular-nums text-amber-200/95">
                          {formatUsdSigned(topAccounts[0]!.netCashCents)}
                        </p>
                        {topAccounts[0]!.roiVsFeesPct != null ? (
                          <p className="mt-1 text-sm font-semibold text-emerald-300/85">
                            ROI {formatPctOne(topAccounts[0]!.roiVsFeesPct!)} vs fees
                          </p>
                        ) : (
                          <p className="mt-1 text-sm text-white/40">ROI —</p>
                        )}
                      </div>
                    </div>
                    <p className="mt-4 text-xs font-medium text-slate-500 transition group-hover:text-sky-300/80">
                      View account →
                    </p>
                  </Panel>
                </Link>
              </section>
            ) : null}

            {/* Firm table — id used by scripts/capture-landing-assets.mjs */}
            <section className="min-w-0" id="landing-capture-firm-table">
              <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
                <p className={SECTION_LABEL}>By prop firm</p>
                {insight ? <p className="max-w-md text-right text-xs text-white/40">{insight}</p> : null}
              </div>
              <Panel className="min-w-0 max-w-full overflow-hidden p-0">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-3 py-3 sm:px-4">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">By firm</p>
                  <span className={KICKER}>Table</span>
                </div>
                <div className="min-w-0 px-1 pb-1 sm:px-2">
                  <table className="w-full table-fixed border-collapse text-left text-[11px] sm:text-sm">
                    <colgroup>
                      <col className="w-[26%] sm:w-[24%]" />
                      <col className="w-[8%] sm:w-[7%]" />
                      <col className="w-[14%] sm:w-[15%]" />
                      <col className="w-[9%]" />
                      <col className="w-[11%]" />
                      <col className="w-[11%]" />
                      <col className="w-[13%]" />
                      <col className="w-[8%] sm:w-[10%]" />
                    </colgroup>
                    <thead>
                      <tr className="border-b border-white/10 bg-black/25">
                        <th className="px-1.5 py-2 text-left text-[9px] font-semibold uppercase tracking-[0.08em] text-white/45 sm:px-2 sm:py-3 sm:text-[10px] sm:tracking-[0.12em]">
                          Firm
                        </th>
                        <th
                          className="px-1 py-2 text-center text-[8px] font-semibold uppercase tracking-[0.06em] text-white/45 sm:px-2 sm:py-3 sm:text-[10px] sm:tracking-[0.12em]"
                          title="Active evaluation + active funded accounts (in play only)"
                        >
                          Accounts
                        </th>
                        <th
                          className="px-1 py-2 text-center text-[9px] font-semibold uppercase tracking-[0.08em] text-white/45 sm:px-2 sm:py-3 sm:text-[10px] sm:tracking-[0.12em]"
                          title="Evaluations — active count; red dots = blown evals"
                        >
                          <span className="hidden sm:inline">Evaluations</span>
                          <span className="sm:hidden">Eval</span>
                          <span className="mt-0.5 block text-[8px] font-normal normal-case tracking-normal text-white/35 sm:mt-1 sm:text-[9px]">
                            <span className="hidden sm:inline">Active · blown</span>
                            <span className="sm:hidden">A·B</span>
                          </span>
                        </th>
                        <th
                          className="px-1 py-2 text-center text-[9px] font-semibold uppercase tracking-[0.08em] text-white/45 sm:px-2 sm:py-3 sm:text-[10px] sm:tracking-[0.12em]"
                          title="Funded — active count (excl. blown); red dots = funded blown"
                        >
                          Funded
                          <span className="mt-0.5 block text-[8px] font-normal normal-case tracking-normal text-white/35 sm:mt-1 sm:text-[9px]">
                            <span className="hidden sm:inline">Active · blown</span>
                            <span className="sm:hidden">A·B</span>
                          </span>
                        </th>
                        <th className="px-1 py-2 text-right text-[9px] font-semibold uppercase tracking-[0.08em] text-white/45 sm:px-2 sm:py-3 sm:text-[10px] sm:tracking-[0.12em]">
                          Fees
                        </th>
                        <th className="px-1 py-2 text-right text-[9px] font-semibold uppercase tracking-[0.08em] text-white/45 sm:px-2 sm:py-3 sm:text-[10px] sm:tracking-[0.12em]">
                          <span className="sm:hidden">Pay</span>
                          <span className="hidden sm:inline">Payouts</span>
                        </th>
                        <th className="px-1 py-2 text-right text-[9px] font-semibold uppercase tracking-[0.12em] text-white/45 sm:px-2 sm:py-3 sm:text-[10px] sm:tracking-[0.12em]">
                          Net
                        </th>
                        <th className="px-1 py-2 text-right text-[9px] font-semibold uppercase tracking-[0.08em] text-white/45 sm:px-2 sm:py-3 sm:text-[10px] sm:tracking-[0.12em]">
                          ROI
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {firmRows.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="px-3 py-10 text-center text-white/45 sm:px-4">
                            No firms to show.
                          </td>
                        </tr>
                      ) : (
                        firmRows.map((r) => (
                          <tr
                            key={r.key}
                            className="border-b border-white/[0.06] transition hover:bg-white/[0.03]"
                          >
                            <td className="max-w-0 px-1.5 py-2 sm:px-2 sm:py-3">
                              <span className="block truncate font-medium text-white/90" title={r.firmName}>
                                {r.firmName}
                              </span>
                            </td>
                            <td className="max-w-0 overflow-hidden text-ellipsis whitespace-nowrap px-1 py-2 text-center tabular-nums text-white/70 sm:px-2 sm:py-3">
                              {r.accountCount}
                            </td>
                            <td className="max-w-0 px-1 py-2 text-center sm:px-2 sm:py-3">
                              <ActiveBlownColumnCell
                                active={r.challengeOngoing}
                                blown={r.challengeFailed}
                                kind="eval"
                              />
                            </td>
                            <td className="max-w-0 px-1 py-2 text-center sm:px-2 sm:py-3">
                              <ActiveBlownColumnCell
                                active={r.fundedActiveCount}
                                blown={r.fundedBlownCount}
                                kind="funded"
                              />
                            </td>
                            <td
                              className="max-w-0 overflow-hidden text-ellipsis whitespace-nowrap px-1 py-2 text-right tabular-nums text-rose-300/80 sm:px-2 sm:py-3"
                              title={formatUsd0(r.feesCents)}
                            >
                              {formatUsd0(r.feesCents)}
                            </td>
                            <td
                              className="max-w-0 overflow-hidden text-ellipsis whitespace-nowrap px-1 py-2 text-right tabular-nums text-amber-300/85 sm:px-2 sm:py-3"
                              title={formatUsd0(r.payoutsCents)}
                            >
                              {formatUsd0(r.payoutsCents)}
                            </td>
                            <td
                              className={`max-w-0 overflow-hidden text-ellipsis whitespace-nowrap px-1 py-2 text-right text-[10px] font-semibold tabular-nums sm:px-2 sm:py-3 sm:text-sm ${
                                r.netCents >= 0 ? "text-emerald-300/95" : "text-rose-300/90"
                              }`}
                              title={formatUsdSigned(r.netCents)}
                            >
                              {formatUsdSigned(r.netCents)}
                            </td>
                            <td className="max-w-0 overflow-hidden text-ellipsis whitespace-nowrap px-1 py-2 text-right text-[10px] font-medium tabular-nums text-emerald-300/85 sm:px-2 sm:py-3 sm:text-sm">
                              {r.roiPct != null ? `${r.roiPct.toFixed(1)}%` : "—"}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </Panel>
            </section>
          </>
        )}
      </div>
    </>
  );
}
