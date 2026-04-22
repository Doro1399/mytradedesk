/**
 * Révision monotonique d’une ligne `workspace_snapshots` : alignée sur le push (watermark)
 * et sur le pull « serveur plus récent ? ».
 */
export function workspaceSnapshotRevisionMs(updatedAt: string, payloadUnknown: unknown): number {
  const fromRow = Date.parse(updatedAt) || 0;
  let fromExport = 0;
  if (typeof payloadUnknown === "object" && payloadUnknown !== null) {
    const ex = (payloadUnknown as { exportedAt?: unknown }).exportedAt;
    if (typeof ex === "string") fromExport = Date.parse(ex) || 0;
  }
  return Math.max(fromRow, fromExport);
}
