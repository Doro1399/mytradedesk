import { PrimaryCta, SecondaryCta } from "./primitives";
import { LANDING_SECTION_BLEED } from "./landing-layout";

export function LandingFinalCtaSection() {
  return (
    <section className="border-t border-white/[0.06] bg-gradient-to-b from-[#050608] to-[#020308] py-24 sm:py-28">
      <div className={LANDING_SECTION_BLEED}>
        <div className="rounded-[1.35rem] bg-gradient-to-br from-sky-500/30 via-violet-500/15 to-cyan-500/10 p-px shadow-[0_24px_80px_rgba(0,0,0,0.4)]">
          <div className="rounded-[1.3rem] border border-white/[0.08] bg-[#070b12]/95 px-8 py-14 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-md sm:px-14 sm:py-16">
            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-white sm:text-3xl">
              Open MyTradeDesk
            </h2>
            <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-white/45">
              Start tracking your accounts. Keep the comparator one click away when you
              add a program or audit a rule change.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <PrimaryCta href="/journal">Start tracking your accounts</PrimaryCta>
              <SecondaryCta href="/compare">Compare firms</SecondaryCta>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
