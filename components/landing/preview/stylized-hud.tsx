import {
  LANDING_KICKER,
  LANDING_NUM,
  LANDING_PANEL,
  LANDING_TABLE_ROW,
} from "../tokens";

function WindowBar({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 border-b border-white/[0.07] bg-black/35 px-3 py-2">
      <span className="flex gap-1" aria-hidden>
        <span className="h-1.5 w-1.5 rounded-full bg-white/20" />
        <span className="h-1.5 w-1.5 rounded-full bg-white/12" />
        <span className="h-1.5 w-1.5 rounded-full bg-white/12" />
      </span>
      <span className="font-mono text-[10px] text-white/30">{label}</span>
    </div>
  );
}

/** Hero: desk + comparator — stylized, same vocabulary as the app. */
export function HeroCompositePreview() {
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-5">
      <div className={`group ${LANDING_PANEL} overflow-hidden transition-[border-color,box-shadow] duration-200 hover:border-sky-500/20`}>
        <WindowBar label="journal / progress" />
        <div className="p-4 sm:p-5">
          <p className={LANDING_KICKER}>Progress</p>
          <p className="mt-2 text-sm font-semibold tracking-tight text-white/92">
            Mission control
          </p>
          <div className="mt-5 rounded-xl border border-white/[0.08] bg-black/30 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-medium uppercase tracking-wider text-white/40">
                  Funded · Topstep · 50K
                </p>
                <p className={`mt-2 text-lg font-semibold text-white/95 ${LANDING_NUM}`}>
                  $52,420
                </p>
                <p className="mt-1 text-[11px] text-white/38">vs $50,000 nominal</p>
              </div>
              <div className="relative h-16 w-16 shrink-0">
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
                    stroke="url(#hudRing)"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={`${0.68 * 251.2} 251.2`}
                    transform="rotate(-90 50 50)"
                    className="text-sky-400/75"
                  />
                  <defs>
                    <linearGradient id="hudRing" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="rgb(56 189 248 / 0.5)" />
                      <stop offset="100%" stopColor="rgb(34 211 238 / 0.85)" />
                    </linearGradient>
                  </defs>
                </svg>
                <span
                  className={`absolute inset-0 flex items-center justify-center text-[11px] font-semibold text-white/80 ${LANDING_NUM}`}
                >
                  68%
                </span>
              </div>
            </div>
            <div className="mt-4">
              <div className="flex justify-between text-[10px] text-white/42">
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
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.06] pt-3">
              <span className="text-[10px] text-white/40">Payout window</span>
              <span className="rounded-md border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-200/90">
                Open
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className={`group ${LANDING_PANEL} overflow-hidden transition-[border-color,box-shadow] duration-200 hover:border-sky-500/20`}>
        <WindowBar label="compare" />
        <div className="p-4 sm:p-5">
          <p className={LANDING_KICKER}>Comparator</p>
          <p className="mt-2 text-sm font-semibold tracking-tight text-white/92">
            Rules at a glance
          </p>
          <div className="mt-4 space-y-2">
            {[
              ["Topstep", "50K", "EOD", "$49/mo"],
              ["Apex", "50K", "EOD", "$167"],
              ["Lucid", "25K", "Trail", "$77"],
            ].map(([firm, sz, dd, px]) => (
              <div
                key={firm}
                className={`flex items-center justify-between gap-2 px-3 py-2.5 text-[11px] ${LANDING_TABLE_ROW}`}
              >
                <span className="min-w-0 truncate font-medium text-white/88">{firm}</span>
                <span className={`shrink-0 text-white/45 ${LANDING_NUM}`}>{sz}</span>
                <span className="hidden shrink-0 text-white/40 sm:inline">{dd}</span>
                <span className={`shrink-0 text-white/55 ${LANDING_NUM}`}>{px}</span>
              </div>
            ))}
          </div>
          <p className="mt-4 text-[10px] leading-relaxed text-white/35">
            Row depth for payouts, caps, platforms—same table as production.
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
            ["Net", "+$4,120", "text-emerald-300/90"],
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

