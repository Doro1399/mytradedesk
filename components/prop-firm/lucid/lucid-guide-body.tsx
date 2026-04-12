"use client";

import Image from "next/image";
import {
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  countryFlagAssetSrc,
  countryFlagEmoji,
} from "@/lib/country-flag";
import {
  lucidDirectEvalSpecPricesUsd,
  lucidEvalFeeTierRanges,
  lucidFlexEvalSpecPricesUsd,
  lucidProEvalSpecPricesUsd,
} from "@/lib/lucid-guide-pricing";
import type { LucidEvalChildId, LucidFundedChildId } from "@/lib/lucid-guide-nav";

const SCROLL_MT = "scroll-mt-[5.75rem]";

/** Same motion as `app/compare` table rows (`globals.css` → `compare-table-carpet`). */
const LUCID_SEGMENT_CARPET_STYLE: CSSProperties = {
  animation:
    "compare-table-carpet 0.4s cubic-bezier(0.22, 1, 0.36, 1) 0ms both",
};

const LUCID_OFFICIAL_SITE = "https://lucidtrading.com/";

const INLINE_LINK_CLASS =
  "font-medium text-sky-400/90 underline decoration-sky-500/30 underline-offset-[3px] transition hover:text-sky-300 hover:decoration-sky-400/50";

/** Brand name → official site (opens new tab). */
function LucidSiteLink({ children }: { children: ReactNode }) {
  return (
    <a
      href={LUCID_OFFICIAL_SITE}
      target="_blank"
      rel="noopener noreferrer"
      className={INLINE_LINK_CLASS}
    >
      {children}
    </a>
  );
}

/** In-page anchor (same tab). */
function AnchorToSection({
  id,
  children,
}: {
  id: string;
  children: ReactNode;
}) {
  return (
    <a href={`#${id}`} className={INLINE_LINK_CLASS}>
      {children}
    </a>
  );
}

function SectionShell({
  id,
  children,
  className = "",
}: {
  id: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={`${SCROLL_MT} ${className}`}>
      {children}
    </section>
  );
}

/** Horizontal rule between subsections — spacing above/below the line (after content, before next title). */
function LucidSectionDivider() {
  return (
    <div
      className="my-8 h-px w-full shrink-0 bg-gradient-to-r from-transparent via-white/[0.14] to-transparent"
      role="separator"
      aria-hidden
    />
  );
}

type LucidStyleSummaryTone = "ok" | "monitored" | "forbidden";

function LucidTradingStyleStatusIcon({ tone }: { tone: LucidStyleSummaryTone }) {
  if (tone === "ok") {
    return (
      <span
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400"
        aria-hidden
      >
        <svg className="h-3.5 w-3.5" viewBox="0 0 12 12" fill="none" aria-hidden>
          <path
            d="M2 6l3 3 5-6"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    );
  }
  if (tone === "monitored") {
    return (
      <span
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-amber-400"
        aria-hidden
      >
        <svg className="h-3.5 w-3.5" viewBox="0 0 12 12" fill="none" aria-hidden>
          <path
            d="M6 1.5L10.5 10h-9L6 1.5z"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
          <path d="M6 4.5v3M6 8.25h.01" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      </span>
    );
  }
  return (
    <span
      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-rose-500/20 text-rose-400"
      aria-hidden
    >
      <svg className="h-3.5 w-3.5" viewBox="0 0 12 12" fill="none" aria-hidden>
        <path
          d="M3 3l6 6M9 3L3 9"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}

/** At-a-glance grid (evaluation + style rules) — labels in English. */
function LucidTradingStylesSummaryGrid() {
  const rows: {
    label: string;
    status: string;
    tone: LucidStyleSummaryTone;
  }[] = [
    { label: "Standard scalping", status: "OK", tone: "ok" },
    { label: "Micro-scalping (<5s)", status: "Monitored", tone: "monitored" },
    { label: "Bots / algo", status: "OK", tone: "ok" },
    { label: "DCA", status: "OK", tone: "ok" },
    { label: "News trading", status: "OK", tone: "ok" },
    { label: "Bonds (ZB, ZN, UB, ZF)", status: "Forbidden", tone: "forbidden" },
  ];

  return (
    <div
      className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3"
      role="list"
      aria-label="Trading style rules summary"
    >
      {rows.map((row) => (
        <div
          key={row.label}
          role="listitem"
          className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.07] bg-gradient-to-b from-white/[0.06] to-white/[0.02] px-3 py-2.5 ring-1 ring-inset ring-white/[0.05]"
        >
          <div className="flex min-w-0 items-center gap-2.5">
            <LucidTradingStyleStatusIcon tone={row.tone} />
            <span className="truncate text-[13px] font-light text-white/75">
              {row.label}
            </span>
          </div>
          <span
            className={`shrink-0 text-[10px] font-semibold uppercase tracking-[0.12em] ${
              row.tone === "ok"
                ? "text-emerald-400/95"
                : row.tone === "monitored"
                  ? "text-amber-400/95"
                  : "text-rose-400/95"
            }`}
          >
            {row.status}
          </span>
        </div>
      ))}
    </div>
  );
}

/** Left accent bar — sky for feeds, emerald for bundled licenses (matches Lucid “platforms” layout). */
function LucidPlatformSubheading({
  accent,
  children,
}: {
  accent: "sky" | "emerald";
  children: React.ReactNode;
}) {
  const bar =
    accent === "sky"
      ? "border-sky-500/60"
      : "border-emerald-500/60";
  return (
    <div className={`mb-4 border-l-2 ${bar} pl-3`}>
      <h3 className="text-xl font-semibold tracking-tight text-white">{children}</h3>
    </div>
  );
}

function LucidDataFeedCard({
  name,
  logoSrc,
  logoW,
  logoH,
}: {
  name: string;
  logoSrc: string;
  logoW: number;
  logoH: number;
}) {
  return (
    <div className="flex flex-col justify-between gap-3 rounded-xl border border-white/[0.08] bg-gradient-to-b from-white/[0.07] to-white/[0.03] p-4 ring-1 ring-inset ring-white/[0.05]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-3">
          <Image
            src={logoSrc}
            alt=""
            width={logoW}
            height={logoH}
            className="h-8 w-auto max-w-[7rem] shrink-0 object-contain object-left opacity-95"
          />
          <span className="text-sm font-semibold tracking-tight text-white">
            {name}
          </span>
        </div>
        <span className="shrink-0 rounded-md border border-sky-500/35 bg-sky-500/10 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-sky-300/95">
          Data feed
        </span>
      </div>
    </div>
  );
}

function LucidFreePlatformCard({
  name,
  logoSrc,
  logoW,
  logoH,
}: {
  name: string;
  logoSrc: string;
  logoW: number;
  logoH: number;
}) {
  return (
    <div className="flex flex-col justify-between gap-3 rounded-xl border border-white/[0.08] bg-gradient-to-b from-white/[0.07] to-white/[0.03] p-4 ring-1 ring-inset ring-white/[0.05]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-3">
          <Image
            src={logoSrc}
            alt=""
            width={logoW}
            height={logoH}
            className="h-8 w-auto max-w-[7rem] shrink-0 object-contain object-left opacity-95"
          />
          <span className="text-sm font-semibold tracking-tight text-white">
            {name}
          </span>
        </div>
        <span className="shrink-0 rounded-md border border-emerald-500/35 bg-emerald-500/10 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-emerald-300/95">
          Free license
        </span>
      </div>
    </div>
  );
}

/** Round-trip (open + close) per contract — zinc frame consistent with guide body. */
function LucidCommissionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col rounded-xl border border-white/[0.07] bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-3.5 ring-1 ring-inset ring-white/[0.05]">
      <div className="border-b border-white/[0.1] pb-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/45">
          {title}
        </p>
      </div>
      <div className="mt-2.5 text-[13px] font-light leading-relaxed text-white/55">
        {children}
      </div>
    </div>
  );
}

const LUCID_COMMISSION_GRID: {
  key: string;
  title: string;
  body: ReactNode;
}[] = [
  {
    key: "indices",
    title: "Indices",
    body: (
      <>
        <p className="text-lg font-semibold tabular-nums text-white">$3.50</p>
        <p className="mt-1.5 text-[12px] text-white/45">
          ES, NQ, RTY, YM, NKD
        </p>
      </>
    ),
  },
  {
    key: "micro-indices",
    title: "Micro indices",
    body: (
      <>
        <p className="text-lg font-semibold tabular-nums text-white">$1.00</p>
        <p className="mt-1.5 text-[12px] text-white/45">MES, MNQ, M2K, MYM</p>
      </>
    ),
  },
  {
    key: "energy",
    title: "Energy",
    body: (
      <>
        <p className="text-lg font-semibold tabular-nums text-white">$4.00</p>
        <p className="mt-1.5 text-[12px] text-white/45">CL, NG, QM</p>
      </>
    ),
  },
  {
    key: "micro-energy",
    title: "Micro energy",
    body: (
      <div className="space-y-2">
        <p>
          <span className="text-white/45">MCL</span>{" "}
          <span className="font-semibold tabular-nums text-white">$1.00</span>
        </p>
        <p>
          <span className="text-white/45">QG</span>{" "}
          <span className="font-semibold tabular-nums text-white">$2.60</span>
        </p>
      </div>
    ),
  },
  {
    key: "metals",
    title: "Metals",
    body: (
      <>
        <p className="text-lg font-semibold tabular-nums text-white">$4.60</p>
        <p className="mt-1.5 text-[12px] text-white/45">GC, SI, HG, PL</p>
      </>
    ),
  },
  {
    key: "micro-metals",
    title: "Micro metals",
    body: (
      <div className="space-y-2">
        <p>
          <span className="text-white/45">MGC</span>{" "}
          <span className="font-semibold tabular-nums text-white">$1.60</span>
        </p>
        <p>
          <span className="text-white/45">SIL</span>{" "}
          <span className="font-semibold tabular-nums text-white">$3.20</span>
        </p>
      </div>
    ),
  },
  {
    key: "currencies",
    title: "Currencies",
    body: (
      <>
        <p className="text-lg font-semibold tabular-nums text-white">$4.80</p>
        <p className="mt-1.5 text-[12px] text-white/45">
          6A, 6B, 6C, 6E, 6J, 6N, 6S
        </p>
      </>
    ),
  },
  {
    key: "ag",
    title: "Agriculture & livestock",
    body: (
      <>
        <p className="text-lg font-semibold tabular-nums text-white">$5.60</p>
        <p className="mt-1.5 text-[12px] text-white/45">
          ZS, ZC, ZW, ZL, ZM, HE, LE
        </p>
      </>
    ),
  },
];

function SectionTitle({
  eyebrow,
  title,
}: {
  eyebrow?: string;
  title: ReactNode;
}) {
  return (
    <header className="mb-4">
      {eyebrow ? (
        <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.16em] text-white/45">
          {eyebrow}
        </p>
      ) : null}
      <h2 className="text-2xl font-semibold tracking-tight text-white">
        {title}
      </h2>
    </header>
  );
}

/** Same voice as block titles (`SectionTitle` h2), one step smaller. */
function SubsectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-3 text-xl font-semibold tracking-tight text-white first:mt-0">
      {children}
    </h3>
  );
}

