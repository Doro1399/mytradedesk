import type { ReactNode } from "react";
import { Eyebrow } from "./primitives";
import { LANDING_MICRO } from "./tokens";
import { LANDING_SECTION_BLEED } from "./landing-layout";

function IconTarget({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" className="stroke-current" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="5" className="stroke-current" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
    </svg>
  );
}

function IconShield({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 3 5 6v5c0 5 3.5 9 7 10 3.5-1 7-5 7-10V6l-7-3Z"
        className="stroke-current"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconBars({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M6 18V10" className="stroke-current" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M12 18V6" className="stroke-current" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M18 18v-7" className="stroke-current" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconTrend({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 16 9 11l4 4 7-7"
        className="stroke-current"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M14 8h6v6" className="stroke-current" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconPie({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" className="stroke-current" strokeWidth="1.5" />
      <path
        d="M12 12V3c4.5.5 8 4 8.5 9H12Z"
        className="stroke-current"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconBolt({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M13 2 4 14h7l-1 8 10-14h-7l0-6Z"
        className="stroke-current"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const CONTROL_CENTER_CARDS: {
  title: string;
  body: string;
  icon: (p: { className?: string }) => ReactNode;
}[] = [
  {
    title: "Track every challenge",
    body: "See all your evals across firms: status, rules and progress at a glance.",
    icon: (p) => <IconTarget {...p} />,
  },
  {
    title: "Manage funded capital",
    body: "Live accounts, buffers and payout readiness without switching platforms.",
    icon: (p) => <IconShield {...p} />,
  },
  {
    title: "See real P&L",
    body: "Fees, payouts and net. Rolled up by firm or globally.",
    icon: (p) => <IconBars {...p} />,
  },
  {
    title: "Understand your ROI",
    body: "See what your capital actually generates after fees, resets and payouts.",
    icon: (p) => <IconTrend {...p} />,
  },
  {
    title: "Compare prop firms",
    body: "Rules, drawdowns and pricing. Side by side, instantly.",
    icon: (p) => <IconPie {...p} />,
  },
  {
    title: "Import your trades",
    body: "Sync your activity via CSV— keep your data aligned with your accounts.",
    icon: (p) => <IconBolt {...p} />,
  },
];

export function LandingDifferentiationSection() {
  return (
    <section
      id="control-center"
      className={`relative scroll-mt-20 overflow-x-hidden border-t border-white/[0.06] bg-[#070a10] py-16 sm:scroll-mt-24 sm:py-24 md:py-32 lg:py-36 ${LANDING_SECTION_BLEED}`}
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_45%_at_50%_0%,rgba(255,255,255,0.025),transparent_50%)]"
        aria-hidden
      />
      <div className="relative mx-auto flex max-w-3xl flex-col items-center text-center">
        <Eyebrow>Control center</Eyebrow>
        <h2 className="mt-6 text-[clamp(1.65rem,3vw,2.25rem)] font-semibold leading-tight tracking-[-0.035em] text-white drop-shadow-[0_1px_16px_rgba(0,0,0,0.4)]">
          Stop managing chaos. Start running your desk.
        </h2>
        <p className="mt-4 max-w-2xl text-[14px] leading-relaxed text-slate-400/95 sm:text-base">
          Multiple prop firms, multiple accounts, different rules. Finally structured in one system.
        </p>
      </div>

      <div className="relative mx-auto mt-10 max-w-6xl sm:mt-16 lg:mt-20">
        <div className="grid gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 lg:gap-6">
        {CONTROL_CENTER_CARDS.map(({ title, body, icon }) => (
          <article
            key={title}
            className={`group relative flex flex-col rounded-2xl border border-white/[0.08] bg-[#0c101a]/95 p-5 shadow-[0_12px_40px_rgba(0,0,0,0.38)] sm:p-6 ${LANDING_MICRO} before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-px before:rounded-t-2xl before:bg-gradient-to-r before:from-transparent before:via-white/14 before:to-transparent hover:-translate-y-0.5 hover:border-white/[0.12] hover:bg-[#0e121c]/95 hover:shadow-[0_24px_56px_rgba(0,0,0,0.48)]`}
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.06] bg-black/35 text-slate-400/95 group-hover:border-cyan-500/15 group-hover:text-cyan-300/85">
              {icon({ className: "h-[1.15rem] w-[1.15rem]" })}
            </div>
            <h3 className="mt-4 text-[15px] font-semibold tracking-tight text-white sm:text-base">
              {title}
            </h3>
            <p className="mt-2 flex-1 text-[13px] leading-relaxed text-slate-400/90 sm:text-sm">
              {body}
            </p>
            <div
              className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-cyan-500/10 opacity-0 blur-2xl transition-opacity duration-200 group-hover:opacity-100"
              aria-hidden
            />
          </article>
        ))}
        </div>
      </div>
    </section>
  );
}
