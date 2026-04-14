export type SimplePayoutPhase = "buffer" | "payout_min" | "payout_max";

export type SimplePayoutProgress = {
  currentPhase: SimplePayoutPhase;
  /** 0–100+ : avancement global de `startingBalance` vers `payoutMaxBalance`. */
  progressPercentage: number;
  /** Palier de fin de phase courante (solde compte, cents). */
  currentTargetCents: number;
  /** Palier suivant (cents). */
  nextTargetCents: number;
  showPayoutButton: boolean;
  showGoodNewsMessage: boolean;
};

/**
 * Progression en 3 segments : start → (+buffer) → (+payout min) → (+payout max).
 * Montants buffer / min / max sont des **écarts** en cents depuis le début du segment concerné
 * (aligné balance compte = start + sommes cumulées).
 */
export function getSimplePayoutProgress(p: {
  startingBalanceCents: number;
  balanceNowCents: number;
  /** 0 = pas de phase buffer. */
  bufferDistanceCents: number;
  payoutMinDistanceCents: number;
  payoutMaxDistanceCents: number;
}): SimplePayoutProgress {
  const S = p.startingBalanceCents;
  const bal = p.balanceNowCents;
  const buf = Math.max(0, Math.round(p.bufferDistanceCents));
  const minD = Math.max(0, Math.round(p.payoutMinDistanceCents));
  const maxD = Math.max(minD, Math.round(p.payoutMaxDistanceCents));

  const tBufferEnd = S + buf;
  const tMin = tBufferEnd + minD;
  /** `payoutMaxDistanceCents` = montant cumulé depuis la fin du buffer jusqu’au max (≥ min). */
  const tMax = tBufferEnd + maxD;
  const span = Math.max(1, tMax - S);

  let currentPhase: SimplePayoutPhase;
  if (buf > 0 && bal < tBufferEnd) {
    currentPhase = "buffer";
  } else if (bal < tMin) {
    currentPhase = "payout_min";
  } else {
    currentPhase = "payout_max";
  }

  const currentTargetCents =
    currentPhase === "buffer" ? tBufferEnd : currentPhase === "payout_min" ? tMin : tMax;
  const nextTargetCents =
    currentPhase === "buffer" ? tMin : currentPhase === "payout_min" ? tMax : tMax;

  const progressPercentage = ((bal - S) / span) * 100;
  const showPayoutButton = bal >= tMin;
  const showGoodNewsMessage = showPayoutButton;

  return {
    currentPhase,
    progressPercentage,
    currentTargetCents,
    nextTargetCents,
    showPayoutButton,
    showGoodNewsMessage,
  };
}
