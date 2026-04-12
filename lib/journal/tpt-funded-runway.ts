import type { ApexFundedRunway } from "@/lib/journal/apex-funded-progress";
import type { JournalAccount, JournalDataV1 } from "@/lib/journal/types";
import { getTptPayoutState } from "@/lib/journal/tpt-funded-payout-state";
import {
  getTptRuleBlockForAccount,
  isTakeProfitTraderJournalAccount,
} from "@/lib/journal/tpt-journal-rules";
import type { StoredTrade } from "@/lib/journal/trades-storage";
import { formatUsdCompact } from "@/lib/prop-firms";

export type TptFundedRunway = ApexFundedRunway;

function tptFundedLaneAccount(account: JournalAccount): boolean {
  return account.accountType === "funded" || account.accountType === "live";
}

/**
 * Nouvelle activité P&L après un payout : ligne journal manuelle/import ou trade stocké (CSV).
 * Utilisé par d’autres firmes (ex. Lucid) pour leurs règles post-payout — inchangé pour compatibilité.
 */
export function hasTptJournalActivityAfterTimestamp(
  state: JournalDataV1,
  accountId: string,
  afterExclusive: string,
  trades?: readonly StoredTrade[]
): boolean {
  for (const e of Object.values(state.pnlEntries)) {
    if (e.accountId !== accountId) continue;
    if (e.createdAt > afterExclusive) return true;
  }
  if (trades) {
    for (const t of trades) {
      if (t.accountId !== accountId) continue;
      if (t.importedAt > afterExclusive) return true;
    }
  }
  return false;
}

/**
 * Take Profit Trader funded / live : retrait de l’excédent au-dessus de **start + buffer** (CSV).
 * Pas d’activité post-payout requise ; pas de consistance / winning days.
 */
export function tryBuildTptFundedRunway(
  _state: JournalDataV1,
  account: JournalAccount,
  p: {
    startCents: number;
    currentCents: number;
    /** Barre / anneau : alignés sur le modèle funded (buffer → objectif). */
    progress01: number;
  }
): TptFundedRunway | null {
  if (!isTakeProfitTraderJournalAccount(account)) return null;
  const block = getTptRuleBlockForAccount(account);
  if (!block || !tptFundedLaneAccount(account)) return null;

  const st = getTptPayoutState(account, {
    balanceNowCents: p.currentCents,
    startCents: p.startCents,
  });
  if (!st) return null;

  const bufferCents = Math.round(block.fundedBufferUsd * 100);
  const thresholdCents = p.startCents + bufferCents;
  /** Excédent **brut** en centimes (évite float ; aligné sur `getTptPayoutState`). */
  const eligibleGrossCents = Math.max(0, Math.round(p.currentCents - thresholdCents));
  const withdrawableGrossUsd = eligibleGrossCents / 100;

  const showAddPayoutButton = st.showAddPayout;

  let payoutCardCallout: string | null = null;
  let suggestedMaxPayoutUsd: number | null = null;
  if (showAddPayoutButton) {
    payoutCardCallout = `You can payout ${formatUsdCompact(withdrawableGrossUsd)}`;
    suggestedMaxPayoutUsd = withdrawableGrossUsd;
  }

  let runwayPartA = "";
  let runwayPartB = "";
  if (eligibleGrossCents > 0) {
    runwayPartA = `${formatUsdCompact(withdrawableGrossUsd)} withdrawable`;
    runwayPartB = "";
  } else {
    runwayPartA = "At or below floor";
    const gap = thresholdCents - p.currentCents;
    runwayPartB =
      gap > 0 ? `${formatUsdCompact(gap / 100)} to start + buffer` : "—";
  }

  const barProgress01 = Math.max(0, Math.min(1, p.progress01));
  const ringArc01 = barProgress01;
  const ringPctDisplay = Math.round(barProgress01 * 100);

  return {
    barProgress01,
    ringArc01,
    ringPctDisplay,
    showAddPayoutButton,
    atOrPastPayoutMax: eligibleGrossCents > 0,
    runwayPartA,
    runwayPartB,
    goalLineLabel: `Start + buffer`,
    goalLineCents: thresholdCents,
    phasePctLabel: String(ringPctDisplay),
    payoutCardCallout,
    suggestedMaxPayoutUsd,
    /** Même libellé que les autres firmes : panneau « Good News » + bouton Add Payout. */
    goodNewsTitle: showAddPayoutButton ? "Good News" : null,
  };
}
