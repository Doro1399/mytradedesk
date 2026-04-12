import {
  aggregateApexFundedPayoutCycle,
  apexFundedEffectivePayoutTargetCents,
  apexFundedRequiredQualifiedDays,
} from "@/lib/journal/apex-funded-payout-cycle";
import { getApexFundedBlockForAccount } from "@/lib/journal/apex-journal-rules";
import type { JournalAccount, JournalDataV1 } from "@/lib/journal/types";
import { formatUsdWholeGrouped } from "@/lib/prop-firms";

/** Part visuelle du track occupée par la phase buffer (le reste va au palier jusqu’au payout mini $500). */
const VISUAL_BUFFER_SHARE = 0.75;
/** Extension visuelle buffer → payout max après le mini (même idée que l’ancien 8 %, inchangé hors 75/25). */
const VISUAL_MAX_TAIL_SHARE = 0.08;

export type ApexFundedRunway = {
  barProgress01: number;
  ringArc01: number;
  ringPctDisplay: number;
  showAddPayoutButton: boolean;
  atOrPastPayoutMax: boolean;
  runwayPartA: string;
  runwayPartB: string;
  goalLineLabel: string;
  goalLineCents: number | null;
  /** @deprecated Utiliser `ringPctDisplay`. */
  phasePctLabel: string;
  payoutCardCallout: string | null;
  suggestedMaxPayoutUsd: number | null;
  /** `Good News` (éligible ou jours manquants) ou `Consistency rule breached` (2e+ payout, consistance non respectée). */
  goodNewsTitle?: string | null;
  /** EN copy when milestone reached but Add Payout blocked (qualified days, 50% consistency, etc.). */
  payoutGateHint?: string | null;
  qualifiedTradingDays?: number;
  requiredQualifiedTradingDays?: number;
  effectivePayoutTargetCents?: number;
  /** Apex : true à partir du 2e payout enregistré. */
  applyConsistencyRule?: boolean;
  bufferReached?: boolean;
  /** Topstep Funded : panneau éligibilité (≥ $750) même si Add Payout pas encore autorisé. */
  showPayoutGatePanel?: boolean;
  /** Libellé des jours sous la barre (ex. Lucid Flex → « qualified days »). */
  progressTradingDaysLabel?: string;
  /** P&L du cycle payout (après dernier payout non rejeté) — affiché sous « Now ». */
  cycleNetPnlCents?: number;
  /** Funded Next Rapid : avertissement retrait du cycle entier (hard breach possible). */
  showHardBreachWarning?: boolean;
  hardBreachWarningMessage?: string | null;
};

function fmtCents(c: number): string {
  return formatUsdWholeGrouped(Math.max(0, Math.round(c)) / 100);
}

function fmtSignedUsdFromCents(cents: number): string {
  const neg = cents < 0;
  const abs = Math.abs(Math.round(cents));
  const s = formatUsdWholeGrouped(abs / 100);
  return neg ? `−${s}` : s;
}

function sumPayoutsCents(state: JournalDataV1, accountId: string): number {
  let s = 0;
  for (const p of Object.values(state.payoutEntries)) {
    if (p.accountId === accountId) s += p.grossAmountCents;
  }
  return s;
}

function countPayouts(state: JournalDataV1, accountId: string): number {
  let n = 0;
  for (const p of Object.values(state.payoutEntries)) {
    if (p.accountId === accountId) n += 1;
  }
  return n;
}

/**
 * Apex Trader Funding — comptes **funded / live** uniquement.
 * Buffer puis payout mini ($500) avec répartition visuelle 75 % / 25 %, puis extension vers le max du palier.
 * Éligibilité Add payout : jours qualifiés (CSV), 1er payout sans consistance, 2e+ avec consistance 50 % sur le cycle courant.
 */
