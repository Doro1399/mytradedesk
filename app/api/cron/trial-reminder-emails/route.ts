import { NextResponse } from "next/server";

import { getTrialDayNumber, getTrialRemainingDays, isTrialActive } from "@/lib/auth/plan";
import type { UserProfileRow } from "@/lib/auth/profile";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const DAY_MS = 86_400_000;
const DEBUG_ITEMS_CAP = 50;

type TrialDayBucket = 7 | 11 | 14;

type DetectedBucket = "day7" | "day11" | "day14" | "none";

type DebugRow = {
  id: string;
  email: string | null;
  trialDay: TrialDayBucket;
  trial_day_7_sent: boolean;
  trial_day_11_sent: boolean;
  trial_day_14_sent: boolean;
};

type ScannedProfileDebug = {
  id: string;
  email: string | null;
  trial_started_at: string | null;
  trial_ends_at: string | null;
  days_since_trial_start: number | null;
  days_until_trial_end: number;
  premium_status: string;
  plan: string;
  trial_day_7_sent: boolean;
  trial_day_11_sent: boolean;
  trial_day_14_sent: boolean;
  is_trial_active: boolean;
  trial_day_number: number;
  bucket: DetectedBucket;
};

function detectedBucketFromTrialDay(n: number): DetectedBucket {
  if (n === 7) return "day7";
  if (n === 11) return "day11";
  if (n === 14) return "day14";
  return "none";
}

function pushMatch(
  map: Map<TrialDayBucket, DebugRow[]>,
  day: TrialDayBucket,
  row: DebugRow
): void {
  const list = map.get(day) ?? [];
  list.push(row);
  map.set(day, list);
}

function buildScannedProfileDebug(p: UserProfileRow, now: Date): ScannedProfileDebug {
  const trialDayNumber = getTrialDayNumber(p, now);
  const trialActive = isTrialActive(p, now);

  let days_since_trial_start: number | null = null;
  if (p.trial_started_at) {
    const start = new Date(p.trial_started_at);
    const diffMs = now.getTime() - start.getTime();
    days_since_trial_start = Math.max(0, Math.floor(diffMs / DAY_MS));
  }

  return {
    id: p.id,
    email: p.email ?? null,
    trial_started_at: p.trial_started_at,
    trial_ends_at: p.trial_ends_at,
    days_since_trial_start,
    days_until_trial_end: getTrialRemainingDays(p, now),
    premium_status: p.premium_status,
    plan: p.plan,
    trial_day_7_sent: Boolean(p.trial_day_7_sent),
    trial_day_11_sent: Boolean(p.trial_day_11_sent),
    trial_day_14_sent: Boolean(p.trial_day_14_sent),
    is_trial_active: trialActive,
    trial_day_number: trialDayNumber,
    bucket: detectedBucketFromTrialDay(trialDayNumber),
  };
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

    const scannedProfileDetails: ScannedProfileDebug[] = profiles.map((p) =>
      buildScannedProfileDebug(p, now),
    );

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
      scannedProfileDetails,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
