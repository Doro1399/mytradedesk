import type { JournalAccount, JournalDataV1, JournalId, JournalPayoutEntry } from "@/lib/journal/types";
import {
  isLucidDirectFundedJournalAccount,
  isLucidFlexFundedJournalAccount,
  isLucidProFundedJournalAccount,
} from "@/lib/journal/lucid-journal-rules";
import { isTakeProfitTraderJournalAccount } from "@/lib/journal/tpt-journal-rules";
import { FUNDED_NEXT_BOLT_FUNDED_FROM_CSV } from "@/lib/journal/funded-next-bolt-funded-csv.generated";
import { FUNDED_NEXT_LEGACY_FUNDED_FROM_CSV } from "@/lib/journal/funded-next-legacy-funded-csv.generated";
import { FUNDED_NEXT_RAPID_FUNDED_FROM_CSV } from "@/lib/journal/funded-next-rapid-funded-csv.generated";
import {
  isFundedNextBoltFundedJournalAccount,
  isFundedNextLegacyFundedJournalAccount,
  isFundedNextRapidFundedJournalAccount,
  parseFundedNextRewardSplitRatio,
} from "@/lib/journal/funded-next-journal-rules";
import {
  MFFU_RAPID_SIM_FUNDED_FROM_CSV,
  type MffuRapidSimFundedCsvSize,
} from "@/lib/journal/mffu-rapid-sim-funded-csv.generated";
import {
  MFFU_FLEX_SIM_FUNDED_FROM_CSV,
  type MffuFlexSimFundedCsvSize,
} from "@/lib/journal/mffu-flex-sim-funded-csv.generated";
import {
  MFFU_PRO_SIM_FUNDED_FROM_CSV,
  type MffuProSimFundedCsvSize,
} from "@/lib/journal/mffu-pro-sim-funded-csv.generated";
import { isMffuFlexSimFundedJournalAccount } from "@/lib/journal/mffu-flex-sim-funded-journal-rules";
import { isMffuProSimFundedJournalAccount } from "@/lib/journal/mffu-pro-sim-funded-journal-rules";
import { getFundedFuturesNetworkFundedRowOrNull } from "@/lib/journal/funded-futures-network-journal-rules";
import { isBluskyFundedJournalAccount } from "@/lib/journal/blusky-journal-rules";
import {
  getDaytradersFundedPayoutRowForAccount,
  isDaytradersFundedJournalAccount,
} from "@/lib/journal/daytraders-journal-rules";
import {
  getTaurusArenaFundedPayoutRowForAccount,
  isTaurusArenaFundedJournalAccount,
} from "@/lib/journal/taurus-arena-journal-rules";
import {
  isTradeDayFundedJournalAccount,
  tradedayGrossCentsFromTraderNetMarginal,
  tradedayTraderNetFromGrossMarginal,
} from "@/lib/journal/tradeday-journal-rules";
import { isMffuRapidSimFundedJournalAccount } from "@/lib/journal/mffu-rapid-sim-funded-journal-rules";
import {
  getTradeifyLightningFundedRowForAccount,
  getTradeifySelectDailyFundedBlockForAccount,
  getTradeifySelectFlexFundedBlockForAccount,
  isTradeifyGrowthFundedJournalAccount,
  tradeifyProfitSplitRatioFromLabel,
} from "@/lib/journal/tradeify-journal-rules";
import {
  aquaFuturesEffectiveProfitSplitFromPriorCumulativeGrossCents,
  aquaFuturesPriorCumulativeGrossCentsForPayoutLine,
  isAquaFuturesFundedJournalAccount,
} from "@/lib/journal/aquafutures-funded-runway";
import { getYrmPropFundedBlockForJournalAccount } from "@/lib/journal/yrm-prop-funded-runway";
import { getFuturesEliteFundedBlockForJournalAccount } from "@/lib/journal/futures-elite-funded-runway";
import { getAlphaFuturesFundedBlockForJournalAccount } from "@/lib/journal/alpha-futures-funded-runway";
import { getLegendsTradingFundedBlockForJournalAccount } from "@/lib/journal/legends-trading-funded-runway";
import {
  alphaFuturesStandardPriorPaidCountBeforeEntry,
  alphaFuturesStandardTraderSplitRatioFromPriorPaidCount,
} from "@/lib/journal/alpha-futures-standard-payout-split";

