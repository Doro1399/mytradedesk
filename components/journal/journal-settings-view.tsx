"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type ChangeEvent } from "react";
import { useSupabase } from "@/components/auth/supabase-provider";
import { useWorkspaceProfile } from "@/components/auth/workspace-profile-provider";
import { useJournal } from "@/components/journal/journal-provider";
import { useJournalStorageUserId } from "@/components/journal/journal-storage-context";
import { LANDING_NUM } from "@/components/landing/tokens";
import type { UserProfileRow } from "@/lib/auth/profile";
import {
  ACCOUNTS_UNLIMITED_CAP,
  canUseFeature,
  getTrialRemainingDays,
  isPremiumPaidActive,
  isTrialActive,
  isTrialPastDue,
} from "@/lib/auth/plan";
import { loadJournalData, saveJournalData } from "@/lib/journal/storage";
import { loadTradesStore, saveTradesStore } from "@/lib/journal/trades-storage";
import { parseWorkspaceBackupJson } from "@/lib/journal/workspace-backup";

const SECTION = "text-[10px] font-semibold uppercase tracking-[0.2em] text-sky-400/85";

const CARD =
  "rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.07] to-white/[0.02] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-sm";

function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden>
      <path d="M12 3v12" strokeLinecap="round" />
      <path d="m8 11 4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 21h14" strokeLinecap="round" />
    </svg>
  );
}

function UploadIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden>
      <path d="M12 21V9" strokeLinecap="round" />
      <path d="m16 13-4-4-4 4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 21h14" strokeLinecap="round" />
    </svg>
  );
}

function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  a.click();
  URL.revokeObjectURL(url);
}

type BillingTierId = "lite" | "premium_monthly" | "premium_annual";

const PREMIUM_MONTHLY_USD = 29.99;
const PREMIUM_YEARLY_PER_MO_USD = 19.99;
/** One yearly payment = 12 × effective monthly (shown as $19.99/mo). */
const PREMIUM_YEARLY_ONCE_USD = Math.round(PREMIUM_YEARLY_PER_MO_USD * 12 * 100) / 100;
const PREMIUM_YEARLY_SAVE_PCT = Math.round(
  ((PREMIUM_MONTHLY_USD * 12 - PREMIUM_YEARLY_ONCE_USD) / (PREMIUM_MONTHLY_USD * 12)) * 100
);

/** Placeholders — replace with Stripe Checkout URLs when billing is live. */
const STRIPE_CHECKOUT_MONTHLY_HREF = "/desk/settings?checkout=premium_monthly";
const STRIPE_CHECKOUT_YEARLY_HREF = "/desk/settings?checkout=premium_yearly";

const premiumCardInteractive =
  "group block rounded-xl border px-4 py-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[#070a10] hover:border-sky-400/35 hover:bg-white/[0.04]";

/** Sky/cyan CTA — même famille que les actions desk (export, labels). */
const premiumUpgradeCtaStrip =
  "mt-4 flex w-full items-center justify-center rounded-xl border border-sky-400/40 bg-gradient-to-b from-sky-500/25 via-sky-600/15 to-cyan-950/25 px-3 py-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_8px_28px_rgba(0,0,0,0.35)] ring-1 ring-sky-400/25 transition group-hover:border-sky-300/50 group-hover:from-sky-400/35 group-hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_0_32px_rgba(56,189,248,0.22)]";

const premiumTooltipCta =
  "mb-2 flex w-full items-center justify-center rounded-lg border border-sky-400/40 bg-gradient-to-b from-sky-500/25 via-sky-600/15 to-cyan-950/30 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.14)] ring-1 ring-sky-400/25";

function workspaceSubscriptionLabel(profile: UserProfileRow | null): string {
  if (!profile) return "—";
  if (isPremiumPaidActive(profile)) return "Premium (paid)";
  if (isTrialActive(profile)) return "Premium trial";
  if (isTrialPastDue(profile)) return "Lite (trial ended)";
  if (profile.premium_status === "expired") return "Lite · trial ended";
  return "Lite";
}

function workspaceSubscriptionTrialDetail(profile: UserProfileRow | null): string | null {
  if (!profile) return null;
  if (isPremiumPaidActive(profile)) return null;
  if (isTrialActive(profile)) {
    const days = getTrialRemainingDays(profile);
    return `${days} full day${days === 1 ? "" : "s"} left`;
  }
  if (isTrialPastDue(profile) || profile.premium_status === "expired") {
    return "Trial ended";
  }
  return null;
}

/** DB stores lowercase; show proper names (e.g. Lite, Free). */
function formatPlanForDisplay(plan: string | null | undefined): string {
  const raw = (plan ?? "").trim();
  const p = raw.toLowerCase();
  if (p === "" || p === "free") return "Free";
  if (p === "lite") return "Lite";
  return raw
    .split(/[_-]+/)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase())
    .join(" ");
}

