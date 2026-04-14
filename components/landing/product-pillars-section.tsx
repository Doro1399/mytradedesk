import Link from "next/link";
import { PillarComparePreview, PillarControlPreview } from "./preview/stylized-hud";
import { Eyebrow } from "./primitives";
import { LANDING_CONTENT_CLASS } from "./landing-layout";

export function LandingProductPillarsSection() {
  return (
    <section
      id="product"
      className={`scroll-mt-24 border-b border-white/[0.06] bg-[#070a10] py-24 sm:py-32 ${LANDING_CONTENT_CLASS}`}
    >
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

      <div className="mt-20 flex flex-col gap-24 lg:gap-28">
        {/* Control */}
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16 xl:gap-20">
          <div className="max-w-lg lg:max-w-none">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-400/80">
              Control
            </p>
            <h3 className="mt-3 text-xl font-semibold tracking-tight text-white sm:text-2xl">
              Accounts, progress, capital—without mixing contexts.
            </h3>
            <p className="mt-4 text-sm leading-relaxed text-white/45 sm:text-base">
              One workspace for funded and eval states, buffers, payout windows, and
              fees. Numbers stay attached to the firm and program they belong to—no
              blended “portfolio” fiction.
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

        {/* Compare — preview first on large screens for balance */}
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16 xl:gap-20">
          <div className="min-w-0 lg:order-1">
            <PillarComparePreview />
          </div>
          <div className="max-w-lg lg:order-2 lg:max-w-none">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-400/80">
              Compare
            </p>
            <h3 className="mt-3 text-xl font-semibold tracking-tight text-white sm:text-2xl">
              Programs, drawdowns, caps—decision-grade, not brochure copy.
            </h3>
            <p className="mt-4 text-sm leading-relaxed text-white/45 sm:text-base">
              The same comparator grid you use when sizing the next eval: prices,
              drawdown type, account limits, platforms, round-trip costs. Drill into
              rules when a row is not enough.
            </p>
            <Link
              href="/compare"
              className="mt-8 inline-flex text-sm font-medium text-sky-300/90 underline-offset-4 transition hover:text-sky-200 hover:underline"
            >
              Open comparator →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
