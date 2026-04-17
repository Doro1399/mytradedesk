"use client";

import { useWorkspaceProfileOptional } from "@/components/auth/workspace-profile-provider";
import {
  getTrialRemainingDays,
  shouldShowLitePlanBanner,
  shouldShowTrialExpiryBanner,
} from "@/lib/auth/plan";

/**
 * Workspace plan notices: trial last week, then Lite limits after trial (or legacy free/lite).
 */
export function PlanBanner() {
  const ctx = useWorkspaceProfileOptional();
  const profile = ctx?.profile ?? null;

  const trialDays = getTrialRemainingDays(profile);

  if (shouldShowTrialExpiryBanner(profile)) {
    return (
      <div
        role="region"
        aria-label="Trial notice"
        className="relative z-[1] shrink-0 border-b border-sky-500/35 bg-gradient-to-r from-sky-950/90 via-[#0a1520] to-sky-950/90 px-4 py-2.5 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
      >
        <p className="text-[13px] leading-snug text-sky-50/95">
          <span className="font-semibold text-sky-100">Your premium plan expires in {trialDays} days</span>
        </p>
      </div>
    );
  }

  if (!shouldShowLitePlanBanner(profile)) return null;

  return (
    <div
      role="region"
      aria-label="Plan notice"
      className="relative z-[1] shrink-0 border-b border-rose-500/30 bg-gradient-to-r from-rose-950/95 via-[#1c0a0c] to-rose-950/95 px-4 py-2.5 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
    >
      <p className="text-[13px] leading-snug text-rose-50/95">
        <span className="font-semibold text-rose-100">Lite plan</span>
        <span className="text-rose-200/75"> — </span>
        <span className="text-rose-100/90">Some features are limited.</span>
      </p>
    </div>
  );
}
