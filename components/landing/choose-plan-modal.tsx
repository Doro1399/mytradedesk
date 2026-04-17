"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { PricingPlanCards } from "@/components/landing/pricing-plan-cards";

const dismissPlanModalClass =
  "absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-white/[0.14] bg-gradient-to-b from-white/[0.1] to-white/[0.03] text-white/55 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_10px_32px_rgba(0,0,0,0.45)] ring-1 ring-white/[0.06] transition hover:border-emerald-400/40 hover:text-emerald-50/95 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_0_28px_rgba(16,185,129,0.2)] active:translate-y-px sm:right-4 sm:top-4";

function ModalDismissIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

/**
 * Post-auth onboarding: dim overlay (no blur), same three plan cards; paid CTAs go to Stripe.
 */
export function ChoosePlanModal() {
  const router = useRouter();

  function dismissToDesk() {
    router.push("/desk/dashboard");
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") router.push("/desk/dashboard");
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

  return (
    <div
      className="fixed inset-0 z-[280] flex items-center justify-center overflow-y-auto bg-black/82 p-4 sm:p-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby="choose-plan-title"
    >
      <div className="relative my-auto w-full max-w-6xl rounded-[1.35rem] border border-white/[0.1] bg-[#070a10]/98 p-5 shadow-[0_40px_120px_rgba(0,0,0,0.75)] sm:p-8 md:p-10">
        <button
          type="button"
          onClick={dismissToDesk}
          className={dismissPlanModalClass}
          aria-label="Close and go to desk"
        >
          <ModalDismissIcon className="shrink-0" />
        </button>
        <div className="mx-auto max-w-2xl px-2 pt-1 text-center sm:px-10">
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
