"use client";

import { useRouter } from "next/navigation";

import { PricingPlanCards } from "@/components/landing/pricing-plan-cards";

/**
 * Post-auth onboarding: dim overlay (no blur), same three plan cards; paid CTAs go to Stripe.
 */
export function ChoosePlanModal() {
  const router = useRouter();

  return (
    <div
      className="fixed inset-0 z-[280] flex items-center justify-center overflow-y-auto bg-black/82 p-4 sm:p-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby="choose-plan-title"
    >
      <div className="relative my-auto w-full max-w-6xl rounded-[1.35rem] border border-white/[0.1] bg-[#070a10]/98 p-5 shadow-[0_40px_120px_rgba(0,0,0,0.75)] sm:p-8 md:p-10">
        <div className="mx-auto max-w-2xl text-center">
          <h2 id="choose-plan-title" className="text-xl font-semibold tracking-[-0.03em] text-white sm:text-2xl">
            Choose your plan
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-300/85">
            Pick Lite to start free, or subscribe to Premium. You can change this anytime in Settings.
          </p>
        </div>
        <div className="mt-8 md:mt-10">
          <PricingPlanCards mode="onboarding-checkout" onLiteContinue={() => router.push("/desk/dashboard")} />
        </div>
      </div>
    </div>
  );
}
