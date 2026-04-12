import type { ApexFundedRunway } from "@/lib/journal/apex-funded-progress";
import {
  getLucidDirectPayoutState,
  type LucidDirectPayoutState,
} from "@/lib/journal/lucid-direct-funded-payout-state";
import {
  getLucidDirectFundedBlockForAccount,
  isLucidDirectFundedJournalAccount,
} from "@/lib/journal/lucid-journal-rules";
import type { JournalAccount, JournalDataV1 } from "@/lib/journal/types";
import type { StoredTrade } from "@/lib/journal/trades-storage";
import { formatUsdWholeGrouped } from "@/lib/prop-firms";

export type { LucidDirectPayoutState } from "@/lib/journal/lucid-direct-funded-payout-state";
export {
  getLucidDirectPayoutState,
  LUCID_DIRECT_FUNDED_MIN_PAYOUT_CENTS,
  lucidDirectFundedEffectiveTargetCents,
} from "@/lib/journal/lucid-direct-funded-payout-state";

export type LucidDirectFundedRunway = ApexFundedRunway;

export { isLucidDirectFundedJournalAccount } from "@/lib/journal/lucid-journal-rules";

function fmtCents(c: number): string {
  return formatUsdWholeGrouped(Math.max(0, Math.round(c)) / 100);
}

/**
 * Lucid Direct funded : pas de buffer — cible cycle = max(goal palier, 5× best day, mini $500) ;
 * consistance 20 % = best ≤ 20 % × **total cycle** ; affichage 90 % via `payout-display`.
 */
export function tryBuildLucidDirectFundedRunway(
  state: JournalDataV1,
  account: JournalAccount,
  _p: { startCents: number; currentCents: number },
  options?: { storedTrades?: readonly StoredTrade[] }
): LucidDirectFundedRunway | null {
  if (!isLucidDirectFundedJournalAccount(account)) return null;
  if (!getLucidDirectFundedBlockForAccount(account)) return null;

  const st = getLucidDirectPayoutState(state, account, {
    storedTrades: options?.storedTrades,
  });
  if (!st) return null;

  return buildRunwayFromState(st);
}

function buildRunwayFromState(st: LucidDirectPayoutState): ApexFundedRunway {
  const G = Math.max(0, st.cycleTotalCents);
  const T_eff = Math.max(1, st.effectiveTargetCents);
  const T_cap = Math.max(1, st.payoutCapCents);

  const spanToEffective = T_eff;
  const spanEffectiveToCap = Math.max(1, T_cap - Math.min(T_cap, T_eff));

  const toTarget01 = Math.min(1, G / spanToEffective);
  let barProgress01: number;
  let ringArc01: number;
  if (G < T_eff) {
    barProgress01 = toTarget01;
    ringArc01 = toTarget01;
  } else {
    barProgress01 = 1;
    const extra = Math.min(1, (G - T_eff) / spanEffectiveToCap);
    ringArc01 = T_cap > T_eff ? Math.min(1, 0.85 + 0.15 * extra) : 1;
  }

  const ringPctDisplay = Math.round(ringArc01 * 100);
  const atOrPastPayoutMax = G >= T_cap && G >= T_eff;

  const maxGrossLabel = fmtCents(st.payoutCapCents);
  let runwayPartA = "";
  let runwayPartB = "";
  let goalLineLabel = "Payout target";
  let goalLineCents: number | null = T_eff;

  if (G < T_eff) {
    runwayPartA = `Payout target · ${ringPctDisplay}%`;
    runwayPartB = `${fmtCents(T_eff - G)} to cycle target (${fmtCents(T_eff)}) · max gross ${maxGrossLabel} this payout`;
    goalLineLabel = "Cycle target";
    goalLineCents = T_eff;
  } else if (G < T_cap) {
    runwayPartA = `To payout max (${maxGrossLabel} gross) · ${ringPctDisplay}%`;
    runwayPartB = `${fmtCents(T_cap - G)} cycle profit to max gross cap · target met`;
    goalLineLabel = `Payout max ${maxGrossLabel}`;
    goalLineCents = T_cap;
  } else {
    runwayPartA = `At or above payout max (${maxGrossLabel} gross)`;
    runwayPartB = `Up to ${fmtCents(st.availablePayoutCents)} gross this cycle`;
    goalLineLabel = `Payout max ${maxGrossLabel}`;
    goalLineCents = T_cap;
  }

  let payoutCardCallout: string | null = null;
  let suggestedMaxPayoutUsd: number | null = null;
  if (st.showAddPayout && st.availablePayoutCents > 0) {
    payoutCardCallout = `You can payout: ${fmtCents(st.availablePayoutCents)}`;
    suggestedMaxPayoutUsd = st.availablePayoutCents / 100;
  }

  let goodNewsTitle: string | null = null;
  let payoutGateHint: string | null = null;
  let showPayoutGatePanel = false;

  if (st.showAddPayout) {
    goodNewsTitle = "Good News";
  } else if (!st.isEligible && st.eligibilityReason) {
    showPayoutGatePanel = true;
    payoutGateHint = st.eligibilityReason;
    goodNewsTitle = "Consistency rule breached";
  }

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
    goodNewsTitle,
    payoutGateHint,
    showPayoutGatePanel,
    cycleNetPnlCents: st.cycleTotalCents,
  };
}