/** Pillar B — comparator strip. */
export function PillarComparePreview() {
  return (
    <div className={`${LANDING_PANEL} overflow-hidden`}>
      <WindowBar label="compare / table" />
      <div className="p-4 sm:p-5">
        <div className="grid grid-cols-[1.2fr_repeat(3,minmax(0,1fr))] gap-1 border-b border-white/[0.07] pb-2 text-[9px] font-semibold uppercase tracking-wider text-white/35">
          <span>Program</span>
          <span className="text-center">DD</span>
          <span className="text-center">Cap</span>
          <span className="text-right">Eval</span>
        </div>
        {[
          ["TopStep 50K", "EOD", "3", "$49"],
          ["Apex Growth 50K", "EOD", "20", "$167"],
          ["Lucid Flex 25K", "Trail", "5", "$77"],
        ].map((row) => (
          <div
            key={row[0]}
            className={`mt-1 grid grid-cols-[1.2fr_repeat(3,minmax(0,1fr))] gap-1 px-2 py-2 text-[11px] ${LANDING_TABLE_ROW}`}
          >
            <span className="truncate font-medium text-white/88">{row[0]}</span>
            <span className="text-center text-white/45">{row[1]}</span>
            <span className={`text-center text-white/45 ${LANDING_NUM}`}>{row[2]}</span>
            <span className={`text-right text-white/50 ${LANDING_NUM}`}>{row[3]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Visual proof row — three HUD tiles, sober. */
export function VisualProofTrio() {
  return (
    <div className="grid gap-5 md:grid-cols-3 md:gap-6">
      <div className={`${LANDING_PANEL} p-5`}>
        <p className={LANDING_KICKER}>Progress</p>
        <p className="mt-2 text-xs font-medium text-white/45">Eval · 50K</p>
        <p className={`mt-3 text-2xl font-semibold text-white ${LANDING_NUM}`}>$51,240</p>
        <p className="mt-1 text-[11px] text-white/38">Target $3,000 profit</p>
        <div className="mt-6 space-y-2">
          <div className="flex justify-between text-[10px] text-white/40">
            <span>Goal</span>
            <span className={LANDING_NUM}>74%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-slate-500/70 to-sky-400/65"
              style={{ width: "74%" }}
            />
          </div>
        </div>
        <div className="mt-6 flex justify-between gap-1 border-t border-white/[0.06] pt-4">
          {["M", "T", "W", "T", "F"].map((d, i) => (
            <div
              key={d + i}
              className={`flex flex-1 flex-col items-center gap-1 rounded border px-0.5 py-2 text-[9px] ${
                i === 2
                  ? "border-sky-500/25 bg-sky-500/10 text-sky-100/90"
                  : "border-white/[0.06] bg-black/20 text-white/35"
              }`}
            >
              <span className="h-6 w-full max-w-[10px] rounded-sm bg-white/[0.08]" />
              {d}
            </div>
          ))}
        </div>
      </div>

      <div className={`${LANDING_PANEL} p-5`}>
        <p className={LANDING_KICKER}>Payout</p>
        <p className="mt-2 text-xs font-medium text-white/45">Funded · request</p>
        <p className={`mt-3 text-2xl font-semibold text-emerald-300/90 ${LANDING_NUM}`}>
          $2,400
        </p>
        <p className="mt-1 text-[11px] text-white/38">After buffer · split applied</p>
        <div className="mt-6 space-y-2 rounded-xl border border-white/[0.07] bg-black/30 p-3">
          <div className="flex justify-between text-[11px] text-white/45">
            <span>Status</span>
            <span className="font-medium text-emerald-200/85">Eligible</span>
          </div>
          <div className="flex justify-between text-[11px] text-white/45">
            <span>Next window</span>
            <span className={LANDING_NUM}>Fri</span>
          </div>
        </div>
      </div>

      <div className={`${LANDING_PANEL} p-5`}>
        <p className={LANDING_KICKER}>Balance</p>
        <p className="mt-2 text-xs font-medium text-white/45">High-water</p>
        <p className={`mt-3 text-2xl font-semibold text-white ${LANDING_NUM}`}>$52,480</p>
        <p className="mt-1 text-[11px] text-white/38">Anchored to firm rules</p>
        <div className="mt-6 flex h-[5.5rem] items-end justify-between gap-1.5 px-1">
          {[28, 40, 36, 48, 42, 32, 44].map((px, i) => (
            <div
              key={i}
              className="flex-1 rounded-t-sm bg-gradient-to-t from-white/[0.06] to-white/[0.14]"
              style={{ height: px, maxHeight: "100%" }}
            />
          ))}
        </div>
        <p className="mt-3 text-[10px] text-white/32">Equity vs nominal — no blended drawdowns.</p>
      </div>
    </div>
  );
}
