/**
 * Last integrated cloud revision for this user.
 * Stored value is either epoch ms (`"1713456789012"`) or a legacy ISO string from
 * `workspace_snapshots.updated_at`.
 */
const KEY_PREFIX = "prop-control-center:workspace-snapshot-server-at:v1:user:";

export function workspaceSnapshotServerWatermarkKey(userId: string): string {
  return `${KEY_PREFIX}${userId}`;
}

export function readWorkspaceSnapshotServerWatermark(userId: string): string | null {
  if (typeof window === "undefined" || !userId) return null;
  try {
    const v = window.localStorage.getItem(workspaceSnapshotServerWatermarkKey(userId));
    return typeof v === "string" && v.length > 0 ? v : null;
  } catch {
    return null;
  }
}

export function writeWorkspaceSnapshotServerWatermark(userId: string, value: string): void {
  if (typeof window === "undefined" || !userId) return;
  try {
    window.localStorage.setItem(workspaceSnapshotServerWatermarkKey(userId), value);
  } catch {
    /* ignore quota / private mode */
  }
}

/** Parse stored watermark: epoch ms (all digits, length ≥ 12) or ISO date. */
export function parseWorkspaceSnapshotServerWatermarkMs(userId: string): number {
  const raw = readWorkspaceSnapshotServerWatermark(userId);
  if (raw == null || raw === "") return 0;
  if (/^\d+$/.test(raw) && raw.length >= 12) return Number(raw);
  return Date.parse(raw) || 0;
}