/** Part trader affichée pour TopStep : 90 % du montant de payout enregistré (brut). */
const TOPSTEP_PAYOUT_DISPLAY_SHARE = 0.9;
/** Lucid Pro / Flex / Direct funded : 90 % du brut (split CSV). */
const LUCID_PRO_FLEX_PAYOUT_DISPLAY_SHARE = 0.9;
/** Take Profit Trader : 80 % du brut enregistré (split affiché). */
const TPT_PAYOUT_DISPLAY_SHARE = 0.8;
/** Tradeify Growth funded : 90 % du brut (CSV). */
const TRADEIFY_GROWTH_PAYOUT_DISPLAY_SHARE = 0.9;
/** BluSky funded (CSV) : split trader 90 %. */
const BLUSKY_FUNDED_PAYOUT_DISPLAY_SHARE = 0.9;

function fundedNextBoltDisplayShare(account: JournalAccount): number | null {
  if (!isFundedNextBoltFundedJournalAccount(account)) return null;
  const sk = account.sizeLabel.trim().toLowerCase().replace(/\s+/g, "") as keyof typeof FUNDED_NEXT_BOLT_FUNDED_FROM_CSV;
  const row = FUNDED_NEXT_BOLT_FUNDED_FROM_CSV[sk as "50k"];
  if (!row) return null;
  return parseFundedNextRewardSplitRatio(row.profitSplitLabel);
}

function fundedNextRapidDisplayShare(account: JournalAccount): number | null {
  if (!isFundedNextRapidFundedJournalAccount(account)) return null;
  const sk = account.sizeLabel.trim().toLowerCase().replace(/\s+/g, "") as keyof typeof FUNDED_NEXT_RAPID_FUNDED_FROM_CSV;
  const row = FUNDED_NEXT_RAPID_FUNDED_FROM_CSV[sk as "50k"];
  if (!row) return null;
  return parseFundedNextRewardSplitRatio(row.profitSplitLabel);
}

function fundedNextLegacyDisplayShare(account: JournalAccount): number | null {
  if (!isFundedNextLegacyFundedJournalAccount(account)) return null;
  const sk = account.sizeLabel.trim().toLowerCase().replace(/\s+/g, "") as keyof typeof FUNDED_NEXT_LEGACY_FUNDED_FROM_CSV;
  const row = FUNDED_NEXT_LEGACY_FUNDED_FROM_CSV[sk as "50k"];
  if (!row) return null;
  return parseFundedNextRewardSplitRatio(row.profitSplitLabel);
}

function mffuRapidSimFundedDisplayShare(account: JournalAccount): number | null {
  if (!isMffuRapidSimFundedJournalAccount(account)) return null;
  const sk = account.sizeLabel.trim().toLowerCase().replace(/\s+/g, "") as MffuRapidSimFundedCsvSize;
  const row = MFFU_RAPID_SIM_FUNDED_FROM_CSV[sk];
  if (!row) return null;
  return parseFundedNextRewardSplitRatio(row.profitSplitLabel);
}

function mffuFlexSimFundedDisplayShare(account: JournalAccount): number | null {
  if (!isMffuFlexSimFundedJournalAccount(account)) return null;
  const sk = account.sizeLabel.trim().toLowerCase().replace(/\s+/g, "") as MffuFlexSimFundedCsvSize;
  const row = MFFU_FLEX_SIM_FUNDED_FROM_CSV[sk];
  if (!row) return null;
  return parseFundedNextRewardSplitRatio(row.profitSplitLabel);
}

