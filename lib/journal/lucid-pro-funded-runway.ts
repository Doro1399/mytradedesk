import type { ApexFundedRunway } from "@/lib/journal/apex-funded-progress";
import {
  getLucidProPayoutState,
  type LucidProPayoutState,
} from "@/lib/journal/lucid-pro-funded-payout-state";
import { getLucidProFundedCsvRow, isLucidProFundedJournalAccount } from "@/lib/journal/lucid-journal-rules";
import type { JournalAccount, JournalDataV1 } from "@/lib/journal/types";
import type { StoredTrade } from "@/lib/journal/trades-storage";
import { formatUsdWholeGrouped } from "@/lib/prop-firms";

export type { LucidProPayoutState } from "@/lib/journal/lucid-pro-funded-payout-state";
export {
  getLucidProPayoutState,
  LUCID_PRO_FUNDED_MIN_PAYOUT_CENTS,
  lucidProFundedCycleTotals,
  countLucidProNonRejectedPayouts,
  lucidProFundedEffectiveTargetCents,
} from "@/lib/journal/lucid-pro-funded-payout-state";

export type LucidProFundedRunway = ApexFundedRunway;

export { isLucidProFundedJournalAccount } from "@/lib/journal/lucid-journal-rules";

function fmtCents(c: number): string {
  return formatUsdWholeGrouped(Math.max(0, Math.round(c)) / 100);
}

/**
 * Lucid Pro funded : phase 1 → buffer ; phase 2 → target réelle max(goal, consistance, 500 $).
 * Brut retiré du solde ; affichage 90 % via `payout-display`.
 */
