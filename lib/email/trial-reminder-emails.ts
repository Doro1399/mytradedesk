import type { SupabaseClient } from "@supabase/supabase-js";

import { getTrialDayNumber, isTrialActive } from "@/lib/auth/plan";
import type { UserProfileRow } from "@/lib/auth/profile";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

import { sendEmail } from "./send-email";

const DAY_MS = 86_400_000;

export const TRIAL_REMINDER_DAYS = [7, 11, 14] as const;
export type TrialReminderDay = (typeof TRIAL_REMINDER_DAYS)[number];

export type TrialReminderSweepResult = {
  scanned: number;
  sent: Record<TrialReminderDay, number>;
  errors: string[];
};

function reminderFlagForDay(day: TrialReminderDay): keyof Pick<
  UserProfileRow,
  "trial_day_7_sent" | "trial_day_11_sent" | "trial_day_14_sent"
> {
  if (day === 7) return "trial_day_7_sent";
  if (day === 11) return "trial_day_11_sent";
  return "trial_day_14_sent";
}

function trialReminderSubject(day: TrialReminderDay): string {
  if (day === 7) return "Your MyTradeDesk trial — one week in";
  if (day === 11) return "Your MyTradeDesk trial — a few days left";
  return "Your MyTradeDesk trial is ending soon";
}

function trialReminderHtml(day: TrialReminderDay): string {
  const line =
    day === 7
      ? "You are one week into your MyTradeDesk Premium trial."
      : day === 11
        ? "Your Premium trial ends in a few days — make the most of MyTradeDesk while you still have full access."
        : "Your Premium trial ends soon. Upgrade anytime to keep unlimited workspace access.";

  return `<!DOCTYPE html>
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
}

async function claimTrialReminderFlag(
  admin: SupabaseClient,
  userId: string,
  day: TrialReminderDay,
): Promise<boolean> {
  const patch =
    day === 7
      ? { trial_day_7_sent: true }
      : day === 11
        ? { trial_day_11_sent: true }
        : { trial_day_14_sent: true };

  let q = admin
    .from("profiles")
    .update(patch)
    .eq("id", userId)
    .eq("premium_status", "trialing");
  if (day === 7) q = q.eq("trial_day_7_sent", false);
  else if (day === 11) q = q.eq("trial_day_11_sent", false);
  else q = q.eq("trial_day_14_sent", false);

  const { data, error } = await q.select("id").maybeSingle();
  if (error) return false;
  return !!data;
}

async function revertTrialReminderFlag(
  admin: SupabaseClient,
  userId: string,
  day: TrialReminderDay,
): Promise<void> {
  const patch =
    day === 7
      ? { trial_day_7_sent: false }
      : day === 11
        ? { trial_day_11_sent: false }
        : { trial_day_14_sent: false };
  await admin.from("profiles").update(patch).eq("id", userId);
}

/**
 * Sends at most one email per reminder day per user, using DB flags + atomic claim so
 * concurrent cron runs cannot duplicate sends.
 */
export async function sendTrialReminderEmailIfDue(
  admin: SupabaseClient,
  profile: UserProfileRow,
  day: TrialReminderDay,
  now: Date = new Date(),
): Promise<"sent" | "skipped" | "failed"> {
  if (!isTrialActive(profile, now)) return "skipped";
  if (getTrialDayNumber(profile, now) !== day) return "skipped";

  const flag = reminderFlagForDay(day);
  if (profile[flag]) return "skipped";

  const to = profile.email?.trim();
  if (!to?.includes("@")) return "skipped";

  const claimed = await claimTrialReminderFlag(admin, profile.id, day);
  if (!claimed) return "skipped";

  try {
    await sendEmail({
      to,
      subject: trialReminderSubject(day),
      html: trialReminderHtml(day),
    });
    return "sent";
  } catch {
    await revertTrialReminderFlag(admin, profile.id, day);
    return "failed";
  }
}

/**
 * Processes all profiles that might still need a trial reminder (service role).
 * Schedule via `POST /api/cron/trial-reminder-emails` with `Authorization: Bearer $CRON_SECRET`.
 */
export async function processTrialReminderEmailSweep(
  now: Date = new Date(),
): Promise<TrialReminderSweepResult> {
  const admin = createAdminSupabaseClient();
  const oldestStart = new Date(now.getTime() - 6 * DAY_MS).toISOString();

  const { data: rows, error } = await admin
    .from("profiles")
    .select("*")
    .eq("premium_status", "trialing")
    .not("trial_started_at", "is", null)
    .lte("trial_started_at", oldestStart)
    .or("trial_day_7_sent.eq.false,trial_day_11_sent.eq.false,trial_day_14_sent.eq.false");

  const sent: TrialReminderSweepResult["sent"] = { 7: 0, 11: 0, 14: 0 };
  const errors: string[] = [];

  if (error) {
    errors.push(error.message);
    return { scanned: 0, sent, errors };
  }

  const profiles = (rows ?? []) as UserProfileRow[];

  for (const profile of profiles) {
    for (const day of TRIAL_REMINDER_DAYS) {
      const flag = reminderFlagForDay(day);
      if (profile[flag]) continue;

      const outcome = await sendTrialReminderEmailIfDue(admin, profile, day, now);
      if (outcome === "sent") {
        sent[day] += 1;
        profile[flag] = true;
      } else if (outcome === "failed") {
        errors.push(`${profile.id}: day ${day} send failed`);
      }
    }
  }

  return {
    scanned: profiles.length,
    sent,
    errors,
  };
}
