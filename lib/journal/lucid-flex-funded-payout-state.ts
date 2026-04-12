import type { ApexFundedRunway } from "@/lib/journal/apex-funded-progress";
import {
  getLucidFlexFundedBlockForAccount,
  isLucidFlexFundedJournalAccount,
  type LucidFlexFundedBlock,
} from "@/lib/journal/lucid-journal-rules";
import { topStepFundedPayoutCycleStartInclusive } from "@/lib/journal/topstep-funded-payout-cycle";
import type { JournalAccount, JournalDataV1 } from "@/lib/journal/types";
import type { StoredTrade } from "@/lib/journal/trades-storage";
import { formatUsdWholeGrouped } from "@/lib/prop-firms";

/** Seuil cycle : 50 % × profit ≥ $500 mini → au moins $1 000 de profit de cycle. */
const MIN_CYCLE_PROFIT_FOR_MIN_PAYOUT_CENTS = 1000 * 100;

function calendarDateKey(raw: string): string {
  const t = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  const slice = t.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(slice) ? slice : t;
}

function normalizedCalendarKey(raw: string): string {
  const k = calendarDateKey(raw);
  if (/^\d{4}-\d{2}-\d{2}$/.test(k)) return k;
  const t = Date.parse(raw.trim());
  if (!Number.isNaN(t)) {
    const d = new Date(t);
    const yy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yy}-${mm}-${dd}`;
  }
  const parts = k.split("-").map((p) => p.trim());
  if (parts.length === 3) {
    const y = Number.parseInt(parts[0]!, 10);
    const mo = Number.parseInt(parts[1]!, 10);
    const da = Number.parseInt(parts[2]!, 10);
    if (Number.isFinite(y) && Number.isFinite(mo) && Number.isFinite(da)) {
      return `${y}-${String(mo).padStart(2, "0")}-${String(da).padStart(2, "0")}`;
    }
  }
  return k;
}

function isOnOrAfterCalendarDay(entryDate: string, sinceInclusive: string): boolean {
  const a = normalizedCalendarKey(entryDate);
  const b = normalizedCalendarKey(sinceInclusive);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(a) || !/^\d{4}-\d{2}-\d{2}$/.test(b)) {
    return entryDate >= sinceInclusive;
  }
  const [ay, am, ad] = a.split("-").map((x) => Number.parseInt(x, 10));
  const [by, bm, bd] = b.split("-").map((x) => Number.parseInt(x, 10));
  const ta = new Date(ay, am - 1, ad).setHours(0, 0, 0, 0);
  const tb = new Date(by, bm - 1, bd).setHours(0, 0, 0, 0);
  return ta >= tb;
}

/**
 * Journal + optional trades, calendar days from `cycleStartInclusive` (same basis as Topstep cycle start).
 * Used by Lucid Flex funded and Funded Next Legacy funded.
 */
export function aggregateLucidFlexCycle(
  state: JournalDataV1,
  account: JournalAccount,
  cycleStartInclusive: string,
  minProfitPerDayCents: number,
  storedTrades?: readonly StoredTrade[]
): { qualifiedDays: number; cycleProfitCents: number; bestDayProfitCents: number } {
  const daily: Record<string, number> = {};

  for (const e of Object.values(state.pnlEntries)) {
    if (e.accountId !== account.id) continue;
    if (!isOnOrAfterCalendarDay(e.date, cycleStartInclusive)) continue;
    const dk = normalizedCalendarKey(e.date);
    daily[dk] = (daily[dk] ?? 0) + e.pnlCents;
  }

  if (storedTrades) {
    for (const t of storedTrades) {
      if (t.accountId !== account.id) continue;
      if (!isOnOrAfterCalendarDay(t.date, cycleStartInclusive)) continue;
      const dk = normalizedCalendarKey(t.date);
      daily[dk] = (daily[dk] ?? 0) + t.pnlCents;
    }
  }

  let qualifiedDays = 0;
  let cycleProfitCents = 0;
  let best = Number.NEGATIVE_INFINITY;
  for (const v of Object.values(daily)) {
    cycleProfitCents += v;
    if (v > best) best = v;
    if (v >= minProfitPerDayCents) qualifiedDays += 1;
  }

  const bestDayProfitCents = best === Number.NEGATIVE_INFINITY ? 0 : best;
  return { qualifiedDays, cycleProfitCents, bestDayProfitCents };
}

function fmtUsdFromCents(cents: number): string {
  return formatUsdWholeGrouped(Math.max(0, Math.round(cents)) / 100);
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

export type LucidFlexPayoutState = {
  isEligible: boolean;
  /** Null when eligible ; sinon message court (EN). */
  eligibilityReason: string | null;
  qualifiedDays: number;
  /** Profit net agrégé sur le cycle (depuis lendemain du dernier payout, ou baseline funded). */
  cycleProfitCents: number;
  payoutMinCents: number;
  /** Plafond brut du cycle : min(50 % du profit de cycle, cap compte). */
  payoutMaxCents: number;
  /** Même valeur que `payoutMaxCents` ici (disponible brut pour le cycle). */
  availablePayoutCents: number;
  showAddPayout: boolean;
};

/**
 * État payout Lucid Flex funded : jours qualifiés (net jour ≥ CSV), profit de cycle > 0,
 * mini brut $500 (donc ≥ $1k de profit de cycle à 50 %), max = min(50 % cycle, cap).
 * Montants en cents ; split affichage site = 90 % du brut (`payout-display`).
 */
export function getLucidFlexPayoutState(
  state: JournalDataV1,
  account: JournalAccount,
  options?: { storedTrades?: readonly StoredTrade[] }
): LucidFlexPayoutState | null {
  const block = getLucidFlexFundedBlockForAccount(account);
  if (!block) return null;

  const start = topStepFundedPayoutCycleStartInclusive(state, account);
  if (start == null || start === "") {
    return buildStateFromAgg(block, 0, 0);
  }

  const minProfitPerDayCents = Math.round(block.minProfitPerDayUsd * 100);
  const { qualifiedDays, cycleProfitCents } = aggregateLucidFlexCycle(
    state,
    account,
    start,
    minProfitPerDayCents,
    options?.storedTrades
  );

  return buildStateFromAgg(block, qualifiedDays, cycleProfitCents);
}

function buildStateFromAgg(
  block: LucidFlexFundedBlock,
  qualifiedDays: number,
  cycleProfitCents: number
): LucidFlexPayoutState {
  const required = block.minTradingDays;
  const payoutMinCents = Math.round(block.payoutMiniUsd * 100);
  const capCents = Math.round(block.payoutMaxUsd * 100);

  const half =
    cycleProfitCents > 0 ? Math.round(cycleProfitCents * 0.5) : 0;
  const payoutMaxCents = Math.min(half, capCents);
  const availablePayoutCents = payoutMaxCents;

  const daysOk = qualifiedDays >= required;
  const profitOk = cycleProfitCents > 0;
  const minPayoutOk = availablePayoutCents >= payoutMinCents;

  const isEligible = daysOk && profitOk && minPayoutOk;
  const showAddPayout = isEligible;

  const reasons: string[] = [];
  if (!daysOk) {
    const need = Math.max(0, required - qualifiedDays);
    reasons.push(
      need === 1
        ? `1 more qualified profit day required (net ≥ ${formatUsdWholeGrouped(block.minProfitPerDayUsd)} / day)`
        : `${need} more qualified profit days required (net ≥ ${formatUsdWholeGrouped(block.minProfitPerDayUsd)} / day)`
    );
  }
  if (!profitOk) {
    reasons.push("Cycle net profit must be positive since last payout");
  }
  if (profitOk && !minPayoutOk) {
    reasons.push(
      `At least ${fmtUsdFromCents(MIN_CYCLE_PROFIT_FOR_MIN_PAYOUT_CENTS)} cycle profit needed for $500 minimum payout (50% rule)`
    );
  }

  return {
    isEligible,
    eligibilityReason: isEligible ? null : reasons.join(" · ") || "Not eligible",
    qualifiedDays,
    cycleProfitCents,
    payoutMinCents,
    payoutMaxCents,
    availablePayoutCents,
    showAddPayout,
  };
}

/**
 * Runway carte Progress — Lucid Flex funded uniquement (pas de buffer, cycle calendaire).
 */
export function tryBuildLucidFlexFundedRunway(
  state: JournalDataV1,
  account: JournalAccount,
  _p: { startCents: number; currentCents: number },
  options?: { storedTrades?: readonly StoredTrade[] }
): ApexFundedRunway | null {
  if (!isLucidFlexFundedJournalAccount(account)) return null;
  const block = getLucidFlexFundedBlockForAccount(account);
  if (!block) return null;

  const st = getLucidFlexPayoutState(state, account, options);
  if (!st) return null;

  const { qualifiedDays, cycleProfitCents } = st;

  const required = block.minTradingDays;
  const T1 = MIN_CYCLE_PROFIT_FOR_MIN_PAYOUT_CENTS;
  const capCents = Math.round(block.payoutMaxUsd * 100);
  const T2 = Math.max(T1 + 1, 2 * capCents);

  const G = Math.max(0, cycleProfitCents);

  /** Piste unique vers payout max : moitié cycle profit vs objectif T2, moitié jours qualifiés. */
  const cycleToMax01 = Math.min(1, G / Math.max(1, T2));
  const daysToRequired01 = Math.min(1, qualifiedDays / Math.max(1, required));
  const pathToPayoutMax01 = (cycleToMax01 + daysToRequired01) / 2;
  const barProgress01 = pathToPayoutMax01;
  const ringArc01 = pathToPayoutMax01;

  const ringPctDisplay = Math.round(pathToPayoutMax01 * 100);

  const atOrPastPayoutMax = G >= T2;

  const maxGrossLabel = formatUsdWholeGrouped(block.payoutMaxUsd);
  const pathPct = Math.round(pathToPayoutMax01 * 100);
  const toMaxCycleCents = Math.max(0, T2 - G);

  let runwayPartA = "";
  let runwayPartB = "";
  let goalLineLabel = "Payout max path";
  let goalLineCents: number | null = T2;

  if (G <= 0) {
    runwayPartA = `To payout max (${maxGrossLabel} gross) · ${pathPct}%`;
    runwayPartB = `${qualifiedDays}/${required} qualified days (≥ ${formatUsdWholeGrouped(block.minProfitPerDayUsd)} / day) · ${fmtUsdFromCents(toMaxCycleCents)} cycle profit to max gross cap`;
    goalLineLabel = `Cycle for max gross (${maxGrossLabel})`;
    goalLineCents = T2;
  } else if (!atOrPastPayoutMax) {
    runwayPartA = `To payout max (${maxGrossLabel} gross) · ${pathPct}%`;
    runwayPartB = `${qualifiedDays}/${required} qualified days · ${fmtUsdFromCents(toMaxCycleCents)} cycle profit left to max gross · min track ${fmtUsdFromCents(T1)} ($500 payout at 50%)`;
    goalLineLabel = `Cycle for max gross (${maxGrossLabel})`;
    goalLineCents = T2;
  } else {
    runwayPartA = `Payout max path complete (${maxGrossLabel} gross)`;
    runwayPartB = `${qualifiedDays}/${required} qualified days · up to ${fmtUsdFromCentsBuffer(capCents)} gross this cycle`;
    goalLineLabel = `Cycle for max gross (${maxGrossLabel})`;
    goalLineCents = T2;
  }

  let payoutCardCallout: string | null = null;
  let suggestedMaxPayoutUsd: number | null = null;
  if (st.isEligible) {
    const g = fmtUsdFromCentsBuffer(st.availablePayoutCents);
    payoutCardCallout = `You can payout ${g}.\nIf you payout now, ${g} remains as buffer.`;
    suggestedMaxPayoutUsd =
      st.availablePayoutCents > 0 ? st.availablePayoutCents / 100 : null;
  }

  const milestoneForPanel = G >= T1 || qualifiedDays >= required;

  const payoutGateHint =
    !st.isEligible && milestoneForPanel && st.eligibilityReason
      ? st.eligibilityReason
      : null;

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
    goodNewsTitle: st.isEligible ? "Good News" : null,
    payoutGateHint,
    showPayoutGatePanel,
    qualifiedTradingDays: qualifiedDays,
    requiredQualifiedTradingDays: required,
    progressTradingDaysLabel: "qualified days",
    cycleNetPnlCents: st.cycleProfitCents,
  };
}
