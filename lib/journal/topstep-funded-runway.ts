import type { ApexFundedRunway } from "@/lib/journal/apex-funded-progress";
import {
  aggregateTopStepFundedPayoutCycle,
  countTopStepPayoutEntries,
} from "@/lib/journal/topstep-funded-payout-cycle";
import { getTopStepFundedBlockForAccount } from "@/lib/journal/topstep-journal-rules";
import type { JournalAccount, JournalDataV1 } from "@/lib/journal/types";
import { formatUsdWholeGrouped } from "@/lib/prop-firms";

/** +$750 de croissance depuis la baseline (après dernier payout payé) pour la phase 2 UI. */
const PROFIT_FIRST_MILESTONE_CENTS = 750 * 100;
/** Second palier visuel : +$10k depuis la baseline. */
const PROFIT_MAX_TRACK_CENTS = 10_000 * 100;
/** Côté solde « Now » : seule la moitié du brut quitte le compte modèle Topstep Funded. */
const TOPSTEP_BALANCE_PAYOUT_DEDUCTION_SHARE = 0.5;

const BAR_FIRST_SHARE = 0.92;

export type TopStepFundedRunway = ApexFundedRunway;

function fmtUsdFromCents(cents: number): string {
  return formatUsdWholeGrouped(Math.max(0, Math.round(cents)) / 100);
}

/** Montants buffer / max retrait : 2 décimales si besoin (ex. $2,475.50). */
function fmtUsdFromCentsBuffer(cents: number): string {
  const n = Math.max(0, Math.round(cents)) / 100;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n);
}

function canonYmd(raw: string): string {
  const s = raw.trim().slice(0, 10);
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s);
  if (m) {
    return `${m[1]}-${m[2]!.padStart(2, "0")}-${m[3]!.padStart(2, "0")}`;
  }
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : s;
}

type ReplayEvent =
  | { kind: "pnl"; day: string; sortKey: string; tie: number; pnlCents: number }
  | { kind: "payout"; day: string; sortKey: string; tie: number; grossAmountCents: number };

/**
 * Solde juste après le dernier payout **payé**, avec déduction solde = 50 % du brut enregistré
 * (aligné sur `progress-metrics` pour les comptes Topstep).
 */
function balanceAfterLastPaidPayoutCents(
  state: JournalDataV1,
  accountId: string,
  startCents: number
): number | null {
  const events: ReplayEvent[] = [];

  for (const e of Object.values(state.pnlEntries)) {
    if (e.accountId !== accountId) continue;
    events.push({
      kind: "pnl",
      day: canonYmd(e.date),
      sortKey: e.createdAt || e.id,
      tie: 0,
      pnlCents: e.pnlCents,
    });
  }

  for (const p of Object.values(state.payoutEntries)) {
    if (p.accountId !== accountId) continue;
    if (p.status === "rejected") continue;
    const raw = (p.requestedDate?.trim() || p.paidDate?.trim() || "").slice(0, 10);
    const day = canonYmd(raw);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) continue;
    events.push({
      kind: "payout",
      day,
      sortKey: p.createdAt || p.id,
      tie: 1,
      grossAmountCents: p.grossAmountCents,
    });
  }

  if (events.length === 0) return null;

  events.sort((a, b) => {
    if (a.day !== b.day) return a.day < b.day ? -1 : 1;
    if (a.sortKey !== b.sortKey) return a.sortKey < b.sortKey ? -1 : 1;
    return a.tie - b.tie;
  });

  let balance = startCents;
  let lastAfterPaid: number | null = null;

  for (const ev of events) {
    if (ev.kind === "pnl") {
      balance += ev.pnlCents;
    } else {
      balance -= Math.round(ev.grossAmountCents * TOPSTEP_BALANCE_PAYOUT_DEDUCTION_SHARE);
      lastAfterPaid = balance;
    }
  }

  return lastAfterPaid;
}

/** Max brut demandable : 50 % du profit affiché (Now − Start), plafonné au maxi standard CSV. */
function topStepFundedPayoutMaxGrossCents(
  startCents: number,
  currentCents: number,
  fdPayoutMaxUsd: number
): number {
  const profitCents = Math.max(0, Math.round(currentCents - startCents));
  const half = Math.round(profitCents * TOPSTEP_BALANCE_PAYOUT_DEDUCTION_SHARE);
  const hardMax = Math.round(fdPayoutMaxUsd * 100);
  return Math.min(half, hardMax);
}

/**
 * TopStep — comptes **funded / live** uniquement (pas l’eval, même si passée).
 * Payout : 5 winning days (net jour ≥ CSV), profit cycle > 0 sauf 1er payout, palier UI $750,
 * max brut = min(50 % × (Now − Start), payout maxi standard CSV).
 */