/** Wraps a major block: sober frame, light accent stripe. */
function Encadré({
  accent = "emerald",
  children,
  className = "",
}: {
  accent?: "emerald" | "sky" | "amber" | "violet";
  children: React.ReactNode;
  className?: string;
}) {
  const stripe = {
    emerald: "from-emerald-500/50 to-emerald-600/20",
    sky: "from-sky-500/45 to-sky-600/15",
    amber: "from-amber-500/40 to-amber-600/15",
    violet: "from-violet-500/45 to-violet-600/15",
  }[accent];
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-white/[0.09] bg-gradient-to-b from-white/[0.05] to-white/[0.015] shadow-[0_2px_24px_rgba(0,0,0,0.35)] ring-1 ring-inset ring-white/[0.06] ${className}`}
    >
      <div
        className={`pointer-events-none absolute left-0 top-0 h-full w-1 bg-gradient-to-b ${stripe}`}
        aria-hidden
      />
      <div className="px-4 py-3.5 sm:px-5 sm:py-4">{children}</div>
    </div>
  );
}

function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border border-white/[0.09] bg-gradient-to-b from-white/[0.055] to-white/[0.02] p-4 shadow-[0_1px_8px_rgba(0,0,0,0.28)] ring-1 ring-inset ring-white/[0.07] ${className}`}
    >
      {children}
    </div>
  );
}

function P({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p
      className={`max-w-none text-[15px] font-light leading-relaxed text-white/75 ${className}`}
    >
      {children}
    </p>
  );
}

function Note({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <p className="mt-4 max-w-none border-l-2 border-white/20 pl-4 text-[15px] font-light leading-relaxed text-white/75">
      {children}
    </p>
  );
}

