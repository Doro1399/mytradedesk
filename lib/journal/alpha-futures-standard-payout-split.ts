import type { JournalDataV1, JournalId, JournalPayoutEntry } from "@/lib/journal/types";

/**
 * Alpha Futures Standard (CSV notes) : 70 % sur les payouts 1–2, 80 % sur 3–4, 90 % à partir du 5ᵉ.
 * `priorPaidCount` = nombre de payouts **payés** (status `paid`, brut > 0) déjà enregistrés **avant** celui en cours.
 */
export function alphaFuturesStandardTraderSplitRatioFromPriorPaidCount(priorPaidCount: number): number {
  const n = Math.max(0, Math.floor(priorPaidCount));
  if (n <= 1) return 0.7;
  if (n <= 3) return 0.8;
  return 0.9;
}

function payoutChronoKey(p: JournalPayoutEntry): string {
  const d = p.paidDate ?? p.requestedDate;
  return `${d}\t${p.createdAt}\t${p.id}`;
}

/** Payouts payés (chronologiques) pour le compte — même base que le palier CSV. */
export function alphaFuturesStandardPaidPayoutsChronological(
  state: JournalDataV1,
  accountId: JournalId
): JournalPayoutEntry[] {
  return Object.values(state.payoutEntries)
    .filter((p) => p.accountId === accountId && p.status === "paid" && p.grossAmountCents > 0)
    .sort((a, b) => payoutChronoKey(a).localeCompare(payoutChronoKey(b)));
}

/** Nombre de payouts payés strictement avant cette ligne (affichage / édition). */
export function alphaFuturesStandardPriorPaidCountBeforeEntry(
  state: JournalDataV1,
  accountId: JournalId,
  entry: JournalPayoutEntry
): number {
  let n = 0;
  for (const p of alphaFuturesStandardPaidPayoutsChronological(state, accountId)) {
    if (p.id === entry.id) break;
    n++;
  }
  return n;
}

/** Avant d’enregistrer un nouveau payout payé. */
export function alphaFuturesStandardPriorPaidCountForNewPayout(
  state: JournalDataV1,
  accountId: JournalId
): number {
  return alphaFuturesStandardPaidPayoutsChronological(state, accountId).length;
}
