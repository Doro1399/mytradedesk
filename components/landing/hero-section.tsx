import Navbar from "@/components/navbar";
import { HeroCompositePreview } from "./preview/stylized-hud";
import { Eyebrow, PrimaryCta, SecondaryCta } from "./primitives";
import { LANDING_CONTENT_CLASS } from "./landing-layout";

export function LandingHeroSection() {
  return (
    <div className="relative border-b border-white/[0.06]">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-0 h-[min(560px,70vh)] w-[min(920px,90vw)] -translate-x-1/2 rounded-[100%] bg-[radial-gradient(ellipse_at_50%_0%,rgba(56,189,248,0.08),transparent_58%)]" />
      </div>

      <Navbar />

      <section
        className={`relative pb-24 pt-16 sm:pb-32 sm:pt-20 lg:pt-28 ${LANDING_CONTENT_CLASS}`}
      >
        <div className="grid gap-16 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-start lg:gap-20">
          <div className="max-w-xl lg:max-w-none lg:pr-8">
            <Eyebrow>Prop futures · multi-account</Eyebrow>
            <h1 className="mt-8 text-[clamp(2.125rem,5vw,3.25rem)] font-semibold leading-[1.06] tracking-[-0.045em] text-white">
              Track your prop firm capital.
              <span className="mt-1 block text-white/95">In one place.</span>
            </h1>
            <p className="mt-5 max-w-lg text-[15px] leading-relaxed text-white/48 sm:text-base">
              Evaluations, funded balances, payout timing, and firm-specific rules—laid
              out the way you operate. Built for traders who run more than one account
              and refuse to guess.
            </p>
            <p className="mt-6 text-sm italic leading-relaxed text-white/32">
              Know exactly where you stand—every firm, every account.
            </p>
            <div className="mt-12 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <PrimaryCta href="/journal">Open workspace</PrimaryCta>
              <SecondaryCta href="/compare">Compare firms</SecondaryCta>
            </div>
          </div>
          <div className="min-w-0">
            <HeroCompositePreview />
            <p className="mt-4 text-center text-[11px] text-white/30 lg:text-left">
              Stylized preview · same components and tokens as the live app
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
