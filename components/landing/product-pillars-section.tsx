import { LandingCompareFeaturePreview } from "@/components/landing/compare-feature-preview";
import { LandingFebruary2026CalendarPreview } from "./preview/landing-calendar-preview";
import {
  AccountsDeskPreview,
  LandingAccountsRosterTable,
  PillarControlPreview,
  VisualProofTrio,
} from "./preview/stylized-hud";
import { Eyebrow } from "./primitives";
import { LANDING_PREVIEW_PLINTH } from "./tokens";
import { LANDING_SECTION_BLEED } from "./landing-layout";

export function LandingProductPillarsSection() {
  return (
    <section
      id="product"
      className={`relative scroll-mt-24 overflow-x-hidden border-b border-cyan-950/25 bg-[#050810] pt-14 pb-10 sm:pt-20 sm:pb-12 lg:pt-24 lg:pb-14 ${LANDING_SECTION_BLEED}`}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-cyan-500/[0.06] to-transparent"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-y-0 right-0 w-[min(55vw,720px)] bg-[radial-gradient(ellipse_at_100%_30%,rgba(34,211,238,0.055),transparent_62%)]"
        aria-hidden
      />
      <div className="relative z-[1] w-full max-w-none">
        <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
          <Eyebrow>In the app</Eyebrow>
          <h2 className="mt-6 text-[clamp(1.75rem,3.2vw,2.35rem)] font-semibold leading-tight tracking-[-0.038em] text-white drop-shadow-[0_1px_18px_rgba(0,0,0,0.45)]">
            No setup. No spreadsheets. No rebuild.
          </h2>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-slate-200/78 sm:text-[17px]">
            Your entire prop firm workflow is already structured.
            <br />
            You just plug in your numbers.
          </p>
          <div className="mt-6 flex w-full justify-center" aria-hidden>
            <div className="h-px w-48 bg-gradient-to-r from-cyan-500/25 via-white/12 to-transparent sm:w-64" />
          </div>
        </div>

        <div className="mt-9 flex w-full min-w-0 flex-col sm:mt-10">
          {/* 1 — Dashboard */}
          <div className="mt-10 grid w-full min-w-0 items-start gap-10 border-t border-white/[0.05] pt-10 sm:mt-11 sm:pt-11 lg:grid-cols-[minmax(0,0.42fr)_minmax(0,1fr)] lg:gap-14 xl:gap-16">
            <div className="max-w-lg pt-1 sm:pt-1.5 lg:max-w-none">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-400/85">
                Dashboard
              </p>
              <h3 className="mt-3 text-2xl font-semibold leading-snug tracking-tight text-white sm:text-[1.65rem] sm:leading-tight">
                Your real P&amp;L across every prop firm.
              </h3>
              <p className="mt-4 text-sm leading-relaxed text-slate-300/75 sm:text-base">
                See exactly what you&apos;ve made, what you&apos;ve spent, and what&apos;s
                actually left.
              </p>
            </div>
            <div className="min-w-0">
              <div className={LANDING_PREVIEW_PLINTH}>
                <div
                  className="pointer-events-none absolute left-1/2 top-0 h-24 w-[min(88%,36rem)] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(56,189,248,0.09),transparent_72%)] opacity-70"
                  aria-hidden
                />
                <div className="relative">
                  <PillarControlPreview />
                </div>
              </div>
            </div>
          </div>

          {/* 2 — Overview: snapshot card (preview left / copy right on large screens) */}
          <div className="mt-16 grid w-full min-w-0 items-start gap-10 sm:mt-20 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.42fr)] lg:gap-14 xl:gap-16">
            <div className="order-2 min-w-0 lg:order-1">
              <div className={LANDING_PREVIEW_PLINTH}>
                <div
                  className="pointer-events-none absolute left-1/2 top-0 h-24 w-[min(88%,36rem)] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(34,211,238,0.08),transparent_72%)] opacity-65"
                  aria-hidden
                />
                <div className="relative">
                  <AccountsDeskPreview />
                </div>
              </div>
            </div>
            <div className="order-1 max-w-lg pt-1 sm:pt-1.5 lg:order-2 lg:max-w-none">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-400/85">
                Overview
              </p>
              <h3 className="mt-3 text-2xl font-semibold leading-snug tracking-tight text-white sm:text-[1.65rem] sm:leading-tight">
                A clear read of your entire prop firm setup.
              </h3>
              <p className="mt-4 text-sm leading-relaxed text-slate-300/75 sm:text-base">
                See where you stand—across evaluations, funded accounts and capital.
              </p>
            </div>
          </div>

          {/* 3 — Accounts: workspace ledger (table mock) */}
          <div className="mt-20 w-full min-w-0 border-t border-white/[0.05] pt-16 sm:mt-24 sm:pt-20">
            <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-400/85">
                Accounts
              </p>
              <h3 className="mt-3 text-2xl font-semibold leading-snug tracking-tight text-white sm:text-[1.65rem] sm:leading-tight">
                Your full prop firm inventory.
              </h3>
              <p className="mt-4 text-sm leading-relaxed text-slate-300/75 sm:text-base">
                Every account, every program, every status.
                <br />
                In one structured view.
              </p>
            </div>
            <div className="relative mt-8 w-full min-w-0 sm:mt-10">
              <div className="-mx-4 w-[calc(100%+2rem)] min-[480px]:-mx-5 min-[480px]:w-[calc(100%+2.5rem)] sm:-mx-6 sm:w-[calc(100%+3rem)] md:-mx-8 md:w-[calc(100%+4rem)] lg:-mx-10 lg:w-[calc(100%+5rem)] xl:-mx-12 xl:w-[calc(100%+6rem)] 2xl:-mx-16 2xl:w-[calc(100%+8rem)]">
                <div className={LANDING_PREVIEW_PLINTH}>
                  <div
                    className="pointer-events-none absolute left-1/2 top-0 h-24 w-[min(88%,36rem)] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(34,211,238,0.08),transparent_72%)] opacity-65"
                    aria-hidden
                  />
                  <div className="relative px-1 sm:px-1.5">
                    <LandingAccountsRosterTable />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 4 — Performance: calendar (Feb 2026 demo) */}
          <div className="mt-20 w-full min-w-0 border-t border-white/[0.05] pt-16 sm:mt-24 sm:pt-20">
            <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-400/85">
                Performance
              </p>
              <h3 className="mt-3 text-2xl font-semibold leading-snug tracking-tight text-white sm:text-[1.65rem] sm:leading-tight">
                See how your trading actually performs.
              </h3>
              <p className="mt-4 text-sm leading-relaxed text-slate-300/75 sm:text-base">
                Track your daily P&amp;L, spot streaks, and understand how consistency turns into payouts.
              </p>
            </div>
            <div className="relative mt-8 w-full min-w-0 sm:mt-10">
              {/* Full width of the section column (negate section horizontal padding) */}
              <div className="-mx-4 w-[calc(100%+2rem)] min-[480px]:-mx-5 min-[480px]:w-[calc(100%+2.5rem)] sm:-mx-6 sm:w-[calc(100%+3rem)] md:-mx-8 md:w-[calc(100%+4rem)] lg:-mx-10 lg:w-[calc(100%+5rem)] xl:-mx-12 xl:w-[calc(100%+6rem)] 2xl:-mx-16 2xl:w-[calc(100%+8rem)]">
                <div className={LANDING_PREVIEW_PLINTH}>
                  <div
                    className="pointer-events-none absolute left-1/2 top-0 h-24 w-[min(88%,36rem)] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(34,211,238,0.08),transparent_72%)] opacity-65"
                    aria-hidden
                  />
                  <div className="relative px-1 sm:px-1.5">
                    <LandingFebruary2026CalendarPreview />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 5 — Payouts (workspace runway + ledger) */}
          <div className="mt-20 w-full min-w-0 border-t border-white/[0.04] pt-14 sm:mt-28 sm:pt-16">
            <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-400/85">
                Payouts
              </p>
              <h3 className="mt-3 text-xl font-semibold tracking-tight text-white sm:text-2xl">
                Know what&apos;s actually yours to withdraw.
              </h3>
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-200/72 sm:text-base">
                Funded accounts, buffers, payout windows. Everything that impacts your real cash,
                in one place.
              </p>
            </div>
            <div className="mt-12 w-full min-w-0 sm:mt-14">
              <div className={LANDING_PREVIEW_PLINTH}>
                <div
                  className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-cyan-500/[0.06] to-transparent opacity-80"
                  aria-hidden
                />
                <div className="relative">
                  <VisualProofTrio />
                </div>
              </div>
            </div>
          </div>

          {/* 6 — Comparator; last block in #product */}
          <div className="mt-20 flex w-full min-w-0 flex-col gap-6 border-t border-white/[0.05] pt-16 sm:mt-24 sm:pt-20">
            <div className="max-w-3xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-400/85">
                Compare
              </p>
              <h3 className="mt-3 text-xl font-semibold tracking-tight text-white sm:text-2xl">
                What looks cheap often isn&apos;t.
              </h3>
              <p className="mt-4 text-sm leading-relaxed text-slate-200/72 sm:text-base">
                See the real cost, risk and constraints before you choose.
              </p>
            </div>
            <div className="w-full min-w-0">
              <div className={LANDING_PREVIEW_PLINTH}>
                <div
                  className="pointer-events-none absolute left-1/2 top-0 h-28 w-[min(90%,42rem)] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(34,211,238,0.11),transparent_72%)] opacity-70"
                  aria-hidden
                />
                <div className="relative">
                  <LandingCompareFeaturePreview />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
