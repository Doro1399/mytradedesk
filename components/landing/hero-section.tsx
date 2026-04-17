import { HeroCompositePreview } from "./preview/stylized-hud";
import { Eyebrow, PrimaryCta, SecondaryCta } from "./primitives";
import { LANDING_MICRO } from "./tokens";
import { LANDING_SECTION_BLEED } from "./landing-layout";

const LIFECYCLE_STEPS = ["Challenge", "Funded", "Buffer", "Payout"] as const;

function LandingLifecycleStrip() {
  return (
    <div
      className={`mt-6 w-full max-w-lg sm:mt-9 ${LANDING_MICRO} group/path`}
      aria-label="Account path: challenge through payout"
    >
      <div className="rounded-xl bg-gradient-to-br from-cyan-400/20 via-white/[0.12] to-white/[0.04] p-px shadow-[0_12px_40px_rgba(0,0,0,0.35)] transition-[box-shadow,background-image] duration-200 ease-out group-hover/path:from-cyan-400/28 group-hover/path:via-white/[0.14] group-hover/path:shadow-[0_16px_48px_rgba(0,0,0,0.42)]">
        <div className="relative overflow-hidden rounded-[0.6875rem] border border-white/[0.04] bg-gradient-to-b from-[#121822]/98 to-[#070a10]/98 px-4 py-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.07),inset_0_-1px_0_rgba(0,0,0,0.35)] backdrop-blur-md sm:px-4 sm:py-4">
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-[radial-gradient(ellipse_at_50%_0%,rgba(34,211,238,0.08),transparent_65%)]"
            aria-hidden
          />
          <div className="relative flex flex-col items-center text-center">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400/95">
              <span className="text-cyan-200/75">Account</span>{" "}
              <span className="text-slate-500/90">path</span>
            </p>
            <span
              className="mt-2 h-px w-10 rounded-full bg-gradient-to-r from-transparent via-cyan-400/45 to-transparent"
              aria-hidden
            />
            <ol className="mt-3 flex w-full max-w-md flex-wrap items-center justify-center gap-x-1.5 gap-y-2">
              {LIFECYCLE_STEPS.map((label, i) => (
                <li key={label} className="flex items-center gap-x-1.5">
                  {i > 0 ? (
                    <span
                      className="select-none px-0.5 font-mono text-[10px] font-medium text-cyan-500/40"
                      aria-hidden
                    >
                      →
                    </span>
                  ) : null}
                  <span className="rounded-md border border-white/[0.09] bg-gradient-to-b from-white/[0.07] to-white/[0.02] px-2.5 py-1 text-[11px] font-semibold tracking-wide text-slate-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_1px_2px_rgba(0,0,0,0.2)] sm:text-xs">
                    {label}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}

export function LandingHeroSection() {
  return (
    <div className="relative border-b border-white/[0.06] bg-[#070a10]">
      {/* overflow-x-hidden only on the decorative layer so `position: sticky` on Navbar works */}
      <div className="pointer-events-none absolute inset-0 overflow-x-hidden">
        <div className="absolute inset-0 opacity-[0.09] [background-image:radial-gradient(rgba(148,163,184,0.12)_1px,transparent_1px)] [background-size:22px_22px]" />
        <div
          className="absolute inset-0 opacity-[0.022]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(148,163,184,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.12) 1px, transparent 1px)",
            backgroundSize: "100% 56px, 72px 100%",
          }}
          aria-hidden
        />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/35 to-transparent" />
      </div>

      <section
        className={`relative overflow-x-hidden pb-20 pt-10 sm:pb-36 sm:pt-20 lg:pb-32 lg:pt-24 ${LANDING_SECTION_BLEED}`}
      >
        {/* ~36% copy / ~64% mockup — mockup first on small screens for weight */}
        <div className="grid gap-8 sm:gap-10 lg:grid-cols-[minmax(0,0.36fr)_minmax(0,0.64fr)] lg:items-center lg:gap-12 xl:gap-16">
          <div className="order-2 max-w-xl lg:order-1 lg:max-w-none lg:pr-2 xl:pr-6">
            <div className="flex justify-center">
              <Eyebrow>Prop futures · multi-account desk</Eyebrow>
            </div>
            <h1 className="mt-4 text-[clamp(1.65rem,6.5vw,3.15rem)] font-semibold leading-[1.08] tracking-[-0.04em] text-white drop-shadow-[0_2px_24px_rgba(0,0,0,0.55)] sm:mt-6 sm:leading-[1.05] sm:tracking-[-0.045em]">
              Know your real prop firm profitability.
              <span className="mt-2 block h-px w-12 rounded-full bg-gradient-to-r from-cyan-400 to-amber-400/80" />
            </h1>
            <p className="mt-4 max-w-lg text-[14px] leading-relaxed text-slate-200/88 sm:mt-5 sm:text-[15px] sm:leading-relaxed md:text-base">
              Not just payouts. Every fee, every account. Everything.
            </p>
            <p className="mt-3 max-w-lg text-[14px] leading-relaxed text-slate-300/75 sm:text-[15px] md:text-base">
              Track what actually matters: fees, resets, challenges and real payouts.
            </p>
            <LandingLifecycleStrip />
            <div className="mt-8 flex w-full max-w-md flex-col gap-3 sm:mx-auto sm:mt-10 sm:max-w-none sm:flex-row sm:flex-wrap sm:items-center sm:justify-center">
              <PrimaryCta href="/register?next=/desk/dashboard" className="w-full justify-center sm:w-auto">
                Run my Desk
              </PrimaryCta>
              <SecondaryCta href="/demo" className="w-full justify-center sm:w-auto">
                See demo
              </SecondaryCta>
            </div>
          </div>

          <div className="order-1 min-w-0 lg:order-2">
            <div className="relative mx-auto w-full max-w-[min(100%,56rem)] lg:mx-0 lg:max-w-none">
              {/* Single diffuse glow behind mockup — neutral, screen-centric */}
              <div
                className="pointer-events-none absolute left-1/2 top-[42%] h-[min(72vw,28rem)] w-[min(92vw,34rem)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(ellipse_at_50%_50%,rgba(148,163,184,0.11),transparent_68%)] blur-3xl"
                aria-hidden
              />
              <div
                className="pointer-events-none absolute -inset-3 rounded-[1.85rem] shadow-[0_36px_100px_rgba(0,0,0,0.5)] sm:-inset-4 sm:rounded-[2rem]"
                aria-hidden
              />
              <div
                className="pointer-events-none absolute -inset-px rounded-[1.45rem] ring-1 ring-white/[0.08] sm:rounded-[1.55rem]"
                aria-hidden
              />
              <div
                className="relative rounded-[1.35rem] border border-white/[0.11] bg-gradient-to-b from-white/[0.06] to-transparent p-px shadow-[0_32px_90px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.05)] sm:rounded-[1.5rem] lg:scale-[1.01]"
              >
                <div className="pointer-events-none absolute inset-0 rounded-[1.3rem] bg-[radial-gradient(ellipse_at_50%_0%,rgba(255,255,255,0.04),transparent_55%)] sm:rounded-[1.42rem]" />
                <div className="relative rounded-[1.3rem] bg-[#080c12]/96 p-2 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)] sm:rounded-[1.42rem] sm:p-2.5">
                  <HeroCompositePreview hero />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
