"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AccountViewModal } from "@/components/journal/account-view-modal";
import { resolveAccountDisplayName, useAutoAccountLabelById } from "@/components/journal/account-auto-labels";
import { useJournal } from "@/components/journal/journal-provider";
import {
  PassedConvertModalHost,
  type PassedConvertFlow,
} from "@/components/journal/passed-convert-modals";
import {
  AddPayoutModal,
  type PayoutModalAccountLine,
} from "@/components/journal/add-payout-modal";
import { dispatchFundConversion } from "@/lib/journal/fund-conversion-actions";
import {
  APEX_FUNDED_PAYOUT_DASHBOARD_REMINDER,
  effectiveProgress01,
  tryBuildApexFundedRunway,
} from "@/lib/journal/apex-funded-progress";
import { isApexJournalAccount } from "@/lib/journal/apex-journal-rules";
import {
  LUCID_DIRECT_FUNDED_PAYOUT_DASHBOARD_REMINDER,
  tryBuildLucidDirectFundedRunway,
} from "@/lib/journal/lucid-direct-funded-runway";
import { tryBuildLucidFlexFundedRunway } from "@/lib/journal/lucid-flex-funded-payout-state";
import {
  LUCID_PRO_FUNDED_PAYOUT_DASHBOARD_REMINDER,
  tryBuildLucidProFundedRunway,
} from "@/lib/journal/lucid-pro-funded-runway";
import {
  getLucidDirectFundedBlockForAccount,
  getLucidFlexFundedBlockForAccount,
  isLucidDirectFundedJournalAccount,
  isLucidFlexFundedJournalAccount,
  isLucidProFundedJournalAccount,
} from "@/lib/journal/lucid-journal-rules";
import { LUCID_FLEX_FUNDED_PAYOUT_DASHBOARD_REMINDER } from "@/lib/journal/lucid-flex-funded-payout-state";
import {
  TPT_FUNDED_PAYOUT_DASHBOARD_REMINDER,
  tryBuildTptFundedRunway,
} from "@/lib/journal/tpt-funded-runway";
import {
  FUNDED_NEXT_BOLT_PAYOUT_DASHBOARD_REMINDER,
  tryBuildFundedNextBoltFundedRunway,
} from "@/lib/journal/funded-next-bolt-funded-runway";
import {
  FUNDED_NEXT_LEGACY_PAYOUT_DASHBOARD_REMINDER,
  tryBuildFundedNextLegacyFundedRunway,
} from "@/lib/journal/funded-next-legacy-funded-runway";
import {
  FUNDED_NEXT_RAPID_PAYOUT_DASHBOARD_REMINDER,
  tryBuildFundedNextRapidFundedRunway,
} from "@/lib/journal/funded-next-rapid-funded-runway";
import {
  MFFU_FLEX_PAYOUT_DASHBOARD_REMINDER,
  tryBuildMffuFlexSimFundedRunway,
} from "@/lib/journal/mffu-flex-sim-funded-runway";
import {
  MFFU_PRO_PAYOUT_DASHBOARD_REMINDER,
  tryBuildMffuProSimFundedRunway,
} from "@/lib/journal/mffu-pro-sim-funded-runway";
import {
  MFFU_RAPID_PAYOUT_DASHBOARD_REMINDER,
  tryBuildMffuRapidSimFundedRunway,
} from "@/lib/journal/mffu-rapid-sim-funded-runway";
import {
  BULENOX_FUNDED_PAYOUT_DASHBOARD_REMINDER,
  isBulenoxFundedSimplePayoutJournalAccount,
  tryBuildBulenoxFundedSimpleRunway,
} from "@/lib/journal/bulenox-master-funded-runway";
import {
  TAURUS_ARENA_FUNDED_PAYOUT_DASHBOARD_REMINDER,
  tryBuildTaurusArenaFundedRunway,
} from "@/lib/journal/taurus-arena-funded-runway";
import { isTaurusArenaFundedJournalAccount } from "@/lib/journal/taurus-arena-journal-rules";
import {
  TRADEDAY_FUNDED_PAYOUT_DASHBOARD_REMINDER,
  tryBuildTradeDayFundedRunway,
} from "@/lib/journal/tradeday-funded-runway";
import {
  isTradeDayFundedJournalAccount,
  sumNonRejectedJournalPayoutGrossCents,
  tradedayTraderNetFromGrossMarginal,
} from "@/lib/journal/tradeday-journal-rules";
import {
  PHIDIAS_FUNDED_PAYOUT_DASHBOARD_REMINDER,
  tryBuildPhidiasFundedRunway,
} from "@/lib/journal/phidias-funded-runway";
import { isPhidiasFundedJournalAccount } from "@/lib/journal/phidias-journal-rules";
import {
  ELITE_TRADER_FUNDING_FUNDED_PAYOUT_DASHBOARD_REMINDER,
  tryBuildEliteTraderFundingFundedRunway,
} from "@/lib/journal/elite-trader-funding-funded-runway";
import { isEliteTraderFundingFundedJournalAccount } from "@/lib/journal/elite-trader-funding-journal-rules";
import {
  BLUSKY_FUNDED_PAYOUT_DASHBOARD_REMINDER,
  tryBuildBluskyFundedRunway,
} from "@/lib/journal/blusky-funded-runway";
import { isBluskyFundedJournalAccount } from "@/lib/journal/blusky-journal-rules";
import {
  DAYTRADERS_FUNDED_PAYOUT_DASHBOARD_REMINDER,
  tryBuildDaytradersFundedRunway,
} from "@/lib/journal/daytraders-funded-runway";
import { isDaytradersFundedJournalAccount } from "@/lib/journal/daytraders-journal-rules";
import {
  FFN_FUNDED_PAYOUT_DASHBOARD_REMINDER,
  tryBuildFundedFuturesNetworkFundedRunway,
} from "@/lib/journal/funded-futures-network-funded-runway";
import { getFundedFuturesNetworkFundedRowOrNull } from "@/lib/journal/funded-futures-network-journal-rules";
import { isMffuFlexSimFundedJournalAccount } from "@/lib/journal/mffu-flex-sim-funded-journal-rules";
import { isMffuProSimFundedJournalAccount } from "@/lib/journal/mffu-pro-sim-funded-journal-rules";
import { isMffuRapidSimFundedJournalAccount } from "@/lib/journal/mffu-rapid-sim-funded-journal-rules";
import { isTakeProfitTraderJournalAccount } from "@/lib/journal/tpt-journal-rules";
import {
  TRADEIFY_GROWTH_FUNDED_PAYOUT_DASHBOARD_REMINDER,
  tryBuildTradeifyGrowthFundedRunway,
} from "@/lib/journal/tradeify-growth-funded-runway";
import {
  TRADEIFY_LIGHTNING_FUNDED_PAYOUT_DASHBOARD_REMINDER,
  tryBuildTradeifyLightningFundedRunway,
} from "@/lib/journal/tradeify-lightning-funded-runway";
import {
  TRADEIFY_SELECT_DAILY_FUNDED_PAYOUT_DASHBOARD_REMINDER,
  tryBuildTradeifySelectDailyFundedRunway,
} from "@/lib/journal/tradeify-select-daily-funded-runway";
import {
  TRADEIFY_SELECT_FLEX_FUNDED_PAYOUT_DASHBOARD_REMINDER,
  tryBuildTradeifySelectFlexFundedRunway,
} from "@/lib/journal/tradeify-select-flex-funded-runway";
import {
  TOPSTEP_FUNDED_PAYOUT_DASHBOARD_REMINDER,
  tryBuildTopStepFundedRunway,
} from "@/lib/journal/topstep-funded-runway";
import { isTopStepFundedJournalAccount } from "@/lib/journal/topstep-journal-rules";
import {
  AQUA_FUTURES_CUMULATIVE_SPLIT_THRESHOLD_CENTS,
  AQUA_FUTURES_FUNDED_PAYOUT_DASHBOARD_REMINDER,
  isAquaFuturesFundedJournalAccount,
  tryBuildAquaFuturesFundedRunway,
} from "@/lib/journal/aquafutures-funded-runway";
import {
  FUTURES_ELITE_FUNDED_PAYOUT_DASHBOARD_REMINDER,
  getFuturesEliteFundedBlockForJournalAccount,
  isFuturesEliteFundedJournalAccount,
  tryBuildFuturesEliteFundedRunway,
} from "@/lib/journal/futures-elite-funded-runway";
import {
  ALPHA_FUTURES_FUNDED_PAYOUT_DASHBOARD_REMINDER,
  getAlphaFuturesFundedBlockForJournalAccount,
  isAlphaFuturesFundedJournalAccount,
  tryBuildAlphaFuturesFundedRunway,
} from "@/lib/journal/alpha-futures-funded-runway";
import {
  alphaFuturesStandardPriorPaidCountForNewPayout,
  alphaFuturesStandardTraderSplitRatioFromPriorPaidCount,
} from "@/lib/journal/alpha-futures-standard-payout-split";
import {
  LEGENDS_TRADING_FUNDED_PAYOUT_DASHBOARD_REMINDER,
  getLegendsTradingFundedBlockForJournalAccount,
  isLegendsTradingFundedJournalAccount,
  tryBuildLegendsTradingFundedRunway,
} from "@/lib/journal/legends-trading-funded-runway";
import {
  YRM_PROP_FUNDED_PAYOUT_DASHBOARD_REMINDER,
  isYrmPropFundedJournalAccount,
  tryBuildYrmPropFundedRunway,
} from "@/lib/journal/yrm-prop-funded-runway";
import {
  isFundedNextBoltFundedJournalAccount,
  isFundedNextLegacyFundedJournalAccount,
  isFundedNextRapidFundedJournalAccount,
} from "@/lib/journal/funded-next-journal-rules";
import {
  isTradeifyGrowthFundedJournalAccount,
  isTradeifyLightningFundedJournalAccount,
  isTradeifySelectDailyFundedJournalAccount,
  isTradeifySelectFlexFundedJournalAccount,
  tradeifyProfitSplitRatioFromLabel,
} from "@/lib/journal/tradeify-journal-rules";
import { getFundedPhaseProfitCents } from "@/lib/journal/funded-phase-pnl";
import { isJournalOtherPropFirm } from "@/lib/journal/journal-other-firm";
import { isoDateLocal } from "@/lib/journal/local-iso-date";
import { nowIso } from "@/lib/journal/reducer";
import { getAccountFinancialMetrics } from "@/lib/journal/selectors";
import type { JournalDataV1 } from "@/lib/journal/types";
import {
  accountBelongsToProgressLane,
  buildAccountProgressModel,
  goalModeForAccount,
  sortBlownByRecency,
  sortProgressModels,
  type AccountProgressModel,
  type ProgressLane,
} from "@/lib/journal/progress-metrics";
import { propFirms } from "@/lib/prop-firms";
import { syncJournalPnlFromStoredTrades } from "@/lib/journal/trades-journal-sync";
import { useJournalStorageUserId } from "@/components/journal/journal-storage-context";
import { loadTradesStore } from "@/lib/journal/trades-storage";

type ProgressFirmGroup = {
  firmName: string;
  logoSrc: string | null;
  models: AccountProgressModel[];
};

function logoSrcForJournalFirmName(firmName: string): string | null {
  const n = firmName.trim();
  const row = propFirms.find((f) => f.name.trim() === n);
  return row?.firmLogoSrc ?? null;
}

