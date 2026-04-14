import { Eyebrow } from "./primitives";
import { LANDING_SECTION_BLEED } from "./landing-layout";

const items = [
  {
    n: "01",
    line:
      "Too many accounts across too many firms—each with its own drawdown, buffer, and payout rhythm.",
  },
  {
    n: "02",
    line: "Rules change and PDFs pile up. Spreadsheets do not survive a week of real trading.",
  },
  {
    n: "03",
    line:
      "You need one sober view of capital and constraints—not another dashboard selling motivation.",
  },
  {
    n: "04",
    line: "MyTradeDesk is the desk you open before the session and after the close. Nothing more.",
  },
] as const;

export function LandingDifferentiationSection() {
  return (
    <section
      id="why"
      className={`scroll-mt-24 border-t border-white/[0.06] bg-[#050608]/80 py-24 sm:py-32 ${LANDING_SECTION_BLEED}`}
    >
      <div className="max-w-2xl">
        <Eyebrow>Why this exists</Eyebrow>
        <h2 className="mt-6 text-[clamp(1.75rem,3.2vw,2.35rem)] font-semibold leading-tight tracking-[-0.038em] text-white">
          Built because the problem is boring—and serious.
        </h2>
      </div>
      <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:gap-5">
        {items.map(({ n, line }) => (
          <div
            key={n}
            className="group relative overflow-hidden rounded-2xl border border-white/[0.07] bg-gradient-to-br from-white/[0.05] via-white/[0.02] to-transparent p-6 shadow-[0_20px_50px_rgba(0,0,0,0.35)] transition-[border-color,box-shadow] duration-300 hover:border-sky-500/20 hover:shadow-[0_24px_60px_rgba(0,0,0,0.42)] sm:p-7"
          >
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-sky-400/80">
              {n}
            </span>
            <p className="mt-4 text-[15px] leading-relaxed text-white/55 sm:text-base">{line}</p>
            <div
              className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-sky-500/10 opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-100"
              aria-hidden
            />
          </div>
        ))}
      </div>
    </section>
  );
}
