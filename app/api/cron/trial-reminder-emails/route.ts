import { NextResponse } from "next/server";

import { processTrialReminderEmailSweep } from "@/lib/email/trial-reminder-emails";

export const dynamic = "force-dynamic";

/**
 * Trial reminder emails (days 7, 11, 14). Secured with `CRON_SECRET`.
 *
 * Env: `CRON_SECRET`, `RESEND_API_KEY`, `RESEND_FROM`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
 *
 * Example: `curl -X POST -H "Authorization: Bearer $CRON_SECRET" https://…/api/cron/trial-reminder-emails`
 */
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  const auth = request.headers.get("authorization")?.trim();
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await processTrialReminderEmailSweep();
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Sweep failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
