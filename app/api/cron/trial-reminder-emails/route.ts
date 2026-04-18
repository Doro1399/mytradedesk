import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

import { getTrialDayNumber, getTrialRemainingDays, isTrialActive } from "@/lib/auth/plan";
import type { UserProfileRow } from "@/lib/auth/profile";
import { sendEmail } from "@/lib/email/send-email";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const DAY_MS = 86_400_000;
const DEBUG_ITEMS_CAP = 50;

/** `getTrialDayNumber` values that map to J+7 / J+11 / J+14 email slots (day 1 = trial start). */
type TrialDayBucket = 8 | 12 | 15;

type DetectedBucket = "day7" | "day11" | "day14" | "none";

/** Email slot / DB flag (trial_day_7_sent = J+7 reminder, etc.). */
type EmailSlot = "day7" | "day11" | "day14";

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
  if (n === 8) return "day7";
  if (n === 12) return "day11";
  if (n === 15) return "day14";
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

function slotAlreadySent(row: DebugRow, slot: EmailSlot): boolean {
  if (slot === "day7") return row.trial_day_7_sent;
  if (slot === "day11") return row.trial_day_11_sent;
  return row.trial_day_14_sent;
}

function trialEmailContent(slot: EmailSlot): { subject: string; html: string } {
  const line =
    slot === "day7"
      ? "You are one week into your MyTradeDesk Premium trial."
      : slot === "day11"
        ? "Your Premium trial ends in a few days — make the most of MyTradeDesk while you still have full access."
        : "Your Premium trial ends soon. Upgrade anytime to keep unlimited workspace access.";

  const subject =
    slot === "day7"
      ? "Your MyTradeDesk trial — one week in"
      : slot === "day11"
        ? "Your MyTradeDesk trial — a few days left"
        : "Your MyTradeDesk trial is ending soon";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f4f4f5;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:480px;background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.06);">
          <tr>
            <td style="padding:40px 32px;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:16px;line-height:1.6;color:#18181b;">
              <p style="margin:0 0 16px;font-size:18px;font-weight:600;color:#18181b;">MyTradeDesk</p>
              <p style="margin:0;color:#3f3f46;">${line}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, html };
}

async function claimTrialFlag(
  admin: SupabaseClient,
  userId: string,
  slot: EmailSlot
): Promise<boolean> {
  const patch =
    slot === "day7"
      ? { trial_day_7_sent: true }
      : slot === "day11"
        ? { trial_day_11_sent: true }
        : { trial_day_14_sent: true };

  let q = admin.from("profiles").update(patch).eq("id", userId).eq("premium_status", "trialing");
  if (slot === "day7") q = q.eq("trial_day_7_sent", false);
  else if (slot === "day11") q = q.eq("trial_day_11_sent", false);
  else q = q.eq("trial_day_14_sent", false);

  const { data, error } = await q.select("id").maybeSingle();
  if (error) return false;
  return !!data;
}

async function revertTrialFlag(admin: SupabaseClient, userId: string, slot: EmailSlot): Promise<void> {
  const patch =
    slot === "day7"
      ? { trial_day_7_sent: false }
      : slot === "day11"
        ? { trial_day_11_sent: false }
        : { trial_day_14_sent: false };
  await admin.from("profiles").update(patch).eq("id", userId);
}

async function trySendTrialSlotEmail(
  admin: SupabaseClient,
  row: DebugRow,
  slot: EmailSlot
): Promise<
  "sent" | "skipped_already_sent" | "skipped_invalid_email" | "skipped_claim_failed" | "send_failed"
> {
  if (slotAlreadySent(row, slot)) return "skipped_already_sent";

  const to = row.email?.trim();
  if (!to?.includes("@")) return "skipped_invalid_email";

  const claimed = await claimTrialFlag(admin, row.id, slot);
  if (!claimed) return "skipped_claim_failed";

  try {
    const { subject, html } = trialEmailContent(slot);
    await sendEmail({ to, subject, html });
    return "sent";
  } catch {
    await revertTrialFlag(admin, row.id, slot);
    return "send_failed";
  }
}

