import type { CalendarWeekRow, DayAggregate } from "@/lib/journal/calendar-aggregates";
import { buildMonthGrid } from "@/lib/journal/calendar-aggregates";

const FEB_PREFIX = "2026-02";

export type LandingFeb2026CalendarDemo = {
  grid: CalendarWeekRow[];
  daily: Map<string, DayAggregate>;
};

/** Deterministic “random” from ISO date string (stable SSR / hydration). */
function hashIso(iso: string): number {
  let h = 2166136261;
  for (let i = 0; i < iso.length; i++) {
    h ^= iso.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mix32(n: number): number {
  let x = n | 0;
  x ^= x >>> 16;
  x = Math.imul(x, 2246822519);
  x ^= x >>> 13;
  x = Math.imul(x, 3266489917);
  x ^= x >>> 16;
  return x >>> 0;
}

/**
 * Synthetic trades-mode calendar for February 2026: P&amp;L on weekdays only
 * (no Sat/Sun), for landing preview.
 */
export function buildLandingFeb2026CalendarDemo(): LandingFeb2026CalendarDemo {
  const grid = buildMonthGrid(2026, 2);
  const daily = new Map<string, DayAggregate>();

  for (const week of grid) {
    for (const cell of week.cells) {
      if (!cell.inMonth || !cell.dateIso.startsWith(FEB_PREFIX)) continue;
      const d = new Date(`${cell.dateIso}T12:00:00`);
      const wd = d.getDay();
      if (wd === 0 || wd === 6) continue;

      const h0 = hashIso(cell.dateIso);
      const h1 = mix32(h0 ^ 0x9e3779b9);
      const h2 = mix32(h1 ^ cell.dateIso.length * 131);

      const isLoss = h0 % 9 === 0;
      const mag = 800 + (h1 % 8500) * 25 + (h2 % 120) * 180;
      const cents = isLoss ? -Math.min(92000, mag) : Math.min(185000, mag + (h2 % 4000) * 10);
      const trades = 1 + (h2 % 14) + (h0 % 5);

      daily.set(cell.dateIso, {
        cents,
        count: 1,
        storedTradeCount: trades,
      });
    }
  }

  return { grid, daily };
}
