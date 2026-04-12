import { fundedProgressPnlBaselineDate } from "@/lib/journal/funded-phase-pnl";
import { parseFundedNextRewardSplitRatio } from "@/lib/journal/funded-next-journal-rules";
import {
  MFFU_PRO_SIM_FUNDED_FROM_CSV,
  type MffuProSimFundedCsvSize,
} from "@/lib/journal/mffu-pro-sim-funded-csv.generated";
import {
  isMffuProSimFundedJournalAccount,
  mffuProSimFundedCsvSizeOrNull,
} from "@/lib/journal/mffu-pro-sim-funded-journal-rules";
import { isoDateLocal } from "@/lib/journal/local-iso-date";
import { isOnOrAfterCalendarDay } from "@/lib/journal/selectors";
import type { ISODate, JournalAccount, JournalDataV1 } from "@/lib/journal/types";
import type { StoredTrade } from "@/lib/journal/trades-storage";

/**
 * Retrait unique avant buffer complet (60 % / min 1 000 $ / 40 % restants) — **hors CSV** pour l’instant.
 * Quand `false`, {@link getMffuProPayoutState} garde `canUseSpecialOneTimeWithdrawal === false` et aucune branche métier.
 */
export const MFFU_PRO_SPECIAL_ONE_TIME_WITHDRAWAL_ENABLED = false;

export type MffuProSimFundedPayoutState = {
  isEligible: boolean;
  eligibilityReason: string | null;
  /** Premier jour civil avec PnL funded non nul (journal et/ou trades importés), ou `null`. */
  firstTradeDate: ISODate | null;
  daysSinceFirstTrade: number;
  requiredDays: number;
  timeRequirementMet: boolean;
  /** Solde nominal compte (USD). */
  startingBalance: number;
  buffer: number;
  payoutMin: number;
  payoutMax: number;
  availablePayout: number;
  rewardSplit: number;
  grossPayoutEstimate: number;
  netPayoutEstimate: number;
  /**
   * Retrait spécial avant buffer : réservé — `false` tant que `MFFU_PRO_SPECIAL_ONE_TIME_WITHDRAWAL_ENABLED` est `false`.
   * Branche isolée pour extension future sans activer le produit par défaut.
   */
  canUseSpecialOneTimeWithdrawal: boolean;
  showAddPayout: boolean;
  showGoodNews: boolean;
  availablePayoutCents: number;
  surplusCents: number;
  bufferFloorCents: number;
};

export type GetMffuProSimFundedPayoutStateParams = {
  startCents: number;
  currentCents: number;
  storedTrades?: readonly StoredTrade[];
  /** Tests / UI déterministe ; défaut `Date.now()`. */
  nowMs?: number;
};

function fundedBaselineYmd(account: JournalAccount): string | null {
  const raw = fundedProgressPnlBaselineDate(account)?.trim();
  if (!raw) return null;
  const ymd = raw.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(ymd) ? ymd : null;
}

function minIsoDate(a: ISODate, b: ISODate): ISODate {
  return a <= b ? a : b;
}

function firstFundedJournalActivityDay(
  state: JournalDataV1,
  account: JournalAccount,
  baselineYmd: string
): ISODate | null {
  let best: ISODate | null = null;
  for (const e of Object.values(state.pnlEntries)) {
    if (e.accountId !== account.id) continue;
    if (!isOnOrAfterCalendarDay(e.date, baselineYmd)) continue;
    if (e.pnlCents === 0) continue;
    const d = e.date.trim().slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) continue;
    if (best == null || d < best) best = d;
  }
  return best;
}

function firstFundedStoredTradeDay(
  storedTrades: readonly StoredTrade[] | undefined,
  accountId: string,
  baselineYmd: string
): ISODate | null {
  if (!storedTrades?.length) return null;
  let best: ISODate | null = null;
  for (const tr of storedTrades) {
    if (tr.accountId !== accountId) continue;
    if (!isOnOrAfterCalendarDay(tr.date, baselineYmd)) continue;
    if (tr.pnlCents === 0) continue;
    const d = tr.date.trim().slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) continue;
    if (best == null || d < best) best = d;
  }
  return best;
}

function firstFundedTradeCalendarDay(
  state: JournalDataV1,
  account: JournalAccount,
  baselineYmd: string,
  storedTrades?: readonly StoredTrade[]
): ISODate | null {
  const j = firstFundedJournalActivityDay(state, account, baselineYmd);
  const s = firstFundedStoredTradeDay(storedTrades, account.id, baselineYmd);
  if (j == null) return s;
  if (s == null) return j;
  return minIsoDate(j, s);
}

