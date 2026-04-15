import { PrimaryCta, SecondaryCta } from "./primitives";
import { LANDING_SECTION_BLEED } from "./landing-layout";

export function LandingFinalCtaSection() {
  return (
    <section className="relative border-t border-white/[0.06] bg-gradient-to-b from-[#050608] to-[#020308] py-20 sm:py-28">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-cyan-500/[0.05] to-transparent"
        aria-hidden
      />
      <div className={`relative ${LANDING_SECTION_BLEED}`}>
        <div className="mx-auto max-w-3xl rounded-[1.35rem] bg-gradient-to-br from-sky-500/28 via-violet-500/12 to-cyan-500/10 p-px shadow-[0_24px_80px_rgba(0,0,0,0.42)] transition-[box-shadow] duration-200 ease-out hover:shadow-[0_32px_96px_rgba(0,0,0,0.48)]">
          <div className="rounded-[1.3rem] border border-white/[0.09] bg-[#070b12]/96 px-8 py-14 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.07)] backdrop-blur-md transition-[border-color] duration-200 ease-out hover:border-white/[0.12] sm:px-14 sm:py-16">
            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-white sm:text-3xl">
              Open MyTradeDesk
            </h2>
            <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-slate-200/75">
              Track your lines in one place. Keep the comparator one click away when a
              rule or price changes.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <PrimaryCta href="/journal">Open workspace</PrimaryCta>
              <SecondaryCta href="/compare">Compare firms</SecondaryCta>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
