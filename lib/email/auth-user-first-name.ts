import type { SupabaseClient } from "@supabase/supabase-js";

/** First word of `full_name` or `name` from `auth.users` metadata (service-role client). */
export async function firstNameFromAuthUserId(
  admin: SupabaseClient,
  userId: string,
): Promise<string | null> {
  const { data, error } = await admin.auth.admin.getUserById(userId);
  if (error || !data?.user) return null;
  const meta = data.user.user_metadata as { full_name?: unknown; name?: unknown };
  const raw =
    typeof meta?.full_name === "string" && meta.full_name.trim()
      ? meta.full_name.trim()
      : typeof meta?.name === "string" && meta.name.trim()
        ? meta.name.trim()
        : "";
  if (!raw) return null;
  return raw.split(/\s+/)[0]?.trim() || null;
}