function Ul({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="mt-4 max-w-none list-disc space-y-2 pl-5 text-[15px] font-light leading-relaxed text-white/75">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

function DataTable({
  columns,
  rows,
}: {
  columns: string[];
  rows: (string | React.ReactNode)[][];
}) {
  return (
    <div className="mt-3 overflow-x-auto rounded-xl border border-white/[0.08] bg-gradient-to-b from-white/[0.06] to-white/[0.02]">
      <table className="w-full min-w-[520px] border-collapse text-left text-[13px]">
        <thead>
          <tr className="border-b border-white/[0.08] bg-gradient-to-b from-white/[0.07] to-white/[0.03]">
            {columns.map((c) => (
              <th
                key={c}
                className="px-4 py-3 font-light text-white/55 first:rounded-tl-xl last:rounded-tr-xl"
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr
              key={ri}
              className="border-b border-white/[0.05] last:border-0 hover:bg-white/[0.02]"
            >
              {row.map((cell, ci) => (
                <td key={ci} className="px-4 py-3 align-top font-light text-white/75">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Pro evaluation specs — palette aligned with Pro tier card (sky cap + zinc frame). Prices = compare `discountedPrice`. */
const LUCID_PRO_EVAL_SPEC_ROWS: {
  size: string;
  consistency: string;
  contracts: string;
  eod: string;
  target: string;
  dll: string;
  activation: string;
  price: number;
}[] = (() => {
  const usd = lucidProEvalSpecPricesUsd();
  const template = [
    {
      size: "25k",
      consistency: "100% · 1 day min",
      contracts: "2 minis / 20 micros",
      eod: "$1,000",
      target: "$1,250",
      dll: "—",
      activation: "$0",
    },
    {
      size: "50k",
      consistency: "100% · 1 day min",
      contracts: "4 minis / 40 micros",
      eod: "$2,000",
      target: "$3,000",
      dll: "$1,200",
      activation: "$0",
    },
    {
      size: "100k",
      consistency: "100% · 1 day min",
      contracts: "6 minis / 60 micros",
      eod: "$3,000",
      target: "$6,000",
      dll: "$1,800",
      activation: "$0",
    },
    {
      size: "150k",
      consistency: "100% · 1 day min",
      contracts: "10 minis / 100 micros",
      eod: "$4,500",
      target: "$9,000",
      dll: "$2,700",
      activation: "$0",
    },
  ] as const;
  return template.map((row, i) => ({ ...row, price: usd[i] ?? 0 }));
})();

function LucidProEvalSpecsTable() {
  const cols = [
    "Size",
    "Consistency",
    "Sizing",
    "EOD drawdown",
    "Target",
    "DLL",
    "Activation",
    "Price",
  ] as const;

  return (
    <div
      className="mt-3 overflow-hidden rounded-2xl border border-white/[0.07] bg-gradient-to-b from-white/[0.06] to-white/[0.02] ring-1 ring-inset ring-white/[0.05]"
      role="region"
      aria-label="Pro evaluation account specifications"
    >
      <div
        className="h-1 w-full bg-gradient-to-r from-sky-400/90 via-sky-500/75 to-sky-700/65"
        aria-hidden
      />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[880px] table-fixed border-collapse text-center text-[12px]">
          <colgroup>
            {cols.map((c) => (
              <col key={c} className="w-[12.5%]" />
            ))}
          </colgroup>
          <thead>
            <tr className="border-b border-white/[0.08] bg-gradient-to-b from-white/[0.055] to-white/[0.02]">
              {cols.map((c) => (
                <th
                  key={c}
                  className="px-3 py-2.5 text-[10px] font-medium uppercase tracking-[0.12em] text-sky-400/85 sm:py-3"
                >
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {LUCID_PRO_EVAL_SPEC_ROWS.map((row) => (
              <tr
                key={row.size}
                className="border-b border-white/[0.05] last:border-0 hover:bg-white/[0.02]"
              >
                <td className="px-3 py-3 font-semibold tabular-nums text-white">
                  {row.size}
                </td>
                <td className="px-3 py-3 font-light text-white/55">
                  {row.consistency}
                </td>
                <td className="px-3 py-3 font-light text-white/55">
                  {row.contracts}
                </td>
                <td className="px-3 py-3 font-semibold tabular-nums text-white">
                  {row.eod}
                </td>
                <td className="px-3 py-3 font-semibold tabular-nums text-white">
                  {row.target}
                </td>
                <td className="px-3 py-3 font-light tabular-nums text-white/55">
                  {row.dll}
                </td>
                <td className="px-3 py-3 font-light tabular-nums text-white/55">
                  {row.activation}
                </td>
                <td className="px-3 py-3 font-bold tabular-nums text-emerald-400">
                  ${row.price.toLocaleString("en-US")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Flex evaluation specs — palette aligned with Flex tier card (emerald cap). Prices = compare `discountedPrice`. */
const LUCID_FLEX_EVAL_SPEC_ROWS: {
  size: string;
  consistency: string;
  sizing: string;
  eod: string;
  target: string;
  activation: string;
  price: number;
}[] = (() => {
  const usd = lucidFlexEvalSpecPricesUsd();
  const template = [
    {
      size: "25k",
      consistency: "50% · 2 days min",
      sizing: "2 minis / 20 micros",
      eod: "$1,000",
      target: "$1,250",
      activation: "$0",
    },
    {
      size: "50k",
      consistency: "50% · 2 days min",
      sizing: "4 minis / 40 micros",
      eod: "$2,000",
      target: "$3,000",
      activation: "$0",
    },
    {
      size: "100k",
      consistency: "50% · 2 days min",
      sizing: "6 minis / 60 micros",
      eod: "$3,000",
      target: "$6,000",
      activation: "$0",
    },
    {
      size: "150k",
      consistency: "50% · 2 days min",
      sizing: "10 minis / 100 micros",
      eod: "$4,500",
      target: "$9,000",
      activation: "$0",
    },
  ] as const;
  return template.map((row, i) => ({ ...row, price: usd[i] ?? 0 }));
})();

function LucidFlexEvalSpecsTable() {
  const cols = [
    "Size",
    "Consistency",
    "Sizing",
    "EOD drawdown",
    "Target",
    "Activation",
    "Price",
  ] as const;

  return (
    <div
      className="mt-3 overflow-hidden rounded-2xl border border-white/[0.07] bg-gradient-to-b from-white/[0.06] to-white/[0.02] ring-1 ring-inset ring-white/[0.05]"
      role="region"
      aria-label="Flex evaluation account specifications"
    >
      <div
        className="h-1 w-full bg-gradient-to-r from-emerald-400/95 via-emerald-500/80 to-emerald-600/70"
        aria-hidden
      />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] table-fixed border-collapse text-center text-[12px]">
          <colgroup>
            {cols.map((c) => (
              <col key={c} className="w-[14.285714%]" />
            ))}
          </colgroup>
          <thead>
            <tr className="border-b border-white/[0.08] bg-gradient-to-b from-white/[0.055] to-white/[0.02]">
              {cols.map((c) => (
                <th
                  key={c}
                  className="px-3 py-2.5 text-[10px] font-medium uppercase tracking-[0.12em] text-emerald-400/85 sm:py-3"
                >
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {LUCID_FLEX_EVAL_SPEC_ROWS.map((row) => (
              <tr
                key={row.size}
                className="border-b border-white/[0.05] last:border-0 hover:bg-white/[0.02]"
              >
                <td className="px-3 py-3 font-semibold tabular-nums text-white">
                  {row.size}
                </td>
                <td className="px-3 py-3 font-light text-white/55">
                  {row.consistency}
                </td>
                <td className="px-3 py-3 font-light text-white/55">
                  {row.sizing}
                </td>
                <td className="px-3 py-3 font-semibold tabular-nums text-white">
                  {row.eod}
                </td>
                <td className="px-3 py-3 font-semibold tabular-nums text-white">
                  {row.target}
                </td>
                <td className="px-3 py-3 font-light tabular-nums text-white/55">
                  {row.activation}
                </td>
                <td className="px-3 py-3 font-bold tabular-nums text-emerald-400">
                  ${row.price.toLocaleString("en-US")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Direct funded specs — palette aligned with Direct tier card (amber cap). Prices = compare `discountedPrice`. */
const LUCID_DIRECT_EVAL_SPEC_ROWS: {
  size: string;
  consistency: string;
  sizing: string;
  eod: string;
  target: string;
  dll: string;
  activation: string;
  price: number;
}[] = (() => {
  const usd = lucidDirectEvalSpecPricesUsd();
  const template = [
    {
      size: "25k",
      consistency: "20%",
      sizing: "2 minis / 20 micros",
      eod: "$1,000",
      target: "—",
      dll: "—",
      activation: "—",
    },
    {
      size: "50k",
      consistency: "20%",
      sizing: "4 minis / 40 micros",
      eod: "$2,000",
      target: "—",
      dll: "$1,200",
      activation: "—",
    },
    {
      size: "100k",
      consistency: "20%",
      sizing: "6 minis / 60 micros",
      eod: "$3,500",
      target: "—",
      dll: "$2,100",
      activation: "—",
    },
    {
      size: "150k",
      consistency: "20%",
      sizing: "10 minis / 100 micros",
      eod: "$5,000",
      target: "—",
      dll: "$3,000",
      activation: "—",
    },
  ] as const;
  return template.map((row, i) => ({ ...row, price: usd[i] ?? 0 }));
})();

function LucidDirectEvalSpecsTable() {
  const cols = [
    "Size",
    "Consistency",
    "Sizing",
    "EOD drawdown",
    "Target",
    "DLL",
    "Activation",
    "Price",
  ] as const;

  return (
    <div
      className="mt-3 overflow-hidden rounded-2xl border border-white/[0.07] bg-gradient-to-b from-white/[0.06] to-white/[0.02] ring-1 ring-inset ring-white/[0.05]"
      role="region"
      aria-label="Direct account specifications"
    >
      <div
        className="h-1 w-full bg-gradient-to-r from-amber-500/90 via-amber-600/70 to-amber-800/60"
        aria-hidden
      />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[880px] table-fixed border-collapse text-center text-[12px]">
          <colgroup>
            {cols.map((c) => (
              <col key={c} className="w-[12.5%]" />
            ))}
          </colgroup>
          <thead>
            <tr className="border-b border-white/[0.08] bg-gradient-to-b from-white/[0.055] to-white/[0.02]">
              {cols.map((c) => (
                <th
                  key={c}
                  className="px-3 py-2.5 text-[10px] font-medium uppercase tracking-[0.12em] text-amber-400/85 sm:py-3"
                >
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {LUCID_DIRECT_EVAL_SPEC_ROWS.map((row) => (
              <tr
                key={row.size}
                className="border-b border-white/[0.05] last:border-0 hover:bg-white/[0.02]"
              >
                <td className="px-3 py-3 font-semibold tabular-nums text-white">
                  {row.size}
                </td>
                <td className="px-3 py-3 font-light text-white/55">
                  {row.consistency}
                </td>
                <td className="px-3 py-3 font-light text-white/55">
                  {row.sizing}
                </td>
                <td className="px-3 py-3 font-semibold tabular-nums text-white">
                  {row.eod}
                </td>
                <td className="px-3 py-3 font-light tabular-nums text-white/55">
                  {row.target}
                </td>
                <td className="px-3 py-3 font-light tabular-nums text-white/55">
                  {row.dll}
                </td>
                <td className="px-3 py-3 font-light tabular-nums text-white/55">
                  {row.activation}
                </td>
                <td className="px-3 py-3 font-bold tabular-nums text-emerald-400">
                  ${row.price.toLocaleString("en-US")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * Eval fee tiers — min/max from compare (`discountedPrice` per path). Same
 * palette as before; layout is intentionally not a shared horizontal “slider” track.
 */
const LUCID_EVAL_PRICE_TIERS: {
  key: string;
  label: string;
  min: number;
  max: number;
  capGradient: string;
  badge?: string;
  highlight?: boolean;
}[] = (() => {
  const r = lucidEvalFeeTierRanges();
  return [
    {
      key: "pro",
      label: "Pro",
      min: r.pro.min,
      max: r.pro.max,
      capGradient: "from-sky-400/90 via-sky-500/75 to-sky-700/65",
    },
    {
      key: "flex",
      label: "Flex",
      min: r.flex.min,
      max: r.flex.max,
      capGradient: "from-emerald-400/95 via-emerald-500/80 to-emerald-600/70",
      badge: "Best value",
      highlight: true,
    },
    {
      key: "direct",
      label: "Direct",
      min: r.direct.min,
      max: r.direct.max,
      capGradient: "from-amber-500/90 via-amber-600/70 to-amber-800/60",
    },
  ];
})();

function LucidEvalPriceScale() {
  return (
    <div
      className="mt-3"
      role="region"
      aria-label="Lucid evaluation fee ranges in USD"
    >
      <p className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.14em] text-white/45">
        Evaluation fees (USD)
      </p>

      <div className="grid gap-1.5 sm:grid-cols-3 sm:gap-1.5">
        {LUCID_EVAL_PRICE_TIERS.map((tier) => (
          <div
            key={tier.key}
            className={`flex flex-col overflow-hidden rounded-2xl border border-white/[0.07] bg-gradient-to-b from-white/[0.06] to-white/[0.02] ring-1 ring-inset ring-white/[0.05] ${
              tier.highlight
                ? "shadow-[0_0_0_1px_rgba(16,185,129,0.12)] sm:shadow-[0_12px_40px_-16px_rgba(16,185,129,0.15)]"
                : ""
            }`}
          >
            <div
              className={`h-1.5 w-full bg-gradient-to-r ${tier.capGradient}`}
              aria-hidden
            />
            <div className="flex flex-1 flex-col px-4 pb-4 pt-3.5">
              <div className="flex items-start justify-between gap-2">
                <span className="text-[11px] font-light uppercase tracking-[0.18em] text-white/55">
                  {tier.label}
                </span>
                {tier.badge ? (
                  <span className="shrink-0 rounded-full border border-emerald-500/30 bg-emerald-500/[0.09] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white">
                    {tier.badge}
                  </span>
                ) : null}
              </div>
              <p className="mt-4 text-[11px] font-medium uppercase tracking-[0.1em] text-white/38">
                Eval fee range
              </p>
              <p className="mt-1.5 text-xl font-semibold tabular-nums tracking-tight text-white sm:text-[1.35rem]">
                <span className="text-white/75">${tier.min.toLocaleString("en-US")}</span>
                <span className="mx-1 text-white/38">–</span>
                <span className="text-white">${tier.max.toLocaleString("en-US")}</span>
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Stripe gradients aligned with eval spec tables (Pro / Flex / Direct). */
const LUCID_CONSISTENCY_PATHS = [
  {
    key: "pro",
    label: "Pro",
    pct: 100,
    /** Min. rule + gloss — kept short so each card reads as one line under the %. */
    subline: "Min. 1 day min · Full target in one session.",
    stripeClass:
      "w-0.5 shrink-0 rounded-full bg-gradient-to-b from-sky-400/85 to-sky-700/40 sm:h-1 sm:w-full sm:bg-gradient-to-r sm:from-sky-400/90 sm:via-sky-500/75 sm:to-sky-700/65",
  },
  {
    key: "flex",
    label: "Flex",
    pct: 50,
    subline: "Min. 2 days min · 50% from your best day.",
    stripeClass:
      "w-0.5 shrink-0 rounded-full bg-gradient-to-b from-emerald-400/85 to-emerald-700/40 sm:h-1 sm:w-full sm:bg-gradient-to-r sm:from-emerald-400/95 sm:via-emerald-500/80 sm:to-emerald-600/70",
  },
  {
    key: "direct",
    label: "Direct",
    pct: 20,
    subline: "20% per day on the target — strictest.",
    stripeClass:
      "w-0.5 shrink-0 rounded-full bg-gradient-to-b from-amber-500/85 to-amber-900/45 sm:h-1 sm:w-full sm:bg-gradient-to-r sm:from-amber-500/90 sm:via-amber-600/70 sm:to-amber-800/60",
  },
] as const;

function LucidConsistencyPathCard({
  p,
}: {
  p: (typeof LUCID_CONSISTENCY_PATHS)[number];
}) {
  return (
    <div className="flex min-h-full gap-3 rounded-xl border border-white/[0.06] bg-gradient-to-b from-white/[0.05] to-white/[0.02] px-3 py-3.5 ring-1 ring-inset ring-white/[0.04] sm:flex-col sm:py-4">
      <div className={p.stripeClass} aria-hidden />
      <div className="min-w-0 flex-1">
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/45">
          {p.label}
        </span>
        <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight text-white sm:text-[1.65rem]">
          {p.pct}%
        </p>
        <p className="mt-3 border-t border-white/[0.08] pt-3 text-[11px] font-normal leading-snug text-white/75 sm:text-[12px] sm:leading-normal">
          {p.subline}
        </p>
      </div>
    </div>
  );
}

/**
 * Editorial comparison: three path cards; top/edge stripes use the same Pro / Flex /
 * Direct gradients as the eval spec tables (sky · emerald · amber).
 */
function LucidEvalConsistencySpectrum() {
  return (
    <div
      className="mt-6"
      role="group"
      aria-label="Consistency cap and minimum evaluation days by path"
    >
      <div className="grid gap-2 sm:grid-cols-3 sm:gap-3">
        {LUCID_CONSISTENCY_PATHS.map((p) => (
          <LucidConsistencyPathCard key={p.key} p={p} />
        ))}
      </div>
    </div>
  );
}

const FAQ_ITEMS: { id: string; q: ReactNode; a: ReactNode }[] = [
  {
    id: "faq-drawdown",
    q: (
      <>
        What drawdown type does <LucidSiteLink>Lucid Trading</LucidSiteLink> use?
      </>
    ),
    a: (
      <>
        <LucidSiteLink>Lucid Trading</LucidSiteLink> uses an{" "}
        <AnchorToSection id="rules-drawdown">
          End of Day (EOD) drawdown
        </AnchorToSection>
        : it is calculated at the end of the trading day, not intraday in real
        time.
      </>
    ),
  },
  {
    id: "faq-scalping",
    q: "Is scalping allowed?",
    a: "Standard scalping is allowed. Micro-scalping held for under ~5 seconds is monitored. Algo trading is allowed (no HFT).",
  },
  {
    id: "faq-withdrawal",
    q: "What are the withdrawal conditions?",
    a: "Key conditions include staying above the buffer, respecting consistency rules (e.g. max 40% per payout cycle), and meeting minimum profit requirements. Rules vary by account type.",
  },
  {
    id: "faq-consistency",
    q: "Is there a consistency rule?",
    a: "Yes. Pro: 100%, Flex: 50%, Direct: 20% — limiting how much of the profit target can come from a single day.",
  },
  {
    id: "faq-platforms",
    q: "Which platforms and data feeds are available?",
    a: "Data feeds: Rithmic and Tradovate. Free platform licenses include MotiveWave and Quantower.",
  },
];

/** In-page Pro / Flex / Direct — uses `onSegmentPick` (no scroll); sidebar uses `onNavigate`. */
function LucidSegmentTriple({
  options,
  value,
  onSelect,
  ariaLabel,
  className = "",
}: {
  options: { id: string; label: string }[];
  value: string;
  onSelect: (id: string) => void;
  ariaLabel: string;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={`inline-flex max-w-full flex-wrap gap-1 rounded-xl border border-white/12 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] ${className}`}
    >
      {options.map((opt) => {
        const selected = value === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onSelect(opt.id)}
            className={`min-w-[4.25rem] rounded-lg px-3.5 py-2 text-center text-[13px] font-semibold transition-[color,background-color,box-shadow,border-color] duration-200 ease-out ${
              selected
                ? "border border-sky-400/40 bg-gradient-to-b from-sky-500/18 to-sky-950/25 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_0_18px_rgba(56,189,248,0.12)]"
                : "border border-transparent text-white/45 hover:border-white/10 hover:bg-white/[0.06] hover:text-white/85"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

const LUCID_FUNDED_PAYOUT_METRICS: Record<
  LucidFundedChildId,
  {
    pathLabel: string;
    profitSplit: string;
    minWithdrawal: string;
    payment: string;
    consistency: string;
  }
> = {
  "funded-pro": {
    pathLabel: "Pro",
    profitSplit: "90/10",
    minWithdrawal: "$500",
    payment: "Workmarket",
    consistency: "40%",
  },
  "funded-flex": {
    pathLabel: "Flex",
    profitSplit: "90/10",
    minWithdrawal: "$500",
    payment: "Workmarket",
    consistency: "—",
  },
  "funded-direct": {
    pathLabel: "Direct",
    profitSplit: "90/10",
    minWithdrawal: "$500",
    payment: "Workmarket",
    consistency: "20%",
  },
};

const LUCID_PRO_BUFFER_ROWS = [
  { account: "25k", buffer: "$26,100" },
  { account: "50k", buffer: "$52,100" },
  { account: "100k", buffer: "$103,100" },
  { account: "150k", buffer: "$154,600" },
] as const;

const LUCID_PRO_PAYOUT_CAP_ROWS = [
  { account: "25k", firstPayout: "$1,000", nextPayouts: "$1,500" },
  { account: "50k", firstPayout: "$2,000", nextPayouts: "$2,500" },
  { account: "100k", firstPayout: "$2,500", nextPayouts: "$3,000" },
  { account: "150k", firstPayout: "$3,000", nextPayouts: "$3,500" },
] as const;

const LUCID_PRO_MIN_PROFIT_ROWS = [
  { account: "25k", minProfit: "$250" },
  { account: "50k", minProfit: "$500" },
  { account: "100k", minProfit: "$750" },
  { account: "150k", minProfit: "$1,000" },
] as const;

const LUCID_FLEX_PAYOUT_CAP_ROWS = [
  { account: "25k", perPayoutCap: "50% of profit, max $1,000" },
  { account: "50k", perPayoutCap: "50% of profit, max $2,000" },
  { account: "100k", perPayoutCap: "50% of profit, max $2,500" },
  { account: "150k", perPayoutCap: "50% of profit, max $3,000" },
] as const;

const LUCID_FLEX_SIZE_SCALING_ROWS = [
  { range: "$0 – $999", x25k: "1 / 10", x50k: "2 / 20", x100k: "3 / 30", x150k: "4 / 40" },
  { range: "$1,000 – $1,999", x25k: "2 / 20", x50k: "3 / 30", x100k: "4 / 40", x150k: "5 / 50" },
  { range: "$2,000 – $2,999", x25k: "–", x50k: "4 / 40", x100k: "5 / 50", x150k: "6 / 60" },
  { range: "$3,000 – $4,499", x25k: "–", x50k: "–", x100k: "6 / 60", x150k: "8 / 80" },
  { range: "$4,500+", x25k: "–", x50k: "–", x100k: "–", x150k: "10 / 100" },
] as const;

const LUCID_DIRECT_PAYOUT_TARGET_ROWS = [
  { account: "25k", payout1: "$1,500", payout2p: "$1,250" },
  { account: "50k", payout1: "$3,000", payout2p: "$2,500" },
  { account: "100k", payout1: "$6,000", payout2p: "$3,500" },
  { account: "150k", payout1: "$9,000", payout2p: "$4,500" },
] as const;

const LUCID_DIRECT_PAYOUT_CAP_ROWS = [
  { account: "25k", payouts1to3: "$1,000", payouts4to6: "$1,000" },
  { account: "50k", payouts1to3: "$2,000", payouts4to6: "$2,500" },
  { account: "100k", payouts1to3: "$2,500", payouts4to6: "$3,000" },
  { account: "150k", payouts1to3: "$3,000", payouts4to6: "$3,500" },
] as const;

function LucidPayoutTable({
  headers,
  rows,
  tone = "pro",
}: {
  headers: string[];
  rows: string[][];
  tone?: "pro" | "flex" | "direct";
}) {
  const headerToneClass =
    tone === "pro"
      ? "text-sky-400/80"
      : tone === "flex"
        ? "text-emerald-400/85"
        : "text-amber-400/85";
  return (
    <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.06] to-white/[0.02] ring-1 ring-inset ring-white/[0.05]">
      <table className="w-full border-collapse text-center text-[12px]">
        <thead>
          <tr className="border-b border-white/[0.06] bg-gradient-to-b from-white/[0.06] to-white/[0.025]">
            {headers.map((h) => (
              <th
                key={h}
                className={`px-3 py-2.5 text-[10px] font-medium uppercase tracking-[0.14em] ${headerToneClass}`}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={`${row[0]}-${idx}`} className="border-b border-white/[0.05] last:border-0">
              {row.map((cell, ci) => (
                <td
                  key={`${cell}-${ci}`}
                  className={`px-3 py-2.5 ${
                    ci === 0
                      ? "font-semibold tabular-nums text-white"
                      : "font-light tabular-nums text-white/55"
                  }`}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LucidProPayoutTables() {
  return (
    <div className="mt-6 space-y-4">
      <LucidPayoutTable
        tone="pro"
        headers={["Account", "Buffer (max loss + $100)"]}
        rows={LUCID_PRO_BUFFER_ROWS.map((r) => [r.account, r.buffer])}
      />
      <P>Withdrawals are capped per cycle:</P>
      <LucidPayoutTable
        tone="pro"
        headers={["Account", "1st payout", "Next payouts"]}
        rows={LUCID_PRO_PAYOUT_CAP_ROWS.map((r) => [
          r.account,
          r.firstPayout,
          r.nextPayouts,
        ])}
      />
      <P>
        Starting from the 2nd payout, a minimum profit target per cycle applies
        (on the 1st payout, the buffer already implies a higher threshold):
      </P>
      <LucidPayoutTable
        tone="pro"
        headers={["Account", "Minimum profit per cycle"]}
        rows={LUCID_PRO_MIN_PROFIT_ROWS.map((r) => [r.account, r.minProfit])}
      />
    </div>
  );
}

function LucidFlexPayoutTables() {
  return (
    <div className="mt-6 space-y-4">
      <LucidPayoutTable
        tone="flex"
        headers={["Account", "Payout cap per payout"]}
        rows={LUCID_FLEX_PAYOUT_CAP_ROWS.map((r) => [r.account, r.perPayoutCap])}
      />
    </div>
  );
}

function LucidDirectPayoutTables() {
  return (
    <div className="mt-6 space-y-4">
      <LucidPayoutTable
        tone="direct"
        headers={["Account", "Payout target 1", "Payout target 2+"]}
        rows={LUCID_DIRECT_PAYOUT_TARGET_ROWS.map((r) => [
          r.account,
          r.payout1,
          r.payout2p,
        ])}
      />
      <P>Withdrawals are capped per cycle:</P>
      <LucidPayoutTable
        tone="direct"
        headers={["Account", "Payouts 1 - 3", "Payouts 4 - 6"]}
        rows={LUCID_DIRECT_PAYOUT_CAP_ROWS.map((r) => [
          r.account,
          r.payouts1to3,
          r.payouts4to6,
        ])}
      />
    </div>
  );
}

function LucidPayoutJourneyStepper() {
  const steps = [
    {
      key: "eval",
      title: "Evaluation",
      sub: "Profit target",
      highlight: false,
      icon: (
        <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <path d="M14 2v6h6" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
      ),
    },
    {
      key: "activation",
      title: "Activation",
      sub: "Free ($0)",
      highlight: false,
      icon: (
        <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
          <path
            d="M8 12l2.5 2.5L16 9"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
    },
    {
      key: "trading",
      title: "Trading",
      sub: "Funded account",
      highlight: false,
      icon: (
        <span className="text-lg font-semibold tabular-nums" aria-hidden>
          $
        </span>
      ),
    },
    {
      key: "payout",
      title: "Payout",
      sub: "90/10 · Workmarket",
      highlight: true,
      icon: (
        <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" aria-hidden>
          <rect
            x="3"
            y="6"
            width="18"
            height="12"
            rx="2"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <path d="M3 10h18" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      ),
    },
  ];

  return (
    <div className="mt-5 rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.055] to-white/[0.02] p-4 ring-1 ring-inset ring-white/[0.05] sm:p-5">
      <p className="border-b border-sky-500/35 pb-2 text-[11px] font-medium uppercase tracking-[0.16em] text-white/55">
        Funded account &amp; payouts
      </p>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-x-1 gap-y-5 sm:gap-x-3">
        {steps.map((s, i) => (
          <div key={s.key} className="flex items-center gap-x-1 sm:gap-x-3">
            {i > 0 ? (
              <span className="pr-1 text-white/38 sm:pr-0" aria-hidden>
                &gt;
              </span>
            ) : null}
            <div
              className={`flex min-w-[5.5rem] flex-col items-center gap-1.5 text-center sm:min-w-[6.5rem] ${
                s.highlight ? "text-emerald-400/95" : "text-white/90"
              }`}
            >
              <div
                className={`flex h-11 w-11 items-center justify-center rounded-lg ${
                  s.highlight
                    ? "border border-emerald-500/55 bg-emerald-500/[0.07]"
                    : "border border-white/[0.08] bg-gradient-to-b from-white/[0.05] to-white/[0.02]"
                }`}
              >
                {s.icon}
              </div>
              <span className="text-[13px] font-semibold tracking-tight">
                {s.title}
              </span>
              <span
                className={`max-w-[9rem] text-[11px] leading-snug ${
                  s.highlight ? "text-emerald-400/85" : "text-white/45"
                }`}
              >
                {s.sub}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function LucidFundedPayoutMetricsGrid({ pickId }: { pickId: LucidFundedChildId }) {
  const m = LUCID_FUNDED_PAYOUT_METRICS[pickId];
  const toneClass =
    pickId === "funded-pro"
      ? "text-sky-400/80"
      : pickId === "funded-flex"
        ? "text-emerald-400/85"
        : "text-amber-400/85";
  const capGradient =
    pickId === "funded-pro"
      ? "from-sky-400/90 via-sky-500/75 to-sky-700/65"
      : pickId === "funded-flex"
        ? "from-emerald-400/95 via-emerald-500/80 to-emerald-600/70"
        : "from-amber-500/90 via-amber-600/70 to-amber-800/60";
  const cells: { label: string; value: string }[] = [
    { label: "Profit split", value: m.profitSplit },
    { label: "Minimum withdrawal", value: m.minWithdrawal },
    { label: "Payment", value: m.payment },
    { label: "Consistency", value: m.consistency },
  ];
  return (
    <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.06] to-white/[0.02] ring-1 ring-inset ring-white/[0.05]">
      <div className={`h-1 w-full bg-gradient-to-r ${capGradient}`} aria-hidden />
      <div className="grid grid-cols-2 divide-x divide-y divide-white/[0.06] sm:grid-cols-4 sm:divide-y-0">
        {cells.map((c) => (
          <div
            key={c.label}
            className="flex flex-col gap-1 px-3 py-3.5 sm:px-4 sm:py-4"
          >
            <p className={`text-[9px] font-medium uppercase tracking-[0.14em] ${toneClass}`}>
              {c.label}
            </p>
            <p className="text-base font-semibold tabular-nums text-white sm:text-[1.05rem]">
              {c.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function LucidFundedAccountSizesStrip() {
  const sizes = ["25k", "50k", "100k", "150k"] as const;
  return (
    <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.05] to-white/[0.02] ring-1 ring-inset ring-white/[0.05]">
      <p className="border-b border-white/[0.07] px-4 py-2.5 text-[10px] font-medium uppercase tracking-[0.14em] text-white/45">
        Funded account sizes
      </p>
      <div className="grid grid-cols-2 divide-x divide-white/[0.06] sm:grid-cols-4">
        {sizes.map((sz) => (
          <div
            key={sz}
            className="flex flex-col items-center justify-center px-3 py-4 text-center"
          >
            <span className="text-lg font-semibold tabular-nums tracking-tight text-white">
              {sz}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** EOD drawdown vs profit target by size — Pro/Flex share eval targets; Direct is funded-only. */
const LUCID_EOD_PRO_FLEX_TIERS: {
  size: string;
  targetUsd: number;
  ddUsd: number;
}[] = [
  { size: "25k", targetUsd: 1250, ddUsd: 1000 },
  { size: "50k", targetUsd: 3000, ddUsd: 2000 },
  { size: "100k", targetUsd: 6000, ddUsd: 3000 },
  { size: "150k", targetUsd: 9000, ddUsd: 4500 },
];

/** Same figures as Direct eval specs table: EOD drawdown + DLL (null = no DLL on 25k). */
const LUCID_EOD_DIRECT_TIERS: {
  size: string;
  eodUsd: number;
  dllUsd: number | null;
}[] = [
  { size: "25k", eodUsd: 1000, dllUsd: null },
  { size: "50k", eodUsd: 2000, dllUsd: 1200 },
  { size: "100k", eodUsd: 3500, dllUsd: 2100 },
  { size: "150k", eodUsd: 5000, dllUsd: 3000 },
];

/** Max height (px) for the visual bars only — text sits above in its own block. */
const EOD_BAR_TARGET_MAX_PX = 80;
const EOD_BAR_DD_MAX_PX = 80;
const EOD_BAR_DIRECT_EOD_MAX_PX = 80;
const EOD_BAR_DIRECT_DLL_MAX_PX = 80;

/** One $ ceiling for Pro/Flex so Target + EOD bars share the same scale (comparable across tiers). */
const PRO_FLEX_VISUAL_MAX_USD = Math.max(
  ...LUCID_EOD_PRO_FLEX_TIERS.flatMap((r) => [r.targetUsd, r.ddUsd])
);

/** One $ ceiling for Direct so EOD + DLL bars share the same scale. */
const DIRECT_VISUAL_MAX_USD = Math.max(
  ...LUCID_EOD_DIRECT_TIERS.flatMap((r) =>
    r.dllUsd != null ? [r.eodUsd, r.dllUsd] : [r.eodUsd]
  )
);

/** Drawdown graph column title — `tabular-nums` on digits only; suffix shown as lowercase “k”. */
function LucidGraphAccountSizeLabel({ size }: { size: string }) {
  const m = /^(\d+)[kK]$/i.exec(size.trim());
  if (!m) return <>{size}</>;
  const [, digits] = m;
  return (
    <>
      <span className="tabular-nums">{digits}</span>
      <span className="font-semibold tracking-normal">k</span>
    </>
  );
}

function LucidDrawdownEodBlock() {
  const [pick, setPick] = useState<"pro-flex" | "direct">("pro-flex");
  const [drawdownCarpetEpoch, setDrawdownCarpetEpoch] = useState(0);
  const prevDrawdownPickRef = useRef<"pro-flex" | "direct" | null>(null);

  useLayoutEffect(() => {
    if (prevDrawdownPickRef.current === null) {
      prevDrawdownPickRef.current = pick;
      return;
    }
    if (prevDrawdownPickRef.current === pick) return;
    prevDrawdownPickRef.current = pick;
    setDrawdownCarpetEpoch((n) => n + 1);
  }, [pick]);

  const drawdownCarpetOn = drawdownCarpetEpoch > 0;

  return (
    <div>
      <SubsectionTitle>Drawdown</SubsectionTitle>

      <div className="mt-4 flex gap-3 overflow-hidden rounded-xl border border-white/[0.07] bg-gradient-to-b from-white/[0.07] to-white/[0.03] ring-1 ring-inset ring-white/[0.05]">
        <div
          className="w-1 shrink-0 bg-gradient-to-b from-amber-400/80 to-amber-600/40"
          aria-hidden
        />
        <div className="flex items-start gap-3 py-3 pr-4">
          <svg
            className="mt-0.5 h-8 w-8 shrink-0 text-amber-400/75"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M4 14l4-4 4 4 8-8"
            />
          </svg>
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-white/45">
              Drawdown type
            </p>
            <p className="mt-0.5 text-sm font-semibold tracking-tight text-amber-200/95">
              End of Day (EOD)
            </p>
          </div>
        </div>
      </div>

      <P className="mt-5">
        Lucid Trading uses an End of Day (EOD) drawdown, which is recalculated
        at the end of each trading day.
      </P>
      <P className="mt-4">
        The drawdown level does not move during an open trade and is only
        updated based on your final end-of-day result. This differs from a
        trailing drawdown, which adjusts in real time as your balance changes.
      </P>
      <P className="mt-4">
        In practice, if you are up $2,000 during the day but close at +$500,
        only the final +$500 will be used to update the drawdown.
      </P>

      <div
        className="mt-6 inline-flex max-w-full flex-wrap gap-1 rounded-xl border border-white/12 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
        role="tablist"
        aria-label="Drawdown comparison by program"
      >
        <button
          type="button"
          role="tab"
          aria-selected={pick === "pro-flex"}
          onClick={() => setPick("pro-flex")}
          className={`min-w-[5.5rem] rounded-lg px-3.5 py-2 text-center text-[13px] font-semibold transition-[color,background-color,box-shadow,border-color] duration-200 ease-out ${
            pick === "pro-flex"
              ? "border border-sky-400/40 bg-gradient-to-b from-sky-500/18 to-sky-950/25 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_0_18px_rgba(56,189,248,0.12)]"
              : "border border-transparent text-white/45 hover:border-white/10 hover:bg-white/[0.06] hover:text-white/85"
          }`}
        >
          Pro / Flex
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={pick === "direct"}
          onClick={() => setPick("direct")}
          className={`min-w-[5.5rem] rounded-lg px-3.5 py-2 text-center text-[13px] font-semibold transition-[color,background-color,box-shadow,border-color] duration-200 ease-out ${
            pick === "direct"
              ? "border border-sky-400/40 bg-gradient-to-b from-sky-500/18 to-sky-950/25 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_0_18px_rgba(56,189,248,0.12)]"
              : "border border-transparent text-white/45 hover:border-white/10 hover:bg-white/[0.06] hover:text-white/85"
          }`}
        >
          Direct
        </button>
      </div>

      <div
        key={`${drawdownCarpetEpoch}-${pick}`}
        className={`mt-4 grid grid-cols-2 items-stretch gap-2 sm:grid-cols-4 sm:gap-3 ${
          drawdownCarpetOn ? "compare-table-row-carpet" : ""
        }`}
        style={drawdownCarpetOn ? LUCID_SEGMENT_CARPET_STYLE : undefined}
      >
        {pick === "pro-flex"
          ? LUCID_EOD_PRO_FLEX_TIERS.map((row) => {
              const barTargetPx =
                EOD_BAR_TARGET_MAX_PX *
                (row.targetUsd / PRO_FLEX_VISUAL_MAX_USD);
              const barDdPx =
                EOD_BAR_DD_MAX_PX * (row.ddUsd / PRO_FLEX_VISUAL_MAX_USD);
              return (
                <div
                  key={row.size}
                  className="flex h-full min-h-[280px] flex-col overflow-hidden rounded-xl border border-white/[0.08] bg-gradient-to-b from-white/[0.06] to-white/[0.02] ring-1 ring-inset ring-white/[0.04]"
                >
                  <p className="shrink-0 border-b border-white/[0.06] py-2 text-center text-[11px] font-semibold tracking-wide text-white/55">
                    <LucidGraphAccountSizeLabel size={row.size} />
                  </p>
                  <div className="flex min-h-0 flex-1 flex-col justify-end gap-2 p-2">
                    <div className="overflow-hidden rounded-lg border border-emerald-500/15 bg-emerald-950/35">
                      <div className="px-2 pb-1 pt-2.5 text-center">
                        <span className="block text-[9px] font-medium uppercase tracking-wide text-emerald-500/85">
                          Profit target
                        </span>
                        <span className="mt-1 block text-[13px] font-semibold tabular-nums leading-snug text-emerald-100">
                          ${row.targetUsd.toLocaleString("en-US")}
                        </span>
                      </div>
                      <div className="px-2 pb-2 pt-1.5">
                        <div
                          className="mx-auto w-full max-w-[5.5rem] rounded-sm bg-gradient-to-b from-emerald-600/55 to-emerald-800/50"
                          style={{
                            height: Math.max(10, barTargetPx),
                          }}
                          aria-hidden
                        />
                      </div>
                    </div>
                    <div className="overflow-hidden rounded-lg border border-rose-500/15 bg-rose-950/30">
                      <div className="px-2 pb-1 pt-2.5 text-center">
                        <span className="block text-[9px] font-medium uppercase tracking-wide text-rose-400/80">
                          Drawdown EOD
                        </span>
                        <span className="mt-1 block text-[13px] font-semibold tabular-nums leading-snug text-rose-100">
                          ${row.ddUsd.toLocaleString("en-US")}
                        </span>
                      </div>
                      <div className="px-2 pb-2 pt-1.5">
                        <div
                          className="mx-auto w-full max-w-[5.5rem] rounded-sm bg-gradient-to-b from-rose-600/50 to-rose-900/45"
                          style={{
                            height: Math.max(10, barDdPx),
                          }}
                          aria-hidden
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          : LUCID_EOD_DIRECT_TIERS.map((row) => {
              const barEodPx =
                EOD_BAR_DIRECT_EOD_MAX_PX *
                (row.eodUsd / DIRECT_VISUAL_MAX_USD);
              const barDllPx =
                row.dllUsd != null
                  ? EOD_BAR_DIRECT_DLL_MAX_PX *
                    (row.dllUsd / DIRECT_VISUAL_MAX_USD)
                  : 0;
              return (
                <div
                  key={row.size}
                  className="flex h-full min-h-[280px] flex-col overflow-hidden rounded-xl border border-white/[0.08] bg-gradient-to-b from-white/[0.06] to-white/[0.02] ring-1 ring-inset ring-white/[0.04]"
                >
                  <p className="shrink-0 border-b border-white/[0.06] py-2 text-center text-[11px] font-semibold tracking-wide text-white/55">
                    <LucidGraphAccountSizeLabel size={row.size} />
                  </p>
                  <div className="flex min-h-0 flex-1 flex-col justify-end gap-2 p-2">
                    <div className="overflow-hidden rounded-lg border border-rose-500/20 bg-rose-950/30">
                      <div className="px-2 pb-1 pt-2.5 text-center">
                        <span className="block text-[9px] font-medium uppercase tracking-wide text-rose-300/85">
                          Drawdown EOD
                        </span>
                        <span className="mt-1 block text-[13px] font-semibold tabular-nums leading-snug text-rose-50">
                          ${row.eodUsd.toLocaleString("en-US")}
                        </span>
                      </div>
                      <div className="px-2 pb-2 pt-1.5">
                        <div
                          className="mx-auto w-full max-w-[5.5rem] rounded-sm bg-gradient-to-b from-rose-600/60 to-rose-950/50"
                          style={{
                            height: Math.max(10, barEodPx),
                          }}
                          aria-hidden
                        />
                      </div>
                    </div>
                    {row.dllUsd != null ? (
                      <div className="overflow-hidden rounded-lg border border-amber-500/25 bg-amber-950/25">
                        <div className="px-2 pb-1 pt-2.5 text-center">
                          <span className="block text-[9px] font-medium uppercase tracking-wide text-amber-400/85">
                            DLL
                          </span>
                          <span className="mt-1 block text-[13px] font-semibold tabular-nums leading-snug text-amber-100">
                            ${row.dllUsd.toLocaleString("en-US")}
                          </span>
                        </div>
                        <div className="px-2 pb-2 pt-1.5">
                          <div
                            className="mx-auto w-full max-w-[5.5rem] rounded-sm bg-gradient-to-b from-amber-600/45 to-amber-950/40"
                            style={{
                              height: Math.max(10, barDllPx),
                            }}
                            aria-hidden
                          />
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
      </div>
    </div>
  );
}

function FaqBlock() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="space-y-2">
      {FAQ_ITEMS.map((item, i) => {
        const isOpen = open === i;
        return (
          <div
            key={item.id}
            className="rounded-xl border border-white/[0.09] bg-gradient-to-b from-white/[0.055] to-white/[0.02] ring-1 ring-inset ring-white/[0.07]"
          >
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : i)}
              className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left"
            >
              <span className="text-sm font-semibold text-white/75">{item.q}</span>
              <span className="shrink-0 text-white/45">{isOpen ? "−" : "+"}</span>
            </button>
            {isOpen ? (
              <div className="border-t border-white/[0.06] px-4 pb-4">
                <div className="pt-3 text-[14px] font-light leading-relaxed text-white/75">
                  {item.a}
                </div>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

export function LucidGuideBody({
  evaluationPickId,
  fundedPickId,
  onSegmentPick,
}: {
  evaluationPickId: LucidEvalChildId;
  fundedPickId: LucidFundedChildId;
  onSegmentPick: (id: string) => void;
}) {
  const evalOptions = [
    { id: "evaluations-pro", label: "Pro" },
    { id: "evaluations-flex", label: "Flex" },
    { id: "evaluations-direct", label: "Direct" },
  ] as const;
  const fundedOptions = [
    { id: "funded-pro", label: "Pro" },
    { id: "funded-flex", label: "Flex" },
    { id: "funded-direct", label: "Direct" },
  ] as const;

  const [evalCarpetEpoch, setEvalCarpetEpoch] = useState(0);
  const prevEvalPickRef = useRef<LucidEvalChildId | null>(null);
  useLayoutEffect(() => {
    if (prevEvalPickRef.current === null) {
      prevEvalPickRef.current = evaluationPickId;
      return;
    }
    if (prevEvalPickRef.current === evaluationPickId) return;
    prevEvalPickRef.current = evaluationPickId;
    setEvalCarpetEpoch((n) => n + 1);
  }, [evaluationPickId]);

  const [fundedCarpetEpoch, setFundedCarpetEpoch] = useState(0);
  const prevFundedPickRef = useRef<LucidFundedChildId | null>(null);
  useLayoutEffect(() => {
    if (prevFundedPickRef.current === null) {
      prevFundedPickRef.current = fundedPickId;
      return;
    }
    if (prevFundedPickRef.current === fundedPickId) return;
    prevFundedPickRef.current = fundedPickId;
    setFundedCarpetEpoch((n) => n + 1);
  }, [fundedPickId]);

  const evalCarpetOn = evalCarpetEpoch > 0;
  const fundedCarpetOn = fundedCarpetEpoch > 0;

  return (
    <div className="space-y-6 pb-16">
      {/* Overview */}
      <Encadré accent="emerald">
        <SectionShell id="overview">
          <SectionTitle
            eyebrow="Overview"
            title="Lucid Trading at a glance"
          />
          <P>
            <LucidSiteLink>Lucid Trading</LucidSiteLink> is a US-based prop firm
            launched in 2025. It offers multiple evaluation types (
            <AnchorToSection id="evaluations-pro">Pro</AnchorToSection>
            {", "}
            <AnchorToSection id="evaluations-flex">Flex</AnchorToSection>
            {", "}
            <AnchorToSection id="evaluations-direct">Direct</AnchorToSection>
            ) with account sizes ranging from $25k to $150k.
          </P>
          <P className="mt-4">
            Its main feature is an{" "}
            <AnchorToSection id="rules-drawdown">
              End of Day (EOD) drawdown
            </AnchorToSection>
            , combined with competitive pricing, especially on the Flex model.
          </P>
          <Note>
            <span className="text-white/75">Note:</span> As a recent firm,
            long-term reliability is still unproven.
          </Note>
          <div className="mt-2.5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="flex flex-col items-center justify-center px-2.5 py-2.5 text-center">
              <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-white/45">
                Data feeds
              </p>
              <div className="mt-2 flex w-full flex-row flex-wrap items-center justify-center gap-4 sm:gap-6">
                <div className="flex items-center gap-2">
                  <Image
                    src="/platforms/rithmic.png"
                    alt=""
                    width={64}
                    height={22}
                    className="h-4 w-auto max-w-[4rem] shrink-0 object-contain"
                  />
                  <span className="text-[10px] font-medium text-white/75">
                    Rithmic
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Image
                    src="/platforms/tradovate.png"
                    alt=""
                    width={72}
                    height={22}
                    className="h-4 w-auto max-w-[4.25rem] shrink-0 object-contain"
                  />
                  <span className="text-[10px] font-medium text-white/75">
                    Tradovate
                  </span>
                </div>
              </div>
            </Card>
            <Card className="flex flex-col items-center justify-center px-2.5 py-2.5 text-center">
              <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-white/45">
                Founded
              </p>
              <p className="mt-1 text-sm font-medium text-white/90">2025</p>
            </Card>
            <Card className="flex flex-col items-center justify-center px-2.5 py-2.5 text-center">
              <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-white/45">
                Headquarters
              </p>
              <div className="mt-2 flex items-center justify-center gap-2">
                {countryFlagAssetSrc("US") ? (
                  /* eslint-disable-next-line @next/next/no-img-element -- Next Image rejects ?v= on local /flags URLs (localPatterns) */
                  <img
                    src={countryFlagAssetSrc("US")!}
                    alt=""
                    width={20}
                    height={20}
                    className="h-5 w-5 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <span className="text-lg leading-none" aria-hidden>
                    {countryFlagEmoji("US")}
                  </span>
                )}
                <span className="text-sm font-medium text-white/90">
                  United States
                </span>
              </div>
            </Card>
            <Card className="flex flex-col items-center justify-center px-2.5 py-2.5 text-center">
              <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-white/45">
                Max accounts
              </p>
              <p className="mt-1 text-sm font-medium leading-snug text-white/90">
                Up to 5 accounts
              </p>
            </Card>
          </div>
        </SectionShell>
      </Encadré>

      {/* Evaluation types */}
      <Encadré accent="sky">
        <SectionShell id="evaluations">
          <SectionTitle
            eyebrow="Evaluation types"
            title="Pro, Flex & Direct"
          />
          <P className="whitespace-nowrap overflow-x-auto pb-1 [scrollbar-width:thin]">
            <LucidSiteLink>Lucid Trading</LucidSiteLink> splits its offering into
            Pro, Flex, and Direct paths. Each has different rules, pricing, and
            risk profiles — the matrix below summarizes the evaluation phase.
          </P>
          <LucidEvalPriceScale />

          <div id="evaluations-detail" className={`${SCROLL_MT} mt-3 space-y-2`}>
            <LucidSegmentTriple
              ariaLabel="Evaluation type (synced with sidebar)"
              options={[...evalOptions]}
              value={evaluationPickId}
              onSelect={onSegmentPick}
            />
            <div
              key={`${evalCarpetEpoch}-${evaluationPickId}`}
              className={`space-y-2 ${evalCarpetOn ? "compare-table-row-carpet" : ""}`}
              style={evalCarpetOn ? LUCID_SEGMENT_CARPET_STYLE : undefined}
            >
              <h3 className="text-xl font-semibold tracking-tight text-white">
                {evaluationPickId === "evaluations-pro"
                  ? "Pro"
                  : evaluationPickId === "evaluations-flex"
                    ? "Flex"
                    : "Direct"}
              </h3>
              {evaluationPickId === "evaluations-pro" ? (
                <>
                  <P>
                    The Pro path uses a 100% consistency rule with just one
                    minimum trading day, meaning the evaluation can technically be
                    completed in a single session — or even a single trade.
                  </P>
                  <P className="mt-4">
                    In practice, this works as a &quot;one-shot&quot; setup, where
                    one strong move can be enough to reach the profit target.
                  </P>
                  <P className="mt-4">
                    ⚠️ Keep in mind: on larger account sizes (above $25k), the
                    Daily Loss Limit (DLL) becomes a key constraint. The format is
                    aggressive, but the margin for error is tighter.
                  </P>
                </>
              ) : evaluationPickId === "evaluations-flex" ? (
                <>
                  <P>
                    The Flex path uses a 50% consistency rule with a minimum of two
                    trading days, meaning performance must be distributed across
                    multiple sessions.
                  </P>
                  <P className="mt-4">
                    It is also the most competitively priced option.
                  </P>
                </>
              ) : (
                <>
                  <P>
                    The Direct path provides instant funding with no profit target
                    to reach — you trade directly on a funded account.
                  </P>
                  <P className="mt-4">
                    It applies a 20% consistency rule.
                  </P>
                  <P className="mt-4">
                    <span className="text-white/75">Note:</span> The Daily Loss
                    Limit (DLL) becomes more restrictive on accounts above $25k.
                  </P>
                </>
              )}
              {evaluationPickId === "evaluations-pro" ? (
                <LucidProEvalSpecsTable />
              ) : evaluationPickId === "evaluations-flex" ? (
                <LucidFlexEvalSpecsTable />
              ) : (
                <LucidDirectEvalSpecsTable />
              )}
            </div>
          </div>
        </SectionShell>
      </Encadré>

      {/* Trading rules */}
      <Encadré accent="amber">
        <SectionShell id="trading-rules">
          <SectionTitle eyebrow="Trading rules" title="Risk & conduct" />
          <P>
            Rules are easier to scan when split by topic. Use the nav to jump to
            drawdown, consistency, news, hours, or account limits.
          </P>
        </SectionShell>

        <div className="mt-5">
          <SectionShell id="rules-drawdown">
            <LucidDrawdownEodBlock />
          </SectionShell>

          <LucidSectionDivider />

          <SectionShell id="rules-consistency">
            <SubsectionTitle>Consistency</SubsectionTitle>
            <P>
              During the evaluation phase,{" "}
              <LucidSiteLink>Lucid Trading</LucidSiteLink> enforces a consistency
              rule that depends on the selected path.
            </P>
            <P className="mt-4">
              In practical terms, it caps how much of the profit target can come
              from a single trading day, requiring results to be distributed over
              multiple sessions.
            </P>
            <LucidEvalConsistencySpectrum />
          </SectionShell>

          <LucidSectionDivider />

          <SectionShell id="rules-news">
            <SubsectionTitle>News</SubsectionTitle>
            <P>
              Trading during economic news releases is allowed, both during the
              evaluation phase and on funded accounts, regardless of the account
              type.
            </P>
          </SectionShell>

          <LucidSectionDivider />

          <SectionShell id="rules-hours">
            <SubsectionTitle>Trading hours</SubsectionTitle>
            <P>
              All positions must be closed (flat) before the market closes — no
              open trades or pending orders can remain active.
            </P>
            <P className="mt-4">
              <strong className="font-semibold text-white/90">Daily close:</strong>{" "}
              all positions must be flat before 4:45 PM Eastern Time (ET), Monday
              through Friday. Any position still open at that time will be
              automatically liquidated by Lucid Trading.
            </P>
            <P className="mt-4">
              <strong className="font-semibold text-white/90">Weekend:</strong>{" "}
              all positions must be flat before 4:45 PM ET on Friday. No overnight
              or weekend holding is allowed.
            </P>
            <P className="mt-4">
              This rule applies to all account types: Pro, Flex, and Direct.
            </P>
            <P className="mt-4">
              Once on a funded (live) account, swing trading may be possible,
              depending on available margin.
            </P>
            <P className="mt-4">
              If the market closes earlier than usual (holidays), it is the
              trader&apos;s responsibility to exit positions before the close.
              Refer to the CME holiday calendar for schedule changes.
            </P>
          </SectionShell>

          <LucidSectionDivider />

          <SectionShell id="rules-accounts">
            <SubsectionTitle>Multiple accounts</SubsectionTitle>
            <P>
              With Lucid Trading, you can hold up to 5 funded accounts
              simultaneously.
            </P>
            <P className="mt-4">
              If this limit is already reached, you can still run up to 5
              additional evaluations in parallel.
            </P>
            <P className="mt-4">
              If you do not have any funded accounts, you can have up to 10
              active evaluations at the same time.
            </P>
          </SectionShell>
        </div>
      </Encadré>

      {/* Trading styles */}
      <Encadré accent="violet">
        <SectionShell id="trading-styles">
          <SectionTitle eyebrow="Trading styles" title="How you can trade" />
          <P>
            Styles are grouped below so you can quickly see scalping, automation,
            and averaging rules without digging through dense policy pages.
          </P>
        </SectionShell>
        <div className="mt-5">
          <SectionShell id="styles-scalping">
            <SubsectionTitle>Scalping</SubsectionTitle>
            <P>
              Standard scalping is allowed with Lucid Trading. However,
              micro-scalping is monitored through an automated system. You may be
              flagged if more than 50% of your profits come from trades held for 5
              seconds or less.
            </P>
          </SectionShell>
          <LucidSectionDivider />
          <SectionShell id="styles-bots">
            <SubsectionTitle>Automated trading &amp; bots</SubsectionTitle>
            <P>
              Automated trading is allowed, provided it complies with standard
              trading rules. High-frequency trading (HFT) is not permitted.
            </P>
          </SectionShell>
          <LucidSectionDivider />
          <SectionShell id="styles-dca">
            <SubsectionTitle>DCA &amp; risk management</SubsectionTitle>
            <P>
              DCA (dollar cost averaging), meaning adding to a losing position,
              is allowed.
            </P>
            <P className="mt-4">
              There are no enforced risk management rules: no mandatory stop-loss
              and no required risk/reward ratio. You are free to manage positions
              as you see fit, as long as you stay within the account&apos;s overall
              drawdown limits.
            </P>
          </SectionShell>
          <LucidSectionDivider />
          <SectionShell id="styles-summary">
            <SubsectionTitle>Summary</SubsectionTitle>
            <P className="mb-1">
              Quick reference for style-related rules (evaluation and funded).
            </P>
            <LucidTradingStylesSummaryGrid />
          </SectionShell>
        </div>
      </Encadré>

      {/* Platforms */}
      <Encadré accent="emerald">
        <SectionShell id="platforms">
          <SectionTitle eyebrow="Platforms" title="Execution stack" />
          <P>
            Data connectivity and platform choice — pick a feed at checkout and
            one included platform license.
          </P>
        </SectionShell>
        <div className="mt-4">
          <SectionShell id="platforms-data">
            <LucidPlatformSubheading accent="sky">Data feeds</LucidPlatformSubheading>
            <P className="mb-4">
              <LucidSiteLink>Lucid Trading</LucidSiteLink> offers a choice of two
              data feeds when you purchase each account. Level 2 data is available
              for an additional fee.
            </P>
            <div className="grid gap-3 sm:grid-cols-2">
              <LucidDataFeedCard
                name="Rithmic"
                logoSrc="/platforms/rithmic.png"
                logoW={128}
                logoH={36}
              />
              <LucidDataFeedCard
                name="Tradovate"
                logoSrc="/platforms/tradovate.png"
                logoW={128}
                logoH={36}
              />
            </div>
          </SectionShell>
          <LucidSectionDivider />
          <SectionShell id="platforms-license">
            <LucidPlatformSubheading accent="emerald">
              Provided platforms
            </LucidPlatformSubheading>
            <P className="mb-4">
              <LucidSiteLink>Lucid Trading</LucidSiteLink> provides{" "}
              <strong className="font-semibold text-white/90">one</strong> platform
              license of your choice at no additional cost. Other
              Rithmic-compatible platforms are also supported.
            </P>
            <div className="grid gap-3 sm:grid-cols-3">
              <LucidFreePlatformCard
                name="MotiveWave"
                logoSrc="/platforms/motivewave.png"
                logoW={128}
                logoH={36}
              />
              <LucidFreePlatformCard
                name="Quantower"
                logoSrc="/platforms/quantower.png"
                logoW={128}
                logoH={36}
              />
              <LucidFreePlatformCard
                name="TradeSea"
                logoSrc="/platforms/tradesea.png"
                logoW={128}
                logoH={36}
              />
            </div>
          </SectionShell>
        </div>
      </Encadré>

      {/* Instruments & commissions */}
      <Encadré accent="emerald">
        <SectionShell id="instruments-commissions">
          <SectionTitle
            eyebrow="Instruments & commissions"
            title="What you trade & what it costs"
          />
        </SectionShell>
        <div className="mt-4">
          <SectionShell id="inst-instruments">
            <SubsectionTitle>Instruments</SubsectionTitle>
            <P>
              <LucidSiteLink>Lucid Trading</LucidSiteLink> provides access to
              major US futures markets through Rithmic and Tradovate data feeds.
            </P>
            <P className="mt-4">
              Micro contracts (MES, MNQ, etc.) are available and count as 1/10 of
              a standard contract toward position limits.
            </P>
            <p className="mb-3 mt-8 text-[11px] font-medium uppercase tracking-[0.16em] text-white/45">
              Available instruments
            </p>
            <div className="space-y-5">
              <div className="border-l-2 border-white/15 pl-3">
                <h4 className="text-sm font-semibold text-white">Indices</h4>
                <P className="mt-2 !mb-0">
                  ES (S&amp;P 500), NQ (Nasdaq), YM (Dow), RTY (Russell 2000), NKD
                  (Nikkei). Micros: MES, MNQ, MYM, M2K.
                </P>
              </div>
              <div className="border-l-2 border-white/15 pl-3">
                <h4 className="text-sm font-semibold text-white">Energy</h4>
                <P className="mt-2 !mb-0">
                  CL (Crude Oil), NG (Natural Gas), QM (E-mini Crude), QG (E-mini
                  Gas). Micro: MCL.
                </P>
              </div>
              <div className="border-l-2 border-white/15 pl-3">
                <h4 className="text-sm font-semibold text-white">Metals</h4>
                <P className="mt-2 !mb-0">
                  GC (Gold), SI (Silver), HG (Copper), PL (Platinum). Micros: MGC
                  (Micro Gold), SIL (Micro Silver).
                </P>
              </div>
              <div className="border-l-2 border-white/15 pl-3">
                <h4 className="text-sm font-semibold text-white">
                  Agriculture &amp; livestock
                </h4>
                <P className="mt-2 !mb-0">
                  ZS (Soybeans), ZC (Corn), ZW (Wheat), ZL (Soybean Oil), ZM
                  (Soybean Meal), HE (Lean Hogs), LE (Live Cattle).
                </P>
              </div>
              <div className="border-l-2 border-white/15 pl-3">
                <h4 className="text-sm font-semibold text-white">Currencies</h4>
                <P className="mt-2 !mb-0">
                  6A (Australian Dollar), 6B (British Pound), 6C (Canadian Dollar),
                  6E (Euro), 6J (Japanese Yen), 6N (New Zealand Dollar), 6S
                  (Swiss Franc).
                </P>
              </div>
            </div>
          </SectionShell>
          <LucidSectionDivider />
          <SectionShell id="inst-commissions">
            <SubsectionTitle>Commissions</SubsectionTitle>
            <P className="mb-4">
              <LucidSiteLink>Lucid Trading</LucidSiteLink> charges commissions per
              contract for a full <strong className="font-semibold text-white/75">round trip</strong> (opening and closing a position). Amounts below are per round trip.
            </P>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {LUCID_COMMISSION_GRID.map((row) => (
                <LucidCommissionCard key={row.key} title={row.title}>
                  {row.body}
                </LucidCommissionCard>
              ))}
            </div>
          </SectionShell>
          <LucidSectionDivider />
          <SectionShell id="inst-max-size">
            <SubsectionTitle>Max Size</SubsectionTitle>
            <P>
              How many contracts you may hold at once depends on your account type
              (
              <AnchorToSection id="evaluations-pro">Pro</AnchorToSection>
              {", "}
              <AnchorToSection id="evaluations-flex">Flex</AnchorToSection>
              {", or "}
              <AnchorToSection id="evaluations-direct">Direct</AnchorToSection>
              ) and size tier — see the Sizing column in the{" "}
              <AnchorToSection id="evaluations">evaluation</AnchorToSection> specs
              tables above.
            </P>
            <P className="mt-4">
              <span className="text-white/55">Pro:</span> contract limits are the
              same during evaluation and on a funded account.
            </P>
            <P className="mt-4">
              <span className="text-white/55">Flex:</span> a scaling plan can apply
              once you are on a funded account; evaluation limits may differ from
              funded limits.
            </P>
            <P className="mt-4">
              There are no additional caps based on instrument family — your
              limit comes from account type and tier (see the tables above), not
              from which futures you trade.
            </P>
          </SectionShell>
        </div>
      </Encadré>

      {/* Funded account */}
      <Encadré accent="amber">
        <SectionShell id="funded-account">
          <SectionTitle eyebrow="Funded account" title="Payouts & funded rules" />
          <LucidPayoutJourneyStepper />
          <P className="mt-5">
            After completing the evaluation — or immediately with Direct accounts —
            you move on to a funded account with{" "}
            <LucidSiteLink>Lucid Trading</LucidSiteLink>.
          </P>
          <div className="relative mt-5">
            <div
              id="funded-pro"
              className={`pointer-events-none absolute left-0 top-0 z-0 h-px w-px ${SCROLL_MT}`}
              aria-hidden
            />
            <div
              id="funded-flex"
              className={`pointer-events-none absolute left-0 top-0 z-0 h-px w-px ${SCROLL_MT}`}
              aria-hidden
            />
            <div
              id="funded-direct"
              className={`pointer-events-none absolute left-0 top-0 z-0 h-px w-px ${SCROLL_MT}`}
              aria-hidden
            />
            <div className="relative z-10">
              <LucidSegmentTriple
                ariaLabel="Funded account type (synced with sidebar)"
                options={[...fundedOptions]}
                value={fundedPickId}
                onSelect={onSegmentPick}
              />
              <div
                key={`${fundedCarpetEpoch}-${fundedPickId}`}
                className={`mt-6 ${
                  fundedCarpetOn ? "compare-table-row-carpet" : ""
                }`}
                style={fundedCarpetOn ? LUCID_SEGMENT_CARPET_STYLE : undefined}
              >
                <div className="border-l-2 border-sky-500/45 pl-3">
                  <h3 className="text-xl font-semibold tracking-tight text-white">
                    {LUCID_FUNDED_PAYOUT_METRICS[fundedPickId].pathLabel}
                  </h3>
                </div>
                <div className="mt-4">
                  <LucidFundedPayoutMetricsGrid pickId={fundedPickId} />
                </div>
                {fundedPickId === "funded-flex" ? (
                  <>
                    <P className="mt-6">
                      Only two conditions are required to request a payout (both
                      reset after each withdrawal):
                    </P>
                    <ul className="mt-4 max-w-none list-disc space-y-2 pl-5 text-[15px] font-light leading-relaxed text-white/75">
                      <li>
                        <strong className="font-semibold text-white/75">
                          Net positive profit over the current cycle
                        </strong>{" "}
                        — even $1 is sufficient (applies from the second payout onward).
                      </li>
                      <li>
                        <strong className="font-semibold text-white/75">
                          Minimum of 5 profitable days per cycle
                        </strong>{" "}
                        — with daily targets:
                        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                          {[
                            { size: "25k", value: "$100" },
                            { size: "50k", value: "$150" },
                            { size: "100k", value: "$200" },
                            { size: "150k", value: "$250" },
                          ].map((t) => (
                            <div
                              key={t.size}
                              className="rounded-xl border border-white/[0.07] bg-gradient-to-b from-white/[0.06] to-white/[0.02] px-3 py-2.5 ring-1 ring-inset ring-white/[0.05]"
                            >
                              <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-emerald-400/80">
                                {t.size}
                              </p>
                              <p className="mt-1 text-sm font-semibold tabular-nums text-white">
                                {t.value}
                              </p>
                            </div>
                          ))}
                        </div>
                      </li>
                    </ul>
                    <P className="mt-6">
                      The maximum withdrawal is capped at 50% of total profits, with
                      an additional limit based on account size:
                    </P>
                    <LucidFlexPayoutTables />
                    <P className="mt-6">
                      After the first payout, the drawdown is reset to the initial
                      account balance.
                    </P>
                    <P className="mt-4">
                      The size of contracts you can trade increases progressively as
                      your simulated profits grow (updated at the end of each
                      session, not in real time):
                    </P>
                    <div className="mt-4">
                      <LucidPayoutTable
                        tone="flex"
                        headers={["Simulated profits", "25k", "50k", "100k", "150k"]}
                        rows={LUCID_FLEX_SIZE_SCALING_ROWS.map((r) => [
                          r.range,
                          r.x25k,
                          r.x50k,
                          r.x100k,
                          r.x150k,
                        ])}
                      />
                    </div>
                    <P className="text-[13px] text-white/45">Values: minis / micros</P>
                  </>
                ) : fundedPickId === "funded-direct" ? (
                  <>
                    <P className="mt-6">
                      Three conditions must be met to request a payout (all reset
                      after each withdrawal):
                    </P>
                    <ul className="mt-4 max-w-none list-disc space-y-2 pl-5 text-[15px] font-light leading-relaxed text-white/75">
                      <li>
                        <strong className="font-semibold text-white/75">
                          Minimum of 5 trading days
                        </strong>{" "}
                        — at least one trade per day with a net result of ≥ $1
                      </li>
                      <li>
                        <strong className="font-semibold text-white/75">
                          20% consistency rule
                        </strong>{" "}
                        — your best trading day must not exceed 20% of the total
                        profit for the payout cycle
                      </li>
                      <li>
                        <strong className="font-semibold text-white/75">
                          Minimum profit target per cycle
                        </strong>{" "}
                        — the requirement decreases after the first payout
                      </li>
                    </ul>
                  </>
                ) : (
                  <>
                    <P className="mt-6">
                      Payouts are available every 3 trading days (based on a 40%
                      consistency rule).
                    </P>
                    <P className="mt-4">
                      To request a payout, three conditions must be met (and reset after
                      each withdrawal):
                    </P>
                    <ul className="mt-4 max-w-none list-disc space-y-2 pl-5 text-[15px] font-light leading-relaxed text-white/75">
                      <li>
                        <strong className="font-semibold text-white/75">
                          Profit above the buffer
                        </strong>{" "}
                        — only profits exceeding the buffer can be withdrawn
                      </li>
                      <li>
                        <strong className="font-semibold text-white/75">
                          40% consistency rule
                        </strong>{" "}
                        — your best trading day must not exceed 40% of the total
                        profit for the payout cycle
                      </li>
                      <li>
                        <strong className="font-semibold text-white/75">
                          Minimum profit target per cycle
                        </strong>{" "}
                        — applies starting from the second payout
                      </li>
                    </ul>
                    <P className="mt-6">
                      The buffer is the minimum balance that must be maintained on the
                      account. Only profits above this level are eligible for
                      withdrawal:
                    </P>
                  </>
                )}
                {fundedPickId === "funded-pro" ? (
                  <LucidProPayoutTables />
                ) : fundedPickId === "funded-flex" ? (
                  null
                ) : fundedPickId === "funded-direct" ? (
                  <LucidDirectPayoutTables />
                ) : (
                  <div className="mt-6">
                    <LucidFundedAccountSizesStrip />
                  </div>
                )}
              </div>
            </div>
          </div>
        </SectionShell>
      </Encadré>

      {/* Our opinion */}
      <Encadré accent="violet">
        <SectionShell id="our-opinion">
          <SectionTitle eyebrow="Our opinion" title="Editorial take" />
        </SectionShell>
        <div className="mt-4">
          <SectionShell id="opinion-pros-cons">
            <SubsectionTitle>Pros & cons</SubsectionTitle>
            <div className="grid gap-5 lg:grid-cols-2">
              <div className="rounded-2xl border border-emerald-500/25 bg-emerald-950/[0.12] p-4 ring-1 ring-inset ring-emerald-500/15">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-400/90">
                  ✓ Strengths
                </p>
                <ul className="mt-4 space-y-2.5 text-[15px] font-light text-white/75">
                  <li>
                    <span className="mr-2 text-emerald-400/85">—</span>
                    Wide range of account paths (
                    <AnchorToSection id="evaluations-pro">Pro</AnchorToSection>,{" "}
                    <AnchorToSection id="evaluations-flex">Flex</AnchorToSection>,{" "}
                    <AnchorToSection id="evaluations-direct">Direct</AnchorToSection>)
                  </li>
                  <li>
                    <span className="mr-2 text-emerald-400/85">—</span>
                    Competitive pricing on the Flex path
                  </li>
                  <li>
                    <span className="mr-2 text-emerald-400/85">—</span>
                    Fast payout rails, often processed quickly via Workmarket
                  </li>
                  <li>
                    <span className="mr-2 text-emerald-400/85">—</span>
                    Dual data-feed stack: Rithmic and Tradovate
                  </li>
                  <li>
                    <span className="mr-2 text-emerald-400/85">—</span>
                    Included platform license (MotiveWave or Quantower)
                  </li>
                </ul>
              </div>
              <div className="rounded-2xl border border-rose-500/25 bg-rose-950/[0.1] p-4 ring-1 ring-inset ring-rose-500/15">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-rose-400/90">
                  ✕ Weaknesses
                </p>
                <ul className="mt-4 space-y-2.5 text-[15px] font-light text-white/75">
                  <li>
                    <span className="mr-2 text-rose-400/85">—</span>
                    Very recent firm (2025)
                  </li>
                  <li>
                    <span className="mr-2 text-rose-400/85">—</span>
                    Limited long-term track record
                  </li>
                </ul>
              </div>
            </div>
          </SectionShell>

          <LucidSectionDivider />

          <SectionShell id="opinion-audience">
            <SubsectionTitle>Who Lucid Trading suits</SubsectionTitle>
            <div className="rounded-2xl bg-emerald-950/[0.1] p-4">
              <P>
                <LucidSiteLink>Lucid Trading</LucidSiteLink> is particularly well
                suited for traders who:
              </P>
              <ul className="mt-5 max-w-none space-y-3 text-[15px] font-light leading-relaxed text-white/75">
                <li>
                  <span className="mr-3 text-emerald-400/90">—</span>
                  Prefer an{" "}
                  <AnchorToSection id="rules-drawdown">EOD drawdown</AnchorToSection>
                </li>
                <li>
                  <span className="mr-3 text-emerald-400/90">—</span>
                  Want flexible feed choice between{" "}
                  Rithmic and Tradovate
                </li>
                <li>
                  <span className="mr-3 text-emerald-400/90">—</span>
                  Are looking for competitive pricing on{" "}
                  <strong className="font-semibold text-emerald-400/90">Flex</strong>
                </li>
                <li>
                  <span className="mr-3 text-emerald-400/90">—</span>
                  Want to avoid consistency constraints, which are absent on funded{" "}
                  <strong className="font-semibold text-emerald-400/90">Flex</strong>
                </li>
                <li>
                  <span className="mr-3 text-emerald-400/90">—</span>
                  Want an included platform license (MotiveWave or Quantower)
                </li>
              </ul>
            </div>
          </SectionShell>

          <LucidSectionDivider />

          <SectionShell id="opinion-score">
            <SubsectionTitle>Score</SubsectionTitle>
            <div className="grid gap-4 lg:grid-cols-[0.85fr_1.45fr] lg:items-start">
              <Card className="max-w-md">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-white/45">
                      Overall (editorial)
                    </p>
                    <p className="mt-2 text-3xl font-semibold tabular-nums text-white">
                      8.2<span className="text-lg text-white/45">/10</span>
                    </p>
                  </div>
                  <div className="h-14 w-14 rounded-full border-2 border-emerald-500/40 bg-emerald-500/10 flex items-center justify-center text-sm font-semibold text-emerald-300/90">
                    A+
                  </div>
                </div>
                <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/[0.1]">
                  <div
                    className="h-full w-[82%] rounded-full bg-gradient-to-r from-emerald-700 to-emerald-500/90"
                    aria-hidden
                  />
                </div>
              </Card>
              <div className="min-w-0">
                <P>
                  Lucid Trading offers a flexible and competitively priced setup,
                  with a clear edge on accessibility — especially through its Flex
                  path.
                </P>
                <P className="mt-4">
                  The End of Day (EOD) drawdown is a strong advantage for intraday
                  traders, allowing more freedom compared to trailing models.
                  Combined with the choice between Rithmic and Tradovate, it fits a
                  wide range of trading setups.
                </P>
                <P className="mt-4">
                  The rules are relatively permissive, with few constraints on
                  trading style or risk management.
                </P>
              </div>
            </div>
          </SectionShell>
        </div>
      </Encadré>

      {/* Good to know (kept as backup, hidden for now) */}
      {false ? (
        <Encadré accent="emerald">
          <SectionShell id="good-to-know">
            <SectionTitle eyebrow="Good to know" title="Ops & eligibility" />
            <P>
              Promotions, support, inactivity, and geography — quick reference so
              you are not surprised after signup.
            </P>
          </SectionShell>
          <div className="mt-5">
            <SectionShell id="gtk-promotions">
              <SubsectionTitle>Promotions</SubsectionTitle>
              <P>
                Watch Lucid&apos;s official site and Discord for limited-time
                discounts or resets — terms change; always read the checkout page.
              </P>
            </SectionShell>
            <LucidSectionDivider />
            <SectionShell id="gtk-support">
              <SubsectionTitle>Support</SubsectionTitle>
              <P>
                Use the official help center and Discord for platform and payout
                questions; response times vary by channel.
              </P>
            </SectionShell>
            <LucidSectionDivider />
            <SectionShell id="gtk-inactivity">
              <SubsectionTitle>Inactivity</SubsectionTitle>
              <P>
                Typical prop rules apply: extended inactivity may affect account
                status — confirm current policy in Lucid&apos;s terms before pausing
                trading for long periods.
              </P>
            </SectionShell>
            <LucidSectionDivider />
            <SectionShell id="gtk-countries">
              <SubsectionTitle>Countries restricted</SubsectionTitle>
              <P>
                Availability depends on compliance and payment rails. Verify your
                country on signup; this guide does not list a live restricted list.
              </P>
            </SectionShell>
          </div>
        </Encadré>
      ) : null}

      {/* FAQ */}
      <Encadré accent="sky">
        <SectionShell id="faq">
          <SectionTitle eyebrow="FAQ" title="Frequently asked questions" />
          <FaqBlock />
        </SectionShell>
      </Encadré>
    </div>
  );
}