function mffuProSimFundedDisplayShare(account: JournalAccount): number | null {
  if (!isMffuProSimFundedJournalAccount(account)) return null;
  const sk = account.sizeLabel.trim().toLowerCase().replace(/\s+/g, "") as MffuProSimFundedCsvSize;
  const row = MFFU_PRO_SIM_FUNDED_FROM_CSV[sk];
  if (!row) return null;
  return parseFundedNextRewardSplitRatio(row.profitSplitLabel);
}

function ffnFundedDisplayShare(account: JournalAccount): number | null {
  const row = getFundedFuturesNetworkFundedRowOrNull(account);
  if (!row) return null;
  return parseFundedNextRewardSplitRatio(row.profitSplit);
}

function tradeifyLightningDisplayShare(account: JournalAccount): number | null {
  const row = getTradeifyLightningFundedRowForAccount(account);
  if (!row) return null;
  return tradeifyProfitSplitRatioFromLabel(row.profitSplitLabel);
}

function tradeifySelectDailyDisplayShare(account: JournalAccount): number | null {
  const b = getTradeifySelectDailyFundedBlockForAccount(account);
  if (!b) return null;
  return tradeifyProfitSplitRatioFromLabel(b.profitSplit);
}

function tradeifySelectFlexDisplayShare(account: JournalAccount): number | null {
  const b = getTradeifySelectFlexFundedBlockForAccount(account);
  if (!b) return null;
  return tradeifyProfitSplitRatioFromLabel(b.profitSplit);
}

function yrmPropFundedDisplayShare(account: JournalAccount): number | null {
  const b = getYrmPropFundedBlockForJournalAccount(account);
  if (!b) return null;
  return tradeifyProfitSplitRatioFromLabel(b.def.profitSplit);
}

function futuresEliteFundedDisplayShare(account: JournalAccount): number | null {
  const b = getFuturesEliteFundedBlockForJournalAccount(account);
  if (!b) return null;
  return tradeifyProfitSplitRatioFromLabel(b.def.profitSplit);
}

function legendsTradingFundedDisplayShare(account: JournalAccount): number | null {
  const b = getLegendsTradingFundedBlockForJournalAccount(account);
  if (!b) return null;
  return tradeifyProfitSplitRatioFromLabel(b.def.profitSplit);
}

export function isTopStepJournalAccount(account: JournalAccount): boolean {
  return account.propFirm.name.trim().toLowerCase() === "topstep";
}

/** Prior cumulative gross withdrawals (same account) for marginal split (TradeDay). */
export type JournalPayoutDisplayContext = {
  priorFundedGrossWithdrawalCents?: number;
  /** Brut cumulé avant ce retrait (Aqua Futures — palier 100 % / 90 %). */
  aquaFuturesPriorCumulativeGrossCents?: number;
  /** Alpha Futures Standard : nombre de payouts payés avant ce brut (split 70 / 80 / 90 %). */
  alphaFuturesStandardPriorPaidPayoutCount?: number;
};

/**
 * Montant à afficher (dashboard, compte, calendrier) pour une ligne payout.
 * TopStep : 90 % du brut. Lucid Direct : 90 % du brut. TPT : 80 % du brut. Autres firmes : net ou brut.
 */
/**
 * Part « affichée » / saisie Add payout (après split) à partir d’un montant **retiré du compte** (brut).
 * TopStep / Lucid Pro funded / TPT : même ratios que `journalPayoutDisplayCents`.
 */
