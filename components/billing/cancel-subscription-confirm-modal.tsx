"use client";

import { useEffect } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  /** Formatted billing-period end, e.g. from `formatPremiumExpires`. */
  periodEndLabel: string | null;
  onConfirm: () => void;
  busy: boolean;
  error: string | null;
};

export function CancelSubscriptionConfirmModal({
  open,
  onClose,
  periodEndLabel,
  onConfirm,
  busy,
  error,
}: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, busy, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center overflow-y-auto overflow-x-hidden p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cancel-subscription-title"
    >
      <button
        type="button"
        className="fixed inset-0 bg-black/70 backdrop-blur-sm"
        aria-label="Close"
        onClick={() => {
          if (!busy) onClose();
        }}
      />
      <div className="relative z-[1] my-auto w-full max-w-md overflow-hidden rounded-xl border border-white/12 bg-[#0d1117] shadow-[0_24px_80px_rgba(0,0,0,0.65),inset_0_1px_0_rgba(255,255,255,0.06)]">
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-white/10 px-5 py-4">
          <div className="min-w-0">
            <h2 id="cancel-subscription-title" className="text-lg font-semibold tracking-tight text-white">
              Cancel subscription?
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-white/50">
              {periodEndLabel ? (
                <>
                  You keep <span className="text-white/70">Premium</span> until{" "}
                  <span className="font-medium text-sky-200/90">{periodEndLabel}</span>. After that, your workspace
                  moves to <span className="text-white/70">Lite</span>.
                </>
              ) : (
                <>
                  You keep <span className="text-white/70">Premium</span> until the end of the billing period already
                  paid. Then your workspace moves to <span className="text-white/70">Lite</span>.
                </>
              )}{" "}
              There is no refund for the current cycle.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              if (!busy) onClose();
            }}
            className="shrink-0 rounded-lg p-1.5 text-white/40 transition hover:bg-white/[0.06] hover:text-white/80 disabled:opacity-40"
            aria-label="Close"
            disabled={busy}
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {error ? (
          <div className="mx-5 mt-4 rounded-xl border border-rose-500/25 bg-rose-500/10 px-3 py-2 text-sm text-rose-100/90">
            {error}
          </div>
        ) : null}

        <div className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-white/10 bg-[#0d1117] px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-xl border border-white/14 bg-white/[0.04] px-4 py-2 text-sm font-medium text-white/80 transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Keep subscription
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="rounded-xl border border-rose-500/45 bg-gradient-to-b from-rose-500/30 to-rose-950/40 px-4 py-2 text-sm font-semibold text-rose-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_8px_28px_rgba(0,0,0,0.35)] ring-1 ring-rose-500/20 transition enabled:hover:from-rose-400/35 enabled:hover:to-rose-900/45 enabled:hover:border-rose-400/50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? "Processing…" : "Cancel renewal"}
          </button>
        </div>
      </div>
    </div>
  );
}
