import type { ReactNode } from "react";

import { UpgradeToPremiumButton } from "@/components/billing/upgrade-to-premium-button";
import {
  PREMIUM_MONTHLY_USD,
  PREMIUM_YEARLY_EFFECTIVE_MONTHLY_USD,
  PREMIUM_YEARLY_ONCE_USD,
} from "@/lib/billing/public-pricing";
import { LANDING_NUM } from "./tokens";

export type PricingPlanId = "lite" | "monthly" | "yearly";

const cardBase =
  "flex h-full min-h-0 flex-col rounded-2xl border border-white/[0.09] bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-sm sm:p-6";

const checkRow = "flex gap-2.5 text-sm leading-snug text-slate-200/88";

function CheckItem({ children }: { children: ReactNode }) {
  return (
    <li className={checkRow}>
      <span className="shrink-0 font-medium text-emerald-400/95" aria-hidden>
        ✔
      </span>
      <span>{children}</span>
    </li>
  );
}

const ctaGhost =
  "inline-flex w-full items-center justify-center rounded-xl border border-white/14 bg-white/[0.06] px-4 py-2.5 text-center text-sm font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition hover:border-white/22 hover:bg-white/[0.1]";

const ctaSky =
  "inline-flex w-full items-center justify-center rounded-xl border border-sky-400/40 bg-gradient-to-b from-sky-500/25 via-sky-600/15 to-cyan-950/25 px-4 py-2.5 text-center text-sm font-semibold text-sky-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_8px_28px_rgba(0,0,0,0.35)] ring-1 ring-sky-400/20 transition hover:border-sky-300/50 hover:from-sky-400/35";

const ctaEmerald =
  "inline-flex w-full items-center justify-center rounded-xl border border-emerald-400/40 bg-gradient-to-b from-emerald-500/25 via-emerald-600/15 to-emerald-950/25 px-4 py-2.5 text-center text-sm font-semibold text-emerald-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_8px_28px_rgba(0,0,0,0.35)] ring-1 ring-emerald-400/20 transition hover:border-emerald-300/50 hover:from-emerald-400/35";

type LandingCaptureProps = {
  mode: "landing-capture";
  onPlanCta: (plan: PricingPlanId) => void;
};

type OnboardingCheckoutProps = {
  mode: "onboarding-checkout";
  onLiteContinue: () => void;
};

export type PricingPlanCardsProps = LandingCaptureProps | OnboardingCheckoutProps;

export function PricingPlanCards(props: PricingPlanCardsProps) {
  const landing = props.mode === "landing-capture";
  const onPlanCta = landing ? props.onPlanCta : undefined;
  const onLiteContinue = !landing ? props.onLiteContinue : undefined;

  return (
    <div className="w-full">
    <ul className="grid gap-5 lg:grid-cols-3 lg:gap-6 lg:items-stretch">
      {/* Lite */}
      <li className={`${cardBase} border-slate-500/20`}>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400/85">Lite plan</p>
        <p className="mt-2 text-lg font-semibold text-white">Free</p>
        <p className={`mt-1 text-3xl font-bold tracking-tight text-white sm:text-4xl ${LANDING_NUM}`}>$0</p>
        <ul className="mt-5 flex flex-col gap-2.5">
          <CheckItem>Up to 2 prop firm accounts</CheckItem>
          <CheckItem>Core tracking</CheckItem>
          <CheckItem>Basic insights</CheckItem>
        </ul>
        <p className="mt-4 text-xs leading-relaxed text-sky-200/75">→ Includes 14-day full Premium access</p>
        <p className="mt-3">
          <span className="inline-flex rounded-full border border-emerald-400/35 bg-emerald-500/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-100/95">
            No credit card required
          </span>
        </p>
        <div className="mt-auto w-full pt-6">
          {landing ? (
            <button type="button" className={ctaGhost} onClick={() => onPlanCta?.("lite")}>
              Start free
            </button>
          ) : (
            <button type="button" className={ctaGhost} onClick={() => onLiteContinue?.()}>
              Continue with Lite
            </button>
          )}
        </div>
      </li>

      {/* Premium monthly */}
      <li className={`${cardBase} border-emerald-400/25 ring-1 ring-emerald-400/15`}>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-300/85">Premium plan monthly</p>
        <p className="mt-2 text-lg font-semibold text-white">Premium</p>
        <p className={`mt-1 text-3xl font-bold tracking-tight text-white sm:text-4xl ${LANDING_NUM}`}>
          ${PREMIUM_MONTHLY_USD.toFixed(2)}
          <span className="text-base font-semibold text-white/45">/month</span>
        </p>
        <ul className="mt-5 flex flex-col gap-2.5">
          <CheckItem>Unlimited accounts</CheckItem>
          <CheckItem>Full analytics</CheckItem>
          <CheckItem>Payout tracking</CheckItem>
          <CheckItem>Advanced insights</CheckItem>
        </ul>
        <div className="mt-auto w-full pt-6">
          {landing ? (
            <button type="button" className={ctaSky} onClick={() => onPlanCta?.("monthly")}>
              Upgrade
            </button>
          ) : (
            <UpgradeToPremiumButton cycle="monthly" className={ctaSky}>
              Upgrade
            </UpgradeToPremiumButton>
          )}
        </div>
      </li>

      {/* Premium yearly */}
      <li className={`${cardBase} relative border-emerald-400/30 ring-1 ring-emerald-400/20`}>
        <span className="absolute right-3 top-3 rounded-full border border-emerald-400/35 bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-100">
          Best value
        </span>
        <p className="pr-24 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-300/85 sm:pr-28">
          Premium plan yearly
        </p>
        <p className="mt-2 text-lg font-semibold text-white">Premium (Yearly)</p>
        <div className="mt-1">
          <p className={`text-3xl font-bold tracking-tight text-white sm:text-4xl ${LANDING_NUM}`}>
            ${PREMIUM_YEARLY_EFFECTIVE_MONTHLY_USD.toFixed(2)}
            <span className="text-base font-semibold text-white/45">/month</span>
          </p>
          <p className={`mt-0.5 text-[11px] text-white/42 ${LANDING_NUM}`}>
            billed ${PREMIUM_YEARLY_ONCE_USD.toFixed(2)}/year
          </p>
        </div>
        <ul className="mt-5 flex flex-col gap-2.5">
          <CheckItem>Everything in Premium</CheckItem>
          <CheckItem>3 months free</CheckItem>
        </ul>
        <div className="mt-auto w-full pt-6">
          {landing ? (
            <button type="button" className={ctaEmerald} onClick={() => onPlanCta?.("yearly")}>
              Get yearly
            </button>
          ) : (
            <UpgradeToPremiumButton cycle="yearly" className={ctaEmerald}>
              Get yearly
            </UpgradeToPremiumButton>
          )}
        </div>
      </li>
    </ul>
    <p className={`mt-6 text-center text-[11px] text-white/40 ${LANDING_NUM}`}>Cancel anytime</p>
    </div>
  );
}