/** Jours civils écoulés depuis `firstYmd` jusqu’à `todayYmd` (0 si même jour). */
function wholeCalendarDaysSinceFirstTrade(firstYmd: ISODate, todayYmd: ISODate): number {
  const [fy, fm, fd] = firstYmd.split("-").map((x) => Number.parseInt(x, 10));
  const [ty, tm, td] = todayYmd.split("-").map((x) => Number.parseInt(x, 10));
  const t0 = new Date(fy, fm - 1, fd).setHours(0, 0, 0, 0);
  const t1 = new Date(ty, tm - 1, td).setHours(0, 0, 0, 0);
  return Math.max(0, Math.floor((t1 - t0) / 86400000));
}

export function getMffuProPayoutState(
  state: JournalDataV1,
  account: JournalAccount,
  params: GetMffuProSimFundedPayoutStateParams
): MffuProSimFundedPayoutState | null {
  if (!isMffuProSimFundedJournalAccount(account)) return null;
  const sk = mffuProSimFundedCsvSizeOrNull(account);
  if (sk == null) return null;
  const csv = MFFU_PRO_SIM_FUNDED_FROM_CSV[sk as MffuProSimFundedCsvSize];
  if (!csv) return null;

  const bufferCents = Math.round(csv.bufferUsd * 100);
  const floorCents = params.startCents + bufferCents;
  const surplusCents = Math.max(0, Math.round(params.currentCents - floorCents));
  const payoutMinCents = Math.round(csv.payoutMiniUsd * 100);
  const payoutMaxCents = Math.round(csv.payoutMaxUsd * 100);

  const availablePayoutCents = Math.min(surplusCents, payoutMaxCents);

  const rewardSplit = parseFundedNextRewardSplitRatio(csv.profitSplitLabel) ?? 0;
  const grossUsd = availablePayoutCents / 100;
  const netUsd = Math.round(availablePayoutCents * rewardSplit) / 100;

  const requiredDays = csv.fundedCalendarDaysFromFirstTrade;
  const baselineYmd = fundedBaselineYmd(account);
  const firstTradeDate =
    baselineYmd != null
      ? firstFundedTradeCalendarDay(state, account, baselineYmd, params.storedTrades)
      : null;

  const todayYmd = isoDateLocal(new Date(params.nowMs ?? Date.now()));
  const daysSinceFirstTrade =
    firstTradeDate != null ? wholeCalendarDaysSinceFirstTrade(firstTradeDate, todayYmd) : 0;
  const timeRequirementMet = firstTradeDate != null && daysSinceFirstTrade >= requiredDays;

  const bufferCleared = params.currentCents >= floorCents;
  const minOk = availablePayoutCents >= payoutMinCents;
  const isEligible =
    timeRequirementMet && bufferCleared && minOk && availablePayoutCents > 0 && firstTradeDate != null;

  const canUseSpecialOneTimeWithdrawal = MFFU_PRO_SPECIAL_ONE_TIME_WITHDRAWAL_ENABLED && false;

  let eligibilityReason: string | null = null;
  if (!isEligible) {
    if (baselineYmd == null) {
      eligibilityReason = "Set funded conversion / baseline to track first trade";
    } else if (firstTradeDate == null) {
      eligibilityReason = "Log funded PnL (non-zero) or import trades on/after funded start";
    } else if (!timeRequirementMet) {
      const missing = Math.max(0, requiredDays - daysSinceFirstTrade);
      eligibilityReason =
        missing === 1
          ? "1 more calendar day until time requirement"
          : `${missing} more calendar days until time requirement`;
    } else if (!bufferCleared) {
      eligibilityReason = "Buffer not cleared";
    } else if (!minOk) {
      eligibilityReason = "Available payout below minimum";
    } else {
      eligibilityReason = "Not eligible";
    }
  }

  return {
    isEligible,
    eligibilityReason,
    firstTradeDate,
    daysSinceFirstTrade,
    requiredDays,
    timeRequirementMet,
    startingBalance: params.startCents / 100,
    buffer: csv.bufferUsd,
    payoutMin: csv.payoutMiniUsd,
    payoutMax: csv.payoutMaxUsd,
    availablePayout: grossUsd,
    rewardSplit,
    grossPayoutEstimate: grossUsd,
    netPayoutEstimate: netUsd,
    canUseSpecialOneTimeWithdrawal,
    showAddPayout: isEligible,
    showGoodNews: isEligible,
    availablePayoutCents,
    surplusCents,
    bufferFloorCents: floorCents,
  };
}
