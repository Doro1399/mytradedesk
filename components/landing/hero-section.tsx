import Navbar from "@/components/navbar";
import { HeroCompositePreview } from "./preview/stylized-hud";
import { Eyebrow, PrimaryCta, SecondaryCta } from "./primitives";
import { LANDING_CONTENT_CLASS } from "./landing-layout";

export function LandingHeroSection() {
  return (
    <div className="relative overflow-hidden border-b border-white/[0.07] bg-[#050608]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-0 h-[min(520px,68vh)] w-[min(880px,92vw)] -translate-x-1/2 rounded-[100%] bg-[radial-gradient(ellipse_at_50%_0%,rgba(56,189,248,0.1),transparent_55%)]" />
        <div className="absolute right-[-8%] top-[8%] h-[min(480px,55vh)] w-[min(640px,70vw)] rounded-[100%] bg-[radial-gradient(ellipse_at_70%_30%,rgba(34,211,238,0.06),transparent_60%)]" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/35 to-transparent" />
      </div>

      <Navbar />

      <section
        className={`relative pb-24 pt-14 sm:pb-32 sm:pt-20 lg:pt-24 ${LANDING_CONTENT_CLASS}`}
      >
        <div className="grid gap-14 lg:grid-cols-[minmax(0,0.76fr)_minmax(0,1.24fr)] lg:items-center lg:gap-16 xl:gap-20">
          <div className="max-w-xl lg:max-w-none lg:pr-4 xl:pr-8">
            <Eyebrow>Prop futures · multi-account desk</Eyebrow>
            <h1 className="mt-7 text-[clamp(2.25rem,5.2vw,3.5rem)] font-semibold leading-[1.04] tracking-[-0.048em] text-white">
              Capital, buffers, payouts—
              <span className="mt-1 block text-white/88">
                firm by firm,{" "}
                <span className="text-sky-200/95">in one workspace.</span>
              </span>
            </h1>
            <p className="mt-5 max-w-lg text-[15px] leading-relaxed text-white/52 sm:text-base">
              Track evals and funded balances, read payout windows, and compare
              programs without re-opening PDFs. Built for desks running more than one
              line at a time.
            </p>
            <p className="mt-6 inline-flex w-full max-w-lg items-center gap-2 rounded-lg border border-white/[0.08] bg-black/30 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-white/40 sm:text-[11px]">
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400/90 shadow-[0_0_10px_rgba(52,211,153,0.45)]"
                aria-hidden
              />
              <span className="min-w-0 truncate">
                Same journal + compare surfaces as production · stylized preview
              </span>
            </p>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <PrimaryCta href="/journal">Open workspace</PrimaryCta>
              <SecondaryCta href="/compare">Compare programs</SecondaryCta>
            </div>
          </div>

          <div className="relative min-w-0">
            <div
              className="pointer-events-none absolute -inset-6 rounded-[2rem] bg-[radial-gradient(ellipse_at_50%_45%,rgba(56,189,248,0.14),transparent_62%)] sm:-inset-8 sm:rounded-[2.25rem]"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute -inset-3 rounded-[1.65rem] ring-1 ring-sky-400/10 sm:-inset-4 sm:rounded-[1.85rem]"
              aria-hidden
            />
            <div className="relative rounded-[1.35rem] border border-white/[0.1] bg-gradient-to-b from-white/[0.04] to-transparent p-[1px] shadow-[0_32px_100px_rgba(0,0,0,0.55),0_0_0_1px_rgba(255,255,255,0.04)_inset] sm:rounded-[1.5rem]">
              <div className="rounded-[1.3rem] bg-[#050608]/80 p-2 sm:rounded-[1.42rem] sm:p-2.5">
                <HeroCompositePreview hero />
              </div>
            </div>
            <p className="mt-4 text-center text-[11px] text-white/34 lg:text-right">
              Preview uses the same tokens and UI patterns as the live app.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
