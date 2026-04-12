import { fundedProgressPnlBaselineDate } from "@/lib/journal/funded-phase-pnl";
import type {
  ISODate,
  JournalAccount,
  JournalDataV1,
  JournalId,
  JournalPayoutEntry,
} from "@/lib/journal/types";

/**
 * Cycle payout **Funded Next Futures Legacy** (benchmark + baseline) : logique isolée du Topstep
 * pour éviter les dérives (`requested`, trades dupliqués, dates demandée vs payée).
 */

function toYyyyMmDd(raw: string | undefined | null): string | null {
  if (raw == null) return null;
  const t = String(raw).trim();
  if (t === "") return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  const slice = t.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(slice)) return slice;
  const ms = Date.parse(t);
  if (!Number.isNaN(ms)) {
    const d = new Date(ms);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
  return null;
}

function compareDay(a: string, b: string): number {
  return a.localeCompare(b);
}

function nextCalendarDay(day: string): string {
  const [y, m, d] = day.split("-").map((x) => Number.parseInt(x, 10));
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + 1);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}

function addCalendarDays(day: string, extra: number): string {
  let cur = day;
  for (let i = 0; i < extra; i++) cur = nextCalendarDay(cur);
  return cur;
}

function isOnOrAfterDay(entryRaw: string, sinceDay: string): boolean {
  const a = toYyyyMmDd(entryRaw);
  const b = toYyyyMmDd(sinceDay);
  if (a == null || b == null) return entryRaw >= sinceDay;
  return compareDay(a, b) >= 0;
}

function legacyCompletedPayouts(state: JournalDataV1, accountId: JournalId): JournalPayoutEntry[] {
  return Object.values(state.payoutEntries).filter(
    (p) => p.accountId === accountId && (p.status === "approved" || p.status === "paid")
  );
}

/** Jour civil du retrait : **payé** d’abord (argent sorti), sinon demandé, sinon jour de création. */
function legacyPayoutSettlementDay(p: JournalPayoutEntry): string | null {
  const fromPaid = toYyyyMmDd(p.paidDate?.trim());
  if (fromPaid != null) return fromPaid;
  const fromReq = toYyyyMmDd(p.requestedDate?.trim());
  if (fromReq != null) return fromReq;
  return toYyyyMmDd(p.createdAt);
}

function fundedAnchorDay(account: JournalAccount): string | null {
  return (
    toYyyyMmDd(fundedProgressPnlBaselineDate(account) ?? "") ??
    toYyyyMmDd(account.startDate) ??
    null
  );
}

/**
 * Premier jour **inclusif** du cycle benchmark Legacy : jour où le PnL du cycle commence à compter.
 *
 * - Aucun retrait payé/approuvé → ancrage phase funded (`fundedConvertedDate` / `startDate`).
 * - Sinon : lendemain du dernier jour civil de retrait, + 1 jour par retrait **supplémentaire** le même dernier jour
 *   (deux retraits datés pareil avancent le front de 2 jours).
 * - Le résultat n’est jamais **avant** l’ancrage funded (pas de benchmark sur l’eval).
 */
export function fundedNextLegacyPayoutCycleStartIso(
  state: JournalDataV1,
  account: JournalAccount
): ISODate | null {
  const anchor = fundedAnchorDay(account);
  if (anchor == null) return null;

  const completed = legacyCompletedPayouts(state, account.id);
  const rows: { p: JournalPayoutEntry; day: string }[] = [];
  for (const p of completed) {
    const day = legacyPayoutSettlementDay(p);
    if (day == null) continue;
    rows.push({ p, day });
  }

  if (rows.length === 0) return anchor;

  rows.sort((a, b) => {
    const c = compareDay(a.day, b.day);
    if (c !== 0) return c;
    const t = a.p.createdAt.localeCompare(b.p.createdAt);
    if (t !== 0) return t;
    return a.p.id.localeCompare(b.p.id);
  });

  const lastDay = rows[rows.length - 1]!.day;
  const sameLastDayCount = rows.filter((r) => r.day === lastDay).length;
  const firstOpen = nextCalendarDay(lastDay);
  const rawStart = addCalendarDays(firstOpen, Math.max(0, sameLastDayCount - 1));

  return compareDay(rawStart, anchor) < 0 ? anchor : rawStart;
}

/**
 * Benchmark days & PnL agrégé du cycle **uniquement** depuis les entrées **journal** (pas `storedTrades`) :
 * évite les doublons import / exécutions et aligne le comptage sur le calendrier du journal.
 *
 * N’inclut que le PnL **à partir** de l’ancrage funded si défini (cohérent avec la carte Progress).
 */
export function aggregateFundedNextLegacyBenchmarkCycle(
  state: JournalDataV1,
  account: JournalAccount,
  cycleStartInclusive: string,
  minProfitPerDayCents: number
): { qualifiedDays: number; cycleProfitCents: number; bestDayProfitCents: number } {
  const cs = toYyyyMmDd(cycleStartInclusive);
  if (cs == null) {
    return { qualifiedDays: 0, cycleProfitCents: 0, bestDayProfitCents: 0 };
  }

  const fundedSince = toYyyyMmDd(fundedProgressPnlBaselineDate(account) ?? "");

  const daily: Record<string, number> = {};
  for (const e of Object.values(state.pnlEntries)) {
    if (e.accountId !== account.id) continue;
    if (!isOnOrAfterDay(e.date, cs)) continue;
    if (fundedSince != null && !isOnOrAfterDay(e.date, fundedSince)) continue;
    const dk = toYyyyMmDd(e.date);
    if (dk == null) continue;
    daily[dk] = (daily[dk] ?? 0) + e.pnlCents;
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
