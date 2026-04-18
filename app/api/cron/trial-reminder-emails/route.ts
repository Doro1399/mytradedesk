import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

import { getTrialDayNumber, isTrialActive } from "@/lib/auth/plan";
import type { UserProfileRow } from "@/lib/auth/profile";
import { sendEmail } from "@/lib/email/send-email";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const DAY_MS = 86_400_000;

/** `getTrialDayNumber` values for J+7 / J+11 / J+14 (day 1 = trial start). */
type TrialDayBucket = 8 | 12 | 15;

type EmailSlot = "day7" | "day11" | "day14";

type BucketRow = {
  id: string;
  email: string | null;
  trialDay: TrialDayBucket;
  trial_day_7_sent: boolean;
  trial_day_11_sent: boolean;
  trial_day_14_sent: boolean;
};

function pushMatch(
  map: Map<TrialDayBucket, BucketRow[]>,
  day: TrialDayBucket,
  row: BucketRow
): void {
  const list = map.get(day) ?? [];
  list.push(row);
  map.set(day, list);
}

function slotAlreadySent(row: BucketRow, slot: EmailSlot): boolean {
  if (slot === "day7") return row.trial_day_7_sent === true;
  if (slot === "day11") return row.trial_day_11_sent === true;
  return row.trial_day_14_sent === true;
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
  if (slot === "day7") {
    q = q.or("trial_day_7_sent.is.null,trial_day_7_sent.eq.false");
  } else if (slot === "day11") {
    q = q.or("trial_day_11_sent.is.null,trial_day_11_sent.eq.false");
  } else {
    q = q.or("trial_day_14_sent.is.null,trial_day_14_sent.eq.false");
  }

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

type TrySendOutcome =
  | { kind: "sent" }
  | { kind: "skipped_already_sent" }
  | { kind: "skipped_invalid_email" }
  | { kind: "skipped_claim_failed" }
  | { kind: "send_failed"; message: string };

async function trySendTrialSlotEmail(
  admin: SupabaseClient,
  row: BucketRow,
  slot: EmailSlot
): Promise<TrySendOutcome> {
  if (slotAlreadySent(row, slot)) return { kind: "skipped_already_sent" };

  const to = row.email?.trim();
  if (!to?.includes("@")) return { kind: "skipped_invalid_email" };

  const claimed = await claimTrialFlag(admin, row.id, slot);
  if (!claimed) return { kind: "skipped_claim_failed" };

  try {
    const { subject, html } = trialEmailContent(slot);
    await sendEmail({ to, subject, html });
    return { kind: "sent" };
  } catch (e) {
    await revertTrialFlag(admin, row.id, slot);
    const message = e instanceof Error ? e.message : String(e);
    return { kind: "send_failed", message };
  }
}

async function loadTrialingProfilesForReminders(
  admin: SupabaseClient,
  now: Date
): Promise<{ profiles: UserProfileRow[]; byDay: Map<TrialDayBucket, BucketRow[]> } | { error: string }> {
  const oldestStart = new Date(now.getTime() - 7 * DAY_MS).toISOString();

  const { data: rows, error } = await admin
    .from("profiles")
    .select("*")
    .eq("premium_status", "trialing")
    .not("trial_started_at", "is", null)
    .lte("trial_started_at", oldestStart);

  if (error) return { error: error.message };

  const profiles = (rows ?? []) as UserProfileRow[];
  const byDay = new Map<TrialDayBucket, BucketRow[]>();

  for (const p of profiles) {
    if (!isTrialActive(p, now)) continue;
    const n = getTrialDayNumber(p, now);
    if (n !== 8 && n !== 12 && n !== 15) continue;

    pushMatch(byDay, n, {
      id: p.id,
      email: p.email ?? null,
      trialDay: n,
      trial_day_7_sent: p.trial_day_7_sent === true,
      trial_day_11_sent: p.trial_day_11_sent === true,
      trial_day_14_sent: p.trial_day_14_sent === true,
    });
  }

  return { profiles, byDay };
}

export async function GET() {
  const now = new Date();

  try {
    const admin = createAdminSupabaseClient();
    const loaded = await loadTrialingProfilesForReminders(admin, now);
    if ("error" in loaded) {
      return NextResponse.json({ ok: false, error: loaded.error }, { status: 500 });
    }

    const { profiles, byDay } = loaded;
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

    const runSlot = async (rows: BucketRow[], slot: EmailSlot) => {
      for (const row of rows) {
        const outcome = await trySendTrialSlotEmail(admin, row, slot);
        if (outcome.kind === "sent") {
          emailsSent[slot]++;
          if (slot === "day7") row.trial_day_7_sent = true;
          else if (slot === "day11") row.trial_day_11_sent = true;
          else row.trial_day_14_sent = true;
        } else if (outcome.kind === "skipped_already_sent") {
          skipped.alreadySent++;
          skipped.total++;
        } else if (outcome.kind === "skipped_invalid_email") {
          skipped.invalidEmail++;
          skipped.total++;
        } else if (outcome.kind === "skipped_claim_failed") {
          skipped.claimFailed++;
          skipped.total++;
        } else {
          errors.push(
            `${row.id} (${slot}): send failed after claim (flag reverted): ${outcome.message}`,
          );
        }
      }
    };

    await runSlot(day7, "day7");
    await runSlot(day11, "day11");
    await runSlot(day14, "day14");

    return NextResponse.json({
      ok: true,
      route: "trial-reminder-emails",
      now: now.toISOString(),
      scanned: profiles.length,
      countsInBucket: {
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
