"use client";

import Link from "next/link";

import { UpgradeToPremiumButton } from "@/components/billing/upgrade-to-premium-button";
import { useWorkspaceProfile } from "@/components/auth/workspace-profile-provider";
import { RithmicAttributionBlock } from "@/components/desk/rithmic-attribution-block";
import { SandboxIntegrations } from "@/components/desk/sandbox-integrations";
import { isPremiumActive } from "@/lib/auth/plan";

/** Same as `journal-settings-view` cards. */
const SECTION = "text-[10px] font-semibold uppercase tracking-[0.2em] text-sky-400/85";

const CARD =
  "rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.07] to-white/[0.02] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-sm";

const upgradeCtaClass =
  "mt-5 flex w-full items-center justify-center rounded-xl border border-sky-400/40 bg-gradient-to-b from-sky-500/25 via-sky-600/15 to-cyan-950/25 px-4 py-3 text-sm font-semibold text-sky-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_8px_28px_rgba(0,0,0,0.35)] ring-1 ring-sky-400/25 transition hover:border-sky-300/50 hover:from-sky-400/35";

function LockIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className={className} aria-hidden>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Integrations (Settings → under Datas). Production: blurred teaser + “Coming soon”. Development:
 * Premium unlocks the full broker UI; otherwise blurred + Premium upsell.
 */
export function DeskSandboxSettingsBlock() {
  const { profile } = useWorkspaceProfile();
  const isProd = process.env.NODE_ENV === "production";
  const premiumUnlocked = isPremiumActive(profile);
  const integrationsInteractive = !isProd && premiumUnlocked;
  const showPremiumOverlay = !isProd && !premiumUnlocked;
  const showComingSoonOverlay = isProd;

  return (
    <section id="desk-sandbox" className={`${CARD} border-white/[0.08] p-5 sm:p-6`}>
      <p className={SECTION}>Integrations</p>
      <h3 className="mt-1 text-base font-semibold text-white">Broker connections</h3>

      <div className="relative mt-5 min-h-[min(52vh,24rem)]">
        <div
          className={`${integrationsInteractive ? "" : "pointer-events-none select-none blur-[3px] opacity-[0.52]"}`}
          aria-hidden={!integrationsInteractive}
        >
          <SandboxIntegrations />
        </div>

        {showComingSoonOverlay ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center px-4 py-8">
            <div className="w-full max-w-[22rem] rounded-2xl border border-white/12 bg-gradient-to-b from-[#141a24] to-[#0a0e14] px-6 py-8 text-center shadow-[0_24px_80px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.06)]">
              <p className="inline-flex rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-white/55">
                Coming soon
              </p>
              <h3 className="mt-4 text-lg font-semibold tracking-tight text-white">Broker connections</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/50">
                Rithmic and Tradovate integrations are in progress. Check back after the next release.
              </p>
            </div>
          </div>
        ) : null}

        {showPremiumOverlay ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center px-4 py-8">
            <div className="w-full max-w-[22rem] rounded-2xl border border-white/12 bg-gradient-to-b from-[#141a24] to-[#0a0e14] px-6 py-8 text-center shadow-[0_24px_80px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.06)]">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-black/40 text-white/55">
                <LockIcon className="h-6 w-6" />
              </div>
              <p className="mt-4 inline-flex rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-white/55">
                Premium feature
              </p>
              <h3 className="mt-4 text-lg font-semibold tracking-tight text-white">Broker sync</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/50">
                Available on Premium (trial included). Upgrade to connect Rithmic, Tradovate, and unlock live broker
                sync for your accounts.
              </p>
              <UpgradeToPremiumButton className={upgradeCtaClass} cycle="monthly">
                Upgrade to Premium
              </UpgradeToPremiumButton>
              <p className="mt-4 text-center">
                <Link
                  href="/pricing"
                  className="text-xs font-medium text-sky-300/90 underline-offset-4 transition hover:text-sky-200 hover:underline"
                >
                  See pricing
                </Link>
              </p>
            </div>
          </div>
        ) : null}
      </div>

      {showComingSoonOverlay || showPremiumOverlay ? <RithmicAttributionBlock /> : null}
    </section>
  );
}
