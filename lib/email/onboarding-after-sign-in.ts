import { sendOnboardingEmail } from "@/lib/email/send-email";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

/**
 * Sends onboarding email once per user (atomic claim on `profiles.onboarding_email_sent`).
 * Safe to call on every auth callback; no-ops if already sent or env admin client missing.
 */
export async function sendOnboardingEmailIfNeeded(
  userId: string,
  emailFromAuth: string,
  displayName?: string | null,
): Promise<void> {
  const to = emailFromAuth.trim();
  if (!to.includes("@")) return;

  let admin: ReturnType<typeof createAdminSupabaseClient>;
  try {
    admin = createAdminSupabaseClient();
  } catch {
    console.warn("[onboarding] skipped: missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    return;
  }

  const { data, error } = await admin
    .from("profiles")
    .update({ onboarding_email_sent: true })
    .eq("id", userId)
    .eq("onboarding_email_sent", false)
    .select("email")
    .maybeSingle();

  if (error) {
    console.error("[onboarding] profile claim failed", userId, error.message);
    return;
  }
  if (!data) {
    console.warn(
      "[onboarding] skip: no profile row updated (already sent, missing profile, or flag not false)",
      userId,
    );
    return;
  }

  const row = data as { email: string | null };
  const recipient = (row.email?.trim() && row.email.includes("@") ? row.email : to).trim();
  if (!recipient.includes("@")) {
    await admin.from("profiles").update({ onboarding_email_sent: false }).eq("id", userId);
    return;
  }

  try {
    await sendOnboardingEmail(recipient, displayName?.trim() || undefined);
  } catch (e) {
    await admin.from("profiles").update({ onboarding_email_sent: false }).eq("id", userId);
    console.error("[onboarding] send failed", userId, e);
  }
}