export function tryBuildLucidProFundedRunway(
  state: JournalDataV1,
  account: JournalAccount,
  p: {
    startCents: number;
    bufferStrideCents: number;
    bufferPhaseProgress01: number;
    currentCents: number;
    tradesForActivity?: readonly StoredTrade[];
  }
): LucidProFundedRunway | null {
  if (!isLucidProFundedJournalAccount(account)) return null;

  const csv = getLucidProFundedCsvRow(account);
  if (!csv) return null;

  const st = getLucidProPayoutState(state, account, {
    startCents: p.startCents,
    bufferStrideCents: p.bufferStrideCents,
    balanceCents: p.currentCents,
    storedTrades: p.tradesForActivity,
  });
  if (!st) return null;

  const S = p.startCents;
  const B = Math.max(1, p.bufferStrideCents);
  const bufferAbs = st.bufferAbsCents;
  const balance = st.balanceCents;
  const pastBuffer = st.pastBuffer;

  const withdrawableBaseCents = st.withdrawableBaseCents;
  const effectiveAbs = withdrawableBaseCents + st.effectiveTargetCents;
  const maxAbs = withdrawableBaseCents + st.payoutCapCents;

  const spanToEffective = Math.max(1, effectiveAbs - withdrawableBaseCents);
  const spanEffectiveToMax = Math.max(1, maxAbs - effectiveAbs);

  const showAddPayoutButton = st.showAddPayout;
  const atOrPastPayoutMax = pastBuffer && balance >= maxAbs;

  const cappedWithdrawableCents = st.availablePayoutCents;

  let payoutCardCallout: string | null = null;
  let suggestedMaxPayoutUsd: number | null = null;
  if (showAddPayoutButton && cappedWithdrawableCents > 0) {
    payoutCardCallout = `You can payout: ${fmtCents(cappedWithdrawableCents)}`;
    suggestedMaxPayoutUsd = cappedWithdrawableCents / 100;
  }

  let goalLineLabel = "Buffer";
  let goalLineCents: number | null = bufferAbs;
  let runwayPartA = "";
  let runwayPartB = "";

  if (balance < bufferAbs) {
    const bufPct = Math.round((Math.max(0, balance - S) / B) * 100);
    runwayPartA = `Buffer ${bufPct}%`;
    runwayPartB = `${fmtCents(bufferAbs - balance)} to buffer · ${fmtCents(Math.max(0, effectiveAbs - balance))} to payout target`;
    goalLineLabel = "Buffer";
    goalLineCents = bufferAbs;
  } else if (balance < effectiveAbs) {
    const anchor = st.firstPayoutCycle ? bufferAbs : withdrawableBaseCents;
    const segSpan = Math.max(1, effectiveAbs - anchor);
    const minPct = Math.round(((balance - anchor) / segSpan) * 100);
    runwayPartA = `Payout target ${minPct}%`;
    runwayPartB = `${fmtCents(effectiveAbs - balance)} to payout target · ${fmtCents(Math.max(0, maxAbs - balance))} to payout max (${fmtCents(st.payoutCapCents)})`;
    if (balance >= maxAbs && effectiveAbs > maxAbs) {
      runwayPartB = `${fmtCents(effectiveAbs - balance)} to payout target (consistency) · at/above max ${fmtCents(st.payoutCapCents)}`;
    }
    goalLineLabel = `Payout max ${fmtCents(st.payoutCapCents)}`;
    goalLineCents = maxAbs;
  } else if (balance < maxAbs) {
    const segPct = Math.round(
      Math.max(0, Math.min(100, ((balance - effectiveAbs) / spanEffectiveToMax) * 100))
    );
    runwayPartA = `Payout max ${segPct}%`;
    runwayPartB = `${fmtCents(maxAbs - balance)} to payout max (${fmtCents(st.payoutCapCents)})`;
    goalLineLabel = `Payout max ${fmtCents(st.payoutCapCents)}`;
    goalLineCents = maxAbs;
  } else {
    runwayPartA = `Payout max 100%+`;
    runwayPartB = `${fmtCents(balance - maxAbs)} above max (${fmtCents(st.payoutCapCents)})`;
    goalLineLabel = `Payout max ${fmtCents(st.payoutCapCents)}`;
    goalLineCents = maxAbs;
  }

  const eligibleCore = st.isEligible;

  let barProgress01: number;
  let ringArc01: number;
  let ringPctDisplay: number;

  if (!pastBuffer) {
    barProgress01 = Math.max(0, Math.min(1, p.bufferPhaseProgress01));
    ringArc01 = barProgress01;
    ringPctDisplay = Math.round(Math.max(0, Math.min(999, p.bufferPhaseProgress01 * 100)));
  } else if (st.firstPayoutCycle) {
    const spanBufToEffective = Math.max(1, effectiveAbs - bufferAbs);
    barProgress01 = 1;
    if (balance <= effectiveAbs) {
      ringArc01 = Math.min(1, Math.max(0, (balance - bufferAbs) / spanBufToEffective));
      ringPctDisplay = Math.round(ringArc01 * 100);
    } else if (effectiveAbs >= maxAbs) {
      ringArc01 = 1;
      ringPctDisplay = 100;
    } else {
      const spanEffToMax = Math.max(1, maxAbs - effectiveAbs);
      const postRunwaySpan = Math.max(1, maxAbs - bufferAbs);
      const wEff = (effectiveAbs - bufferAbs) / postRunwaySpan;
      const tail = Math.min(1, Math.max(0, (balance - effectiveAbs) / spanEffToMax));
      ringArc01 = Math.min(1, wEff + (1 - wEff) * tail);
      ringPctDisplay = Math.round(ringArc01 * 100);
    }
  } else {
    const r = withdrawableBaseCents;
    const spanToMax = Math.max(1, maxAbs - r);
    const fillRefToMax01 = Math.min(1, Math.max(0, (balance - r) / spanToMax));
    if (balance < effectiveAbs) {
      barProgress01 = Math.max(0, Math.min(1, (balance - r) / spanToEffective));
      ringArc01 = barProgress01;
      ringPctDisplay = Math.round(barProgress01 * 100);
    } else {
      barProgress01 = 1;
      ringArc01 = fillRefToMax01;
      ringPctDisplay = Math.round(fillRefToMax01 * 100);
    }
  }

  let goodNewsTitle: string | null = null;
  let payoutGateHint: string | null = null;
  let showPayoutGatePanel = false;

  if (showAddPayoutButton) {
    goodNewsTitle = "Good News";
  } else if (
    pastBuffer &&
    st.applyConsistencyRule &&
    !st.consistencyOk &&
    st.cycleTotalCents > 0
  ) {
    goodNewsTitle = "Consistency rule breached";
    const leftCents =
      st.cycleTotalCents < st.effectiveTargetCents
        ? st.effectiveTargetCents - st.cycleTotalCents
        : Math.max(0, st.effectiveTargetCents - st.withdrawableRawCents);
    payoutGateHint = `40% consistency not met — Cycle target: ${fmtCents(st.effectiveTargetCents)} → ${fmtCents(leftCents)} left`;
  } else if (pastBuffer && !eligibleCore && st.eligibilityReason) {
    showPayoutGatePanel = true;
    payoutGateHint = st.eligibilityReason;
  }

  return {
    barProgress01,
    ringArc01,
    ringPctDisplay,
    showAddPayoutButton,
    atOrPastPayoutMax,
    runwayPartA,
    runwayPartB,
    goalLineLabel,
    goalLineCents,
    phasePctLabel: String(ringPctDisplay),
    payoutCardCallout,
    suggestedMaxPayoutUsd,
    goodNewsTitle,
    payoutGateHint,
    showPayoutGatePanel,
    cycleNetPnlCents: st.cycleTotalCents,
  };
}
