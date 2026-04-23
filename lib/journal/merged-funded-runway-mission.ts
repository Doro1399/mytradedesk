/**
 * Même `??` que `MissionCard` (journal-progress-view) pour savoir quelle runway
 * funded « gagne » et si `showAddPayoutButton` s’applique (tri / density).
 * À garder aligné avec le merge ~1316+ dans journal-progress-view.tsx.
 */
import { tryBuildApexFundedRunway } from "@/lib/journal/apex-funded-progress";
import { isApexJournalAccount } from "@/lib/journal/apex-journal-rules";
import { tryBuildAlphaFuturesFundedRunway } from "@/lib/journal/alpha-futures-funded-runway";
import { isAlphaFuturesFundedJournalAccount } from "@/lib/journal/alpha-futures-funded-runway";
import { tryBuildAquaFuturesFundedRunway } from "@/lib/journal/aquafutures-funded-runway";
import { isAquaFuturesFundedJournalAccount } from "@/lib/journal/aquafutures-funded-runway";
import { tryBuildBluskyFundedRunway } from "@/lib/journal/blusky-funded-runway";
import { isBluskyFundedJournalAccount } from "@/lib/journal/blusky-journal-rules";
import { tryBuildBulenoxFundedSimpleRunway } from "@/lib/journal/bulenox-master-funded-runway";
import { isBulenoxFundedSimplePayoutJournalAccount } from "@/lib/journal/bulenox-master-funded-runway";
import { tryBuildDaytradersFundedRunway } from "@/lib/journal/daytraders-funded-runway";
import { isDaytradersFundedJournalAccount } from "@/lib/journal/daytraders-journal-rules";
import { tryBuildEliteTraderFundingFundedRunway } from "@/lib/journal/elite-trader-funding-funded-runway";
import { isEliteTraderFundingFundedJournalAccount } from "@/lib/journal/elite-trader-funding-journal-rules";
import { tryBuildFuturesEliteFundedRunway } from "@/lib/journal/futures-elite-funded-runway";
import { isFuturesEliteFundedJournalAccount } from "@/lib/journal/futures-elite-funded-runway";
import { tryBuildFundedFuturesNetworkFundedRunway } from "@/lib/journal/funded-futures-network-funded-runway";
import { tryBuildFundedNextBoltFundedRunway } from "@/lib/journal/funded-next-bolt-funded-runway";
import { tryBuildFundedNextLegacyFundedRunway } from "@/lib/journal/funded-next-legacy-funded-runway";
import { tryBuildFundedNextRapidFundedRunway } from "@/lib/journal/funded-next-rapid-funded-runway";
import {
  isFundedNextBoltFundedJournalAccount,
  isFundedNextLegacyFundedJournalAccount,
  isFundedNextRapidFundedJournalAccount,
} from "@/lib/journal/funded-next-journal-rules";
import { getFundedPhaseProfitCents } from "@/lib/journal/funded-phase-pnl";
import { tryBuildLegendsTradingFundedRunway } from "@/lib/journal/legends-trading-funded-runway";
import { isLegendsTradingFundedJournalAccount } from "@/lib/journal/legends-trading-funded-runway";
import { tryBuildLucidDirectFundedRunway } from "@/lib/journal/lucid-direct-funded-runway";
import { tryBuildLucidFlexFundedRunway } from "@/lib/journal/lucid-flex-funded-payout-state";
import { tryBuildLucidProFundedRunway } from "@/lib/journal/lucid-pro-funded-runway";
import {
  getLucidDirectFundedBlockForAccount,
  getLucidFlexFundedBlockForAccount,
  isLucidProFundedJournalAccount,
} from "@/lib/journal/lucid-journal-rules";
import { tryBuildMffuFlexSimFundedRunway } from "@/lib/journal/mffu-flex-sim-funded-runway";
import { isMffuFlexSimFundedJournalAccount } from "@/lib/journal/mffu-flex-sim-funded-journal-rules";
import { tryBuildMffuProSimFundedRunway } from "@/lib/journal/mffu-pro-sim-funded-runway";
import { isMffuProSimFundedJournalAccount } from "@/lib/journal/mffu-pro-sim-funded-journal-rules";
import { tryBuildMffuRapidSimFundedRunway } from "@/lib/journal/mffu-rapid-sim-funded-runway";
import { isMffuRapidSimFundedJournalAccount } from "@/lib/journal/mffu-rapid-sim-funded-journal-rules";
import { tryBuildPhidiasFundedRunway } from "@/lib/journal/phidias-funded-runway";
import { isPhidiasFundedJournalAccount } from "@/lib/journal/phidias-journal-rules";
import { tryBuildTaurusArenaFundedRunway } from "@/lib/journal/taurus-arena-funded-runway";
import { isTaurusArenaFundedJournalAccount } from "@/lib/journal/taurus-arena-journal-rules";
import { tryBuildTptFundedRunway } from "@/lib/journal/tpt-funded-runway";
import { tryBuildTopStepFundedRunway } from "@/lib/journal/topstep-funded-runway";
import { isTopStepFundedJournalAccount } from "@/lib/journal/topstep-journal-rules";
import { tryBuildTradeDayFundedRunway } from "@/lib/journal/tradeday-funded-runway";
import { isTradeDayFundedJournalAccount } from "@/lib/journal/tradeday-journal-rules";
import { tryBuildTradeifyGrowthFundedRunway } from "@/lib/journal/tradeify-growth-funded-runway";
import { tryBuildTradeifyLightningFundedRunway } from "@/lib/journal/tradeify-lightning-funded-runway";
import {
  isTradeifySelectDailyFundedJournalAccount,
  isTradeifySelectFlexFundedJournalAccount,
} from "@/lib/journal/tradeify-journal-rules";
import { tryBuildTradeifySelectDailyFundedRunway } from "@/lib/journal/tradeify-select-daily-funded-runway";
import { tryBuildTradeifySelectFlexFundedRunway } from "@/lib/journal/tradeify-select-flex-funded-runway";
import { tryBuildYrmPropFundedRunway } from "@/lib/journal/yrm-prop-funded-runway";
import { isYrmPropFundedJournalAccount } from "@/lib/journal/yrm-prop-funded-runway";
import { getAccountFinancialMetrics } from "@/lib/journal/selectors";
import type { AccountProgressModel } from "@/lib/journal/progress-metrics";
import type { JournalDataV1 } from "@/lib/journal/types";
import type { ApexFundedRunway } from "@/lib/journal/apex-funded-progress";