export function journalTraderDisplayCentsFromGrossCents(
  grossCents: number,
  account: JournalAccount,
  ctx?: JournalPayoutDisplayContext
): number {
  const g = Math.max(0, Math.round(grossCents));
  if (isTopStepJournalAccount(account)) {
    return Math.round(g * TOPSTEP_PAYOUT_DISPLAY_SHARE);
  }
  if (
    isLucidProFundedJournalAccount(account) ||
    isLucidFlexFundedJournalAccount(account) ||
    isLucidDirectFundedJournalAccount(account)
  ) {
    return Math.round(g * LUCID_PRO_FLEX_PAYOUT_DISPLAY_SHARE);
  }
  if (isTakeProfitTraderJournalAccount(account)) {
    return Math.round(g * TPT_PAYOUT_DISPLAY_SHARE);
  }
  if (isTradeifyGrowthFundedJournalAccount(account)) {
    return Math.round(g * TRADEIFY_GROWTH_PAYOUT_DISPLAY_SHARE);
  }
  if (isBluskyFundedJournalAccount(account)) {
    return Math.round(g * BLUSKY_FUNDED_PAYOUT_DISPLAY_SHARE);
  }
  if (isDaytradersFundedJournalAccount(account)) {
    const row = getDaytradersFundedPayoutRowForAccount(account);
    if (row) return Math.round(g * row.profitSplitFraction);
  }
  if (isTaurusArenaFundedJournalAccount(account)) {
    const row = getTaurusArenaFundedPayoutRowForAccount(account);
    if (row) return Math.round(g * row.profitSplitTraderFraction);
  }
  if (isTradeDayFundedJournalAccount(account)) {
    const prior = Math.max(0, Math.round(ctx?.priorFundedGrossWithdrawalCents ?? 0));
    return tradedayTraderNetFromGrossMarginal(prior, g);
  }
  const fnb = fundedNextBoltDisplayShare(account);
  if (fnb != null) {
    return Math.round(g * fnb);
  }
  const fnr = fundedNextRapidDisplayShare(account);
  if (fnr != null) {
    return Math.round(g * fnr);
  }
  const fnl = fundedNextLegacyDisplayShare(account);
  if (fnl != null) {
    return Math.round(g * fnl);
  }
  const mffu = mffuRapidSimFundedDisplayShare(account);
  if (mffu != null) {
    return Math.round(g * mffu);
  }
  const mffx = mffuFlexSimFundedDisplayShare(account);
  if (mffx != null) {
    return Math.round(g * mffx);
  }
  const mffp = mffuProSimFundedDisplayShare(account);
  if (mffp != null) {
    return Math.round(g * mffp);
  }
  const ffn = ffnFundedDisplayShare(account);
  if (ffn != null) {
    return Math.round(g * ffn);
  }
  const sd = tradeifySelectDailyDisplayShare(account);
  if (sd != null) {
    return Math.round(g * sd);
  }
  const sf = tradeifySelectFlexDisplayShare(account);
  if (sf != null) {
    return Math.round(g * sf);
  }
  const ln = tradeifyLightningDisplayShare(account);
  if (ln != null) {
    return Math.round(g * ln);
  }
  const yrm = yrmPropFundedDisplayShare(account);
  if (yrm != null) {
    return Math.round(g * yrm);
  }
  const fe = futuresEliteFundedDisplayShare(account);
  if (fe != null) {
    return Math.round(g * fe);
  }
  const af = getAlphaFuturesFundedBlockForJournalAccount(account);
  if (af) {
    if (af.def.standardEscalatingSplit) {
      const k = Math.max(0, Math.round(ctx?.alphaFuturesStandardPriorPaidPayoutCount ?? 0));
      return Math.round(g * alphaFuturesStandardTraderSplitRatioFromPriorPaidCount(k));
    }
    const r = tradeifyProfitSplitRatioFromLabel(af.def.profitSplit);
    if (r == null) return g;
    return Math.round(g * r);
  }
  const lt = legendsTradingFundedDisplayShare(account);
  if (lt != null) {
    return Math.round(g * lt);
  }
  if (isAquaFuturesFundedJournalAccount(account)) {
    const prior = ctx?.aquaFuturesPriorCumulativeGrossCents;
    if (prior != null) {
      return Math.round(g * aquaFuturesEffectiveProfitSplitFromPriorCumulativeGrossCents(prior));
    }
    return g;
  }
  return g;
}