export function tryBuildApexFundedRunway(
  state: JournalDataV1,
  account: JournalAccount,
  p: {
    startCents: number;
    bufferStrideCents: number;
    rawFundedPnlCents: number;
    lifetimePnlCents: number;
    currentCents: number;
  }
): ApexFundedRunway | null {
  if (account.accountType !== "funded" && account.accountType !== "live") {
    return null;
  }
  const fd = getApexFundedBlockForAccount(account);
  if (!fd) return null;

  const B = Math.max(1, p.bufferStrideCents);
  const M = Math.round(fd.payoutMiniUsd * 100);
  const sumPay = sumPayoutsCents(state, account.id);
  let P = p.rawFundedPnlCents - sumPay;
  if (p.currentCents >= p.startCents) {
    P = Math.max(0, P);
  }

  const nPay = countPayouts(state, account.id);
  const tierIdx = Math.min(nPay, Math.max(0, fd.payouts1stTo6thUsd.length - 1));
  const X = Math.round(fd.payouts1stTo6thUsd[tierIdx]! * 100);

  const BM = B + M;
  const BMX = B + X;
  const spanMax = Math.max(1, X - M);
  const bmSafe = Math.max(1, BM);

  const cycle = aggregateApexFundedPayoutCycle(state, account, fd);
  const requiredQ = apexFundedRequiredQualifiedDays(fd);
  const applyConsistency = nPay >= 1;
  const effectiveTargetCents = apexFundedEffectivePayoutTargetCents(
    applyConsistency,
    fd,
    cycle.bestDayProfitCents
  );

  /**
   * Même base que `P` : P&L phase funded net des payouts, pas `currentCents − nominal` qui peut
   * inclure l’eval si pas de baseline — sinon buffer / disponible faux et le CTA ne s’affiche jamais.
   */
  const bufferReached = P >= B;
  const availableAboveBufferCents = Math.max(0, P - B);

  let showAddPayoutButton = false;
  if (bufferReached && cycle.qualifiedTradingDaysCount >= requiredQ) {
    if (!applyConsistency) {
      showAddPayoutButton = P >= BM && availableAboveBufferCents >= M;
    } else {
      showAddPayoutButton =
        cycle.totalCycleProfitCents >= effectiveTargetCents &&
        availableAboveBufferCents >= effectiveTargetCents;
    }
  }

  const payoutMilestoneReached = P >= BM;

  let goodNewsTitle: string | null = null;
  let payoutGateHint: string | null = null;

  if (payoutMilestoneReached) {
    if (showAddPayoutButton) {
      goodNewsTitle = "Good News";
    } else if (applyConsistency && cycle.qualifiedTradingDaysCount >= requiredQ) {
      goodNewsTitle = "Consistency rule breached";
      const leftCents =
        cycle.totalCycleProfitCents < effectiveTargetCents
          ? effectiveTargetCents - cycle.totalCycleProfitCents
          : Math.max(0, effectiveTargetCents - availableAboveBufferCents);
      payoutGateHint = `50% consistency not met — Cycle target: ${fmtCents(effectiveTargetCents)} → ${fmtCents(leftCents)} left`;
    } else {
      goodNewsTitle = "Good News";
      if (cycle.qualifiedTradingDaysCount < requiredQ) {
        const need = requiredQ - cycle.qualifiedTradingDaysCount;
        payoutGateHint =
          need === 1
            ? "1 more qualified trading day required for Add Payout."
            : `${need} more qualified trading days required for Add Payout.`;
      }
    }
  }

  let atOrPastPayoutMax = false;
  let runwayPartA = "";
  let runwayPartB = "";
  let goalLineLabel = "Buffer";
  let goalLineCents: number | null = p.startCents + B;

  if (P < B) {
    const bufPct = Math.round((P / B) * 100);
    runwayPartA = `Buffer ${bufPct}%`;
    runwayPartB = `${fmtCents(B - P)} to buffer · ${fmtCents(Math.max(0, BM - P))} to payout min`;
    goalLineLabel = "Buffer";
    goalLineCents = p.startCents + B;
  } else if (P < BM) {
    const minPct = Math.round(((P - B) / Math.max(1, M)) * 100);
    runwayPartA = `Payout min ${minPct}%`;
    runwayPartB = `${fmtCents(BM - P)} to min · ${fmtCents(Math.max(0, BMX - P))} to payout max (${fmtCents(X)})`;
    goalLineLabel = `Payout max ${fmtCents(X)}`;
    goalLineCents = p.startCents + BMX;
  } else {
    atOrPastPayoutMax = P >= BMX;
    const segPct = Math.round(Math.max(0, Math.min(100, ((P - BM) / spanMax) * 100)));
    if (P < BMX) {
      runwayPartA = `Payout max ${segPct}%`;
      runwayPartB = `${fmtCents(BMX - P)} to payout max (${fmtCents(X)})`;
    } else {
      runwayPartA = `Payout max 100%+`;
      runwayPartB = `${fmtCents(P - BMX)} above max (${fmtCents(X)})`;
    }
    goalLineLabel = `Payout max ${fmtCents(X)}`;
    goalLineCents = p.startCents + BMX;
  }

  let barProgress01: number;
  if (P < B) {
    barProgress01 = Math.min(1, Math.max(0, (P / B) * VISUAL_BUFFER_SHARE));
  } else if (P < BM) {
    const miniFrac = (P - B) / Math.max(1, M);
    barProgress01 = Math.min(
      1,
      VISUAL_BUFFER_SHARE + miniFrac * (1 - VISUAL_BUFFER_SHARE)
    );
  } else {
    const tailToMax01 = Math.min(1, Math.max(0, (P - BM) / spanMax));
    barProgress01 = Math.min(
      1,
      1 + VISUAL_MAX_TAIL_SHARE * tailToMax01
    );
  }

  const ringArc01 = Math.min(1, barProgress01);
  const ringPctDisplay = Math.round((P / bmSafe) * 100);

  let payoutCardCallout: string | null = null;
  let suggestedMaxPayoutUsd: number | null = null;

  if (showAddPayoutButton) {
    if (P >= BMX) {
      payoutCardCallout = `You can payout: ${fmtCents(X)}`;
      suggestedMaxPayoutUsd = X / 100;
    } else {
      payoutCardCallout = `You can payout: ${fmtSignedUsdFromCents(availableAboveBufferCents)}`;
      const eligibleUsd = availableAboveBufferCents / 100;
      suggestedMaxPayoutUsd = eligibleUsd > 0 ? eligibleUsd : null;
    }
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
    qualifiedTradingDays: cycle.qualifiedTradingDaysCount,
    requiredQualifiedTradingDays: requiredQ,
    effectivePayoutTargetCents: effectiveTargetCents,
    applyConsistencyRule: applyConsistency,
    bufferReached,
  };
}

/**
 * Barre / anneau Progress : funded générique = remplissage jusqu’au buffer (plafonné à 100 %).
 * Challenge : progression brute (peut dépasser 1 avant objectif).
 */
export function effectiveProgress01(m: { lane: "challenge" | "funded"; progress01: number }): number {
  const pr = Math.max(0, m.progress01);
  if (m.lane === "funded") return Math.min(1, pr);
  return pr;
}
