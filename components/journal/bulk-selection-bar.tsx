"use client";

type Props = {
  count: number;
  /** Funded / live only — payout button hidden when 0 */
  payoutEligibleCount: number;
  onPassed: () => void;
  onBlown: () => void;
  onActive: () => void;
  onPayout: () => void;
  onDelete: () => void;
  onDismiss: () => void;
};

export function BulkSelectionBar({
  count,
  payoutEligibleCount,
  onPassed,
  onBlown,
  onActive,
  onPayout,
  onDelete,
  onDismiss,
}: Props) {
  if (count <= 0) return null;

  const chip =
    "inline-flex h-7 items-center rounded-full border px-2.5 py-0 text-[11px] font-semibold leading-none transition active:scale-[0.98]";

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/[0.08] bg-gradient-to-b from-zinc-900/90 to-zinc-950/95 px-4 py-2.5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05),0_12px_40px_rgba(0,0,0,0.35)]">
      <span className="font-mono text-[13px] tabular-nums text-white/90">
        {count} selected
      </span>
      <div className="flex flex-wrap items-center gap-1.5">
        <button type="button" onClick={onActive} className={`${chip} border-white/15 bg-white/[0.06] text-white/85 hover:bg-white/10`}>
          Active
        </button>
        <button type="button" onClick={onPassed} className={`${chip} border-emerald-500/35 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/18`}>
          Passed
        </button>
        <button type="button" onClick={onBlown} className={`${chip} border-red-500/40 bg-red-500/10 text-red-200 hover:bg-red-500/18`}>
          Blown
        </button>
        {payoutEligibleCount > 0 ? (
          <button
            type="button"
            onClick={onPayout}
            className={`${chip} border-amber-400/45 bg-gradient-to-b from-amber-500/35 to-amber-700/25 text-amber-50 shadow-[0_0_20px_rgba(245,158,11,0.15)] hover:from-amber-500/45 hover:to-amber-700/35`}
          >
            + Payout ({payoutEligibleCount})
          </button>
        ) : null}
        <button
          type="button"
          onClick={onDelete}
          className={`${chip} border-red-500/30 bg-transparent text-red-300 hover:bg-red-500/10`}
        >
          <span className="inline-flex items-center gap-1">
            <TrashIcon className="h-3.5 w-3.5" />
            Delete
          </span>
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="ml-0.5 flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-white/[0.06] hover:text-white"
          aria-label="Clear selection"
        >
          ×
        </button>
      </div>
    </div>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} stroke="currentColor" strokeWidth="1.3">
      <path d="M3 4h10M6 4V2.5h4V4M6 14h4l1-9H5l1 9Z" strokeLinejoin="round" />
    </svg>
  );
}