export function journalPayoutDisplayCents(
  p: JournalPayoutEntry,
  account: JournalAccount,
  state?: JournalDataV1
): number {
  if (isTopStepJournalAccount(account)) {
    return Math.round(p.grossAmountCents * TOPSTEP_PAYOUT_DISPLAY_SHARE);
  }
  if (
    isLucidProFundedJournalAccount(account) ||
    isLucidFlexFundedJournalAccount(account) ||
    isLucidDirectFundedJournalAccount(account)
  ) {
    return Math.round(p.grossAmountCents * LUCID_PRO_FLEX_PAYOUT_DISPLAY_SHARE);
  }
  if (isTakeProfitTraderJournalAccount(account)) {
    return Math.round(p.grossAmountCents * TPT_PAYOUT_DISPLAY_SHARE);
  }
  if (isTradeifyGrowthFundedJournalAccount(account)) {
    return Math.round(p.grossAmountCents * TRADEIFY_GROWTH_PAYOUT_DISPLAY_SHARE);
  }
  if (isBluskyFundedJournalAccount(account)) {
    return Math.round(p.grossAmountCents * BLUSKY_FUNDED_PAYOUT_DISPLAY_SHARE);
  }
  if (isDaytradersFundedJournalAccount(account)) {
    const row = getDaytradersFundedPayoutRowForAccount(account);
    if (row) return Math.round(p.grossAmountCents * row.profitSplitFraction);
  }
  if (isTaurusArenaFundedJournalAccount(account)) {
    const row = getTaurusArenaFundedPayoutRowForAccount(account);
    if (row) return Math.round(p.grossAmountCents * row.profitSplitTraderFraction);
  }
  if (isTradeDayFundedJournalAccount(account)) {
    return p.netAmountCents ?? tradedayTraderNetFromGrossMarginal(0, p.grossAmountCents);
  }
  const fnb = fundedNextBoltDisplayShare(account);
  if (fnb != null) {
    return Math.round(p.grossAmountCents * fnb);
  }
  const fnr = fundedNextRapidDisplayShare(account);
  if (fnr != null) {
    return Math.round(p.grossAmountCents * fnr);
  }
  const fnl = fundedNextLegacyDisplayShare(account);
  if (fnl != null) {
    return Math.round(p.grossAmountCents * fnl);
  }
  const mffu = mffuRapidSimFundedDisplayShare(account);
  if (mffu != null) {
    return Math.round(p.grossAmountCents * mffu);
  }
  const mffx = mffuFlexSimFundedDisplayShare(account);
  if (mffx != null) {
    return Math.round(p.grossAmountCents * mffx);
  }
  const mffp = mffuProSimFundedDisplayShare(account);
  if (mffp != null) {
    return Math.round(p.grossAmountCents * mffp);
  }
  const ffn = ffnFundedDisplayShare(account);
  if (ffn != null) {
    return Math.round(p.grossAmountCents * ffn);
  }
  const sd = tradeifySelectDailyDisplayShare(account);
  if (sd != null) {
    return Math.round(p.grossAmountCents * sd);
  }
  const sf = tradeifySelectFlexDisplayShare(account);
  if (sf != null) {
    return Math.round(p.grossAmountCents * sf);
  }
  const ln = tradeifyLightningDisplayShare(account);
  if (ln != null) {
    return Math.round(p.grossAmountCents * ln);
  }
  const yrm = yrmPropFundedDisplayShare(account);
  if (yrm != null) {
    return Math.round(p.grossAmountCents * yrm);
  }
  const fe = futuresEliteFundedDisplayShare(account);
  if (fe != null) {
    return Math.round(p.grossAmountCents * fe);
  }
  const af = getAlphaFuturesFundedBlockForJournalAccount(account);
  if (af) {
    if (af.def.standardEscalatingSplit) {
      if (!state) return p.netAmountCents ?? p.grossAmountCents;
      const prior = alphaFuturesStandardPriorPaidCountBeforeEntry(state, account.id, p);
      return Math.round(
        p.grossAmountCents * alphaFuturesStandardTraderSplitRatioFromPriorPaidCount(prior)
      );
    }
    const r = tradeifyProfitSplitRatioFromLabel(af.def.profitSplit);
    if (r != null) return Math.round(p.grossAmountCents * r);
  }
  const lt = legendsTradingFundedDisplayShare(account);
  if (lt != null) {
    return Math.round(p.grossAmountCents * lt);
  }
  if (isAquaFuturesFundedJournalAccount(account)) {
    if (state) {
      const prior = aquaFuturesPriorCumulativeGrossCentsForPayoutLine(state, account.id, p);
      return Math.round(
        p.grossAmountCents * aquaFuturesEffectiveProfitSplitFromPriorCumulativeGrossCents(prior)
      );
    }
    return p.netAmountCents ?? p.grossAmountCents;
  }
  return p.netAmountCents ?? p.grossAmountCents;
}

