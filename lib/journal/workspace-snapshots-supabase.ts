import type { SupabaseClient } from "@supabase/supabase-js";
import type { WorkspaceBackupPayloadV1 } from "@/lib/journal/workspace-backup-payload";
import { workspaceSyncLogLoaded, workspaceSyncLogSaveFailed, workspaceSyncLogSaved } from "@/lib/journal/workspace-sync-telemetry";

export const WORKSPACE_SNAPSHOTS_TABLE = "workspace_snapshots" as const;

/** PostgREST often returns one row as an array; unwrap for `.select().maybeSingle()` / `.single()`. */
function firstDataRow<T extends Record<string, unknown>>(data: unknown): T | null {
  if (data == null) return null;
  if (Array.isArray(data)) {
    const row = data[0];
    return row && typeof row === "object" ? (row as T) : null;
  }
  if (typeof data === "object") return data as T;
  return null;
}

/**
 * RLS `select` on `workspace_snapshots` needs a user JWT. On a cold load the
 * browser client can briefly have no session until cookies are read — wait a bit.
 */
export async function waitForSupabaseAccessToken(
  supabase: SupabaseClient,
  opts?: { timeoutMs?: number; intervalMs?: number }
): Promise<boolean> {
  const timeoutMs = opts?.timeoutMs ?? 8000;
  const intervalMs = opts?.intervalMs ?? 120;
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const { data } = await supabase.auth.getSession();
    if (data.session?.access_token) {
      await supabase.auth.getUser().catch(() => {});
      return true;
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return false;
}

/**
 * One row per `user_id`: insert first time, then update `payload` (+ `updated_at` via trigger).
 */
/** Returns server `updated_at` after write (for local sync watermark). */
export async function upsertWorkspaceSnapshot(
  supabase: SupabaseClient,
  userId: string,
  payload: WorkspaceBackupPayloadV1
): Promise<string | null> {
  const { data, error } = await supabase
    .from(WORKSPACE_SNAPSHOTS_TABLE)
    .upsert(
      {
        user_id: userId,
        payload,
      },
      { onConflict: "user_id" }
    )
    .select("updated_at")
    .maybeSingle();

  if (error) {
    workspaceSyncLogSaveFailed("supabase", error, { userId });
    throw error;
  }
  const row = firstDataRow<{ updated_at?: unknown }>(data);
  const updated_at = row && typeof row.updated_at === "string" ? row.updated_at : null;
  workspaceSyncLogSaved("supabase", { userId, updated_at });
  return updated_at;
}

export type WorkspaceSnapshotRow = {
  updated_at: string;
  /** Full `mytradedesk-workspace-backup` object as stored in JSONB. */
  payload: unknown;
};

function normalizeSnapshotPayload(payload: unknown): unknown {
  if (payload == null) return null;
  if (typeof payload === "object") return payload;
  if (typeof payload === "string") {
    try {
      return JSON.parse(payload) as unknown;
    } catch {
      return null;
    }
  }
  return null;
}

/** Read current cloud row for the signed-in user (RLS). Retries briefly (cold session / race). */
export async function fetchWorkspaceSnapshotRow(
  supabase: SupabaseClient
): Promise<WorkspaceSnapshotRow | null> {
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) {
      await new Promise((r) => setTimeout(r, 450));
      await supabase.auth.refreshSession().catch(() => {});
    }

    const { data, error } = await supabase
      .from(WORKSPACE_SNAPSHOTS_TABLE)
      .select("payload, updated_at")
      .maybeSingle();

    if (error) throw error;

    const row = firstDataRow<{ updated_at?: unknown; payload?: unknown }>(data);
    if (!row) continue;

    const updated_at = row.updated_at;
    if (typeof updated_at !== "string") continue;

    const payload = normalizeSnapshotPayload(row.payload);
    if (payload != null && typeof payload === "object") {
      workspaceSyncLogLoaded("supabase", { updated_at, attempt: attempt + 1 });
      return { updated_at, payload };
    }
  }

  return null;
}
