import { TPT_FUNDED_PAYOUT_DASHBOARD_REMINDER } from "@/lib/journal/tpt-funded-runway";
import { LANDING_KICKER, LANDING_NUM, LANDING_PANEL } from "../tokens";

const LANDING_SECTION_LABEL =
  "text-[10px] font-semibold uppercase tracking-[0.2em] text-sky-400/85";

function FirmLogoThumb({ src, label }: { src: string; label: string }) {
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-black/40 p-1">
      {/* eslint-disable-next-line @next/next/no-img-element -- small static logos; avoid layout shift */}
      <img src={src} alt={label} className="max-h-6 max-w-[1.65rem] object-contain opacity-95" />
    </span>
  );
}

type ComparePreviewDensity = "hero" | "pillar";

function fmtUsd0(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function LandingCompareProgramRows({ density }: { density: ComparePreviewDensity }) {
  const hero = density === "hero";
  /** Aligné sur `propFirms` : TopStep Standard 50k, Apex EOD 50k, LucidFlex 25k — max DD = montants USD. */
  const rows: {
    logo: string;
    name: string;
    program: string;
    price: string;
    maxDrawdownUsd: number;
  }[] = [
    {
      logo: "/firms/topstep.png",
      name: "TopStep",
      program: "TopStep Standard 50k",
      price: "$49/mo",
      maxDrawdownUsd: 2000,
    },
    {
      logo: "/firms/apex.png",
      name: "Apex Trader Funding",
      program: "Apex EOD 50k",
      price: "$34.90",
      maxDrawdownUsd: 2000,
    },
    {
      logo: "/firms/lucid.png",
      name: "Lucid Trading",
      program: "LucidFlex 25k",
      price: "$60",
      maxDrawdownUsd: 1000,
    },
  ];

  const padCell = hero ? "px-3 py-3" : "px-2.5 py-2.5";
  const programText = hero ? "text-[11px] sm:text-[12px]" : "text-[11px]";

  return (
    <>
      <div
        className={`grid gap-1 border-b border-white/[0.08] pb-2 text-[9px] font-semibold uppercase tracking-wider text-white/38 ${
          hero
            ? "grid-cols-[minmax(0,1.35fr)_minmax(0,0.55fr)_minmax(0,0.85fr)]"
            : "grid-cols-[minmax(0,1.4fr)_minmax(0,0.5fr)_minmax(0,0.9fr)]"
        }`}
      >
        <span>Program</span>
        <span className="text-right">Eval price</span>
        <span className="text-right">Max DD</span>
      </div>
      <div className={hero ? "space-y-2.5" : "space-y-2"}>
        {rows.map((r) => (
          <div
            key={r.program}
            className={`grid items-center gap-2 rounded-xl border border-white/[0.09] bg-black/28 transition-[border-color,background-color] duration-200 hover:border-sky-500/22 hover:bg-black/34 ${padCell} ${
              hero
                ? "grid-cols-[minmax(0,1.35fr)_minmax(0,0.55fr)_minmax(0,0.85fr)]"
                : "grid-cols-[minmax(0,1.4fr)_minmax(0,0.5fr)_minmax(0,0.9fr)]"
            }`}
          >
            <div className="flex min-w-0 items-center gap-2.5">
              <FirmLogoThumb src={r.logo} label={r.name} />
              <span
                className={`min-w-0 truncate rounded-md border border-white/[0.08] bg-white/[0.05] px-2 py-1 font-medium text-white/90 ${programText}`}
              >
                {r.program}
              </span>
            </div>
            <span className={`text-right font-medium text-white/78 ${LANDING_NUM} text-[11px]`}>
              {r.price}
            </span>
            <span
              className={`text-right text-[10px] text-white/48 sm:text-[11px] ${LANDING_NUM}`}
            >
              {fmtUsd0(r.maxDrawdownUsd)}
            </span>
          </div>
        ))}
      </div>
    </>
  );
}

function WindowBar({ label, hero }: { label: string; hero?: boolean }) {
  return (
    <div
      className={`relative flex items-center gap-2 border-b border-white/[0.08] bg-black/40 px-3 ${
        hero ? "py-2.5" : "py-2"
      }`}
    >
      <span
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sky-400/35 to-transparent"
        aria-hidden
      />
      <span className="flex gap-1" aria-hidden>
        <span className="h-1.5 w-1.5 rounded-full bg-white/20" />
        <span className="h-1.5 w-1.5 rounded-full bg-white/12" />
        <span className="h-1.5 w-1.5 rounded-full bg-white/12" />
      </span>
      <span className={`font-mono text-white/35 ${hero ? "text-[11px]" : "text-[10px]"}`}>
        {label}
      </span>
    </div>
  );
}

/** Hero: desk + comparator — stylized, same vocabulary as the app. */
export function HeroCompositePreview({ hero = false }: { hero?: boolean }) {
  const pad = hero ? "p-5 sm:p-6" : "p-4 sm:p-5";
  const gap = hero ? "gap-5 lg:gap-6" : "gap-4 lg:gap-5";
  const titleSm = hero ? "text-base" : "text-sm";
  const balLg = hero ? "text-xl sm:text-2xl" : "text-lg";
  const ringBox = hero ? "h-[4.5rem] w-[4.5rem] sm:h-[5rem] sm:w-[5rem]" : "h-16 w-16";
  const ringPct = hero ? "text-xs" : "text-[11px]";
  const gridCols = hero
    ? "lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]"
    : "lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]";

  return (
    <div className={`grid ${gridCols} ${gap}`}>
      <div
        className={`group ${LANDING_PANEL} overflow-hidden transition-[border-color,box-shadow] duration-200 hover:border-sky-400/30 ${
          hero ? "shadow-[0_22px_56px_rgba(0,0,0,0.42),inset_0_1px_0_rgba(255,255,255,0.07)]" : ""
        }`}
      >
        <WindowBar label="journal / progress" hero={hero} />
        <div className={pad}>
          <p className={LANDING_KICKER}>Progress</p>
          <p className={`mt-2 font-semibold tracking-tight text-white/92 ${titleSm}`}>
            Mission control
          </p>
          <div className={`mt-5 rounded-xl border border-white/[0.1] bg-black/35 ${hero ? "p-5" : "p-4"}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-medium uppercase tracking-wider text-white/42">
                  Funded · TopStep · 50k
                </p>
                <p className={`mt-2 font-semibold text-white/95 ${LANDING_NUM} ${balLg}`}>
                  $52,420
                </p>
                <p className="mt-1 text-[11px] text-white/38">vs $50,000 nominal</p>
              </div>
              <div className={`relative shrink-0 ${ringBox}`}>
                <svg viewBox="0 0 100 100" className="text-slate-600/50" aria-hidden>
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="8"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="url(#landingHudRingHero)"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={`${0.68 * 251.2} 251.2`}
                    transform="rotate(-90 50 50)"
                    className="text-sky-400/75"
                  />
                  <defs>
                    <linearGradient id="landingHudRingHero" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="rgb(56 189 248 / 0.5)" />
                      <stop offset="100%" stopColor="rgb(34 211 238 / 0.85)" />
                    </linearGradient>
                  </defs>
                </svg>
                <span
                  className={`absolute inset-0 flex items-center justify-center font-semibold text-white/80 ${LANDING_NUM} ${ringPct}`}
                >
                  68%
                </span>
              </div>
            </div>
            <div className="mt-4">
              <div className="flex justify-between text-[10px] text-white/44">
                <span>Buffer runway</span>
                <span className={`text-emerald-300/90 ${LANDING_NUM}`}>+$1,180</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-sky-600/70 to-cyan-400/55"
                  style={{ width: "61%" }}
                />
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.07] pt-3">
              <span className="text-[10px] text-white/42">Payout window</span>
              <span className="rounded-md border border-emerald-500/25 bg-emerald-500/12 px-2 py-0.5 text-[10px] font-medium text-emerald-200/90">
                Open
              </span>
            </div>
          </div>
        </div>
      </div>

      <div
        className={`group ${LANDING_PANEL} overflow-hidden transition-[border-color,box-shadow] duration-200 hover:border-sky-400/30 ${
          hero ? "shadow-[0_22px_56px_rgba(0,0,0,0.42),inset_0_1px_0_rgba(255,255,255,0.07)]" : ""
        }`}
      >
        <WindowBar label="compare" hero={hero} />
        <div className={pad}>
          <p className={LANDING_KICKER}>Comparator</p>
          <p className={`mt-2 font-semibold tracking-tight text-white/92 ${titleSm}`}>
            Rules at a glance
          </p>
          <div className={hero ? "mt-5" : "mt-4"}>
            <LandingCompareProgramRows density={hero ? "hero" : "pillar"} />
          </div>
          <p className="mt-4 text-[10px] leading-relaxed text-white/35">
            Logos and columns match production compare—full depth one click away.
          </p>
        </div>
      </div>
    </div>
  );
}

/** Pillar A — control surface (abbreviated HUD). */
export function PillarControlPreview() {
  return (
    <div className={`${LANDING_PANEL} overflow-hidden`}>
      <WindowBar label="journal / dashboard" />
      <div className="p-4 sm:p-5">
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            ["Fees (YTD)", "$2,140", "text-white/88"],
            ["Payouts", "$8,200", "text-amber-200/90"],
            ["Net", "+$6,060", "text-emerald-300/90"],
          ].map(([k, v, c]) => (
            <div
              key={k}
              className="rounded-xl border border-white/[0.07] bg-black/30 px-3 py-3"
            >
              <p className="text-[9px] font-semibold uppercase tracking-wider text-white/38">
                {k}
              </p>
              <p className={`mt-2 text-base font-semibold ${c} ${LANDING_NUM}`}>{v}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 rounded-xl border border-white/[0.06] bg-black/25 px-3 py-2.5">
          <p className="text-[9px] font-medium uppercase tracking-wider text-white/35">
            By firm · net roll-up
          </p>
          <div className="mt-2 flex items-end justify-between gap-2">
            {[
              ["Topstep", 72],
              ["Apex", 48],
              ["TPT", 35],
            ].map(([name, w]) => (
              <div key={name} className="min-w-0 flex-1">
                <div
                  className="mx-auto w-full max-w-[2.25rem] rounded-sm bg-sky-500/35"
                  style={{ height: `${Math.max(16, Number(w))}px` }}
                />
                <p className="mt-1.5 truncate text-center text-[9px] text-white/45">
                  {name}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const KICKER_BADGE =
  "inline-flex rounded-md border border-white/[0.1] bg-white/[0.05] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-white/45";

/** `accountName` + size from `propFirms` — no invented labels. */
const LANDING_ACCOUNTS_ROSTER_ROWS: {
  accountName: string;
  size: string;
  firm: string;
  logo: string;
  kind: "eval" | "funded";
  status: string;
  statusClass: string;
  payouts: string | null;
}[] = [
  {
    accountName: "TopStep",
    size: "50k",
    firm: "TopStep",
    logo: "/firms/topstep.png",
    kind: "eval",
    status: "Active",
    statusClass: "border-white/12 bg-slate-800/60 text-slate-100",
    payouts: null,
  },
  {
    accountName: "Apex EOD",
    size: "50k",
    firm: "Apex Trader Funding",
    logo: "/firms/apex.png",
    kind: "eval",
    status: "Active",
    statusClass: "border-white/12 bg-slate-800/60 text-slate-100",
    payouts: null,
  },
  {
    accountName: "LucidFlex",
    size: "25k",
    firm: "Lucid Trading",
    logo: "/firms/lucid.png",
    kind: "funded",
    status: "Active",
    statusClass: "border-emerald-400/25 bg-emerald-500/12 text-emerald-100",
    payouts: "$2,400",
  },
  {
    accountName: "Bulenox Opt. 1",
    size: "50k",
    firm: "Bulenox",
    logo: "/firms/bulenox.png",
    kind: "eval",
    status: "Passed",
    statusClass: "border-emerald-400/30 bg-emerald-500/14 text-emerald-100",
    payouts: null,
  },
  {
    accountName: "Take Profit Trader",
    size: "50k",
    firm: "Take Profit Trader",
    logo: "/firms/take-profit-trader.svg",
    kind: "eval",
    status: "Active",
    statusClass: "border-white/12 bg-slate-800/60 text-slate-100",
    payouts: null,
  },
  {
    accountName: "Funded Next Futures Bolt",
    size: "50k",
    firm: "Funded Next Futures",
    logo: "/firms/brand-funded-next-futures.png",
    kind: "funded",
    status: "Active",
    statusClass: "border-emerald-400/25 bg-emerald-500/12 text-emerald-100",
    payouts: "$1,850",
  },
  {
    accountName: "Tradeify Growth",
    size: "100k",
    firm: "Tradeify",
    logo: "/firms/brand-tradeify-v2.png",
    kind: "eval",
    status: "Blown",
    statusClass: "border-rose-400/30 bg-rose-500/12 text-rose-100",
    payouts: null,
  },
  {
    accountName: "Funded Futures Network OG",
    size: "50k",
    firm: "Funded Futures Network",
    logo: "/firms/brand-funded-futures-network.png",
    kind: "eval",
    status: "Active",
    statusClass: "border-white/12 bg-slate-800/60 text-slate-100",
    payouts: null,
  },
  {
    accountName: "LucidPro",
    size: "50k",
    firm: "Lucid Trading",
    logo: "/firms/lucid.png",
    kind: "eval",
    status: "Passed",
    statusClass: "border-emerald-400/30 bg-emerald-500/14 text-emerald-100",
    payouts: null,
  },
  {
    accountName: "Bulenox Master Account",
    size: "50k",
    firm: "Bulenox",
    logo: "/firms/bulenox.png",
    kind: "funded",
    status: "Active",
    statusClass: "border-emerald-400/25 bg-emerald-500/12 text-emerald-100",
    payouts: "$3,100",
  },
];

/** Accounts snapshot — Evaluation & funded + capital (sans roster). */
export function AccountsDeskPreview() {
  const evalToFundedPct = (7 / 12) * 100;

  return (
    <div className={`${LANDING_PANEL} overflow-hidden`}>
      <WindowBar label="journal / accounts" />
      <div className="space-y-5 p-4 sm:p-5">
        <div>
          <p className={LANDING_SECTION_LABEL}>Evaluation &amp; funded</p>
          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            <div className="rounded-xl border border-white/[0.09] bg-black/30 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-white/42">
                  Challenge
                </p>
                <span className={KICKER_BADGE}>Evaluations</span>
              </div>
              <p className="mt-3 text-sm font-semibold text-white/88">Evaluations</p>
              <p className={`mt-1 text-3xl font-bold tracking-tight text-white ${LANDING_NUM}`}>
                12
              </p>
              <p className="mt-3 text-sm text-white/48">
                <span className="font-medium text-sky-300/90">3 active</span>
                <span className="mx-1.5 text-white/25">·</span>
                <span className="font-medium text-emerald-300/85">7 passed</span>
                <span className="mx-1.5 text-white/25">·</span>
                <span className="font-medium text-rose-300/85">2 blown</span>
              </p>
              <p className="mt-3 text-xs text-white/38">
                Seven passed challenges are funded on the desk.
              </p>
            </div>
            <div className="rounded-xl border border-white/[0.09] bg-black/30 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-white/42">
                  Funded
                </p>
                <span className={KICKER_BADGE}>Pipeline</span>
              </div>
              <div className="mb-3 mt-3 h-2 overflow-hidden rounded-full bg-slate-800/80 ring-1 ring-slate-600/25">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-sky-600/90 to-cyan-400/70"
                  style={{ width: `${Math.min(100, evalToFundedPct)}%` }}
                />
              </div>
              <p className="text-sm font-semibold text-white/88">Funded accounts</p>
              <p className={`mt-1 text-3xl font-bold tracking-tight text-white ${LANDING_NUM}`}>
                7
              </p>
              <div className="mt-3 rounded-lg border border-white/[0.08] bg-black/25 px-3 py-2.5">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/38">
                    Success rate
                  </span>
                  <span className={`text-lg font-bold text-emerald-300/95 ${LANDING_NUM}`}>
                    {evalToFundedPct.toFixed(1)}%
                  </span>
                </div>
                <p className="mt-1.5 text-[10px] leading-snug text-white/35">
                  7 funded from 12 evaluations (7&nbsp;/&nbsp;12).
                </p>
              </div>
            </div>
          </div>
        </div>

        <div>
          <p className={LANDING_SECTION_LABEL}>Capital under management</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-white/[0.09] bg-black/28 px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-white/42">
                Notional
              </p>
              <p className="mt-2 text-[11px] font-medium uppercase tracking-wide text-white/38">
                Total
              </p>
              <p className={`mt-1 text-xl font-bold tracking-tight text-white/90 ${LANDING_NUM}`}>
                $8,200,000
              </p>
              <p className="mt-2 text-[10px] leading-snug text-white/35">
                $7,000,000 funded + $1,200,000 in challenge.
              </p>
            </div>
            <div className="rounded-xl border border-white/[0.09] bg-black/28 px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-white/42">
                Funded &amp; live
              </p>
              <p className="mt-2 text-[11px] font-medium uppercase tracking-wide text-white/38">
                In play
              </p>
              <p className={`mt-1 text-xl font-bold tracking-tight text-emerald-200/95 ${LANDING_NUM}`}>
                $7,000,000
              </p>
            </div>
            <div className="rounded-xl border border-white/[0.09] bg-black/28 px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-white/42">
                Evaluations
              </p>
              <p className="mt-2 text-[11px] font-medium uppercase tracking-wide text-white/38">
                In play
              </p>
              <p className={`mt-1 text-xl font-bold tracking-tight text-sky-200/95 ${LANDING_NUM}`}>
                $1,200,000
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Roster table — full width block below the snapshot card. */
export function LandingAccountsRosterTable() {
  return (
    <div className={`${LANDING_PANEL} overflow-hidden`}>
      <WindowBar label="journal / accounts · roster" />
      <div className="p-4 sm:p-5">
        <p className={LANDING_SECTION_LABEL}>Roster</p>
        <p className="mt-1 text-[11px] text-white/38">
          Programs and sizes from compare data · same columns as /journal/accounts
        </p>
        <div className="mt-3 overflow-x-auto rounded-xl border border-white/[0.1]">
          <table className="w-full min-w-[36rem] border-separate border-spacing-0 text-left text-[11px]">
            <thead>
              <tr className="border-b border-white/[0.08] text-[10px] uppercase tracking-wide text-white/40">
                <th className="px-3 py-2.5 font-medium">Program</th>
                <th className="px-3 py-2.5 font-medium">Prop firm</th>
                <th className="px-3 py-2.5 font-medium text-center">Size</th>
                <th className="px-3 py-2.5 font-medium text-center">Type</th>
                <th className="px-3 py-2.5 font-medium text-center">Status</th>
                <th className="px-3 py-2.5 text-right font-medium">Payouts</th>
              </tr>
            </thead>
            <tbody>
              {LANDING_ACCOUNTS_ROSTER_ROWS.map((r) => (
                <tr
                  key={`${r.accountName}-${r.size}-${r.status}`}
                  className="border-b border-white/[0.05] bg-black/15 last:border-0 hover:bg-black/25"
                >
                  <td className="max-w-[14rem] truncate px-3 py-2 font-medium text-white/88">
                    {r.accountName}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <FirmLogoThumb src={r.logo} label={r.firm} />
                      <span className="text-white/55">{r.firm}</span>
                    </div>
                  </td>
                  <td className={`px-3 py-2 text-center ${LANDING_NUM} text-white/50`}>{r.size}</td>
                  <td className="px-3 py-2 text-center">
                    <span
                      className={`rounded-md border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${
                        r.kind === "funded"
                          ? "border-emerald-400/25 text-emerald-200/90"
                          : "border-white/10 text-white/45"
                      }`}
                    >
                      {r.kind === "funded" ? "Funded" : "Eval"}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span
                      className={`inline-flex rounded-md border px-2 py-0.5 text-[9px] font-semibold ${r.statusClass}`}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td
                    className={`px-3 py-2 text-right ${LANDING_NUM} ${
                      r.payouts ? "text-amber-200/90" : "text-white/30"
                    }`}
                  >
                    {r.payouts ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const DASH_KICKER =
  "rounded-lg border border-white/10 bg-slate-800/60 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-slate-400/90";

function formatUsdSigned0(cents: number): string {
  const sign = cents > 0 ? "+" : "";
  return sign + fmtUsd0(Math.abs(cents) / 100);
}

function formatUsdCompactSignedCents(cents: number): string {
  if (cents === 0) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
    signDisplay: "always",
  }).format(cents / 100);
}

/** Progress row payout panel — strings alignées sur `topstep-funded-runway.ts` + `journal-progress-view.tsx`. */
function LandingProgressPayoutCalloutCard() {
  return (
    <div className={`${LANDING_PANEL} overflow-hidden`}>
      <WindowBar label="journal / progress" />
      <div className="p-4 sm:p-5">
        <p className={LANDING_KICKER}>Progress</p>
        <p className="mt-2 text-sm font-semibold tracking-tight text-white/92">Funded runway</p>
        <p className="mt-3 text-[10px] font-medium uppercase tracking-wider text-white/42">
          Funded · Take Profit Trader · 150k
        </p>
        <p className={`mt-2 text-lg font-semibold tabular-nums text-white/92 ${LANDING_NUM}`}>
          Balance now $158,000
        </p>
        <div className="mt-4 space-y-2 rounded-xl border border-emerald-400/25 bg-emerald-500/[0.08] px-3 py-3">
          <p className="text-center text-[13px] font-semibold text-emerald-100">Good News</p>
          <p className="whitespace-pre-line text-center text-[11px] text-emerald-200/85">
            You can request a payout of $3,500.00.
            {"\n"}
            {TPT_FUNDED_PAYOUT_DASHBOARD_REMINDER}
          </p>
        </div>
      </div>
    </div>
  );
}

/** Payout ledger — même structure que `journal-dashboard.tsx` (section Analytics). */
function LandingPayoutLedgerCard() {
  const chartYear = 2026;
  /** Juillet = 0 ; somme des mois = total année affiché (cents). */
  const monthlyCents: number[] = [
    120_000, 180_000, 95_000, 220_000, 165_000, 140_000, 0, 200_000, 175_000, 210_000, 155_000,
    190_000,
  ];
  const yearNet = monthlyCents.reduce((a, b) => a + b, 0);
  const maxAbs = Math.max(...monthlyCents.map((c) => Math.abs(c)), 1);
  const monthShort = Array.from({ length: 12 }, (_, i) =>
    new Date(2000, i, 1).toLocaleString("en-US", { month: "short" })
  );
  const bestI = monthlyCents.indexOf(Math.max(...monthlyCents));

  return (
    <div className={`${LANDING_PANEL} overflow-hidden`}>
      <WindowBar label="journal / dashboard" />
      <div className="p-5">
        <div className="relative flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-white/45">
              Payout ledger
            </p>
            <p className="mt-1.5 text-base font-semibold tracking-tight text-white/92">
              Monthly payouts · {chartYear}
            </p>
          </div>
          <span className={`${DASH_KICKER} border-amber-400/25 text-amber-200/85`}>Activity</span>
        </div>
        <div className="relative mt-4 flex flex-wrap items-end justify-between gap-4 border-t border-white/10 pt-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              Year payouts
            </p>
            <p className={`mt-1 text-2xl font-bold tabular-nums tracking-tight text-amber-200/95 ${LANDING_NUM}`}>
              {formatUsdSigned0(yearNet)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-[11px]">
            <span className="rounded-lg border border-white/10 bg-black/25 px-2 py-1 font-medium text-amber-200/85">
              Peak {monthShort[bestI]!.slice(0, 3)}{" "}
              <span className="tabular-nums text-amber-100/90">
                {formatUsdSigned0(monthlyCents[bestI]!)}
              </span>
            </span>
          </div>
        </div>
        <div className="relative mt-5 flex min-h-[180px] items-end justify-between gap-1 px-0.5 pb-0.5">
          {monthlyCents.map((cents, i) => {
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
                  />
                </div>
                <span className="text-[9px] font-medium uppercase tracking-wide text-slate-500">
                  {monthShort[i]!.slice(0, 3)}
                </span>
                <span
                  className={`max-w-full text-center text-[9px] font-bold tabular-nums leading-tight sm:text-[11px] ${
                    cents === 0 ? "text-white/35" : "text-amber-200/90"
                  }`}
                >
                  {formatUsdCompactSignedCents(cents)}
                </span>
              </div>
            );
          })}
        </div>
        <div className="relative mt-4 flex items-center justify-center">
          <span className="min-w-[5.5rem] rounded-xl border border-white/10 bg-black/30 px-4 py-2 text-center text-sm font-bold tabular-nums tracking-tight text-white/90">
            {chartYear}
          </span>
        </div>
      </div>
    </div>
  );
}

/** Showcase: progress payout callout + dashboard payout ledger. */
export function VisualProofTrio() {
  return (
    <div className="grid gap-5 md:grid-cols-2 md:gap-6 md:items-stretch">
      <LandingProgressPayoutCalloutCard />
      <LandingPayoutLedgerCard />
    </div>
  );
}