export function getAccountPayoutTotalDisplayCents(state: JournalDataV1, accountId: JournalId): number {
  const acc = state.accounts[accountId];
  if (!acc) return 0;
  let s = 0;
  for (const p of Object.values(state.payoutEntries)) {
    if (p.accountId !== accountId) continue;
    s += journalPayoutDisplayCents(p, acc, state);
  }
  return s;
}

/**
 * Montant brut à enregistrer quand l’utilisateur saisit le **montant affiché** (même base que `journalPayoutDisplayCents`).
 */
export function journalPayoutGrossCentsFromDisplayInput(
  displayCents: number,
  account: JournalAccount,
  ctx?: JournalPayoutDisplayContext
): number {
  const d = Math.max(0, Math.round(displayCents));
  if (d <= 0) return 0;
  if (isTopStepJournalAccount(account)) {
    return Math.max(1, Math.round(d / TOPSTEP_PAYOUT_DISPLAY_SHARE));
  }
  if (isTakeProfitTraderJournalAccount(account)) {
    return Math.max(1, Math.round(d / TPT_PAYOUT_DISPLAY_SHARE));
  }
  if (isTradeifyGrowthFundedJournalAccount(account)) {
    return Math.max(1, Math.round(d / TRADEIFY_GROWTH_PAYOUT_DISPLAY_SHARE));
  }
  if (isBluskyFundedJournalAccount(account)) {
    return Math.max(1, Math.round(d / BLUSKY_FUNDED_PAYOUT_DISPLAY_SHARE));
  }
  if (isDaytradersFundedJournalAccount(account)) {
    const row = getDaytradersFundedPayoutRowForAccount(account);
    const f = row?.profitSplitFraction ?? 1;
    if (f >= 1 - 1e-9) return d;
    if (f > 0) return Math.max(1, Math.round(d / f));
    return d;
  }
  if (isTaurusArenaFundedJournalAccount(account)) {
    const row = getTaurusArenaFundedPayoutRowForAccount(account);
    const f = row?.profitSplitTraderFraction ?? 1;
    if (f >= 1 - 1e-9) return d;
    if (f > 0) return Math.max(1, Math.round(d / f));
    return d;
  }
  if (isTradeDayFundedJournalAccount(account)) {
    const prior = Math.max(0, Math.round(ctx?.priorFundedGrossWithdrawalCents ?? 0));
    return Math.max(1, tradedayGrossCentsFromTraderNetMarginal(prior, d));
  }
  const fnb = fundedNextBoltDisplayShare(account);
  if (fnb != null) {
    return Math.max(1, Math.round(d / fnb));
  }
  const fnr = fundedNextRapidDisplayShare(account);
  if (fnr != null) {
    return Math.max(1, Math.round(d / fnr));
  }
  const fnl = fundedNextLegacyDisplayShare(account);
  if (fnl != null) {
    return Math.max(1, Math.round(d / fnl));
  }
  const mffu = mffuRapidSimFundedDisplayShare(account);
  if (mffu != null) {
    return Math.max(1, Math.round(d / mffu));
  }
  const mffx = mffuFlexSimFundedDisplayShare(account);
  if (mffx != null) {
    return Math.max(1, Math.round(d / mffx));
  }
  const mffp = mffuProSimFundedDisplayShare(account);
  if (mffp != null) {
    return Math.max(1, Math.round(d / mffp));
  }
  const ffn = ffnFundedDisplayShare(account);
  if (ffn != null) {
    return Math.max(1, Math.round(d / ffn));
  }
  const sd = tradeifySelectDailyDisplayShare(account);
  if (sd != null) {
    return Math.max(1, Math.round(d / sd));
  }
  const sf = tradeifySelectFlexDisplayShare(account);
  if (sf != null) {
    return Math.max(1, Math.round(d / sf));
  }
  const ln = tradeifyLightningDisplayShare(account);
  if (ln != null) {
    return Math.max(1, Math.round(d / ln));
  }
  const yrm = yrmPropFundedDisplayShare(account);
  if (yrm != null) {
    return Math.max(1, Math.round(d / yrm));
  }
  const fe = futuresEliteFundedDisplayShare(account);
  if (fe != null) {
    if (fe >= 1 - 1e-9) return d;
    if (fe > 0) return Math.max(1, Math.round(d / fe));
    return d;
  }
  const af = getAlphaFuturesFundedBlockForJournalAccount(account);
  if (af) {
    if (af.def.standardEscalatingSplit) {
      const k = Math.max(0, Math.round(ctx?.alphaFuturesStandardPriorPaidPayoutCount ?? 0));
      const r = alphaFuturesStandardTraderSplitRatioFromPriorPaidCount(k);
      if (r >= 1 - 1e-9) return d;
      if (r > 0) return Math.max(1, Math.round(d / r));
      return d;
    }
    const r = tradeifyProfitSplitRatioFromLabel(af.def.profitSplit);
    if (r == null || r >= 1 - 1e-9) return d;
    if (r > 0) return Math.max(1, Math.round(d / r));
    return d;
  }
  const lt = legendsTradingFundedDisplayShare(account);
  if (lt != null) {
    if (lt >= 1 - 1e-9) return d;
    if (lt > 0) return Math.max(1, Math.round(d / lt));
    return d;
  }
  if (isAquaFuturesFundedJournalAccount(account)) {
    const prior = ctx?.aquaFuturesPriorCumulativeGrossCents;
    if (prior != null) {
      const r = aquaFuturesEffectiveProfitSplitFromPriorCumulativeGrossCents(prior);
      if (r >= 1 - 1e-9) return Math.max(1, Math.round(d / r));
      if (r > 0) return Math.max(1, Math.round(d / r));
    }
    return d;
  }
  if (
    isLucidProFundedJournalAccount(account) ||
    isLucidFlexFundedJournalAccount(account) ||
    isLucidDirectFundedJournalAccount(account)
  ) {
    return Math.max(1, Math.round(d / LUCID_PRO_FLEX_PAYOUT_DISPLAY_SHARE));
  }
  return d;
}

