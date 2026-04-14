import { VisualProofTrio } from "./preview/stylized-hud";
import { Eyebrow } from "./primitives";
import { LANDING_CONTENT_CLASS } from "./landing-layout";

export function LandingShowcaseSection() {
  return (
    <section className="border-b border-white/[0.05] bg-[#040508] py-24 sm:py-32">
      <div className={LANDING_CONTENT_CLASS}>
        <div className="flex max-w-3xl flex-col gap-5 sm:flex-row sm:items-end sm:justify-between sm:gap-10">
          <div>
            <Eyebrow>Interface</Eyebrow>
            <h2 className="mt-6 text-[clamp(1.75rem,3.2vw,2.35rem)] font-semibold leading-tight tracking-[-0.038em] text-white">
              Read the desk at a glance.
            </h2>
          </div>
          <p className="max-w-sm text-sm leading-relaxed text-white/40 sm:text-right sm:text-[15px]">
            Progress, payout eligibility, balance context—HUD-clear, not arcade. Same
            discipline you expect when size is on the line.
          </p>
        </div>
        <div className="mt-16 sm:mt-20">
          <VisualProofTrio />
        </div>
      </div>
    </section>
  );
}