export function tryBuildTopStepFundedRunway(
  state: JournalDataV1,
  account: JournalAccount,
  p: { startCents: number; currentCents: number }
): TopStepFundedRunway | null {
  const fd = getTopStepFundedBlockForAccount(account);
  if (!fd) return null;
  if (account.accountType !== "funded" && account.accountType !== "live") {
    return null;
  }

  const afterLastPaid = balanceAfterLastPaidPayoutCents(state, account.id, p.startCents);
  const B0 = afterLastPaid != null ? afterLastPaid : p.startCents;
  const G = Math.round(p.currentCents - B0);

  const cycle = aggregateTopStepFundedPayoutCycle(state, account, fd);
  const nPay = countTopStepPayoutEntries(state, account.id);
  const requiredWin = fd.minTradingDays;

  const winningOk = cycle.winningDaysCount >= requiredWin;
  const profitSinceOk = nPay === 0 || cycle.profitSinceLastPayoutCents > 0;
  const milestone750 = G >= PROFIT_FIRST_MILESTONE_CENTS;

  const eligible = milestone750 && winningOk && profitSinceOk;

  const T1 = PROFIT_FIRST_MILESTONE_CENTS;
  const T2 = PROFIT_MAX_TRACK_CENTS;

  const wd01 = Math.min(1, cycle.winningDaysCount / Math.max(1, requiredWin));
  const g01 = G <= 0 ? 0 : Math.min(1, G / T1);
  let barProgress01: number;
  if (G >= T2) {
    barProgress01 = 1;
  } else if (G >= T1) {
    const span = Math.max(1, T2 - T1);
    const tail01 = Math.min(1, Math.max(0, (G - T1) / span));
    barProgress01 = Math.min(1, BAR_FIRST_SHARE + (1 - BAR_FIRST_SHARE) * tail01);
  } else {
    barProgress01 = (wd01 + g01) / 2;
  }

  const ringArc01 = barProgress01;

  let ringPctDisplay = 0;
  if (G <= 0) ringPctDisplay = 0;
  else if (G < T1) ringPctDisplay = Math.round((G / T1) * 100);
  else if (G < T2) {
    const span = Math.max(1, T2 - T1);
    ringPctDisplay = Math.round(100 + ((G - T1) / span) * 100);
  } else {
    ringPctDisplay = 200;
  }

  const atOrPastPayoutMax = G >= T2;

  let runwayPartA = "";
  let runwayPartB = "";
  let goalLineLabel = "Target";
  let goalLineCents: number | null = B0 + T1;

  if (G <= 0) {
    runwayPartA = afterLastPaid != null ? "Since last payout" : "Net vs account start";
    runwayPartB =
      G < 0
        ? `${fmtUsdFromCents(-G)} below baseline after payouts`
        : "At baseline — build winning days and +$750 for payout phase";
    goalLineLabel = "$750 above baseline";
    goalLineCents = B0 + T1;
  } else if (G < T1) {
    const pct = Math.round((G / T1) * 100);
    runwayPartA = `To +$750 ${pct}%`;
    runwayPartB = `${cycle.winningDaysCount}/${requiredWin} winning days (≥ ${formatUsdWholeGrouped(fd.minProfitPerDayUsd)} / day) · ${fmtUsdFromCents(T1 - G)} to milestone`;
    goalLineLabel = "$750 above baseline";
    goalLineCents = B0 + T1;
  } else if (G < T2) {
    const span = Math.max(1, T2 - T1);
    const pct = Math.round(((G - T1) / span) * 100);
    runwayPartA = `To +$10k track ${pct}%`;
    runwayPartB = `${cycle.winningDaysCount}/${requiredWin} winning days · up to ${formatUsdWholeGrouped(fd.payoutMaxStandardUsd)} payout (rules cap)`;
    goalLineLabel = "$10k above baseline";
    goalLineCents = B0 + T2;
  } else {
    runwayPartA = "Max track complete";
    runwayPartB = `${fmtUsdFromCents(G - T2)} above +$10k track`;
    goalLineLabel = "$10k+ above baseline";
    goalLineCents = B0 + T2;
  }

  const payoutMaxGrossCents = topStepFundedPayoutMaxGrossCents(
    p.startCents,
    p.currentCents,
    fd.payoutMaxStandardUsd
  );
  let payoutCardCallout: string | null = null;
  let suggestedMaxPayoutUsd: number | null = null;
  if (eligible) {
    payoutCardCallout = `You can payout ${fmtUsdFromCentsBuffer(payoutMaxGrossCents)}.\nIf you payout now, ${fmtUsdFromCentsBuffer(payoutMaxGrossCents)} remains as buffer.`;
    suggestedMaxPayoutUsd =
      payoutMaxGrossCents > 0 ? payoutMaxGrossCents / 100 : null;
  }

  const hints: string[] = [];
  if (milestone750 && !winningOk) {
    const need = Math.max(0, requiredWin - cycle.winningDaysCount);
    hints.push(
      need > 0
        ? `Need ${need} more winning day${need === 1 ? "" : "s"} (${requiredWin} required, net ≥ ${formatUsdWholeGrouped(fd.minProfitPerDayUsd)} / day)`
        : `Need ${requiredWin} winning days`
    );
  }
  if (milestone750 && nPay > 0 && !profitSinceOk) {
    hints.push("Profit since last payout must be positive");
  }

  const payoutGateHint =
    milestone750 && !eligible && hints.length > 0 ? hints.join(" · ") : null;

  return {
    barProgress01,
    ringArc01,
    ringPctDisplay,
    showAddPayoutButton: eligible,
    atOrPastPayoutMax,
    runwayPartA,
    runwayPartB,
    goalLineLabel,
    goalLineCents,
    phasePctLabel: String(ringPctDisplay),
    payoutCardCallout,
    suggestedMaxPayoutUsd,
    goodNewsTitle: eligible ? "Good News" : null,
    payoutGateHint,
    showPayoutGatePanel: milestone750 && !eligible,
    qualifiedTradingDays: cycle.winningDaysCount,
    requiredQualifiedTradingDays: requiredWin,
    cycleNetPnlCents: cycle.profitSinceLastPayoutCents,
  };
}
