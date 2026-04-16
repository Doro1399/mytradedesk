import Link from "next/link";
import { PrimaryCta, SecondaryCta } from "./primitives";
import { LANDING_MICRO } from "./tokens";
import { LANDING_SECTION_BLEED } from "./landing-layout";

/** Tertiary CTA — text-only, lower emphasis (compare / research path). */
const tertiaryLink =
  `text-[13px] font-medium text-white/45 transition-colors duration-200 hover:text-white/85 ${LANDING_MICRO}`;

export function LandingFinalCtaSection() {
  return (
    <section className="relative border-t border-white/[0.06] bg-[#070a10] py-24 sm:py-32">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[radial-gradient(ellipse_90%_100%_at_50%_0%,rgba(255,255,255,0.03),transparent_60%)]"
        aria-hidden
      />
      <div className={`relative ${LANDING_SECTION_BLEED}`}>
        <div className="mx-auto max-w-3xl rounded-[1.35rem] border border-white/[0.08] bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-px shadow-[0_20px_70px_rgba(0,0,0,0.4)] transition-[box-shadow,border-color] duration-200 ease-out hover:border-white/[0.11] hover:shadow-[0_28px_88px_rgba(0,0,0,0.48)]">
          <div className="rounded-[1.3rem] border border-white/[0.06] bg-[#0a0e14]/98 px-8 py-14 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-md transition-[border-color] duration-200 ease-out hover:border-white/[0.09] sm:px-14 sm:py-16">
            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-white sm:text-3xl">
              One desk for every prop account.
            </h2>
            <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-slate-200/75">
              Fees, payouts, and performance in one place — so you always know where you stand.
            </p>

            <div className="mx-auto mt-10 flex w-full max-w-md flex-col items-stretch gap-3 sm:max-w-none sm:flex-row sm:items-center sm:justify-center sm:gap-3">
              <PrimaryCta href="/journal" className="w-full min-h-[2.75rem] py-3.5 sm:w-auto sm:min-w-[12.5rem] sm:px-8">
                Start tracking
              </PrimaryCta>
              <SecondaryCta href="/demo" className="w-full min-h-[2.75rem] py-3.5 sm:w-auto sm:min-w-[12.5rem]">
                Preview dashboard
              </SecondaryCta>
            </div>

            <p className={`mt-6 ${LANDING_MICRO}`}>
              <Link href="/compare" className={tertiaryLink}>
                Compare prop firms
                <span className="ml-1 text-white/35" aria-hidden>
                  →
                </span>
              </Link>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
