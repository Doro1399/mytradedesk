import { NextResponse } from "next/server";

import { getTrialDayNumber, isTrialActive } from "@/lib/auth/plan";
import type { UserProfileRow } from "@/lib/auth/profile";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const DAY_MS = 86_400_000;
const DEBUG_ITEMS_CAP = 50;

type TrialDayBucket = 7 | 11 | 14;

type DebugRow = {
  id: string;
  email: string | null;
  trialDay: TrialDayBucket;
  trial_day_7_sent: boolean;
  trial_day_11_sent: boolean;
  trial_day_14_sent: boolean;
};

function pushMatch(
  map: Map<TrialDayBucket, DebugRow[]>,
  day: TrialDayBucket,
  row: DebugRow
): void {
  const list = map.get(day) ?? [];
  list.push(row);
  map.set(day, list);
}

export async function GET() {
  const now = new Date();

  try {
    const admin = createAdminSupabaseClient();
    const oldestStart = new Date(now.getTime() - 6 * DAY_MS).toISOString();

    const { data: rows, error } = await admin
      .from("profiles")
      .select("*")
      .eq("premium_status", "trialing")
      .not("trial_started_at", "is", null)
      .lte("trial_started_at", oldestStart);

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    const profiles = (rows ?? []) as UserProfileRow[];
    const byDay = new Map<TrialDayBucket, DebugRow[]>();

    for (const p of profiles) {
      if (!isTrialActive(p, now)) continue;
      const n = getTrialDayNumber(p, now);
      if (n !== 7 && n !== 11 && n !== 14) continue;

      pushMatch(byDay, n, {
        id: p.id,
        email: p.email ?? null,
        trialDay: n,
        trial_day_7_sent: Boolean(p.trial_day_7_sent),
        trial_day_11_sent: Boolean(p.trial_day_11_sent),
        trial_day_14_sent: Boolean(p.trial_day_14_sent),
      });
    }

    const day7 = byDay.get(7) ?? [];
    const day11 = byDay.get(11) ?? [];
    const day14 = byDay.get(14) ?? [];

    const bucketJson = (list: DebugRow[]) => ({
      count: list.length,
      sample: list.slice(0, DEBUG_ITEMS_CAP),
      sampleTruncated: list.length > DEBUG_ITEMS_CAP,
    });

    return NextResponse.json({
      ok: true,
      route: "trial-reminder-emails",
      now: now.toISOString(),
      scanned: profiles.length,
      counts: {
        day7: day7.length,
        day11: day11.length,
        day14: day14.length,
      },
      debug: {
        day7: bucketJson(day7),
        day11: bucketJson(day11),
        day14: bucketJson(day14),
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
