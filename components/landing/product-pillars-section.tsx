import { LandingCompareFeaturePreview } from "@/components/landing/compare-feature-preview";
import { LandingFebruary2026CalendarPreview } from "./preview/landing-calendar-preview";
import {
  AccountsDeskPreview,
  LandingAccountsRosterTable,
  PillarControlPreview,
  VisualProofTrio,
} from "./preview/stylized-hud";
import { Eyebrow } from "./primitives";
import {
  LANDING_PILLAR_SPOTLIGHT_CYAN,
  LANDING_PILLAR_SPOTLIGHT_VIOLET,
  LANDING_PREVIEW_PLINTH,
} from "./tokens";
import { LANDING_SECTION_BLEED } from "./landing-layout";

export function LandingProductPillarsSection() {
  return (
    <section
      id="product"
      className={`relative scroll-mt-20 overflow-x-hidden border-b border-white/[0.06] bg-[#070a10] pb-12 pt-12 sm:scroll-mt-24 sm:pb-16 sm:pt-16 md:pb-20 md:pt-20 lg:pb-24 lg:pt-28 ${LANDING_SECTION_BLEED}`}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-[radial-gradient(ellipse_80%_100%_at_50%_0%,rgba(255,255,255,0.03),transparent_65%)]"
        aria-hidden
      />
      <div className="relative z-[1] w-full max-w-none">
        <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
          <Eyebrow>In the app</Eyebrow>
          <h2 className="mt-6 text-[clamp(1.75rem,3.2vw,2.35rem)] font-semibold leading-tight tracking-[-0.038em] text-white drop-shadow-[0_1px_18px_rgba(0,0,0,0.45)]">
            No setup. No spreadsheets. No rebuild.
          </h2>
          <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-slate-200/78 sm:mt-5 sm:text-base md:text-[17px]">
            Your entire prop firm workflow is already structured. You just plug in your numbers.
          </p>
          <div className="mt-8 flex w-full justify-center" aria-hidden>
            <div className="h-px w-56 bg-gradient-to-r from-transparent via-cyan-400/25 to-transparent sm:w-72" />
          </div>
        </div>

        <div className="mt-10 flex w-full min-w-0 flex-col sm:mt-14 md:mt-16">
          {/* 1 — Dashboard (spotlight) */}
          <div className={`${LANDING_PILLAR_SPOTLIGHT_CYAN} mt-2`}>
            <div
              className="pointer-events-none absolute -right-24 -top-28 h-80 w-80 rounded-full bg-cyan-400/15 blur-3xl"
              aria-hidden
            />
            <div className="relative grid w-full min-w-0 items-start gap-8 sm:gap-10 lg:grid-cols-[minmax(0,0.4fr)_minmax(0,1fr)] lg:gap-16 xl:gap-20">
            <div className="max-w-lg pt-0.5 sm:pt-1 lg:max-w-none">
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
          </div>

          {/* 2 — Overview: snapshot card (preview left / copy right on large screens) */}
          <div className="mt-16 grid w-full min-w-0 items-start gap-8 border-t border-white/[0.07] pt-12 sm:mt-20 sm:gap-10 sm:pt-16 md:mt-24 md:gap-12 md:pt-20 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.4fr)] lg:gap-16 xl:gap-20">
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
          <div className="mt-24 w-full min-w-0 border-t border-white/[0.07] pt-16 sm:mt-28 sm:pt-20">
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
            <div className="relative mt-10 w-full min-w-0 sm:mt-12">
              <div className="-mx-3 w-[calc(100%+1.5rem)] min-[400px]:-mx-4 min-[400px]:w-[calc(100%+2rem)] min-[480px]:-mx-5 min-[480px]:w-[calc(100%+2.5rem)] sm:-mx-6 sm:w-[calc(100%+3rem)] md:-mx-8 md:w-[calc(100%+4rem)] lg:-mx-10 lg:w-[calc(100%+5rem)] xl:-mx-12 xl:w-[calc(100%+6rem)] 2xl:-mx-16 2xl:w-[calc(100%+8rem)]">
                <LandingAccountsRosterTable />
              </div>
            </div>
          </div>

          {/* 4 — Performance: calendar (Feb 2026 demo) */}
          <div className="mt-24 w-full min-w-0 border-t border-white/[0.07] pt-16 sm:mt-28 sm:pt-20">
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
            <div className="relative mt-10 w-full min-w-0 sm:mt-12">
              <div className="-mx-3 w-[calc(100%+1.5rem)] min-[400px]:-mx-4 min-[400px]:w-[calc(100%+2rem)] min-[480px]:-mx-5 min-[480px]:w-[calc(100%+2.5rem)] sm:-mx-6 sm:w-[calc(100%+3rem)] md:-mx-8 md:w-[calc(100%+4rem)] lg:-mx-10 lg:w-[calc(100%+5rem)] xl:-mx-12 xl:w-[calc(100%+6rem)] 2xl:-mx-16 2xl:w-[calc(100%+8rem)]">
                <LandingFebruary2026CalendarPreview />
              </div>
            </div>
          </div>

          {/* 5 — Payouts (spotlight) */}
          <div className="mt-24 w-full min-w-0 border-t border-white/[0.07] pt-16 sm:mt-28 sm:pt-20">
            <div className={`${LANDING_PILLAR_SPOTLIGHT_VIOLET}`}>
              <div
                className="pointer-events-none absolute -left-20 -top-24 h-72 w-72 rounded-full bg-violet-400/12 blur-3xl"
                aria-hidden
              />
              <div className="relative flex w-full min-w-0 flex-col gap-10 sm:gap-12">
                <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-400/85">
                    Payouts
                  </p>
                  <h3 className="mt-3 text-2xl font-semibold leading-snug tracking-tight text-white sm:text-[1.65rem] sm:leading-tight">
                    Know what&apos;s actually yours to withdraw.
                  </h3>
                  <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-200/72 sm:text-base">
                    Funded accounts, buffers, payout windows. Everything that impacts your real cash,
                    in one place.
                  </p>
                </div>
                <div className="w-full min-w-0">
                  <div className={LANDING_PREVIEW_PLINTH}>
                    <div
                      className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-violet-400/[0.07] to-transparent opacity-90"
                      aria-hidden
                    />
                    <div className="relative">
                      <VisualProofTrio />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 6 — Comparator; last block in #product */}
          <div className="mt-24 flex w-full min-w-0 flex-col gap-8 border-t border-white/[0.07] pt-16 sm:mt-28 sm:gap-10 sm:pt-20">
            <div className="mx-auto flex w-full max-w-3xl flex-col items-center text-center">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-400/85">
                Compare
              </p>
              <h3 className="mt-3 text-2xl font-semibold leading-snug tracking-tight text-white sm:text-[1.65rem] sm:leading-tight">
                What looks cheap often isn&apos;t.
              </h3>
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-200/72 sm:text-base">
                See the real cost, risk and constraints before you choose.
              </p>
            </div>
            <div className="relative w-full min-w-0">
              <div className="-mx-3 w-[calc(100%+1.5rem)] min-[400px]:-mx-4 min-[400px]:w-[calc(100%+2rem)] min-[480px]:-mx-5 min-[480px]:w-[calc(100%+2.5rem)] sm:-mx-6 sm:w-[calc(100%+3rem)] md:-mx-8 md:w-[calc(100%+4rem)] lg:-mx-10 lg:w-[calc(100%+5rem)] xl:-mx-12 xl:w-[calc(100%+6rem)] 2xl:-mx-16 2xl:w-[calc(100%+8rem)]">
                <div className={LANDING_PREVIEW_PLINTH}>
                  <div
                    className="pointer-events-none absolute left-1/2 top-0 h-28 w-[min(90%,42rem)] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(34,211,238,0.11),transparent_72%)] opacity-70"
                    aria-hidden
                  />
                  <div className="relative px-0.5 sm:px-1">
                    <LandingCompareFeaturePreview />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
