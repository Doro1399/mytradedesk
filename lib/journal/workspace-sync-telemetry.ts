/**
 * Logs temporaires pour tracer la synchro desk / snapshot Supabase.
 * Active avec `NEXT_PUBLIC_WORKSPACE_SYNC_LOG=1` (tous environnements) ou automatiquement en `development`.
 */
const PREFIX = "[MyTradeDesk workspace sync]";

function enabled(): boolean {
  if (process.env.NODE_ENV === "development") return true;
  return process.env.NEXT_PUBLIC_WORKSPACE_SYNC_LOG === "1";
}

export function workspaceSyncLogLoaded(
  source: "supabase" | "localStorage" | "client_memory" | "merged",
  detail?: Record<string, unknown>
): void {
  if (!enabled()) return;
  console.info(PREFIX, "data loaded", source, detail ?? {});
}

export function workspaceSyncLogSaved(to: "supabase" | "localStorage", detail?: Record<string, unknown>): void {
  if (!enabled()) return;
  console.info(PREFIX, "data saved", to, detail ?? {});
}

export function workspaceSyncLogLocalOverwritePrevented(reason: string, detail?: Record<string, unknown>): void {
  if (!enabled()) return;
  console.warn(PREFIX, "local overwrite prevented", reason, detail ?? {});
}

export function workspaceSyncLogSaveFailed(to: "supabase", error: unknown, detail?: Record<string, unknown>): void {
  if (!enabled()) return;
  console.error(PREFIX, "save failed", to, error, detail ?? {});
}