function resolveBillingCurrentTier(profile: UserProfileRow | null): BillingTierId {
  if (!profile) return "lite";
  if (isPremiumPaidActive(profile)) {
    const p = profile.plan.trim().toLowerCase();
    if (p.includes("annual") || p.includes("year")) return "premium_annual";
    if (p.includes("monthly") || p.includes("month")) return "premium_monthly";
    if (p === "premium") return "premium_monthly";
    return "premium_monthly";
  }
  return "lite";
}

export function JournalSettingsView() {
  const supabase = useSupabase();
  const { dispatch } = useJournal();
  const { profile, accountsLimit } = useWorkspaceProfile();
  const storageUserId = useJournalStorageUserId();
  const importInputRef = useRef<HTMLInputElement>(null);
  const [authEmail, setAuthEmail] = useState<string | null>(null);
  const [exportBusy, setExportBusy] = useState(false);
  const [importBusy, setImportBusy] = useState(false);
  const [importNotice, setImportNotice] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [importHoverLocked, setImportHoverLocked] = useState(false);

  useEffect(() => {
    void supabase.auth.getUser().then(({ data: { user } }) => {
      setAuthEmail(user?.email ?? null);
    });
  }, [supabase]);

  const currentBillingTier = resolveBillingCurrentTier(profile);
  const subscriptionLabel = workspaceSubscriptionLabel(profile);
  const subscriptionTrialDetail = workspaceSubscriptionTrialDetail(profile);
  const canImportBackup = canUseFeature("import_backup", profile);
  const importLockedByPlan = !canImportBackup && Boolean(storageUserId);

  const handleExportBackup = useCallback(() => {
    if (!storageUserId || typeof window === "undefined") return;
    setExportBusy(true);
    try {
      const payload = {
        format: "mytradedesk-workspace-backup" as const,
        version: 1,
        exportedAt: new Date().toISOString(),
        userId: storageUserId,
        journal: loadJournalData(storageUserId),
        tradesStore: loadTradesStore(storageUserId),
      };
      const stamp = new Date().toISOString().slice(0, 10);
      downloadJson(`mytradedesk-backup-${stamp}.json`, payload);
    } finally {
      setExportBusy(false);
    }
  }, [storageUserId]);

  const onImportFile = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file || !storageUserId) return;
      setImportBusy(true);
      setImportNotice(null);
      try {
        const text = await file.text();
        let parsed: unknown;
        try {
          parsed = JSON.parse(text) as unknown;
        } catch {
          setImportNotice({ kind: "err", text: "This file is not valid JSON." });
          return;
        }
        const result = parseWorkspaceBackupJson(parsed);
        if (!result.ok) {
          setImportNotice({ kind: "err", text: result.error });
          return;
        }
        if (result.backupUserId && result.backupUserId !== storageUserId) {
          const ok = window.confirm(
            "This backup was exported for a different sign-in. Restoring may overwrite your current TradeDesk data. Continue?"
          );
          if (!ok) return;
        }
        dispatch({ type: "journal/hydrate", payload: result.journal });
        saveJournalData(result.journal, storageUserId);
        saveTradesStore(result.tradesStore, storageUserId);
        setImportNotice({ kind: "ok", text: "Backup restored. Journal and trades were loaded from this file." });
      } catch {
        setImportNotice({ kind: "err", text: "Could not read this file." });
      } finally {
        setImportBusy(false);
      }
    },
    [dispatch, storageUserId]
  );

  return (
    <>
      <header className="shrink-0 border-b border-white/10 bg-black/55 px-[clamp(16px,2.5vw,40px)] py-[clamp(14px,1.8vw,24px)] backdrop-blur-xl">
        <p className={SECTION}>TradeDesk</p>
        <h1 className="mt-1 text-[clamp(1.35rem,2.2vw,1.9rem)] font-semibold tracking-tight text-white">Settings</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/50">
          Account, billing, and local backup import/export for your desk.
        </p>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-auto px-[clamp(12px,2.5vw,40px)] py-6">
        <section className={`${CARD} border-violet-400/15 p-5 sm:p-6`}>
          <p className={SECTION}>Account</p>
          <h3 className="mt-1 text-base font-semibold text-white">Overview</h3>
          <dl className="mt-3 space-y-2 text-sm text-white/55">
            <div className="flex flex-wrap justify-between gap-2">
              <dt className="text-white/40">Email</dt>
              <dd className="text-right text-white/85">{authEmail ?? profile?.email ?? "—"}</dd>
            </div>
            <div className="flex flex-wrap justify-between gap-2">
              <dt className="text-white/40">Subscription</dt>
              <dd className="text-right text-white/85">{subscriptionLabel}</dd>
            </div>
            {subscriptionTrialDetail ? (
              <div className="flex flex-wrap justify-between gap-2">
                <dt className="text-white/40">Trial</dt>
                <dd className="max-w-[min(100%,20rem)] text-right text-white/75">{subscriptionTrialDetail}</dd>
              </div>
            ) : null}
            <div className="flex flex-wrap justify-between gap-2">
              <dt className="text-white/40">Plan</dt>
              <dd className="text-right text-white/85">{formatPlanForDisplay(profile?.plan)}</dd>
            </div>
            <div className="flex flex-wrap justify-between gap-2">
              <dt className="text-white/40">Tracked accounts</dt>
              <dd className="text-right font-medium text-sky-100/90">
                {accountsLimit >= ACCOUNTS_UNLIMITED_CAP ? "Unlimited" : accountsLimit}
              </dd>
            </div>
          </dl>
        </section>

        <section className={`${CARD} border-emerald-400/12 p-5 sm:p-6`}>
          <p className={SECTION}>Billing</p>
          <h3 className="mt-1 text-base font-semibold text-white">Plans</h3>
          <ul className="mt-4 grid gap-3 sm:grid-cols-3">
            <li
              className={`rounded-xl border px-4 py-4 ${
                currentBillingTier === "lite"
                  ? "border-sky-400/35 bg-sky-500/[0.08] ring-1 ring-sky-400/20"
                  : "border-white/[0.08] bg-black/20"
              }`}
            >
              <p className="text-sm font-semibold text-white">Lite</p>
              <p className="mt-1 text-xs leading-snug text-white/45">
                Limited workspace features and fewer tracked accounts.
              </p>
              <p className={`mt-3 text-lg font-bold tracking-tight text-white/90 ${LANDING_NUM}`}>Free forever</p>
              {currentBillingTier === "lite" ? (
                <span className="mt-3 inline-flex rounded-lg border border-sky-400/30 bg-sky-500/15 px-2.5 py-1 text-[11px] font-semibold text-sky-100/95">
                  Current plan
                </span>
              ) : (
                <button
                  type="button"
                  disabled
                  className="mt-3 w-full cursor-not-allowed rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-center text-[11px] font-semibold text-white/35"
                >
                  Choose (soon)
                </button>
              )}
            </li>
            {currentBillingTier === "premium_monthly" ? (
              <li className="rounded-xl border border-emerald-400/35 bg-emerald-500/[0.08] px-4 py-4 ring-1 ring-emerald-400/20">
                <p className="text-sm font-semibold text-white">Premium — monthly</p>
                <p className="mt-1 text-xs leading-snug text-white/45">Full workspace, billed every month.</p>
                <p className={`mt-2 text-lg font-bold tracking-tight text-white ${LANDING_NUM}`}>
                  $29.99<span className="text-sm font-medium text-white/45">/mo</span>
                </p>
                <p className="mt-1 text-[11px] text-white/38">Cancel anytime</p>
                <span className="mt-3 inline-flex rounded-lg border border-emerald-400/30 bg-emerald-500/15 px-2.5 py-1 text-[11px] font-semibold text-emerald-100/95">
                  Current plan
                </span>
              </li>
            ) : (
              <li className="list-none">
                <Link
                  href={STRIPE_CHECKOUT_MONTHLY_HREF}
                  prefetch={false}
                  className={`${premiumCardInteractive} border-white/[0.08] bg-black/20`}
                >
                  <p className="text-sm font-semibold text-white">Premium — monthly</p>
                  <p className="mt-1 text-xs leading-snug text-white/45">Full workspace, billed every month.</p>
                  <p className={`mt-2 text-lg font-bold tracking-tight text-white ${LANDING_NUM}`}>
                    $29.99<span className="text-sm font-medium text-white/45">/mo</span>
                  </p>
                  <p className="mt-1 text-[11px] text-white/38">Cancel anytime</p>
                  <span className={premiumUpgradeCtaStrip}>Upgrade to Premium</span>
                </Link>
              </li>
            )}
            {currentBillingTier === "premium_annual" ? (
              <li className="relative rounded-xl border border-emerald-400/35 bg-emerald-500/[0.08] px-4 py-4 ring-1 ring-emerald-400/20">
                <span className="absolute right-3 top-3 rounded-full border border-emerald-400/35 bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-100">
                  Save {PREMIUM_YEARLY_SAVE_PCT}%
                </span>
                <p className="pr-[4.5rem] text-sm font-semibold text-white sm:pr-24">Premium — yearly</p>
                <p className="mt-1 text-xs leading-snug text-white/45">Full workspace, best value on a yearly cycle.</p>
                <p className={`mt-2 text-lg font-bold tracking-tight text-white ${LANDING_NUM}`}>
                  $19.99<span className="text-sm font-medium text-white/45">/mo</span>
                </p>
                <p className={`mt-1 text-[11px] text-white/38 ${LANDING_NUM}`}>
                  ${PREMIUM_YEARLY_ONCE_USD.toFixed(2)} paid once
                </p>
                <span className="mt-3 inline-flex rounded-lg border border-emerald-400/30 bg-emerald-500/15 px-2.5 py-1 text-[11px] font-semibold text-emerald-100/95">
                  Current plan
                </span>
              </li>
            ) : (
              <li className="list-none">
                <Link
                  href={STRIPE_CHECKOUT_YEARLY_HREF}
                  prefetch={false}
                  className={`${premiumCardInteractive} relative border-white/[0.08] bg-black/20`}
                >
                  <span className="absolute right-3 top-3 rounded-full border border-emerald-400/35 bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-100">
                    Save {PREMIUM_YEARLY_SAVE_PCT}%
                  </span>
                  <p className="pr-[4.5rem] text-sm font-semibold text-white sm:pr-24">Premium — yearly</p>
                  <p className="mt-1 text-xs leading-snug text-white/45">Full workspace, best value on a yearly cycle.</p>
                  <p className={`mt-2 text-lg font-bold tracking-tight text-white ${LANDING_NUM}`}>
                    $19.99<span className="text-sm font-medium text-white/45">/mo</span>
                  </p>
                  <p className={`mt-1 text-[11px] text-white/38 ${LANDING_NUM}`}>
                    ${PREMIUM_YEARLY_ONCE_USD.toFixed(2)} paid once
                  </p>
                  <span className={premiumUpgradeCtaStrip}>Upgrade to Premium</span>
                </Link>
              </li>
            )}
          </ul>
        </section>

        <section className={`${CARD} border-white/[0.08] p-5 sm:p-6`}>
          <p className={SECTION}>Datas</p>
          <h3 className="mt-1 text-base font-semibold text-white">Local storage</h3>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <input
              ref={importInputRef}
              type="file"
              accept="application/json,.json"
              className="sr-only"
              onChange={onImportFile}
            />
            <button
              type="button"
              disabled={!storageUserId || exportBusy}
              onClick={handleExportBackup}
              className="inline-flex items-center gap-2 rounded-xl border border-sky-400/40 bg-sky-500/15 px-4 py-2.5 text-sm font-semibold text-sky-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition hover:border-sky-300/50 hover:bg-sky-500/22 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/[0.04] disabled:text-white/35"
            >
              <DownloadIcon className="h-4 w-4 shrink-0" />
              {exportBusy ? "Exporting…" : "Export backup"}
            </button>
            <div
              className="relative inline-flex"
              onPointerEnter={() => {
                if (importLockedByPlan) setImportHoverLocked(true);
              }}
              onPointerLeave={() => setImportHoverLocked(false)}
            >
              <button
                type="button"
                disabled={!storageUserId || importBusy || !canImportBackup}
                onClick={() => importInputRef.current?.click()}
                className="inline-flex items-center gap-2 rounded-xl border border-violet-400/40 bg-violet-500/15 px-4 py-2.5 text-sm font-semibold text-violet-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition hover:border-violet-300/50 hover:bg-violet-500/22 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/[0.04] disabled:text-white/35"
              >
                <UploadIcon className="h-4 w-4 shrink-0" />
                {importBusy ? "Importing…" : "Import backup"}
              </button>
              {importLockedByPlan ? (
                <div
                  role="tooltip"
                  className={`pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 w-[min(18rem,calc(100vw-2rem))] -translate-x-1/2 rounded-xl border border-white/[0.12] bg-gradient-to-b from-[#141a24] to-[#0a0e14] px-3 py-2.5 text-left shadow-[0_12px_40px_rgba(0,0,0,0.55)] transition-opacity duration-150 ${
                    importHoverLocked ? "opacity-100" : "opacity-0"
                  }`}
                >
                  <div className={premiumTooltipCta}>Upgrade to Premium</div>
                  <p className="text-[11px] leading-snug text-white/68">
                    Import is available on Premium. Lite can export backups only.
                  </p>
                </div>
              ) : null}
            </div>
            {!storageUserId ? (
              <p className="text-xs text-amber-200/80">Sign in to import or export data tied to your account.</p>
            ) : null}
          </div>
          {importNotice ? (
            <p
              className={`mt-4 text-sm ${importNotice.kind === "ok" ? "text-emerald-200/90" : "text-rose-200/90"}`}
              role="status"
            >
              {importNotice.text}
            </p>
          ) : null}
        </section>
      </div>
    </>
  );
}