function firmSectionSlug(name: string): string {
  const s = name.trim().replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "");
  return s || "firm";
}

function groupProgressModelsByFirm(
  list: AccountProgressModel[],
  lane: ProgressLane
): ProgressFirmGroup[] {
  const map = new Map<string, AccountProgressModel[]>();
  for (const m of list) {
    const fname = m.account.propFirm.name.trim() || "Other";
    let bucket = map.get(fname);
    if (!bucket) {
      bucket = [];
      map.set(fname, bucket);
    }
    bucket.push(m);
  }
  const cmp = lane === "blown" ? sortBlownByRecency : sortProgressModels;
  for (const arr of map.values()) {
    arr.sort(cmp);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b, undefined, { sensitivity: "base" }))
    .map(([firmName, models]) => ({
      firmName,
      logoSrc: logoSrcForJournalFirmName(firmName),
      models,
    }));
}

function formatUsdCents(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

function formatUsdCentsCompact(cents: number): string {
  const neg = cents < 0;
  const a = Math.abs(cents);
  const s = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(a / 100);
  return neg ? `-${s}` : s;
}

function missingGoalRunwayCaption(m: AccountProgressModel): { text: string; className: string } {
  if (m.lane === "funded") {
    if (isJournalOtherPropFirm(m.account)) {
      return {
        text: "Set buffer (USD) in account view",
        className: "text-[10px] text-amber-200/55",
      };
    }
    return { text: "No buffer required", className: "text-[10px] text-slate-400/85" };
  }
  return {
    text: isJournalOtherPropFirm(m.account)
      ? "Set profit target (USD) in account view"
      : "Goal unknown — set program in Accounts",
    className: "text-[10px] text-amber-200/55",
  };
}

function ProgressRing({
  progress01,
  className,
  strokeClass,
}: {
  progress01: number;
  className?: string;
  strokeClass: string;
}) {
  const r = 42;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(1, progress01));
  /** Offset + dash length = c : même logique que la barre horizontale (0 → vide, 1 → anneau plein). */
  const dashOffset = c * (1 - p);
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden>
      <circle
        cx="50"
        cy="50"
        r={r}
        fill="none"
        stroke="currentColor"
        strokeWidth="7"
        className="text-slate-600/45"
      />
      <circle
        cx="50"
        cy="50"
        r={r}
        fill="none"
        stroke="currentColor"
        strokeWidth="7"
        strokeLinecap="round"
        strokeDasharray={`${c} ${c}`}
        strokeDashoffset={dashOffset}
        transform="rotate(-90 50 50)"
        className={strokeClass}
        style={{
          filter: "drop-shadow(0 0 10px currentColor)",
        }}
      />
    </svg>
  );
}

function evalTargetReachedForConvert(m: AccountProgressModel): boolean {
  return (
    m.lane === "challenge" &&
    m.displayState === "active" &&
    !m.missingGoal &&
    m.goalCents != null &&
    m.currentCents >= m.goalCents
  );
}

