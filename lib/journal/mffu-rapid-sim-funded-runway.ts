import type { ApexFundedRunway } from "@/lib/journal/apex-funded-progress";
import { getMffuRapidSimFundedPayoutState } from "@/lib/journal/mffu-rapid-sim-funded-payout-state";
import {
  MFFU_RAPID_SIM_FUNDED_FROM_CSV,
  type MffuRapidSimFundedCsvSize,
} from "@/lib/journal/mffu-rapid-sim-funded-csv.generated";
import { isMffuRapidSimFundedJournalAccount } from "@/lib/journal/mffu-rapid-sim-funded-journal-rules";
import type { JournalAccount, JournalDataV1 } from "@/lib/journal/types";
import { formatUsdWholeGrouped } from "@/lib/prop-firms";

export type MffuRapidSimFundedRunway = ApexFundedRunway;

/** Same visual split as {@link tryBuildApexFundedRunway} (`apex-funded-progress.ts`). */
const VISUAL_BUFFER_SHARE = 0.75;
const VISUAL_MAX_TAIL_SHARE = 0.08;

function fmtCents(c: number): string {
  return formatUsdWholeGrouped(Math.max(0, Math.round(c)) / 100);
}

function fmtUsdFromCentsBuffer(cents: number): string {
  const n = Math.max(0, Math.round(cents)) / 100;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n);
}

/**
 * My Funded Futures **Rapid** Sim funded: Phase 1 → nominal + CSV buffer; Phase 2 → surplus to payout mini;
 * Phase 3 → Good News + Add Payout when gross ≥ mini (CSV max cap applies).
 */
export function tryBuildMffuRapidSimFundedRunway(
  state: JournalDataV1,
  account: JournalAccount,
  p: { startCents: number; currentCents: number }
): MffuRapidSimFundedRunway | null {
  if (!isMffuRapidSimFundedJournalAccount(account)) return null;
  const sk = account.sizeLabel.trim().toLowerCase().replace(/\s+/g, "") as MffuRapidSimFundedCsvSize;
  const csv = MFFU_RAPID_SIM_FUNDED_FROM_CSV[sk];
  if (!csv) return null;

  const st = getMffuRapidSimFundedPayoutState(state, account, {
    startCents: p.startCents,
    currentCents: p.currentCents,
  });
  if (!st) return null;

  const B = Math.max(1, Math.round(csv.bufferUsd * 100));
  const M = Math.round(csv.payoutMiniUsd * 100);
  const X = Math.round(csv.payoutMaxUsd * 100);
  const floorCents = st.bufferFloorCents;

  /** Equity gain depuis le nominal (même idée que le `P` Apex sur le segment buffer → mini). */
  const P = Math.max(0, p.currentCents - p.startCents);
  const BM = B + M;
  const BMX = B + X;
  const spanMax = Math.max(1, X - M);
  const bmSafe = Math.max(1, BM);

  const surplusCents = st.surplusCents;
  const bufferReached = P >= B;

  let barProgress01: number;
  if (P < B) {
    barProgress01 = Math.min(1, Math.max(0, (P / B) * VISUAL_BUFFER_SHARE));
  } else if (P < BM) {
    const miniFrac = (P - B) / Math.max(1, M);
    barProgress01 = Math.min(1, VISUAL_BUFFER_SHARE + miniFrac * (1 - VISUAL_BUFFER_SHARE));
  } else {
    const tailToMax01 = Math.min(1, Math.max(0, (P - BM) / spanMax));
    barProgress01 = Math.min(1, 1 + VISUAL_MAX_TAIL_SHARE * tailToMax01);
  }

  const ringArc01 = Math.min(1, barProgress01);
  const ringPctDisplay = Math.round((P / bmSafe) * 100);

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
    goalLineLabel = `Payout min ${fmtCents(M)}`;
    goalLineCents = floorCents + M;
  } else {
    const segPct = Math.round(Math.max(0, Math.min(100, ((P - BM) / spanMax) * 100)));
    if (P < BMX) {
      runwayPartA = `Payout max ${segPct}%`;
      runwayPartB = `${fmtCents(BMX - P)} to payout max (${fmtCents(X)})`;
    } else {
      runwayPartA = `Payout max 100%+`;
      runwayPartB = `${fmtCents(P - BMX)} above max (${fmtCents(X)})`;
    }
    goalLineLabel = `Payout max ${fmtCents(X)}`;
    goalLineCents = floorCents + X;
  }

  const atOrPastPayoutMax = P >= BMX;

  let payoutCardCallout: string | null = null;
  let suggestedMaxPayoutUsd: number | null = null;
  if (st.isEligible) {
    const g = fmtUsdFromCentsBuffer(st.availablePayoutCents);
    payoutCardCallout = `You can payout up to ${g}.`;
    suggestedMaxPayoutUsd = st.availablePayout > 0 ? st.availablePayout : null;
  }

  const milestoneForPanel = st.surplusCents > 0 || p.currentCents > p.startCents;

  const payoutGateHint =
    !st.isEligible && milestoneForPanel && st.eligibilityReason ? st.eligibilityReason : null;

  const showPayoutGatePanel = !st.isEligible && milestoneForPanel && payoutGateHint != null;

  return {
    barProgress01,
    ringArc01,
    ringPctDisplay,
    showAddPayoutButton: st.showAddPayout,
    atOrPastPayoutMax,
    runwayPartA,
    runwayPartB,
    goalLineLabel,
    goalLineCents,
    phasePctLabel: String(ringPctDisplay),
    payoutCardCallout,
    suggestedMaxPayoutUsd,
    goodNewsTitle: st.showGoodNews ? "Good News" : null,
    payoutGateHint,
    showPayoutGatePanel,
    cycleNetPnlCents: surplusCents,
    bufferReached,
  };
}
