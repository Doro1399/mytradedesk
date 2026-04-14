import { Eyebrow } from "./primitives";
import { LANDING_CONTENT_CLASS } from "./landing-layout";

const lines = [
  "Too many accounts across too many firms—each with its own drawdown, buffer, and payout rhythm.",
  "Rules change and PDFs pile up. Spreadsheets do not survive a week of real trading.",
  "You need one sober view of capital and constraints—not another dashboard selling motivation.",
  "MyTradeDesk is the desk you open before the session and after the close. Nothing more.",
] as const;

export function LandingDifferentiationSection() {
  return (
    <section
      id="why"
      className={`scroll-mt-24 border-t border-white/[0.05] bg-[#050608] py-24 sm:py-32 ${LANDING_CONTENT_CLASS}`}
    >
      <div className="max-w-2xl">
        <Eyebrow>Why this exists</Eyebrow>
        <h2 className="mt-6 text-[clamp(1.75rem,3.2vw,2.35rem)] font-semibold leading-tight tracking-[-0.038em] text-white">
          Built because the problem is boring—and serious.
        </h2>
      </div>
      <ul className="mt-14 max-w-3xl space-y-8 border-l border-white/[0.08] pl-8 sm:pl-10">
        {lines.map((line) => (
          <li
            key={line}
            className="text-base leading-relaxed text-white/50 sm:text-[17px]"
          >
            {line}
          </li>
        ))}
      </ul>
    </section>
  );
}