function isLiveAccount(account: AccountProgressModel["account"]): boolean {
  return account.accountType === "funded" || account.accountType === "live";
}

export function getMergedFundedRunwayForProgressModel(
  state: JournalDataV1,
  model: AccountProgressModel
): ApexFundedRunway | null {
  const { account, lane, missingGoal, startCents, currentCents, strideCents, progress01 } = model;
  if (lane !== "funded" || !isLiveAccount(account)) {
    return null;
  }

  const yrmPropFundedRunway = isYrmPropFundedJournalAccount(account)
    ? tryBuildYrmPropFundedRunway(state, account, { startCents, currentCents })
    : null;
  const aquaFuturesFundedRunway = isAquaFuturesFundedJournalAccount(account)
    ? tryBuildAquaFuturesFundedRunway(state, account, { startCents, currentCents })
    : null;
  const futuresEliteFundedRunway = isFuturesEliteFundedJournalAccount(account)
    ? tryBuildFuturesEliteFundedRunway(state, account, { startCents, currentCents })
    : null;
  const alphaFuturesFundedRunway = isAlphaFuturesFundedJournalAccount(account)
    ? tryBuildAlphaFuturesFundedRunway(state, account, { startCents, currentCents })
    : null;
  const legendsTradingFundedRunway = isLegendsTradingFundedJournalAccount(account)
    ? tryBuildLegendsTradingFundedRunway(state, account, { startCents, currentCents })
    : null;
  const topStepRunway = isTopStepFundedJournalAccount(account)
    ? tryBuildTopStepFundedRunway(state, account, { startCents, currentCents })
    : null;
  const tptRunway =
    topStepRunway != null
      ? null
      : tryBuildTptFundedRunway(state, account, { startCents, currentCents });
  const tradeifyGrowthRunway =
    topStepRunway != null || tptRunway != null
      ? null
      : tryBuildTradeifyGrowthFundedRunway(state, account, { startCents, currentCents });
  const tradeifyLightningRunway =
    topStepRunway != null || tptRunway != null || tradeifyGrowthRunway != null
      ? null
      : tryBuildTradeifyLightningFundedRunway(state, account, { startCents, currentCents });
  const fundedNextBoltRunway =
    topStepRunway != null || tptRunway != null || tradeifyGrowthRunway != null || tradeifyLightningRunway != null
      ? null
      : isFundedNextBoltFundedJournalAccount(account)
        ? tryBuildFundedNextBoltFundedRunway(state, account, { startCents, currentCents })
        : null;
  const fundedNextRapidRunway =
    topStepRunway != null ||
    tptRunway != null ||
    tradeifyGrowthRunway != null ||
    tradeifyLightningRunway != null ||
    fundedNextBoltRunway != null
      ? null
      : isFundedNextRapidFundedJournalAccount(account)
        ? tryBuildFundedNextRapidFundedRunway(state, account, { startCents, currentCents })
        : null;
  const fundedNextLegacyRunway =
    topStepRunway != null ||
    tptRunway != null ||
    tradeifyGrowthRunway != null ||
    tradeifyLightningRunway != null ||
    fundedNextBoltRunway != null ||
    fundedNextRapidRunway != null
      ? null
      : isFundedNextLegacyFundedJournalAccount(account)
        ? tryBuildFundedNextLegacyFundedRunway(state, account, { startCents, currentCents })
        : null;
  const mffuRapidSimFundedRunway =
    topStepRunway != null ||
    tptRunway != null ||
    tradeifyGrowthRunway != null ||
    tradeifyLightningRunway != null ||
    fundedNextBoltRunway != null ||
    fundedNextRapidRunway != null ||
    fundedNextLegacyRunway != null
      ? null
      : isMffuRapidSimFundedJournalAccount(account)
        ? tryBuildMffuRapidSimFundedRunway(state, account, { startCents, currentCents })
        : null;
  const mffuFlexSimFundedRunway =
    topStepRunway != null ||
    tptRunway != null ||
    tradeifyGrowthRunway != null ||
    tradeifyLightningRunway != null ||
    fundedNextBoltRunway != null ||
    fundedNextRapidRunway != null ||
    fundedNextLegacyRunway != null ||
    mffuRapidSimFundedRunway != null
      ? null
      : isMffuFlexSimFundedJournalAccount(account)
        ? tryBuildMffuFlexSimFundedRunway(state, account, { startCents, currentCents })
        : null;
  const mffuProSimFundedRunway =
    topStepRunway != null ||
    tptRunway != null ||
    tradeifyGrowthRunway != null ||
    tradeifyLightningRunway != null ||
    fundedNextBoltRunway != null ||
    fundedNextRapidRunway != null ||
    fundedNextLegacyRunway != null ||
    mffuRapidSimFundedRunway != null ||
    mffuFlexSimFundedRunway != null
      ? null
      : isMffuProSimFundedJournalAccount(account)
        ? tryBuildMffuProSimFundedRunway(state, account, { startCents, currentCents })
        : null;
  const bulenoxFundedSimpleRunway =
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
      ? null
      : isBulenoxFundedSimplePayoutJournalAccount(account)
        ? tryBuildBulenoxFundedSimpleRunway(state, account, { startCents, currentCents })
        : null;
  const taurusArenaFundedRunway =
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
      ? null
      : isTaurusArenaFundedJournalAccount(account)
        ? tryBuildTaurusArenaFundedRunway(state, account, { startCents, currentCents })
        : null;
  const tradeDayFundedRunway =
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
      ? null
      : isTradeDayFundedJournalAccount(account)
        ? tryBuildTradeDayFundedRunway(state, account, { startCents, currentCents })
        : null;
  const phidiasFundedRunway =
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
      ? null
      : isPhidiasFundedJournalAccount(account)
        ? tryBuildPhidiasFundedRunway(state, account, { startCents, currentCents })
        : null;
  const eliteTraderFundingFundedRunway =
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
      ? null
      : isEliteTraderFundingFundedJournalAccount(account)
        ? tryBuildEliteTraderFundingFundedRunway(state, account, { startCents, currentCents })
        : null;
  const ffnFundedRunway =
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
      ? null
      : tryBuildFundedFuturesNetworkFundedRunway(state, account, { startCents, currentCents });
  const bluskyFundedRunway =
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
      ? null
      : isBluskyFundedJournalAccount(account)
        ? tryBuildBluskyFundedRunway(state, account, { startCents, currentCents })
        : null;
  const daytradersFundedRunway =
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
      ? null
      : isDaytradersFundedJournalAccount(account)
        ? tryBuildDaytradersFundedRunway(state, account, { startCents, currentCents })
        : null;
  const tradeifySelectFlexRunway =
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
      ? null
      : isTradeifySelectFlexFundedJournalAccount(account)
        ? tryBuildTradeifySelectFlexFundedRunway(state, account, { startCents, currentCents })
        : null;
  const tradeifySelectDailyRunway =
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
      ? null
      : isTradeifySelectDailyFundedJournalAccount(account)
        ? tryBuildTradeifySelectDailyFundedRunway(state, account, { startCents, currentCents })
        : null;
  const lucidFlexRunway =
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
      ? null
      : getLucidFlexFundedBlockForAccount(account) != null
        ? tryBuildLucidFlexFundedRunway(state, account, { startCents, currentCents })
        : null;
  const lucidDirectRunway =
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
      ? null
      : getLucidDirectFundedBlockForAccount(account) != null
        ? tryBuildLucidDirectFundedRunway(state, account, { startCents, currentCents })
        : null;
  const lucidProRunway =
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
      ? null
      : !isLucidProFundedJournalAccount(account) || missingGoal || strideCents <= 0
        ? null
        : tryBuildLucidProFundedRunway(state, account, {
            startCents,
            bufferStrideCents: strideCents,
            bufferPhaseProgress01: progress01,
            currentCents,
          });
  const apexRunway =
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
      ? null
      : !isApexJournalAccount(account) || missingGoal || strideCents <= 0
        ? null
        : tryBuildApexFundedRunway(state, account, {
            startCents,
            bufferStrideCents: strideCents,
            rawFundedPnlCents: getFundedPhaseProfitCents(state, account),
            lifetimePnlCents: getAccountFinancialMetrics(state, account.id).totalPnlCents,
            currentCents,
          });

  return (
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
    apexRunway
  );
}
