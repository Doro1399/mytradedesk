import type { SupabaseClient } from "@supabase/supabase-js";
import type { WorkspaceBackupPayloadV1 } from "@/lib/journal/workspace-backup-payload";

export const WORKSPACE_SNAPSHOT_DAILY_BACKUPS_TABLE = "workspace_snapshot_daily_backups" as const;

/** UTC calendar day `YYYY-MM-DD` (matches Postgres `date` in UTC-oriented workflows). */
export function workspaceBackupUtcCalendarDay(isoFromClient: Date = new Date()): string {
  return isoFromClient.toISOString().slice(0, 10);
}

/**
 * Upserts today’s automatic backup for the signed-in user.
 * Safe to call after every successful `workspace_snapshots` push: one row per day, last write wins.
 */
export async function upsertDailyWorkspaceBackup(
  supabase: SupabaseClient,
  userId: string,
  payload: WorkspaceBackupPayloadV1
): Promise<void> {
  const backup_day = workspaceBackupUtcCalendarDay();
  const { error } = await supabase.from(WORKSPACE_SNAPSHOT_DAILY_BACKUPS_TABLE).upsert(
    {
      user_id: userId,
      backup_day,
      payload,
    },
    { onConflict: "user_id,backup_day" }
  );
  if (error) throw error;
}