/**
 * Ligne d’aide sous la saisie **brute** Add payout : rappel du split trader (dashboard).
 */
export function journalPayoutDashboardHintFromGrossUsd(
  grossUsd: number,
  account: JournalAccount,
  ctx?: JournalPayoutDisplayContext
): string | null {
  const grossCents = Math.round(grossUsd * 100);
  if (grossCents <= 0) return null;
  const displayCents = journalTraderDisplayCentsFromGrossCents(grossCents, account, ctx);
  if (displayCents === grossCents) return null;
  if (isTradeDayFundedJournalAccount(account)) {
    return "Marginal trader share: 80% / 90% / 95% on cumulative gross ($50k / $100k bands).";
  }
  if (isTakeProfitTraderJournalAccount(account)) {
    return "80% trader share on this gross.";
  }
  const fnb = fundedNextBoltDisplayShare(account);
  if (fnb != null) {
    return `${Math.round(fnb * 100)}% trader share on this gross.`;
  }
  const fnr = fundedNextRapidDisplayShare(account);
  if (fnr != null) {
    return `${Math.round(fnr * 100)}% trader share on this gross.`;
  }
  const fnl = fundedNextLegacyDisplayShare(account);
  if (fnl != null) {
    return `${Math.round(fnl * 100)}% trader share on this gross.`;
  }
  const mffu = mffuRapidSimFundedDisplayShare(account);
  if (mffu != null) {
    return `${Math.round(mffu * 100)}% trader share on this gross.`;
  }
  const mffx = mffuFlexSimFundedDisplayShare(account);
  if (mffx != null) {
    return `${Math.round(mffx * 100)}% trader share on this gross.`;
  }
  const mffp = mffuProSimFundedDisplayShare(account);
  if (mffp != null) {
    return `${Math.round(mffp * 100)}% trader share on this gross.`;
  }
  const ffn = ffnFundedDisplayShare(account);
  if (ffn != null) {
    return `${Math.round(ffn * 100)}% trader share on this gross.`;
  }
  const sd = tradeifySelectDailyDisplayShare(account);
  if (sd != null) {
    return `${Math.round(sd * 100)}% trader share on this gross.`;
  }
  const sf = tradeifySelectFlexDisplayShare(account);
  if (sf != null) {
    return `${Math.round(sf * 100)}% trader share on this gross.`;
  }
  const ln = tradeifyLightningDisplayShare(account);
  if (ln != null) {
    return `${Math.round(ln * 100)}% trader share on this gross.`;
  }
  const yrm = yrmPropFundedDisplayShare(account);
  if (yrm != null) {
    return `${Math.round(yrm * 100)}% trader share on this gross.`;
  }
  const fe = futuresEliteFundedDisplayShare(account);
  if (fe != null && fe < 1 - 1e-9) {
    return `${Math.round(fe * 100)}% trader share on this gross.`;
  }
  const af = getAlphaFuturesFundedBlockForJournalAccount(account);
  if (af) {
    if (af.def.standardEscalatingSplit && ctx?.alphaFuturesStandardPriorPaidPayoutCount != null) {
      const r = alphaFuturesStandardTraderSplitRatioFromPriorPaidCount(
        ctx.alphaFuturesStandardPriorPaidPayoutCount
      );
      return `${Math.round(r * 100)}% trader share on this gross (Alpha Futures Standard: 70% / 80% / 90% by paid payout count).`;
    }
    if (!af.def.standardEscalatingSplit) {
      const r = tradeifyProfitSplitRatioFromLabel(af.def.profitSplit);
      if (r != null && r < 1 - 1e-9) {
        return `${Math.round(r * 100)}% trader share on this gross.`;
      }
    }
  }
  const lt = legendsTradingFundedDisplayShare(account);
  if (lt != null && lt < 1 - 1e-9) {
    return `${Math.round(lt * 100)}% trader share on this gross.`;
  }
  if (isAquaFuturesFundedJournalAccount(account) && ctx?.aquaFuturesPriorCumulativeGrossCents != null) {
    const r = aquaFuturesEffectiveProfitSplitFromPriorCumulativeGrossCents(
      ctx.aquaFuturesPriorCumulativeGrossCents
    );
    return `${Math.round(r * 100)}% trader share on this gross (100% until $15k cumulative gross, then 90%).`;
  }
  if (isBluskyFundedJournalAccount(account)) {
    return "90% trader share on this gross.";
  }
  if (isDaytradersFundedJournalAccount(account)) {
    const row = getDaytradersFundedPayoutRowForAccount(account);
    if (row && row.profitSplitFraction < 1 - 1e-9) {
      return `${Math.round(row.profitSplitFraction * 100)}% trader share on this gross.`;
    }
  }
  if (isTaurusArenaFundedJournalAccount(account)) {
    const row = getTaurusArenaFundedPayoutRowForAccount(account);
    if (row && row.profitSplitTraderFraction < 1 - 1e-9) {
      return `${Math.round(row.profitSplitTraderFraction * 100)}% trader share on this gross.`;
    }
  }
  return "90% trader share on this gross.";
}