type DetectionResult = {
  profiles: UserProfileRow[];
  byDay: Map<TrialDayBucket, DebugRow[]>;
  scannedProfileDetails: ScannedProfileDebug[];
};

async function loadProfilesAndDetect(
  admin: SupabaseClient,
  now: Date
): Promise<DetectionResult | { error: string }> {
  const oldestStart = new Date(now.getTime() - 7 * DAY_MS).toISOString();

  const { data: rows, error } = await admin
    .from("profiles")
    .select("*")
    .eq("premium_status", "trialing")
    .not("trial_started_at", "is", null)
    .lte("trial_started_at", oldestStart);

  if (error) return { error: error.message };

  const profiles = (rows ?? []) as UserProfileRow[];
  const byDay = new Map<TrialDayBucket, DebugRow[]>();
  const scannedProfileDetails = profiles.map((p) => buildScannedProfileDebug(p, now));

  for (const p of profiles) {
    if (!isTrialActive(p, now)) continue;
    const n = getTrialDayNumber(p, now);
    if (n !== 8 && n !== 12 && n !== 15) continue;

    pushMatch(byDay, n, {
      id: p.id,
      email: p.email ?? null,
      trialDay: n,
      trial_day_7_sent: Boolean(p.trial_day_7_sent),
      trial_day_11_sent: Boolean(p.trial_day_11_sent),
      trial_day_14_sent: Boolean(p.trial_day_14_sent),
    });
  }

  return { profiles, byDay, scannedProfileDetails };
}

export async function GET() {
  const now = new Date();

  try {
    const admin = createAdminSupabaseClient();
    const result = await loadProfilesAndDetect(admin, now);
    if ("error" in result) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 500 });
    }

    const { byDay, scannedProfileDetails, profiles } = result;
    const day7 = byDay.get(8) ?? [];
    const day11 = byDay.get(12) ?? [];
    const day14 = byDay.get(15) ?? [];

    const bucketJson = (list: DebugRow[]) => ({
      count: list.length,
      sample: list.slice(0, DEBUG_ITEMS_CAP),
      sampleTruncated: list.length > DEBUG_ITEMS_CAP,
    });

    return NextResponse.json({
      ok: true,
      route: "trial-reminder-emails",
      mode: "detect",
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

export async function POST() {
  const now = new Date();

  try {
    const admin = createAdminSupabaseClient();
    const result = await loadProfilesAndDetect(admin, now);
    if ("error" in result) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 500 });
    }

    const { byDay, profiles } = result;

    const day7 = byDay.get(8) ?? [];
    const day11 = byDay.get(12) ?? [];
    const day14 = byDay.get(15) ?? [];

    const emailsSent = { day7: 0, day11: 0, day14: 0 };
    const skipped = {
      total: 0,
      alreadySent: 0,
      invalidEmail: 0,
      claimFailed: 0,
    };
    const errors: string[] = [];

    const runSlot = async (rows: DebugRow[], slot: EmailSlot) => {
      for (const row of rows) {
        const outcome = await trySendTrialSlotEmail(admin, row, slot);
        if (outcome === "sent") {
          emailsSent[slot]++;
          if (slot === "day7") row.trial_day_7_sent = true;
          else if (slot === "day11") row.trial_day_11_sent = true;
          else row.trial_day_14_sent = true;
        } else if (outcome === "skipped_already_sent") {
          skipped.alreadySent++;
          skipped.total++;
        } else if (outcome === "skipped_invalid_email") {
          skipped.invalidEmail++;
          skipped.total++;
        } else if (outcome === "skipped_claim_failed") {
          skipped.claimFailed++;
          skipped.total++;
        } else {
          errors.push(`${row.id} (${slot}): Resend send failed after claim (flag reverted)`);
        }
      }
    };

    await runSlot(day7, "day7");
    await runSlot(day11, "day11");
    await runSlot(day14, "day14");

    return NextResponse.json({
      ok: true,
      route: "trial-reminder-emails",
      mode: "send",
      now: now.toISOString(),
      scanned: profiles.length,
      counts: {
        day7: day7.length,
        day11: day11.length,
        day14: day14.length,
      },
      emailsSent,
      emailsSkipped: skipped,
      errors,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