function MissionCard({
  model,
  label,
  state,
  editable,
  onOpenAccount,
  onConvertToFunded,
  onApexAddPayout,
  apexPayoutCommit,
}: {
  model: AccountProgressModel;
  label: string;
  state: JournalDataV1;
  /** Lite overflow / plan lock — hide funded conversion & payout CTAs. */
  editable: boolean;
  onOpenAccount: (accountId: string) => void;
  onConvertToFunded?: (accountId: string) => void;
  onApexAddPayout?: (accountId: string, suggestedUsd: number | null) => void;
  apexPayoutCommit: { tick: number; accountIds: string[] };
}) {
  const {
    account,
    goalTitle,
    startCents,
    currentCents,
    goalCents,
    ageDays,
    usdPerDay,
    displayState,
    missingGoal,
    lane,
  } = model;
  const missingRunway = missingGoal ? missingGoalRunwayCaption(model) : null;
  const showConvertToFundedCta =
    editable && onConvertToFunded != null && evalTargetReachedForConvert(model);

  const yrmPropFundedRunway = useMemo(() => {
    if (lane !== "funded") return null;
    if (account.accountType !== "funded" && account.accountType !== "live") return null;
    if (!isYrmPropFundedJournalAccount(account)) return null;
    return tryBuildYrmPropFundedRunway(state, account, { startCents, currentCents });
  }, [lane, account, startCents, currentCents, state]);

  const aquaFuturesFundedRunway = useMemo(() => {
    if (lane !== "funded") return null;
    if (account.accountType !== "funded" && account.accountType !== "live") return null;
    if (!isAquaFuturesFundedJournalAccount(account)) return null;
    return tryBuildAquaFuturesFundedRunway(state, account, { startCents, currentCents });
  }, [lane, account, startCents, currentCents, state]);

  const futuresEliteFundedRunway = useMemo(() => {
    if (lane !== "funded") return null;
    if (account.accountType !== "funded" && account.accountType !== "live") return null;
    if (!isFuturesEliteFundedJournalAccount(account)) return null;
    return tryBuildFuturesEliteFundedRunway(state, account, { startCents, currentCents });
  }, [lane, account, startCents, currentCents, state]);

  const alphaFuturesFundedRunway = useMemo(() => {
    if (lane !== "funded") return null;
    if (account.accountType !== "funded" && account.accountType !== "live") return null;
    if (!isAlphaFuturesFundedJournalAccount(account)) return null;
    return tryBuildAlphaFuturesFundedRunway(state, account, { startCents, currentCents });
  }, [lane, account, startCents, currentCents, state]);

  const legendsTradingFundedRunway = useMemo(() => {
    if (lane !== "funded") return null;
    if (account.accountType !== "funded" && account.accountType !== "live") return null;
    if (!isLegendsTradingFundedJournalAccount(account)) return null;
    return tryBuildLegendsTradingFundedRunway(state, account, { startCents, currentCents });
  }, [lane, account, startCents, currentCents, state]);

  const topStepRunway = useMemo(() => {
    if (lane !== "funded") return null;
    if (account.accountType !== "funded" && account.accountType !== "live") return null;
    if (!isTopStepFundedJournalAccount(account)) return null;
    return tryBuildTopStepFundedRunway(state, account, { startCents, currentCents });
  }, [lane, account, startCents, currentCents, state]);

  const tptRunway = useMemo(() => {
    if (topStepRunway != null) return null;
    if (lane !== "funded") return null;
    if (account.accountType !== "funded" && account.accountType !== "live") return null;
    return tryBuildTptFundedRunway(state, account, { startCents, currentCents });
  }, [topStepRunway, lane, account, startCents, currentCents, state]);

  const tradeifyGrowthRunway = useMemo(() => {
    if (topStepRunway != null || tptRunway != null) return null;
    if (lane !== "funded") return null;
    if (account.accountType !== "funded" && account.accountType !== "live") return null;
    return tryBuildTradeifyGrowthFundedRunway(state, account, {
      startCents,
      currentCents,
    });
  }, [topStepRunway, tptRunway, lane, account, startCents, currentCents, state]);

  const tradeifyLightningRunway = useMemo(() => {
    if (topStepRunway != null || tptRunway != null || tradeifyGrowthRunway != null) return null;
    if (lane !== "funded") return null;
    if (account.accountType !== "funded" && account.accountType !== "live") return null;
    return tryBuildTradeifyLightningFundedRunway(state, account, { startCents, currentCents });
  }, [topStepRunway, tptRunway, tradeifyGrowthRunway, lane, account, startCents, currentCents, state]);

  const fundedNextBoltRunway = useMemo(() => {
    if (
      topStepRunway != null ||
      tptRunway != null ||
      tradeifyGrowthRunway != null ||
      tradeifyLightningRunway != null
    )
      return null;
    if (lane !== "funded") return null;
    if (account.accountType !== "funded" && account.accountType !== "live") return null;
    if (!isFundedNextBoltFundedJournalAccount(account)) return null;
    return tryBuildFundedNextBoltFundedRunway(state, account, { startCents, currentCents });
  }, [topStepRunway, tptRunway, tradeifyGrowthRunway, tradeifyLightningRunway, lane, account, startCents, currentCents, state]);

  const fundedNextRapidRunway = useMemo(() => {
    if (
      topStepRunway != null ||
      tptRunway != null ||
      tradeifyGrowthRunway != null ||
      tradeifyLightningRunway != null ||
      fundedNextBoltRunway != null
    )
      return null;
    if (lane !== "funded") return null;
    if (account.accountType !== "funded" && account.accountType !== "live") return null;
    if (!isFundedNextRapidFundedJournalAccount(account)) return null;
    return tryBuildFundedNextRapidFundedRunway(state, account, { startCents, currentCents });
  }, [
    topStepRunway,
    tptRunway,
    tradeifyGrowthRunway,
    tradeifyLightningRunway,
    fundedNextBoltRunway,
    lane,
    account,
    startCents,
    currentCents,
    state,
  ]);

  const fundedNextLegacyRunway = useMemo(() => {
    if (
      topStepRunway != null ||
      tptRunway != null ||
      tradeifyGrowthRunway != null ||
      tradeifyLightningRunway != null ||
      fundedNextBoltRunway != null ||
      fundedNextRapidRunway != null
    )
      return null;
    if (lane !== "funded") return null;
    if (account.accountType !== "funded" && account.accountType !== "live") return null;
    if (!isFundedNextLegacyFundedJournalAccount(account)) return null;
    return tryBuildFundedNextLegacyFundedRunway(state, account, { startCents, currentCents });
  }, [
    topStepRunway,
    tptRunway,
    tradeifyGrowthRunway,
    tradeifyLightningRunway,
    fundedNextBoltRunway,
    fundedNextRapidRunway,
    lane,
    account,
    startCents,
    currentCents,
    state,
  ]);

  const mffuRapidSimFundedRunway = useMemo(() => {
    if (
      topStepRunway != null ||
      tptRunway != null ||
      tradeifyGrowthRunway != null ||
      tradeifyLightningRunway != null ||
      fundedNextBoltRunway != null ||
      fundedNextRapidRunway != null ||
      fundedNextLegacyRunway != null
    )
      return null;
    if (lane !== "funded") return null;
    if (account.accountType !== "funded" && account.accountType !== "live") return null;
    if (!isMffuRapidSimFundedJournalAccount(account)) return null;
    return tryBuildMffuRapidSimFundedRunway(state, account, { startCents, currentCents });
  }, [
    topStepRunway,
    tptRunway,
    tradeifyGrowthRunway,
    tradeifyLightningRunway,
    fundedNextBoltRunway,
    fundedNextRapidRunway,
    fundedNextLegacyRunway,
    lane,
    account,
    startCents,
    currentCents,
    state,
  ]);

  const mffuFlexSimFundedRunway = useMemo(() => {
    if (
      topStepRunway != null ||
      tptRunway != null ||
      tradeifyGrowthRunway != null ||
      tradeifyLightningRunway != null ||
      fundedNextBoltRunway != null ||
      fundedNextRapidRunway != null ||
      fundedNextLegacyRunway != null ||
      mffuRapidSimFundedRunway != null
    )
      return null;
    if (lane !== "funded") return null;
    if (account.accountType !== "funded" && account.accountType !== "live") return null;
    if (!isMffuFlexSimFundedJournalAccount(account)) return null;
    return tryBuildMffuFlexSimFundedRunway(state, account, { startCents, currentCents });
  }, [
    topStepRunway,
    tptRunway,
    tradeifyGrowthRunway,
    tradeifyLightningRunway,
    fundedNextBoltRunway,
    fundedNextRapidRunway,
    fundedNextLegacyRunway,
    mffuRapidSimFundedRunway,
    lane,
    account,
    startCents,
    currentCents,
    state,
  ]);

  const mffuProSimFundedRunway = useMemo(() => {
    if (
      topStepRunway != null ||
      tptRunway != null ||
      tradeifyGrowthRunway != null ||
      tradeifyLightningRunway != null ||
      fundedNextBoltRunway != null ||
      fundedNextRapidRunway != null ||
      fundedNextLegacyRunway != null ||
      mffuRapidSimFundedRunway != null ||
      mffuFlexSimFundedRunway != null
    )
      return null;
    if (lane !== "funded") return null;
    if (account.accountType !== "funded" && account.accountType !== "live") return null;
    if (!isMffuProSimFundedJournalAccount(account)) return null;
    return tryBuildMffuProSimFundedRunway(state, account, { startCents, currentCents });
  }, [
    topStepRunway,
    tptRunway,
    tradeifyGrowthRunway,
    tradeifyLightningRunway,
    fundedNextBoltRunway,
    fundedNextRapidRunway,
    fundedNextLegacyRunway,
    mffuRapidSimFundedRunway,
    mffuFlexSimFundedRunway,
    lane,
    account,
    startCents,
    currentCents,
    state,
  ]);

  const bulenoxFundedSimpleRunway = useMemo(() => {
    if (
      topStepRunway != null ||
      tptRunway != null ||
      tradeifyGrowthRunway != null ||
      tradeifyLightningRunway != null ||
      fundedNextBoltRunway != null ||
      fundedNextRapidRunway != null ||
      fundedNextLegacyRunway != null ||
      mffuRapidSimFundedRunway != null ||
      mffuFlexSimFundedRunway != null ||
      mffuProSimFundedRunway != null
    )
      return null;
    if (lane !== "funded") return null;
    if (account.accountType !== "funded" && account.accountType !== "live") return null;
    if (!isBulenoxFundedSimplePayoutJournalAccount(account)) return null;
    return tryBuildBulenoxFundedSimpleRunway(state, account, { startCents, currentCents });
  }, [
    topStepRunway,
    tptRunway,
    tradeifyGrowthRunway,
    tradeifyLightningRunway,
    fundedNextBoltRunway,
    fundedNextRapidRunway,
    fundedNextLegacyRunway,
    mffuRapidSimFundedRunway,
    mffuFlexSimFundedRunway,
    mffuProSimFundedRunway,
    lane,
    account,
    startCents,
    currentCents,
    state,
  ]);

  const taurusArenaFundedRunway = useMemo(() => {
    if (
      topStepRunway != null ||
      tptRunway != null ||
      tradeifyGrowthRunway != null ||
      tradeifyLightningRunway != null ||
      fundedNextBoltRunway != null ||
      fundedNextRapidRunway != null ||
      fundedNextLegacyRunway != null ||
      mffuRapidSimFundedRunway != null ||
      mffuFlexSimFundedRunway != null ||
      mffuProSimFundedRunway != null ||
      bulenoxFundedSimpleRunway != null
    )
      return null;
    if (lane !== "funded") return null;
    if (account.accountType !== "funded" && account.accountType !== "live") return null;
    if (!isTaurusArenaFundedJournalAccount(account)) return null;
    return tryBuildTaurusArenaFundedRunway(state, account, { startCents, currentCents });
  }, [
    topStepRunway,
    tptRunway,
    tradeifyGrowthRunway,
    tradeifyLightningRunway,
    fundedNextBoltRunway,
    fundedNextRapidRunway,
    fundedNextLegacyRunway,
    mffuRapidSimFundedRunway,
    mffuFlexSimFundedRunway,
    mffuProSimFundedRunway,
    bulenoxFundedSimpleRunway,
    lane,
    account,
    startCents,
    currentCents,
    state,
  ]);

  const tradeDayFundedRunway = useMemo(() => {
    if (
      topStepRunway != null ||
      tptRunway != null ||
      tradeifyGrowthRunway != null ||
      tradeifyLightningRunway != null ||
      fundedNextBoltRunway != null ||
      fundedNextRapidRunway != null ||
      fundedNextLegacyRunway != null ||
      mffuRapidSimFundedRunway != null ||
      mffuFlexSimFundedRunway != null ||
      mffuProSimFundedRunway != null ||
      bulenoxFundedSimpleRunway != null ||
      taurusArenaFundedRunway != null
    )
      return null;
    if (lane !== "funded") return null;
    if (account.accountType !== "funded" && account.accountType !== "live") return null;
    if (!isTradeDayFundedJournalAccount(account)) return null;
    return tryBuildTradeDayFundedRunway(state, account, { startCents, currentCents });
  }, [
    topStepRunway,
    tptRunway,
    tradeifyGrowthRunway,
    tradeifyLightningRunway,
    fundedNextBoltRunway,
    fundedNextRapidRunway,
    fundedNextLegacyRunway,
    mffuRapidSimFundedRunway,
    mffuFlexSimFundedRunway,
    mffuProSimFundedRunway,
    bulenoxFundedSimpleRunway,
    taurusArenaFundedRunway,
    lane,
    account,
    startCents,
    currentCents,
    state,
  ]);

  const phidiasFundedRunway = useMemo(() => {
    if (
      topStepRunway != null ||
      tptRunway != null ||
      tradeifyGrowthRunway != null ||
      tradeifyLightningRunway != null ||
      fundedNextBoltRunway != null ||
      fundedNextRapidRunway != null ||
      fundedNextLegacyRunway != null ||
      mffuRapidSimFundedRunway != null ||
      mffuFlexSimFundedRunway != null ||
      mffuProSimFundedRunway != null ||
      bulenoxFundedSimpleRunway != null ||
      taurusArenaFundedRunway != null ||
      tradeDayFundedRunway != null
    )
      return null;
    if (lane !== "funded") return null;
    if (account.accountType !== "funded" && account.accountType !== "live") return null;
    if (!isPhidiasFundedJournalAccount(account)) return null;
    return tryBuildPhidiasFundedRunway(state, account, { startCents, currentCents });
  }, [
    topStepRunway,
    tptRunway,
    tradeifyGrowthRunway,
    tradeifyLightningRunway,
    fundedNextBoltRunway,
    fundedNextRapidRunway,
    fundedNextLegacyRunway,
    mffuRapidSimFundedRunway,
    mffuFlexSimFundedRunway,
    mffuProSimFundedRunway,
    bulenoxFundedSimpleRunway,
    taurusArenaFundedRunway,
    tradeDayFundedRunway,
    lane,
    account,
    startCents,
    currentCents,
    state,
  ]);

  const eliteTraderFundingFundedRunway = useMemo(() => {
    if (
      topStepRunway != null ||
      tptRunway != null ||
      tradeifyGrowthRunway != null ||
      tradeifyLightningRunway != null ||
      fundedNextBoltRunway != null ||
      fundedNextRapidRunway != null ||
      fundedNextLegacyRunway != null ||
      mffuRapidSimFundedRunway != null ||
      mffuFlexSimFundedRunway != null ||
      mffuProSimFundedRunway != null ||
      bulenoxFundedSimpleRunway != null ||
      taurusArenaFundedRunway != null ||
      tradeDayFundedRunway != null ||
      phidiasFundedRunway != null
    )
      return null;
    if (lane !== "funded") return null;
    if (account.accountType !== "funded" && account.accountType !== "live") return null;
    if (!isEliteTraderFundingFundedJournalAccount(account)) return null;
    return tryBuildEliteTraderFundingFundedRunway(state, account, { startCents, currentCents });
  }, [
    topStepRunway,
    tptRunway,
    tradeifyGrowthRunway,
    tradeifyLightningRunway,
    fundedNextBoltRunway,
    fundedNextRapidRunway,
    fundedNextLegacyRunway,
    mffuRapidSimFundedRunway,
    mffuFlexSimFundedRunway,
    mffuProSimFundedRunway,
    bulenoxFundedSimpleRunway,
    taurusArenaFundedRunway,
    tradeDayFundedRunway,
    phidiasFundedRunway,
    lane,
    account,
    startCents,
    currentCents,
    state,
  ]);

  const ffnFundedRunway = useMemo(() => {
    if (
      topStepRunway != null ||
      tptRunway != null ||
      tradeifyGrowthRunway != null ||
      tradeifyLightningRunway != null ||
      fundedNextBoltRunway != null ||
      fundedNextRapidRunway != null ||
      fundedNextLegacyRunway != null ||
      mffuRapidSimFundedRunway != null ||
      mffuFlexSimFundedRunway != null ||
      mffuProSimFundedRunway != null ||
      bulenoxFundedSimpleRunway != null ||
      taurusArenaFundedRunway != null ||
      tradeDayFundedRunway != null ||
      phidiasFundedRunway != null ||
      eliteTraderFundingFundedRunway != null
    )
      return null;
    if (lane !== "funded") return null;
    if (account.accountType !== "funded" && account.accountType !== "live") return null;
    return tryBuildFundedFuturesNetworkFundedRunway(state, account, { startCents, currentCents });
  }, [
    topStepRunway,
    tptRunway,
    tradeifyGrowthRunway,
    tradeifyLightningRunway,
    fundedNextBoltRunway,
    fundedNextRapidRunway,
    fundedNextLegacyRunway,
    mffuRapidSimFundedRunway,
    mffuFlexSimFundedRunway,
    mffuProSimFundedRunway,
    bulenoxFundedSimpleRunway,
    taurusArenaFundedRunway,
    tradeDayFundedRunway,
    phidiasFundedRunway,
    eliteTraderFundingFundedRunway,
    lane,
    account,
    startCents,
    currentCents,
    state,
  ]);

  const bluskyFundedRunway = useMemo(() => {
    if (
      topStepRunway != null ||
      tptRunway != null ||
      tradeifyGrowthRunway != null ||
      tradeifyLightningRunway != null ||
      fundedNextBoltRunway != null ||
      fundedNextRapidRunway != null ||
      fundedNextLegacyRunway != null ||
      mffuRapidSimFundedRunway != null ||
      mffuFlexSimFundedRunway != null ||
      mffuProSimFundedRunway != null ||
      bulenoxFundedSimpleRunway != null ||
      taurusArenaFundedRunway != null ||
      tradeDayFundedRunway != null ||
      phidiasFundedRunway != null ||
      eliteTraderFundingFundedRunway != null ||
      ffnFundedRunway != null
    )
      return null;
    if (lane !== "funded") return null;
    if (account.accountType !== "funded" && account.accountType !== "live") return null;
    if (!isBluskyFundedJournalAccount(account)) return null;
    return tryBuildBluskyFundedRunway(state, account, { startCents, currentCents });
  }, [
    topStepRunway,
    tptRunway,
    tradeifyGrowthRunway,
    tradeifyLightningRunway,
    fundedNextBoltRunway,
    fundedNextRapidRunway,
    fundedNextLegacyRunway,
    mffuRapidSimFundedRunway,
    mffuFlexSimFundedRunway,
    mffuProSimFundedRunway,
    bulenoxFundedSimpleRunway,
    taurusArenaFundedRunway,
    tradeDayFundedRunway,
    phidiasFundedRunway,
    eliteTraderFundingFundedRunway,
    ffnFundedRunway,
    lane,
    account,
    startCents,
    currentCents,
    state,
  ]);

  const daytradersFundedRunway = useMemo(() => {
    if (
      topStepRunway != null ||
      tptRunway != null ||
      tradeifyGrowthRunway != null ||
      tradeifyLightningRunway != null ||
      fundedNextBoltRunway != null ||
      fundedNextRapidRunway != null ||
      fundedNextLegacyRunway != null ||
      mffuRapidSimFundedRunway != null ||
      mffuFlexSimFundedRunway != null ||
      mffuProSimFundedRunway != null ||
      bulenoxFundedSimpleRunway != null ||
      taurusArenaFundedRunway != null ||
      tradeDayFundedRunway != null ||
      phidiasFundedRunway != null ||
      eliteTraderFundingFundedRunway != null ||
      ffnFundedRunway != null ||
      bluskyFundedRunway != null
    )
      return null;
    if (lane !== "funded") return null;
    if (account.accountType !== "funded" && account.accountType !== "live") return null;
    if (!isDaytradersFundedJournalAccount(account)) return null;
    return tryBuildDaytradersFundedRunway(state, account, { startCents, currentCents });
  }, [
    topStepRunway,
    tptRunway,
    tradeifyGrowthRunway,
    tradeifyLightningRunway,
    fundedNextBoltRunway,
    fundedNextRapidRunway,
    fundedNextLegacyRunway,
    mffuRapidSimFundedRunway,
    mffuFlexSimFundedRunway,
    mffuProSimFundedRunway,
    bulenoxFundedSimpleRunway,
    taurusArenaFundedRunway,
    tradeDayFundedRunway,
    phidiasFundedRunway,
    eliteTraderFundingFundedRunway,
    ffnFundedRunway,
    bluskyFundedRunway,
    lane,
    account,
    startCents,
    currentCents,
    state,
  ]);

  const tradeifySelectFlexRunway = useMemo(() => {
    if (
      topStepRunway != null ||
      tptRunway != null ||
      tradeifyGrowthRunway != null ||
      tradeifyLightningRunway != null ||
      fundedNextBoltRunway != null ||
      fundedNextRapidRunway != null ||
      fundedNextLegacyRunway != null ||
      mffuRapidSimFundedRunway != null ||
      mffuFlexSimFundedRunway != null ||
      mffuProSimFundedRunway != null ||
      bulenoxFundedSimpleRunway != null ||
      taurusArenaFundedRunway != null ||
      tradeDayFundedRunway != null ||
      phidiasFundedRunway != null ||
      eliteTraderFundingFundedRunway != null ||
      ffnFundedRunway != null ||
      bluskyFundedRunway != null ||
      daytradersFundedRunway != null
    )
      return null;
    if (lane !== "funded") return null;
    if (account.accountType !== "funded" && account.accountType !== "live") return null;
    if (!isTradeifySelectFlexFundedJournalAccount(account)) return null;
    return tryBuildTradeifySelectFlexFundedRunway(state, account, {
      startCents,
      currentCents,
    });
  }, [
    topStepRunway,
    tptRunway,
    tradeifyGrowthRunway,
    tradeifyLightningRunway,
    fundedNextBoltRunway,
    fundedNextRapidRunway,
    fundedNextLegacyRunway,
    mffuRapidSimFundedRunway,
    mffuFlexSimFundedRunway,
    mffuProSimFundedRunway,
    bulenoxFundedSimpleRunway,
    taurusArenaFundedRunway,
    tradeDayFundedRunway,
    phidiasFundedRunway,
    eliteTraderFundingFundedRunway,
    ffnFundedRunway,
    bluskyFundedRunway,
    daytradersFundedRunway,
    lane,
    account,
    startCents,
    currentCents,
    state,
  ]);

  const tradeifySelectDailyRunway = useMemo(() => {
    if (
      topStepRunway != null ||
      tptRunway != null ||
      tradeifyGrowthRunway != null ||
      tradeifyLightningRunway != null ||
      fundedNextBoltRunway != null ||
      fundedNextRapidRunway != null ||
      fundedNextLegacyRunway != null ||
      mffuRapidSimFundedRunway != null ||
      mffuFlexSimFundedRunway != null ||
      mffuProSimFundedRunway != null ||
      bulenoxFundedSimpleRunway != null ||
      taurusArenaFundedRunway != null ||
      tradeDayFundedRunway != null ||
      phidiasFundedRunway != null ||
      eliteTraderFundingFundedRunway != null ||
      ffnFundedRunway != null ||
      bluskyFundedRunway != null ||
      daytradersFundedRunway != null ||
      tradeifySelectFlexRunway != null
    )
      return null;
    if (lane !== "funded") return null;
    if (account.accountType !== "funded" && account.accountType !== "live") return null;
    if (!isTradeifySelectDailyFundedJournalAccount(account)) return null;
    return tryBuildTradeifySelectDailyFundedRunway(state, account, {
      startCents,
      currentCents,
    });
  }, [
    topStepRunway,
    tptRunway,
    tradeifyGrowthRunway,
    tradeifyLightningRunway,
    fundedNextBoltRunway,
    fundedNextRapidRunway,
    fundedNextLegacyRunway,
    mffuRapidSimFundedRunway,
    mffuFlexSimFundedRunway,
    mffuProSimFundedRunway,
    bulenoxFundedSimpleRunway,
    taurusArenaFundedRunway,
    tradeDayFundedRunway,
    phidiasFundedRunway,
    eliteTraderFundingFundedRunway,
    ffnFundedRunway,
    bluskyFundedRunway,
    daytradersFundedRunway,
    tradeifySelectFlexRunway,
    lane,
    account,
    startCents,
    currentCents,
    state,
  ]);

  const lucidFlexRunway = useMemo(() => {
    if (
      topStepRunway != null ||
      tptRunway != null ||
      tradeifyGrowthRunway != null ||
      tradeifyLightningRunway != null ||
      fundedNextBoltRunway != null ||
      fundedNextRapidRunway != null ||
      fundedNextLegacyRunway != null ||
      mffuRapidSimFundedRunway != null ||
      mffuFlexSimFundedRunway != null ||
      mffuProSimFundedRunway != null ||
      bulenoxFundedSimpleRunway != null ||
      taurusArenaFundedRunway != null ||
      tradeDayFundedRunway != null ||
      phidiasFundedRunway != null ||
      eliteTraderFundingFundedRunway != null ||
      ffnFundedRunway != null ||
      bluskyFundedRunway != null ||
      daytradersFundedRunway != null ||
      tradeifySelectFlexRunway != null ||
      tradeifySelectDailyRunway != null
    )
      return null;
    if (lane !== "funded") return null;
    if (account.accountType !== "funded" && account.accountType !== "live") return null;
    if (!getLucidFlexFundedBlockForAccount(account)) return null;
    return tryBuildLucidFlexFundedRunway(state, account, { startCents, currentCents });
  }, [
    topStepRunway,
    tptRunway,
    tradeifyGrowthRunway,
    tradeifyLightningRunway,
    fundedNextBoltRunway,
    fundedNextRapidRunway,
    fundedNextLegacyRunway,
    mffuRapidSimFundedRunway,
    mffuFlexSimFundedRunway,
    mffuProSimFundedRunway,
    bulenoxFundedSimpleRunway,
    taurusArenaFundedRunway,
    tradeDayFundedRunway,
    phidiasFundedRunway,
    eliteTraderFundingFundedRunway,
    ffnFundedRunway,
    bluskyFundedRunway,
    daytradersFundedRunway,
    tradeifySelectFlexRunway,
    tradeifySelectDailyRunway,
    lane,
    account,
    startCents,
    currentCents,
    state,
  ]);

  const lucidDirectRunway = useMemo(() => {
    if (
      topStepRunway != null ||
      tptRunway != null ||
      tradeifyGrowthRunway != null ||
      tradeifyLightningRunway != null ||
      fundedNextBoltRunway != null ||
      fundedNextRapidRunway != null ||
      fundedNextLegacyRunway != null ||
      mffuRapidSimFundedRunway != null ||
      mffuFlexSimFundedRunway != null ||
      mffuProSimFundedRunway != null ||
      bulenoxFundedSimpleRunway != null ||
      taurusArenaFundedRunway != null ||
      tradeDayFundedRunway != null ||
      phidiasFundedRunway != null ||
      eliteTraderFundingFundedRunway != null ||
      ffnFundedRunway != null ||
      bluskyFundedRunway != null ||
      daytradersFundedRunway != null ||
      tradeifySelectFlexRunway != null ||
      tradeifySelectDailyRunway != null ||
      lucidFlexRunway != null
    )
      return null;
    if (lane !== "funded") return null;
    if (account.accountType !== "funded" && account.accountType !== "live") return null;
    if (!getLucidDirectFundedBlockForAccount(account)) return null;
    return tryBuildLucidDirectFundedRunway(state, account, { startCents, currentCents });
  }, [
    topStepRunway,
    tptRunway,
    tradeifyGrowthRunway,
    tradeifyLightningRunway,
    fundedNextBoltRunway,
    fundedNextRapidRunway,
    fundedNextLegacyRunway,
    mffuRapidSimFundedRunway,
    mffuFlexSimFundedRunway,
    mffuProSimFundedRunway,
    bulenoxFundedSimpleRunway,
    taurusArenaFundedRunway,
    tradeDayFundedRunway,
    phidiasFundedRunway,
    eliteTraderFundingFundedRunway,
    ffnFundedRunway,
    bluskyFundedRunway,
    daytradersFundedRunway,
    tradeifySelectFlexRunway,
    tradeifySelectDailyRunway,
    lucidFlexRunway,
    lane,
    account,
    startCents,
    currentCents,
    state,
  ]);

  const lucidProRunway = useMemo(() => {
    if (
      topStepRunway != null ||
      tptRunway != null ||
      tradeifyGrowthRunway != null ||
      tradeifyLightningRunway != null ||
      fundedNextBoltRunway != null ||
      fundedNextRapidRunway != null ||
      fundedNextLegacyRunway != null ||
      mffuRapidSimFundedRunway != null ||
      mffuFlexSimFundedRunway != null ||
      mffuProSimFundedRunway != null ||
      bulenoxFundedSimpleRunway != null ||
      taurusArenaFundedRunway != null ||
      tradeDayFundedRunway != null ||
      phidiasFundedRunway != null ||
      eliteTraderFundingFundedRunway != null ||
      ffnFundedRunway != null ||
      bluskyFundedRunway != null ||
      daytradersFundedRunway != null ||
      tradeifySelectFlexRunway != null ||
      tradeifySelectDailyRunway != null ||
      lucidFlexRunway != null ||
      lucidDirectRunway != null
    )
      return null;
    if (lane !== "funded") return null;
    if (account.accountType !== "funded" && account.accountType !== "live") return null;
    if (!isLucidProFundedJournalAccount(account)) return null;
    if (missingGoal || model.strideCents <= 0) return null;
    return tryBuildLucidProFundedRunway(state, account, {
      startCents,
      bufferStrideCents: model.strideCents,
      bufferPhaseProgress01: model.progress01,
      currentCents,
    });
  }, [
    topStepRunway,
    tptRunway,
    tradeifyGrowthRunway,
    tradeifyLightningRunway,
    fundedNextBoltRunway,
    fundedNextRapidRunway,
    fundedNextLegacyRunway,
    mffuRapidSimFundedRunway,
    mffuFlexSimFundedRunway,
    mffuProSimFundedRunway,
    bulenoxFundedSimpleRunway,
    taurusArenaFundedRunway,
    tradeDayFundedRunway,
    phidiasFundedRunway,
    eliteTraderFundingFundedRunway,
    ffnFundedRunway,
    bluskyFundedRunway,
    daytradersFundedRunway,
    tradeifySelectFlexRunway,
    tradeifySelectDailyRunway,
    lucidFlexRunway,
    lucidDirectRunway,
    lane,
    account,
    missingGoal,
    model.strideCents,
    startCents,
    currentCents,
    state,
    model.progress01,
  ]);

  const apexRunway = useMemo(() => {
    if (
      topStepRunway != null ||
      tptRunway != null ||
      tradeifyGrowthRunway != null ||
      tradeifyLightningRunway != null ||
      fundedNextBoltRunway != null ||
      fundedNextRapidRunway != null ||
      fundedNextLegacyRunway != null ||
      mffuRapidSimFundedRunway != null ||
      mffuFlexSimFundedRunway != null ||
      mffuProSimFundedRunway != null ||
      bulenoxFundedSimpleRunway != null ||
      taurusArenaFundedRunway != null ||
      tradeDayFundedRunway != null ||
      phidiasFundedRunway != null ||
      eliteTraderFundingFundedRunway != null ||
      ffnFundedRunway != null ||
      bluskyFundedRunway != null ||
      daytradersFundedRunway != null ||
      tradeifySelectFlexRunway != null ||
      tradeifySelectDailyRunway != null ||
      lucidFlexRunway != null ||
      lucidDirectRunway != null ||
      lucidProRunway != null
    )
      return null;
    if (lane !== "funded") return null;
    if (account.accountType !== "funded" && account.accountType !== "live") return null;
    if (!isApexJournalAccount(account)) return null;
    if (missingGoal || model.strideCents <= 0) return null;
    return tryBuildApexFundedRunway(state, account, {
      startCents,
      bufferStrideCents: model.strideCents,
      rawFundedPnlCents: getFundedPhaseProfitCents(state, account),
      lifetimePnlCents: getAccountFinancialMetrics(state, account.id).totalPnlCents,
      currentCents,
    });
  }, [
    topStepRunway,
    tptRunway,
    tradeifyGrowthRunway,
    tradeifyLightningRunway,
    fundedNextBoltRunway,
    fundedNextRapidRunway,
    fundedNextLegacyRunway,
    mffuRapidSimFundedRunway,
    mffuFlexSimFundedRunway,
    mffuProSimFundedRunway,
    bulenoxFundedSimpleRunway,
    taurusArenaFundedRunway,
    tradeDayFundedRunway,
    phidiasFundedRunway,
    eliteTraderFundingFundedRunway,
    ffnFundedRunway,
    bluskyFundedRunway,
    daytradersFundedRunway,
    tradeifySelectFlexRunway,
    tradeifySelectDailyRunway,
    lucidFlexRunway,
    lucidDirectRunway,
    lucidProRunway,
    lane,
    account,
    missingGoal,
    model.strideCents,
    startCents,
    currentCents,
    state,
  ]);

  const fundedRunway =
    yrmPropFundedRunway ??
    aquaFuturesFundedRunway ??
    futuresEliteFundedRunway ??
    alphaFuturesFundedRunway ??
    legendsTradingFundedRunway ??
    topStepRunway ??
    tptRunway ??
    tradeifyGrowthRunway ??
    tradeifyLightningRunway ??
    fundedNextBoltRunway ??
    fundedNextRapidRunway ??
    fundedNextLegacyRunway ??
    mffuRapidSimFundedRunway ??
    mffuFlexSimFundedRunway ??
    mffuProSimFundedRunway ??
    bulenoxFundedSimpleRunway ??
    taurusArenaFundedRunway ??
    tradeDayFundedRunway ??
    phidiasFundedRunway ??
    eliteTraderFundingFundedRunway ??
    ffnFundedRunway ??
    bluskyFundedRunway ??
    daytradersFundedRunway ??
    tradeifySelectFlexRunway ??
    tradeifySelectDailyRunway ??
    lucidFlexRunway ??
    lucidDirectRunway ??
    lucidProRunway ??
    apexRunway;

  const [apexSimplePayoutUiDismissed, setApexSimplePayoutUiDismissed] = useState(false);
  const fundedRunwaySimplePayoutUi =
    fundedRunway?.apexSimplePayoutUi === true ||
    fundedRunway?.lucidProSimplePayoutUi === true ||
    fundedRunway?.lucidFlexSimplePayoutUi === true ||
    fundedRunway?.lucidDirectSimplePayoutUi === true ||
    fundedRunway?.tptSimplePayoutUi === true ||
    fundedRunway?.topstepSimplePayoutUi === true ||
    fundedRunway?.fundedNextBoltSimplePayoutUi === true ||
    fundedRunway?.fundedNextRapidSimplePayoutUi === true ||
    fundedRunway?.fundedNextLegacySimplePayoutUi === true ||
    fundedRunway?.mffuRapidSimplePayoutUi === true ||
    fundedRunway?.mffuFlexSimplePayoutUi === true ||
    fundedRunway?.mffuProSimplePayoutUi === true ||
    fundedRunway?.ffnFundedSimplePayoutUi === true ||
    fundedRunway?.etfFundedSimplePayoutUi === true ||
    fundedRunway?.taurusArenaFundedSimplePayoutUi === true ||
    fundedRunway?.tradeDayFundedSimplePayoutUi === true ||
    fundedRunway?.phidiasFundedSimplePayoutUi === true ||
    fundedRunway?.bulenoxFundedSimplePayoutUi === true ||
    fundedRunway?.bluskyFundedSimplePayoutUi === true ||
    fundedRunway?.daytradersFundedSimplePayoutUi === true ||
    fundedRunway?.tradeifyLightningSimplePayoutUi === true ||
    fundedRunway?.tradeifyGrowthSimplePayoutUi === true ||
    fundedRunway?.tradeifySelectFlexSimplePayoutUi === true ||
    fundedRunway?.tradeifySelectDailySimplePayoutUi === true ||
    fundedRunway?.yrmPropSimplePayoutUi === true ||
    fundedRunway?.aquaFuturesSimplePayoutUi === true ||
    fundedRunway?.futuresEliteSimplePayoutUi === true ||
    fundedRunway?.alphaFuturesSimplePayoutUi === true ||
    fundedRunway?.legendsTradingSimplePayoutUi === true;
  const fundedRunwaySimplePayoutMinCents =
    fundedRunway?.apexSimplePayoutMinBalanceCents ??
    fundedRunway?.lucidProSimplePayoutMinBalanceCents ??
    fundedRunway?.lucidFlexSimplePayoutMinBalanceCents ??
    fundedRunway?.lucidDirectSimplePayoutMinBalanceCents ??
    fundedRunway?.tptSimplePayoutMinBalanceCents ??
    fundedRunway?.topstepSimplePayoutMinBalanceCents ??
    fundedRunway?.fundedNextBoltSimplePayoutMinBalanceCents ??
    fundedRunway?.fundedNextRapidSimplePayoutMinBalanceCents ??
    fundedRunway?.fundedNextLegacySimplePayoutMinBalanceCents ??
    fundedRunway?.mffuRapidSimplePayoutMinBalanceCents ??
    fundedRunway?.mffuFlexSimplePayoutMinBalanceCents ??
    fundedRunway?.mffuProSimplePayoutMinBalanceCents ??
    fundedRunway?.ffnFundedSimplePayoutMinBalanceCents ??
    fundedRunway?.etfFundedSimplePayoutMinBalanceCents ??
    fundedRunway?.taurusArenaFundedSimplePayoutMinBalanceCents ??
    fundedRunway?.tradeDayFundedSimplePayoutMinBalanceCents ??
    fundedRunway?.phidiasFundedSimplePayoutMinBalanceCents ??
    fundedRunway?.bulenoxFundedSimplePayoutMinBalanceCents ??
    fundedRunway?.bluskyFundedSimplePayoutMinBalanceCents ??
    fundedRunway?.daytradersFundedSimplePayoutMinBalanceCents ??
    fundedRunway?.tradeifyLightningSimplePayoutMinBalanceCents ??
    fundedRunway?.tradeifyGrowthSimplePayoutMinBalanceCents ??
    fundedRunway?.tradeifySelectFlexSimplePayoutMinBalanceCents ??
    fundedRunway?.tradeifySelectDailySimplePayoutMinBalanceCents ??
    fundedRunway?.yrmPropSimplePayoutMinBalanceCents ??
    fundedRunway?.aquaFuturesSimplePayoutMinBalanceCents ??
    fundedRunway?.futuresEliteSimplePayoutMinBalanceCents ??
    fundedRunway?.alphaFuturesSimplePayoutMinBalanceCents ??
    fundedRunway?.legendsTradingSimplePayoutMinBalanceCents;

  useEffect(() => {
    const thr = fundedRunwaySimplePayoutMinCents;
    if (thr == null) return;
    if (currentCents < thr) setApexSimplePayoutUiDismissed(false);
  }, [currentCents, fundedRunwaySimplePayoutMinCents]);

  useEffect(() => {
    if (apexPayoutCommit.tick === 0) return;
    if (!fundedRunwaySimplePayoutUi) return;
    if (apexPayoutCommit.accountIds.includes(account.id)) {
      setApexSimplePayoutUiDismissed(true);
    }
  }, [apexPayoutCommit.tick, apexPayoutCommit.accountIds, account.id, fundedRunwaySimplePayoutUi]);

  const fundedRunwayPayoutPanel = useMemo(() => {
    if (!fundedRunwaySimplePayoutUi || !apexSimplePayoutUiDismissed) return fundedRunway;
    return {
      ...fundedRunway,
      showAddPayoutButton: false,
      goodNewsTitle: null,
      payoutCardCallout: null,
    };
  }, [fundedRunway, fundedRunwaySimplePayoutUi, apexSimplePayoutUiDismissed]);

  const fundedRunwayWinningDaysLabel = topStepRunway != null;

  const bar01 = fundedRunway
    ? fundedRunway.barProgress01
    : effectiveProgress01({ lane, progress01: model.progress01 });

  const pct =
    displayState === "passed"
      ? 100
      : missingGoal
        ? null
        : fundedRunway
          ? Math.max(-999, Math.min(999, fundedRunway.ringPctDisplay))
          : Math.max(-999, Math.min(999, Math.round(bar01 * 100)));

  const ringProgress =
    displayState === "passed"
      ? 1
      : missingGoal
        ? 0
        : fundedRunway
          ? Math.max(0, Math.min(1, fundedRunway.ringArc01))
          : Math.max(0, Math.min(1, bar01));

  const goalHeader = fundedRunway?.goalLineLabel ?? goalTitle;
  const goalValueCents = fundedRunway?.goalLineCents ?? goalCents;

  const fundedPayoutPanelWarning =
    fundedRunway?.goodNewsTitle === "Consistency rule breached" ||
    fundedRunway?.goodNewsTitle === "20% best-day rule" ||
    fundedRunway?.showPayoutGatePanel === true;

  const strokeClass =
    displayState === "failed"
      ? "text-rose-400/90"
      : displayState === "passed"
        ? "text-emerald-400/95"
        : bar01 >= 0.85
          ? "text-amber-300/95"
          : "text-sky-400/95";

  const cardTint =
    displayState === "failed"
      ? "from-rose-950/30 via-slate-900/45 to-slate-950/55 border-rose-400/25"
      : displayState === "passed"
        ? "from-emerald-950/28 via-slate-900/45 to-slate-950/55 border-emerald-400/28"
        : bar01 >= 0.85
          ? "from-amber-950/22 via-slate-900/45 to-slate-950/55 border-amber-400/22"
          : "from-slate-800/40 via-slate-900/50 to-slate-950/55 border-slate-500/22";

  const badge =
    displayState === "passed" ? (
      <span className="rounded-full border border-emerald-400/35 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-200/95">
        Cleared
      </span>
    ) : displayState === "failed" ? (
      <span className="rounded-full border border-rose-400/35 bg-rose-500/12 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-rose-200/90">
        Blown
      </span>
    ) : lane === "challenge" ? (
      <span className="rounded-full border border-violet-400/25 bg-violet-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-violet-200/85">
        Eval
      </span>
    ) : (
      <span className="rounded-full border border-teal-400/25 bg-teal-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-teal-200/85">
        Funded
      </span>
    );

  return (
    <article
      role="button"
      tabIndex={0}
      aria-label={`View account ${label}`}
      onClick={() => onOpenAccount(account.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpenAccount(account.id);
        }
      }}
      className={`group relative cursor-pointer overflow-hidden rounded-2xl border bg-gradient-to-b p-6 shadow-[0_16px_40px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.08)] transition hover:border-slate-400/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400/50 ${cardTint}`}
    >
      <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-gradient-to-br from-white/[0.12] to-transparent opacity-0 transition group-hover:opacity-40" />

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="min-w-0 truncate text-[15px] font-semibold tracking-tight text-slate-50">{label}</h3>
            {badge}
          </div>
          <p className="mt-1 truncate text-xs text-slate-400/90">
            {account.propFirm.name} · {account.sizeLabel.toUpperCase()}
            {account.displayAccountCode ? ` · ${account.displayAccountCode}` : ""}
          </p>
        </div>
        <div className="relative h-20 w-20 shrink-0 text-white/90">
          <ProgressRing progress01={ringProgress} className="h-full w-full" strokeClass={strokeClass} />
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            {pct == null ? (
              <span className="text-[10px] font-bold text-slate-500">—</span>
            ) : (
              <>
                <span
                  className={`font-bold tabular-nums leading-none ${
                    pct < 0 ? "text-rose-200/95" : "text-slate-50"
                  } ${pct > 99 ? "text-base" : "text-lg"}`}
                >
                  {pct}
                </span>
                <span className="text-[9px] font-medium uppercase tracking-widest text-slate-500">%</span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-3 text-center">
        <div className="rounded-xl bg-slate-800/50 py-3 ring-1 ring-slate-600/25">
          <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-500">Start</p>
          <p className="mt-1 text-xs font-semibold tabular-nums text-slate-100">{formatUsdCentsCompact(startCents)}</p>
        </div>
        <div
          className="rounded-xl bg-slate-800/65 py-3 ring-1 ring-sky-500/30"
          title="Estimated balance: account size + workspace P&L − paid/approved payouts. After a payout, this can stay above size while payout-cycle P&L resets to $0 until new lines or trades."
        >
          <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-sky-300/85">Now</p>
          <p
            className={`mt-1 text-xs font-bold tabular-nums ${
              currentCents >= startCents ? "text-emerald-300/95" : "text-rose-300/95"
            }`}
          >
            {formatUsdCents(currentCents)}
          </p>
        </div>
        <div className="rounded-xl bg-slate-800/50 py-3 ring-1 ring-slate-600/25">
          <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-500">{goalHeader}</p>
          <p className="mt-1 text-xs font-semibold tabular-nums text-slate-100">
            {goalValueCents != null ? formatUsdCentsCompact(goalValueCents) : "—"}
          </p>
        </div>
      </div>

      {fundedRunway != null &&
      fundedRunway.qualifiedTradingDays != null &&
      fundedRunway.requiredQualifiedTradingDays != null ? (
        <p className="mt-3 text-center text-[10px] font-medium tabular-nums text-slate-400/95">
          {fundedRunway.qualifiedTradingDays}/{fundedRunway.requiredQualifiedTradingDays}{" "}
          {fundedRunway.progressTradingDaysLabel ??
            (fundedRunwayWinningDaysLabel ? "winning days" : "trading days")}
        </p>
      ) : null}

      <div className="mt-4">
        <div className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-[10px] text-slate-500">Progress</span>
          {missingRunway ? (
            <span className={missingRunway.className}>{missingRunway.text}</span>
          ) : goalCents != null && displayState === "failed" ? (
            <span className="text-[10px] tabular-nums text-rose-200/70">
              {formatUsdCentsCompact(goalCents - currentCents)} short of {goalTitle.toLowerCase()} at blow-up
            </span>
          ) : fundedRunway &&
            (!fundedRunway.goodNewsTitle || fundedRunway.goodNewsTitle === "Good News") ? (
            <span className="text-[10px] tabular-nums text-slate-400">
              {fundedRunway.runwayPartB?.trim()
                ? `${fundedRunway.runwayPartA} · ${fundedRunway.runwayPartB}`
                : fundedRunway.runwayPartA}
            </span>
          ) : lane === "challenge" && goalCents != null && currentCents >= goalCents ? (
            <span className="text-[10px] text-emerald-200/75">Milestone reached</span>
          ) : goalCents != null && !fundedRunway ? (
            <span className="text-[10px] tabular-nums text-slate-400">
              {formatUsdCentsCompact(goalCents - currentCents)} to go
            </span>
          ) : fundedRunway?.goodNewsTitle &&
            fundedRunway.goodNewsTitle !== "Good News" ? (
            <span
              className={`text-[10px] tabular-nums ${
                fundedRunway.goodNewsTitle === "Consistency rule breached" ||
                fundedRunway.goodNewsTitle === "20% best-day rule"
                  ? "text-amber-200/85"
                  : "text-emerald-200/80"
              }`}
            >
              {fundedRunway.runwayPartA}
            </span>
          ) : null}
        </div>
        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-800/80 ring-1 ring-slate-600/30">
          <div
            className={`h-full rounded-full bg-gradient-to-r transition-all duration-500 ${
              displayState === "failed"
                ? "from-rose-600/80 to-rose-400/60"
                : displayState === "passed"
                  ? "from-emerald-600/85 to-emerald-400/65"
                  : "from-sky-600/90 to-cyan-400/70"
            }`}
            style={{
              width: `${Math.min(100, Math.max(0, missingGoal ? 0 : bar01 * 100))}%`,
            }}
          />
        </div>
        <div className="mt-1 flex justify-between px-0.5 font-mono text-[9px] text-slate-600">
          <span>0</span>
          <span>25</span>
          <span>50</span>
          <span>75</span>
          <span>100</span>
        </div>
        {showConvertToFundedCta ? (
          <div className="mt-4 flex justify-center" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              data-row-click-ignore="true"
              onClick={(e) => {
                e.stopPropagation();
                onConvertToFunded?.(account.id);
              }}
              className="rounded-xl border border-emerald-400/40 bg-emerald-500/15 px-4 py-2 text-[12px] font-semibold text-emerald-100 shadow-[0_0_20px_rgba(52,211,153,0.12)] transition hover:border-emerald-300/55 hover:bg-emerald-500/22"
            >
              Convert to funded
            </button>
          </div>
        ) : null}
        {displayState !== "failed" &&
        fundedRunwayPayoutPanel &&
        (fundedRunwayPayoutPanel.goodNewsTitle ||
          fundedRunwayPayoutPanel.showPayoutGatePanel ||
          ((fundedRunwayPayoutPanel.apexSimplePayoutUi === true ||
            fundedRunwayPayoutPanel.lucidProSimplePayoutUi === true ||
            fundedRunwayPayoutPanel.lucidFlexSimplePayoutUi === true ||
            fundedRunwayPayoutPanel.lucidDirectSimplePayoutUi === true ||
            fundedRunwayPayoutPanel.tptSimplePayoutUi === true ||
            fundedRunwayPayoutPanel.topstepSimplePayoutUi === true ||
            fundedRunwayPayoutPanel.fundedNextBoltSimplePayoutUi === true ||
            fundedRunwayPayoutPanel.fundedNextRapidSimplePayoutUi === true ||
            fundedRunwayPayoutPanel.fundedNextLegacySimplePayoutUi === true ||
            fundedRunwayPayoutPanel.mffuRapidSimplePayoutUi === true ||
            fundedRunwayPayoutPanel.mffuFlexSimplePayoutUi === true ||
            fundedRunwayPayoutPanel.mffuProSimplePayoutUi === true ||
            fundedRunwayPayoutPanel.ffnFundedSimplePayoutUi === true ||
            fundedRunwayPayoutPanel.etfFundedSimplePayoutUi === true ||
            fundedRunwayPayoutPanel.taurusArenaFundedSimplePayoutUi === true ||
            fundedRunwayPayoutPanel.tradeDayFundedSimplePayoutUi === true ||
            fundedRunwayPayoutPanel.phidiasFundedSimplePayoutUi === true ||
            fundedRunwayPayoutPanel.bulenoxFundedSimplePayoutUi === true ||
            fundedRunwayPayoutPanel.bluskyFundedSimplePayoutUi === true ||
            fundedRunwayPayoutPanel.daytradersFundedSimplePayoutUi === true ||
            fundedRunwayPayoutPanel.tradeifyLightningSimplePayoutUi === true ||
            fundedRunwayPayoutPanel.tradeifyGrowthSimplePayoutUi === true ||
            fundedRunwayPayoutPanel.tradeifySelectFlexSimplePayoutUi === true ||
            fundedRunwayPayoutPanel.tradeifySelectDailySimplePayoutUi === true ||
            fundedRunwayPayoutPanel.yrmPropSimplePayoutUi === true ||
            fundedRunwayPayoutPanel.aquaFuturesSimplePayoutUi === true ||
            fundedRunwayPayoutPanel.futuresEliteSimplePayoutUi === true ||
            fundedRunwayPayoutPanel.alphaFuturesSimplePayoutUi === true ||
            fundedRunwayPayoutPanel.legendsTradingSimplePayoutUi === true) &&
            fundedRunwayPayoutPanel.payoutCardCallout != null &&
            fundedRunwayPayoutPanel.payoutCardCallout.trim() !== "")) ? (
          <div
            className={`mt-4 space-y-2 rounded-xl border px-3 py-3 ${
              fundedPayoutPanelWarning
                ? "border-amber-400/35 bg-amber-500/[0.1]"
                : "border-emerald-400/25 bg-emerald-500/[0.08]"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {fundedRunwayPayoutPanel.goodNewsTitle ? (
              <p
                className={`text-center text-[13px] font-semibold ${
                  fundedRunwayPayoutPanel.goodNewsTitle === "Consistency rule breached" ||
                  fundedRunwayPayoutPanel.goodNewsTitle === "20% best-day rule"
                    ? "text-amber-100"
                    : "text-emerald-100"
                }`}
              >
                {fundedRunwayPayoutPanel.goodNewsTitle}
              </p>
            ) : null}
            {fundedRunwayPayoutPanel.payoutCardCallout ? (
              <p className="whitespace-pre-line text-center text-[11px] text-emerald-200/85">
                {fundedRunwayPayoutPanel.payoutCardCallout}
              </p>
            ) : null}
            {fundedRunwayPayoutPanel.payoutGateHint ? (
              <p
                className={`text-center text-[11px] leading-snug ${
                  fundedPayoutPanelWarning ? "text-amber-200/90" : "text-amber-200/88"
                }`}
              >
                {fundedRunwayPayoutPanel.payoutGateHint}
              </p>
            ) : null}
            {fundedRunwayPayoutPanel.showHardBreachWarning && fundedRunwayPayoutPanel.hardBreachWarningMessage ? (
              <p className="text-center text-[11px] leading-snug text-amber-200/90">
                {fundedRunwayPayoutPanel.hardBreachWarningMessage}
              </p>
            ) : null}
            {fundedRunwayPayoutPanel.showAddPayoutButton && onApexAddPayout && editable ? (
              <div className="flex justify-center pt-1">
                <button
                  type="button"
                  data-row-click-ignore="true"
                  onClick={(e) => {
                    e.stopPropagation();
                    onApexAddPayout(account.id, fundedRunway?.suggestedMaxPayoutUsd ?? null);
                  }}
                  className="rounded-xl border border-teal-400/45 bg-teal-500/20 px-4 py-2 text-[12px] font-semibold text-teal-50 shadow-[0_0_20px_rgba(45,212,191,0.12)] transition hover:border-teal-300/55 hover:bg-teal-500/28"
                >
                  Add Payout
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-600/25 pt-4">
        <div className="flex items-center gap-2">
          <span className="flex h-7 min-w-[2.5rem] items-center justify-center rounded-lg bg-slate-800/60 px-2 text-[11px] font-bold tabular-nums text-amber-200/95 ring-1 ring-amber-400/30">
            {ageDays}d
          </span>
          <span className="text-[10px] uppercase tracking-wider text-slate-500">Account age</span>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-wider text-slate-500">Avg / day</p>
          <p className="text-xs font-semibold tabular-nums text-slate-200/90">
            {usdPerDay == null ? "—" : formatUsdCents(Math.round(usdPerDay * 100))}
          </p>
        </div>
      </div>

    </article>
  );
}

export function JournalProgressView() {
  const { state, hydrated, dispatch, isAccountEditable } = useJournal();
  const storageUserId = useJournalStorageUserId();
  const pathname = usePathname();
  const stateRef = useRef(state);
  stateRef.current = state;
  const accountsList = useMemo(() => Object.values(state.accounts), [state.accounts]);
  const labelById = useAutoAccountLabelById(accountsList);
  const [lane, setLane] = useState<ProgressLane>("funded");
  const [accountModalId, setAccountModalId] = useState<string | null>(null);
  const [progressConvertFlow, setProgressConvertFlow] = useState<PassedConvertFlow | null>(
    null
  );
  const [apexPayoutModal, setApexPayoutModal] = useState<{
    accountId: string;
    suggestedUsd: number | null;
  } | null>(null);
  const [apexPayoutCommit, setApexPayoutCommit] = useState<{ tick: number; accountIds: string[] }>({
    tick: 0,
    accountIds: [],
  });
  const progressLaneInitRef = useRef(false);

  /** Onglet par défaut « Funded » masque les evals actives ; on choisit un onglet non vide une fois l’état hydraté. */
  useEffect(() => {
    if (!hydrated || progressLaneInitRef.current) return;
    progressLaneInitRef.current = true;
    const fundedN = accountsList.filter((a) => accountBelongsToProgressLane(a, "funded")).length;
    const challengeN = accountsList.filter((a) => accountBelongsToProgressLane(a, "challenge")).length;
    const blownN = accountsList.filter((a) => accountBelongsToProgressLane(a, "blown")).length;
    if (fundedN === 0 && challengeN > 0) setLane("challenge");
    else if (fundedN === 0 && challengeN === 0 && blownN > 0) setLane("blown");
  }, [hydrated, accountsList]);

  const resyncTradesPnlIntoJournal = useCallback(() => {
    if (!hydrated || !storageUserId) return;
    const { deleteIds, upserts } = syncJournalPnlFromStoredTrades(
      stateRef.current,
      loadTradesStore(storageUserId)
    );
    if (deleteIds.length === 0 && upserts.length === 0) return;
    dispatch({ type: "pnl/syncFromTrades", payload: { deleteIds, upserts } });
  }, [hydrated, dispatch, storageUserId]);

  /** Réaligne P&L journal ↔ trades (CSV) si un événement a été manqué ou la page était en arrière-plan. */
  useEffect(() => {
    if (!hydrated) return;
    const onVis = () => {
      if (document.visibilityState !== "visible") return;
      resyncTradesPnlIntoJournal();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [hydrated, resyncTradesPnlIntoJournal]);

  useEffect(() => {
    if (!hydrated || !pathname.includes("/desk/progress")) return;
    resyncTradesPnlIntoJournal();
  }, [hydrated, pathname, resyncTradesPnlIntoJournal]);

  const firmGroups = useMemo(() => {
    const list = Object.values(state.accounts)
      .filter((a) => accountBelongsToProgressLane(a, lane))
      .map((a) =>
        lane === "blown"
          ? buildAccountProgressModel(state, a, goalModeForAccount(a), { forBlownTab: true })
          : buildAccountProgressModel(state, a, lane)
      );
    return groupProgressModelsByFirm(list, lane);
  }, [state.accounts, state.pnlEntries, state.payoutEntries, state.lastSavedAt, lane]);

  const modelsFlat = useMemo(
    () => firmGroups.flatMap((g) => g.models),
    [firmGroups]
  );

  const summary = useMemo(() => {
    if (lane === "blown") {
      const withGoal = modelsFlat.filter((m) => !m.missingGoal);
      const best =
        withGoal.length > 0
          ? Math.max(
              ...withGoal.map((m) =>
                Math.round(effectiveProgress01({ lane: m.lane, progress01: m.progress01 }) * 100)
              )
            )
          : null;
      const maxDays =
        modelsFlat.length > 0 ? Math.max(...modelsFlat.map((m) => m.ageDays)) : null;
      return { count: modelsFlat.length, maxDays, bestPct: best };
    }
    const active = modelsFlat.filter((m) => m.displayState === "active");
    const maxDays = active.length ? Math.max(...active.map((m) => m.ageDays)) : null;
    return { count: modelsFlat.length, maxDays, bestPct: null as number | null };
  }, [modelsFlat, lane]);

  const progressConvertAccount =
    progressConvertFlow != null ? state.accounts[progressConvertFlow.accountId] ?? null : null;

  const openProgressConvert = useCallback(
    (accountId: string) => {
      if (!isAccountEditable(accountId)) return;
      setAccountModalId(null);
      setProgressConvertFlow({ accountId, phase: "convert" });
    },
    [isAccountEditable]
  );

  const apexPayoutModalAccounts = useMemo((): PayoutModalAccountLine[] => {
    if (!apexPayoutModal) return [];
    const a = state.accounts[apexPayoutModal.accountId];
    if (!a) return [];
    return [
      {
        id: a.id,
        label: resolveAccountDisplayName(a, labelById),
        firmName: a.propFirm.name,
        journalAccount: a,
      },
    ];
  }, [apexPayoutModal, state.accounts, labelById]);

  const apexPayoutSuggestedUsdById = useMemo(() => {
    if (!apexPayoutModal || apexPayoutModal.suggestedUsd == null) return undefined;
    return { [apexPayoutModal.accountId]: apexPayoutModal.suggestedUsd };
  }, [apexPayoutModal]);

  const progressPayoutConfirmBanner = useMemo(() => {
    if (apexPayoutModal == null) return null;
    const a = state.accounts[apexPayoutModal.accountId];
    if (!a) return null;
    if (isLucidProFundedJournalAccount(a)) return LUCID_PRO_FUNDED_PAYOUT_DASHBOARD_REMINDER;
    if (isLucidFlexFundedJournalAccount(a)) return LUCID_FLEX_FUNDED_PAYOUT_DASHBOARD_REMINDER;
    if (isLucidDirectFundedJournalAccount(a)) return LUCID_DIRECT_FUNDED_PAYOUT_DASHBOARD_REMINDER;
    if (isTakeProfitTraderJournalAccount(a)) return TPT_FUNDED_PAYOUT_DASHBOARD_REMINDER;
    if (isTopStepFundedJournalAccount(a)) return TOPSTEP_FUNDED_PAYOUT_DASHBOARD_REMINDER;
    if (isFundedNextBoltFundedJournalAccount(a)) return FUNDED_NEXT_BOLT_PAYOUT_DASHBOARD_REMINDER;
    if (isFundedNextRapidFundedJournalAccount(a)) return FUNDED_NEXT_RAPID_PAYOUT_DASHBOARD_REMINDER;
    if (isFundedNextLegacyFundedJournalAccount(a)) return FUNDED_NEXT_LEGACY_PAYOUT_DASHBOARD_REMINDER;
    if (isMffuRapidSimFundedJournalAccount(a)) return MFFU_RAPID_PAYOUT_DASHBOARD_REMINDER;
    if (isMffuFlexSimFundedJournalAccount(a)) return MFFU_FLEX_PAYOUT_DASHBOARD_REMINDER;
    if (isMffuProSimFundedJournalAccount(a)) return MFFU_PRO_PAYOUT_DASHBOARD_REMINDER;
    if (getFundedFuturesNetworkFundedRowOrNull(a) != null) return FFN_FUNDED_PAYOUT_DASHBOARD_REMINDER;
    if (isTaurusArenaFundedJournalAccount(a)) return TAURUS_ARENA_FUNDED_PAYOUT_DASHBOARD_REMINDER;
    if (isTradeDayFundedJournalAccount(a)) return TRADEDAY_FUNDED_PAYOUT_DASHBOARD_REMINDER;
    if (isPhidiasFundedJournalAccount(a)) return PHIDIAS_FUNDED_PAYOUT_DASHBOARD_REMINDER;
    if (isEliteTraderFundingFundedJournalAccount(a)) return ELITE_TRADER_FUNDING_FUNDED_PAYOUT_DASHBOARD_REMINDER;
    if (isBulenoxFundedSimplePayoutJournalAccount(a)) return BULENOX_FUNDED_PAYOUT_DASHBOARD_REMINDER;
    if (isBluskyFundedJournalAccount(a)) return BLUSKY_FUNDED_PAYOUT_DASHBOARD_REMINDER;
    if (isDaytradersFundedJournalAccount(a)) return DAYTRADERS_FUNDED_PAYOUT_DASHBOARD_REMINDER;
    if (isTradeifyGrowthFundedJournalAccount(a)) return TRADEIFY_GROWTH_FUNDED_PAYOUT_DASHBOARD_REMINDER;
    if (isTradeifySelectDailyFundedJournalAccount(a))
      return TRADEIFY_SELECT_DAILY_FUNDED_PAYOUT_DASHBOARD_REMINDER;
    if (isTradeifySelectFlexFundedJournalAccount(a))
      return TRADEIFY_SELECT_FLEX_FUNDED_PAYOUT_DASHBOARD_REMINDER;
    if (isTradeifyLightningFundedJournalAccount(a)) return TRADEIFY_LIGHTNING_FUNDED_PAYOUT_DASHBOARD_REMINDER;
    if (isApexJournalAccount(a)) return APEX_FUNDED_PAYOUT_DASHBOARD_REMINDER;
    if (isYrmPropFundedJournalAccount(a)) return YRM_PROP_FUNDED_PAYOUT_DASHBOARD_REMINDER;
    if (isAquaFuturesFundedJournalAccount(a)) return AQUA_FUTURES_FUNDED_PAYOUT_DASHBOARD_REMINDER;
    if (isFuturesEliteFundedJournalAccount(a)) return FUTURES_ELITE_FUNDED_PAYOUT_DASHBOARD_REMINDER;
    if (isAlphaFuturesFundedJournalAccount(a)) return ALPHA_FUTURES_FUNDED_PAYOUT_DASHBOARD_REMINDER;
    if (isLegendsTradingFundedJournalAccount(a)) return LEGENDS_TRADING_FUNDED_PAYOUT_DASHBOARD_REMINDER;
    return null;
  }, [apexPayoutModal, state.accounts]);

  const confirmApexProgressPayout = useCallback(
    (payload: {
      date: string;
      note: string;
      perAccount: { accountId: string; netUsd: number }[];
    }) => {
      if (!payload.perAccount.length) return;
      const t = nowIso();
      const paidAccountIds: string[] = [];
      for (const { accountId, netUsd } of payload.perAccount) {
        if (netUsd <= 0) continue;
        const id =
          typeof crypto !== "undefined" && crypto.randomUUID
            ? crypto.randomUUID()
            : `payout-${Date.now()}-${accountId}`;
        const acc = state.accounts[accountId];
        if (!acc) continue;
        const grossCents = Math.round(netUsd * 100);
        if (grossCents <= 0) continue;
        const priorGross = sumNonRejectedJournalPayoutGrossCents(state, accountId);
        let netAmountCents = grossCents;
        if (isTradeDayFundedJournalAccount(acc)) {
          netAmountCents = tradedayTraderNetFromGrossMarginal(priorGross, grossCents);
        } else if (isAquaFuturesFundedJournalAccount(acc)) {
          netAmountCents = Math.round(
            grossCents *
              (priorGross < AQUA_FUTURES_CUMULATIVE_SPLIT_THRESHOLD_CENTS ? 1 : 0.9)
          );
        } else if (isFuturesEliteFundedJournalAccount(acc)) {
          const b = getFuturesEliteFundedBlockForJournalAccount(acc);
          const r = b ? (tradeifyProfitSplitRatioFromLabel(b.def.profitSplit) ?? 1) : 1;
          netAmountCents = Math.round(grossCents * r);
        } else if (isAlphaFuturesFundedJournalAccount(acc)) {
          const b = getAlphaFuturesFundedBlockForJournalAccount(acc);
          if (b?.def.standardEscalatingSplit) {
            const k = alphaFuturesStandardPriorPaidCountForNewPayout(state, accountId);
            const r = alphaFuturesStandardTraderSplitRatioFromPriorPaidCount(k);
            netAmountCents = Math.round(grossCents * r);
          } else {
            const r = b ? (tradeifyProfitSplitRatioFromLabel(b.def.profitSplit) ?? 1) : 1;
            netAmountCents = Math.round(grossCents * r);
          }
        } else if (isLegendsTradingFundedJournalAccount(acc)) {
          const b = getLegendsTradingFundedBlockForJournalAccount(acc);
          const r = b ? (tradeifyProfitSplitRatioFromLabel(b.def.profitSplit) ?? 1) : 1;
          netAmountCents = Math.round(grossCents * r);
        }
        paidAccountIds.push(accountId);
        dispatch({
          type: "payout/upsert",
          payload: {
            id,
            accountId,
            requestedDate: payload.date,
            paidDate: payload.date,
            grossAmountCents: grossCents,
            netAmountCents,
            status: "paid",
            note: payload.note || undefined,
            createdAt: t,
            updatedAt: t,
          },
        });
      }
      if (paidAccountIds.length > 0) {
        setApexPayoutCommit((c) => ({ tick: c.tick + 1, accountIds: paidAccountIds }));
      }
      setApexPayoutModal(null);
    },
    [dispatch, state]
  );

  const confirmProgressConvert = useCallback(
    (payload: {
      newDisplayName: string;
      activationFeeUsd: number;
      fundedConversionDate: string;
      tradeifySelectFundedVariant?: "daily" | "flex";
    }) => {
      if (!progressConvertFlow) return;
      if (!isAccountEditable(progressConvertFlow.accountId)) {
        setProgressConvertFlow(null);
        return;
      }
      const challenge = state.accounts[progressConvertFlow.accountId];
      if (!challenge) return;
      dispatchFundConversion({
        dispatch,
        state,
        challenge,
        payload,
        getAutoLabel: (id) => labelById.get(id),
      });
      setProgressConvertFlow(null);
      setLane("funded");
    },
    [progressConvertFlow, state, dispatch, labelById, isAccountEditable]
  );

  if (!hydrated) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center text-sm text-white/40">Loading…</div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <AccountViewModal accountId={accountModalId} onClose={() => setAccountModalId(null)} />
      <PassedConvertModalHost
        open={progressConvertFlow != null}
        flow={progressConvertFlow}
        account={progressConvertAccount}
        formatAccountLabel={(acc) => resolveAccountDisplayName(acc, labelById)}
        onClose={() => setProgressConvertFlow(null)}
        onIntroMaybeLater={() => setProgressConvertFlow(null)}
        onIntroConvertNow={() => {}}
        onConfirmConvert={confirmProgressConvert}
      />
      <AddPayoutModal
        open={apexPayoutModal != null && apexPayoutModalAccounts.length > 0}
        accounts={apexPayoutModalAccounts}
        defaultDate={isoDateLocal()}
        variant="singleAccount"
        suggestedAmountUsdByAccountId={apexPayoutSuggestedUsdById}
        confirmBanner={progressPayoutConfirmBanner}
        journalPayoutState={state}
        onClose={() => setApexPayoutModal(null)}
        onConfirm={confirmApexProgressPayout}
      />
      <header className="shrink-0 border-b border-white/10 bg-black/55 px-[clamp(16px,2.5vw,40px)] py-[clamp(14px,1.8vw,24px)] backdrop-blur-xl">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-sky-400/90">TradeDesk</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">Progress</h1>
          </div>
          <div className="flex flex-wrap gap-1.5 rounded-xl border border-white/12 bg-white/[0.04] p-1 sm:gap-2">
            {(
              [
                ["funded", "Funded"],
                ["challenge", "Evaluations"],
                ["blown", "Blown"],
              ] as const
            ).map(([key, lab]) => (
              <button
                key={key}
                type="button"
                onClick={() => setLane(key)}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition sm:px-4 ${
                  lane === key
                    ? key === "blown"
                      ? "bg-gradient-to-b from-rose-500/25 to-rose-900/10 text-rose-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] ring-1 ring-rose-400/35"
                      : "bg-gradient-to-b from-amber-500/25 to-amber-600/10 text-amber-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] ring-1 ring-amber-400/30"
                    : "text-white/55 hover:bg-white/[0.06] hover:text-white"
                }`}
              >
                {lab}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col px-[clamp(12px,2.5vw,40px)] py-6">
        <div
          className={`mb-6 grid gap-3 lg:mb-8 ${
            lane === "blown" ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2 sm:grid-cols-3"
          }`}
        >
          <div className="rounded-xl border border-white/10 bg-black/25 px-4 py-3 shadow-sm shadow-black/10">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-white/45">Accounts</p>
            <p className="mt-1 text-xl font-semibold tabular-nums text-white">{summary.count}</p>
          </div>
          {lane === "blown" ? (
            <div className="rounded-xl border border-white/10 bg-black/25 px-4 py-3 shadow-sm shadow-black/10">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-white/45">
                Best run (max %)
              </p>
              <p className="mt-1 text-xl font-semibold tabular-nums text-amber-200/95">
                {summary.bestPct != null ? `${summary.bestPct}%` : "—"}
              </p>
            </div>
          ) : null}
          <div className="rounded-xl border border-white/10 bg-black/25 px-4 py-3 shadow-sm shadow-black/10">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-white/45">Oldest (days)</p>
            <p className="mt-1 text-xl font-semibold tabular-nums text-white">{summary.maxDays ?? "—"}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/25 px-4 py-3 shadow-sm shadow-black/10">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-white/45">View</p>
            <p className="mt-1 text-sm font-semibold text-white/90">
              {lane === "challenge" ? "Evaluations" : lane === "funded" ? "Funded" : "Blown"}
            </p>
          </div>
        </div>

        {modelsFlat.length === 0 ? (
          <div className="flex min-h-[min(50vh,28rem)] flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 bg-black/20 px-8 py-16 text-center">
            <p className="text-lg font-medium text-white/90">
              {lane === "blown" ? "No blown accounts" : "No accounts in this view"}
            </p>
            <p className="mt-2 max-w-md text-sm text-white/50">
              {lane === "blown"
                ? "When an account is marked blown, it moves here with the same target or buffer progression."
                : `Add an ${lane === "challenge" ? "evaluation" : "funded"} account from Accounts, import P&L on the calendar, and your progress will appear here.`}
            </p>
            {lane === "funded" &&
            accountsList.some((a) => accountBelongsToProgressLane(a, "challenge")) ? (
              <p className="mt-3 max-w-md text-sm text-amber-200/70">
                Active evaluations are listed under{" "}
                <button
                  type="button"
                  onClick={() => setLane("challenge")}
                  className="font-semibold text-sky-300/95 underline decoration-sky-400/40 underline-offset-2 hover:text-sky-200"
                >
                  Evaluations
                </button>
                .
              </p>
            ) : null}
            {lane !== "blown" ? (
              <Link
                href="/desk/accounts"
                className="mt-6 rounded-xl border border-sky-500/35 bg-sky-500/15 px-5 py-2.5 text-sm font-semibold text-sky-100 transition hover:bg-sky-500/25"
              >
                Go to Accounts
              </Link>
            ) : null}
          </div>
        ) : (
          <div
            id="landing-capture-progress"
            className="flex flex-col gap-10 lg:gap-12"
          >
            {firmGroups.map(({ firmName, logoSrc, models: firmModels }) => {
              const firmSlug = firmSectionSlug(firmName);
              return (
              <section key={firmName} aria-labelledby={`progress-firm-${firmSlug}`}>
                <div
                  id={`progress-firm-${firmSlug}`}
                  className="mb-4 flex items-center gap-3 border-b border-white/[0.08] pb-3"
                >
                  {logoSrc ? (
                    <img
                      src={logoSrc}
                      alt=""
                      className="h-9 w-9 shrink-0 rounded-lg bg-white/[0.06] object-contain p-1 ring-1 ring-white/10"
                    />
                  ) : (
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.06] text-xs font-bold uppercase tracking-wide text-white/45 ring-1 ring-white/10"
                      aria-hidden
                    >
                      {firmName.slice(0, 1)}
                    </div>
                  )}
                  <h2 className="min-w-0 text-base font-semibold tracking-tight text-white/95 sm:text-lg">
                    {firmName}
                  </h2>
                </div>
                <div className="grid auto-rows-fr gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {firmModels.map((m) => (
                    <MissionCard
                      key={m.account.id}
                      model={m}
                      label={resolveAccountDisplayName(m.account, labelById)}
                      state={state}
                      editable={isAccountEditable(m.account.id)}
                      onOpenAccount={setAccountModalId}
                      onConvertToFunded={
                        lane === "challenge" ? openProgressConvert : undefined
                      }
                      onApexAddPayout={(accountId, suggestedUsd) => {
                        if (!isAccountEditable(accountId)) return;
                        setApexPayoutModal({ accountId, suggestedUsd });
                      }}
                      apexPayoutCommit={apexPayoutCommit}
                    />
                  ))}
                </div>
              </section>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}


