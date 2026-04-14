import Link from "next/link";
import { LandingCompareFeaturePreview } from "@/components/landing/compare-feature-preview";
import {
  AccountsDeskPreview,
  LandingAccountsRosterTable,
  PillarControlPreview,
  VisualProofTrio,
} from "./preview/stylized-hud";
import { Eyebrow } from "./primitives";
import { LANDING_SECTION_BLEED } from "./landing-layout";

export function LandingProductPillarsSection() {
  return (
    <section
      id="product"
      className={`relative scroll-mt-24 border-b border-white/[0.06] bg-[#070a10] py-24 sm:py-32 ${LANDING_SECTION_BLEED}`}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-sky-500/[0.06] to-transparent"
        aria-hidden
      />
      <div className="relative z-[1] w-full max-w-none">
        <div className="max-w-2xl">
          <Eyebrow>Product</Eyebrow>
          <h2 className="mt-6 text-[clamp(1.75rem,3.2vw,2.35rem)] font-semibold leading-tight tracking-[-0.038em] text-white">
            Control and compare. Nothing else on the canvas.
          </h2>
          <p className="mt-5 text-base leading-relaxed text-white/45 sm:text-[17px]">
            Two jobs: keep capital and progress legible across firms, and decide between
            programs without re-reading five PDFs. Everything else is noise.
          </p>
        </div>

        <div className="mt-20 flex w-full min-w-0 flex-col gap-24 lg:gap-28">
          {/* 1 — Comparator (same grid as /compare) */}
          <div className="flex w-full min-w-0 flex-col gap-8">
            <div className="max-w-3xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-400/80">
                Compare
              </p>
              <h3 className="mt-3 text-xl font-semibold tracking-tight text-white sm:text-2xl">
                Programs, drawdowns, targets, round-trip—decision-grade, not brochure copy.
              </h3>
              <p className="mt-4 text-sm leading-relaxed text-white/45 sm:text-base">
                The same wide table you use when sizing the next eval: prices, billing,
                platforms, drawdown caps, score ring, and CTA—pixel vocabulary from the live
                comparator.
              </p>
              <Link
                href="/compare"
                className="mt-8 inline-flex text-sm font-medium text-sky-300/90 underline-offset-4 transition hover:text-sky-200 hover:underline"
              >
                Open comparator →
              </Link>
            </div>
            <div className="w-full min-w-0">
              <LandingCompareFeaturePreview />
            </div>
          </div>

          {/* 2 — Dashboard */}
          <div className="grid w-full min-w-0 items-center gap-12 lg:grid-cols-[minmax(0,0.42fr)_minmax(0,1fr)] lg:gap-16 xl:gap-20">
            <div className="max-w-lg lg:max-w-none">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-400/80">
                Dashboard
              </p>
              <h3 className="mt-3 text-xl font-semibold tracking-tight text-white sm:text-2xl">
                Fees, payouts, net—rolled up the way your desk thinks.
              </h3>
              <p className="mt-4 text-sm leading-relaxed text-white/45 sm:text-base">
                One glance at capital snapshot and firm roll-ups before you drill into
                accounts or progress.
              </p>
              <Link
                href="/journal"
                className="mt-8 inline-flex text-sm font-medium text-sky-300/90 underline-offset-4 transition hover:text-sky-200 hover:underline"
              >
                Open dashboard →
              </Link>
            </div>
            <div className="min-w-0">
              <PillarControlPreview />
            </div>
          </div>

          {/* 3 — Accounts */}
          <div className="grid w-full min-w-0 items-start gap-12 lg:grid-cols-[minmax(0,0.42fr)_minmax(0,1fr)] lg:gap-16 xl:gap-20">
            <div className="max-w-lg lg:max-w-none">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-400/80">
                Accounts
              </p>
              <h3 className="mt-3 text-xl font-semibold tracking-tight text-white sm:text-2xl">
                The full roster, with payouts and capital in one scroll.
              </h3>
              <p className="mt-4 text-sm leading-relaxed text-white/45 sm:text-base">
                Evaluation &amp; funded snapshot and notional vs in-play capital—same
                blocks as the journal dashboard. Full roster table spans the width below.
              </p>
              <Link
                href="/journal/accounts"
                className="mt-8 inline-flex text-sm font-medium text-sky-300/90 underline-offset-4 transition hover:text-sky-200 hover:underline"
              >
                Open accounts →
              </Link>
            </div>
            <div className="min-w-0">
              <AccountsDeskPreview />
            </div>
          </div>

          <div className="w-full min-w-0">
            <LandingAccountsRosterTable />
          </div>

          {/* 4 — Progress + payout ledger (journal) */}
          <div className="w-full min-w-0">
            <div className="max-w-3xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-400/80">
                Interface
              </p>
              <h3 className="mt-3 text-xl font-semibold tracking-tight text-white sm:text-2xl">
                Read the desk at a glance.
              </h3>
              <p className="mt-4 text-sm leading-relaxed text-white/45 sm:text-base">
                Funded runway callouts and the monthly payout ledger—same patterns as
                Journal progress and Dashboard.
              </p>
            </div>
            <div className="mt-12 w-full min-w-0 sm:mt-14">
              <VisualProofTrio />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
