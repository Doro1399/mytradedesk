"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { AuthForm } from "@/components/auth/auth-form";
import { useSupabase } from "@/components/auth/supabase-provider";
import { LANDING_SECTION_BLEED } from "./landing-layout";
import { LANDING_MICRO } from "./tokens";
import { PricingPlanCards, type PricingPlanId } from "./pricing-plan-cards";

const ONBOARDING_NEXT = "/desk/onboarding";

function RegisterModalFallback() {
  return (
    <div className="flex min-h-[320px] w-full max-w-[440px] items-center justify-center rounded-2xl border border-white/10 bg-[#080c12]/90 px-8 py-12 text-sm text-white/55">
      Loading…
    </div>
  );
}

/** Standalone `/pricing` page: plan cards + register modal only (not embedded on the home page). */
export function PricingPageClient() {
  const router = useRouter();
  const supabase = useSupabase();
  const [registerOpen, setRegisterOpen] = useState(false);

  const handlePlanCta = useCallback(
    async (_plan: PricingPlanId) => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        router.push(ONBOARDING_NEXT);
        return;
      }
      setRegisterOpen(true);
    },
    [router, supabase]
  );

  useEffect(() => {
    if (!registerOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setRegisterOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [registerOpen]);

  return (
    <>
      <section
        className={`relative flex min-h-0 flex-1 flex-col justify-center overflow-x-hidden overflow-y-auto overscroll-y-contain py-8 sm:py-10 ${LANDING_SECTION_BLEED}`}
      >
        <div className="relative z-[1] mx-auto w-full max-w-6xl">
          <header className="mx-auto max-w-3xl pb-8 text-center sm:pb-10">
            <h1 className="text-[clamp(1.85rem,5vw,2.85rem)] font-semibold tracking-[-0.035em] text-white">
              Built for serious prop traders
            </h1>
            <p
              className={`mt-4 text-[clamp(1.05rem,2.1vw,1.35rem)] leading-relaxed text-slate-200/80 sm:mt-5 ${LANDING_MICRO}`}
            >
              Start free. And scale as you grow.
            </p>
          </header>
          <PricingPlanCards mode="landing-capture" onPlanCta={handlePlanCta} />
        </div>
      </section>

      {registerOpen ? (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center overflow-y-auto p-4 sm:p-6"
          role="presentation"
          onClick={() => setRegisterOpen(false)}
        >
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-md"
            aria-hidden
          />
          <div
            className="relative z-[1] my-auto w-full max-w-[480px]"
            role="dialog"
            aria-modal="true"
            aria-label="Create an account"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setRegisterOpen(false)}
              className="absolute right-0 top-0 z-[2] -translate-y-1 translate-x-0 rounded-full border border-white/15 bg-black/50 px-3 py-1.5 text-xs font-medium text-white/80 transition hover:border-white/25 hover:bg-black/70 sm:-translate-y-2 sm:translate-x-2"
            >
              Close
            </button>
            <Suspense fallback={<RegisterModalFallback />}>
              <AuthForm variant="register" redirectNext={ONBOARDING_NEXT} />
            </Suspense>
          </div>
        </div>
      ) : null}
    </>
  );
}
