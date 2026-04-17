import Link from "next/link";
import { LANDING_KICKER, LANDING_MICRO, LANDING_NUM, LANDING_PANEL } from "../tokens";

const LANDING_SECTION_LABEL =
  "text-[10px] font-semibold uppercase tracking-[0.2em] text-sky-400/85";

/** Pill label for landing “capital under management” overview (HUD / glitch accent). */
function OverviewCapitalBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex max-w-full items-center rounded-full border border-white/[0.14] bg-[#0b0e14] px-2.5 py-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      <span className="truncate text-[9px] font-bold uppercase leading-none tracking-[0.16em] text-sky-300 [text-shadow:0.55px_0_0_rgba(249,115,22,0.55),-0.55px_0_0_rgba(56,189,248,0.52)] sm:text-[10px] sm:tracking-[0.18em]">
        {label}
      </span>
    </span>
  );
}

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
      program: "TopStep 50k",
      price: "$49/mo",
      maxDrawdownUsd: 2000,
    },
    {
      logo: "/firms/apex.png",
      name: "Apex Trader Funding",
      program: "Apex 50k EOD",
      price: "$34.90",
      maxDrawdownUsd: 2000,
    },
    {
      logo: "/firms/lucid.png",
      name: "Lucid Trading",
      program: "LucidFlex 50k",
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
            ? "grid-cols-[minmax(min-content,1.35fr)_minmax(0,0.55fr)_minmax(0,0.85fr)]"
            : "grid-cols-[minmax(min-content,1.4fr)_minmax(0,0.5fr)_minmax(0,0.9fr)]"
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
            className={`grid items-center gap-2 rounded-xl border border-white/[0.09] bg-black/28 ${padCell} ${
              hero
                ? "grid-cols-[minmax(min-content,1.35fr)_minmax(0,0.55fr)_minmax(0,0.85fr)]"
                : "grid-cols-[minmax(min-content,1.4fr)_minmax(0,0.5fr)_minmax(0,0.9fr)]"
            }`}
          >
            <div className="flex min-w-0 items-center gap-2.5">
              <FirmLogoThumb src={r.logo} label={r.name} />
              <span
                className={`whitespace-nowrap rounded-md border border-white/[0.08] bg-white/[0.05] px-2 py-1 font-medium text-white/90 ${programText}`}
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

/** Hero: TradeDesk + comparator — stylized path labels match the product routes. */
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
        className={`${LANDING_PANEL} overflow-hidden ${
          hero ? "shadow-[0_22px_56px_rgba(0,0,0,0.42),inset_0_1px_0_rgba(255,255,255,0.07)]" : ""
        }`}
      >
        <WindowBar label="tradedesk/progress" hero={hero} />
        <div className={pad}>
          <p className={LANDING_KICKER}>Progress</p>
          <p className={`mt-2 font-semibold tracking-tight text-white/92 ${titleSm}`}>
            Mission control
          </p>
          <div className={`mt-5 rounded-xl border border-white/[0.1] bg-black/35 ${hero ? "p-5" : "p-4"}`}>
            <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:items-start sm:justify-between sm:gap-3 sm:text-left">
              <div className="min-w-0">
                <p className="text-[10px] font-medium uppercase tracking-wider text-white/42">
                  Funded · TopStep · 50k
                </p>
                <p className={`mt-2 font-semibold text-white/95 ${LANDING_NUM} ${balLg}`}>
                  {fmtUsd0(51_180)}
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
            <div className="mt-4 flex flex-nowrap items-center justify-between gap-2 border-t border-white/[0.07] pt-3">
              <span className="shrink-0 whitespace-nowrap text-[10px] text-white/42">Payout window</span>
              <span className="shrink-0 whitespace-nowrap rounded-md border border-emerald-500/25 bg-emerald-500/12 px-2 py-0.5 text-[10px] font-medium text-emerald-200/90">
                Open
              </span>
            </div>
          </div>
        </div>
      </div>

      <div
        className={`${LANDING_PANEL} overflow-hidden ${
          hero ? "shadow-[0_22px_56px_rgba(0,0,0,0.42),inset_0_1px_0_rgba(255,255,255,0.07)]" : ""
        }`}
      >
        <WindowBar label="compare" hero={hero} />
        <div className={pad}>
          <p className={LANDING_KICKER}>Comparator</p>
          <p className={`mt-2 font-semibold tracking-tight text-white/92 ${titleSm}`}>
            Rules at a glance
          </p>
          <div className={`min-w-0 ${hero ? "mt-5" : "mt-4"} overflow-x-auto`}>
            <LandingCompareProgramRows density={hero ? "hero" : "pillar"} />
          </div>
          <div className="mt-5 flex justify-center">
            <Link
              href="/compare"
              className={`${LANDING_MICRO} inline-flex items-center justify-center gap-2 rounded-xl border border-white/[0.12] bg-gradient-to-b from-white/[0.09] to-white/[0.02] px-5 py-2.5 text-[11px] font-semibold tracking-wide text-white/95 shadow-[inset_0_1px_0_rgba(255,255,255,0.11),0_8px_24px_rgba(0,0,0,0.38)] hover:-translate-y-0.5 hover:border-sky-400/30 hover:from-white/[0.12] hover:to-white/[0.04] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_12px_32px_rgba(0,0,0,0.45)] active:translate-y-px sm:px-6 sm:text-xs`}
            >
              Explore prop firm rules
              <svg
                className="h-3 w-3 shrink-0 text-sky-300/90"
                viewBox="0 0 20 20"
                fill="none"
                aria-hidden
              >
                <path
                  d="M7 5l6 5-6 5"
                  stroke="currentColor"
                  strokeWidth="1.65"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Pillar A — control surface (abbreviated HUD). */
export function PillarControlPreview() {
  return (
    <div className={`${LANDING_PANEL} overflow-hidden`}>
      <WindowBar label="tradedesk/dashboard" />
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
          <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-white/42">
            By firm - net roll-up
          </p>
          <div className="mt-2 flex items-end justify-between gap-2">
            {[
              ["Topstep", 72],
              ["Apex", 48],
              ["SFT", 35],
            ].map(([name, w]) => (
              <div key={name} className="min-w-0 flex-1">
                <div
                  className="mx-auto w-full max-w-[2.25rem] rounded-sm bg-sky-500/45"
                  style={{ height: `${Math.max(16, Number(w))}px` }}
                />
                <p className="mt-1.5 whitespace-nowrap text-center text-[9px] text-white/50">
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
      <WindowBar label="tradedesk/accounts" />
      <div className="space-y-5 p-4 sm:p-5">
        <div>
          <p className={LANDING_SECTION_LABEL}>Evaluation &amp; funded</p>
          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            <div className="rounded-xl border border-white/[0.09] bg-black/30 p-4">
              <p className="text-sm font-semibold text-white/90">Evaluations</p>
              <p className={`mt-2 text-3xl font-bold tracking-tight text-white ${LANDING_NUM}`}>
                12
              </p>
              <p className="mt-3 flex flex-nowrap items-center gap-x-1.5 overflow-x-auto whitespace-nowrap text-sm text-white/48">
                <span className="font-medium text-sky-300/90">10 active</span>
                <span className="shrink-0 text-white/25">·</span>
                <span className="font-medium text-rose-300/85">2 blown</span>
              </p>
            </div>
            <div className="rounded-xl border border-white/[0.09] bg-black/30 p-4">
              <p className="text-sm font-semibold leading-snug text-white/90">Funded accounts</p>
              <p className={`mt-2 text-3xl font-bold tracking-tight text-white ${LANDING_NUM}`}>
                7
              </p>
              <div className="mt-3">
                <div className="flex items-center justify-between gap-2 text-[10px] font-medium text-white/40">
                  <span className="uppercase tracking-wider">Progress</span>
                  <span className={`${LANDING_NUM} text-white/55`}>
                    {evalToFundedPct.toFixed(1)}%
                  </span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-800/80 ring-1 ring-slate-600/25">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-sky-600/90 to-cyan-400/70"
                    style={{ width: `${Math.min(100, evalToFundedPct)}%` }}
                  />
                </div>
              </div>
              <div className="mt-4 rounded-lg border border-white/[0.08] bg-black/25 px-3 py-2.5">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/38">
                    Success rate
                  </span>
                  <span className={`text-lg font-bold text-emerald-300/95 ${LANDING_NUM}`}>
                    {evalToFundedPct.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div>
          <p className={LANDING_SECTION_LABEL}>Capital under management</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-white/[0.09] bg-black/28 px-4 py-3">
              <OverviewCapitalBadge label="Total" />
              <p className={`mt-3 text-xl font-bold tracking-tight text-white/90 ${LANDING_NUM}`}>
                $2,550,000
              </p>
            </div>
            <div className="rounded-xl border border-white/[0.09] bg-black/28 px-4 py-3">
              <OverviewCapitalBadge label="Funded & live" />
              <p className={`mt-3 text-xl font-bold tracking-tight text-emerald-200/95 ${LANDING_NUM}`}>
                $1,050,000
              </p>
            </div>
            <div className="rounded-xl border border-white/[0.09] bg-black/28 px-4 py-3">
              <OverviewCapitalBadge label="Evaluations" />
              <p className={`mt-3 text-xl font-bold tracking-tight text-sky-200/95 ${LANDING_NUM}`}>
                $1,500,000
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Accounts ledger table — landing mock (same columns as workspace Accounts). */
export function LandingAccountsRosterTable() {
  return (
    <div className={`${LANDING_PANEL} overflow-hidden`}>
      <WindowBar label="tradedesk/accounts · Ledger" />
      <div className="p-4 sm:p-5">
        <p className={LANDING_SECTION_LABEL}>Ledger</p>
        <p className="mt-1 text-[11px] text-white/38">
          Programs and sizes from compare data · same columns as workspace Accounts
        </p>
        <div className="mt-3 overflow-x-hidden rounded-xl border border-white/[0.1] sm:overflow-x-auto sm:[-webkit-overflow-scrolling:touch]">
          <table className="w-full max-w-full table-fixed border-separate border-spacing-0 text-left text-[8px] sm:text-[11px]">
            <thead>
              <tr className="border-b border-white/[0.08] text-[8px] uppercase tracking-wide text-white/40 sm:text-[10px]">
                <th className="w-[27%] px-1 py-1.5 font-medium sm:w-[24%] sm:px-2.5 sm:py-2.5">
                  Program
                </th>
                <th className="w-[12%] px-0.5 py-1.5 text-center font-medium sm:w-[26%] sm:px-2.5 sm:py-2.5 sm:text-left">
                  <span className="sm:hidden">Firm</span>
                  <span className="hidden sm:inline">Prop firm</span>
                </th>
                <th className="w-[10%] px-0.5 py-1.5 text-center font-medium sm:w-[9%] sm:px-2 sm:py-2.5">
                  Size
                </th>
                <th className="hidden w-[13%] px-1.5 py-2 text-center font-medium sm:table-cell sm:px-2 sm:py-2.5">
                  Type
                </th>
                <th className="w-[26%] px-0.5 py-1.5 text-center font-medium sm:w-[14%] sm:px-2 sm:py-2.5">
                  Status
                </th>
                <th className="w-[25%] px-1 py-1.5 text-right font-medium tabular-nums sm:w-[14%] sm:px-2.5 sm:py-2.5">
                  Payouts
                </th>
              </tr>
            </thead>
            <tbody>
              {LANDING_ACCOUNTS_ROSTER_ROWS.map((r) => (
                <tr
                  key={`${r.accountName}-${r.size}-${r.status}`}
                  className="border-b border-white/[0.05] bg-black/15 last:border-0"
                >
                  <td className="max-w-0 truncate px-1 py-1 font-medium text-white/88 sm:px-2.5 sm:py-2">
                    {r.accountName}
                  </td>
                  <td className="max-w-0 px-0.5 py-1 sm:px-2.5 sm:py-2">
                    <div className="flex min-w-0 items-center justify-center gap-1 max-sm:origin-center max-sm:scale-[0.88] sm:justify-start sm:scale-100 sm:gap-2">
                      <FirmLogoThumb src={r.logo} label={r.firm} />
                      <span className="hidden min-w-0 truncate text-white/55 sm:inline">{r.firm}</span>
                    </div>
                  </td>
                  <td className={`px-0.5 py-1 text-center sm:px-2 sm:py-2 ${LANDING_NUM} text-white/50`}>
                    {r.size}
                  </td>
                  <td className="hidden px-1.5 py-1.5 text-center sm:table-cell sm:px-2 sm:py-2">
                    <span
                      className={`inline-block max-w-full truncate rounded-md border px-1 py-0.5 text-[8px] font-semibold uppercase tracking-wide sm:px-1.5 sm:text-[9px] ${
                        r.kind === "funded"
                          ? "border-emerald-400/25 text-emerald-200/90"
                          : "border-white/10 text-white/45"
                      }`}
                    >
                      {r.kind === "funded" ? "Funded" : "Eval"}
                    </span>
                  </td>
                  <td className="px-0.5 py-1 text-center sm:px-2 sm:py-2">
                    <span
                      className={`inline-block max-w-full truncate rounded-md border px-0.5 py-0.5 text-[7px] font-semibold sm:px-1.5 sm:text-[9px] ${r.statusClass}`}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td
                    className={`whitespace-nowrap px-1 py-1 text-right text-[8px] sm:truncate sm:px-2.5 sm:py-2 sm:text-[11px] ${LANDING_NUM} ${
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

/** Progress row — mock Take Profit Trader funded 150K (aligné visuellement sur la carte workspace). */
function LandingProgressPayoutCalloutCard() {
  const ringR = 42;
  const ringC = 2 * Math.PI * ringR;
  const ringPct = 178;
  const fmtUsd2 = (n: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n);

  return (
    <div className={`${LANDING_PANEL} overflow-hidden`}>
      <WindowBar label="tradedesk/progress" />
      <div className="p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <FirmLogoThumb src="/firms/take-profit-trader.svg" label="Take Profit Trader" />
              <h3 className="text-base font-semibold tracking-tight text-white/95">Take Profit Trader</h3>
              <span className="rounded-md border border-emerald-400/45 bg-emerald-500/12 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-emerald-200/95">
                FUNDED
              </span>
            </div>
            <p className="mt-2 text-[11px] text-white/42">
              Take Profit Trader · 150K · Take Profit Trader
            </p>
          </div>
          <div
            className="relative mx-auto h-[5.25rem] w-[5.25rem] shrink-0"
            aria-label={`Progress ${ringPct} percent`}
          >
            <svg className="-rotate-90" viewBox="0 0 100 100" aria-hidden>
              <circle
                cx="50"
                cy="50"
                r={ringR}
                fill="none"
                className="stroke-white/[0.08]"
                strokeWidth="7"
              />
              <circle
                cx="50"
                cy="50"
                r={ringR}
                fill="none"
                className="stroke-amber-300/95"
                strokeWidth="7"
                strokeLinecap="round"
                strokeDasharray={ringC}
                strokeDashoffset={0}
                style={{
                  filter: "drop-shadow(0 0 10px rgba(251, 191, 36, 0.42))",
                }}
              />
            </svg>
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <span className={`text-lg font-bold tabular-nums text-white ${LANDING_NUM}`}>{ringPct}%</span>
            </div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2 text-center sm:gap-3">
          <div className="rounded-lg px-2 py-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/38">Start</p>
            <p className={`mt-1 text-sm font-semibold tabular-nums text-white/90 sm:text-[15px] ${LANDING_NUM}`}>
              {fmtUsd0(150_000)}
            </p>
          </div>
          <div className="rounded-lg border border-emerald-400/35 bg-emerald-500/[0.06] px-2 py-2.5 shadow-[0_0_20px_rgba(16,185,129,0.12)]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-300/90">Now</p>
            <p className={`mt-1 text-sm font-semibold tabular-nums text-emerald-300 sm:text-[15px] ${LANDING_NUM}`}>
              <span className="sm:hidden">$158k</span>
              <span className="hidden sm:inline">{fmtUsd2(158_000)}</span>
            </p>
          </div>
          <div className="rounded-lg px-2 py-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/38">Buffer</p>
            <p className={`mt-1 text-sm font-semibold tabular-nums text-white/90 sm:text-[15px] ${LANDING_NUM}`}>
              {fmtUsd0(154_500)}
            </p>
          </div>
        </div>

        <div className="mt-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2 text-[11px]">
            <span className="font-semibold text-white/55">Progress</span>
            <span className="text-right text-cyan-200/85">
              Surplus - Target {fmtUsd0(154_500)} reached
            </span>
          </div>
          <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-800/90 ring-1 ring-slate-600/30">
            <div className="h-full w-full rounded-full bg-gradient-to-r from-cyan-500/95 to-sky-400/85" />
          </div>
          <div
            className={`mt-1.5 flex justify-between px-0.5 text-[9px] font-medium tabular-nums text-white/30 ${LANDING_NUM}`}
          >
            <span>0</span>
            <span>25</span>
            <span>50</span>
            <span>75</span>
            <span>100</span>
          </div>
        </div>

        <div className="mt-5 space-y-3 rounded-xl border border-emerald-400/30 bg-emerald-500/[0.07] px-3 py-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
          <p className="text-center text-[13px] font-semibold text-emerald-100">Good News</p>
          <p className="text-center text-[11px] leading-snug text-emerald-200/88">
            You can request a payout of $3,500.
          </p>
          <div className="flex justify-center">
            <span className="inline-flex rounded-lg border border-emerald-400/50 bg-emerald-500/10 px-4 py-2 text-[11px] font-semibold text-emerald-200/95">
              Add Payout
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Payout ledger — même structure que le dashboard workspace (`journal-dashboard.tsx`, section Analytics). */
function LandingPayoutLedgerCard() {
  const chartYear = 2026;
  /**
   * Maquette : un seul mois ≥ 30k USD, le reste en montants « bruités » (sans grille régulière) ;
   * somme = 11M centimes (~$110k an).
   */
  const monthlyCents: number[] = [
    750_234, 889_120, 412_056, 623_891, 234_567, 998_877, 445_566, 156_703, 871_290, 3_127_894,
    1_203_450, 1_286_352,
  ];
  const yearNet = monthlyCents.reduce((a, b) => a + b, 0);
  const maxAbs = Math.max(...monthlyCents.map((c) => Math.abs(c)), 1);
  const monthShort = Array.from({ length: 12 }, (_, i) =>
    new Date(2000, i, 1).toLocaleString("en-US", { month: "short" })
  );
  const bestI = monthlyCents.indexOf(Math.max(...monthlyCents));

  return (
    <div className={`${LANDING_PANEL} overflow-hidden`}>
      <WindowBar label="tradedesk/dashboard" />
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
        <div className="relative mt-5 flex min-h-[160px] min-w-0 items-end justify-between gap-0.5 overflow-x-auto px-0.5 pb-0.5 [-webkit-overflow-scrolling:touch] sm:min-h-[180px] sm:gap-1">
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
                  } max-sm:hidden`}
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
    <div className="grid gap-4 md:grid-cols-2 md:gap-6 md:items-stretch">
      <LandingProgressPayoutCalloutCard />
      <LandingPayoutLedgerCard />
    </div>
  );
}
