"use client";

import { useCallback, useMemo, useState } from "react";
import { useJournal } from "@/components/journal/journal-provider";
import type { JournalAccount } from "@/lib/journal/types";

const CARD =
  "rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.07] to-white/[0.02] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-sm";

/**
 * Blocks the desk until the user picks exactly two editable accounts (Lite overflow after trial).
 */
export function LiteAccountSelectionModal() {
  const { state, needsLiteAccountSelection, confirmLiteAccountSelection, hydrated } = useJournal();
  const [a, setA] = useState<string | null>(null);
  const [b, setB] = useState<string | null>(null);

  const accounts = useMemo(() => Object.values(state.accounts) as JournalAccount[], [state.accounts]);

  const toggle = useCallback(
    (id: string) => {
      if (a === id) {
        setA(null);
        return;
      }
      if (b === id) {
        setB(null);
        return;
      }
      if (!a) {
        setA(id);
        return;
      }
      if (!b) {
        setB(id);
        return;
      }
      setB(id);
    },
    [a, b]
  );

  const canConfirm = a && b && a !== b;

  const onConfirm = useCallback(() => {
    if (!a || !b || a === b) return;
    confirmLiteAccountSelection([a, b]);
  }, [a, b, confirmLiteAccountSelection]);

  if (!hydrated || !needsLiteAccountSelection) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="lite-selection-title"
    >
      <div className={`${CARD} max-h-[min(90dvh,40rem)] w-full max-w-lg overflow-hidden border-violet-400/25`}>
        <div className="border-b border-white/10 bg-black/40 px-5 py-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-violet-300/90">Lite plan</p>
          <h2 id="lite-selection-title" className="mt-1 text-lg font-semibold text-white">
            Choose 2 accounts to keep editable
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-white/55">
            Your plan allows two active trading accounts. Pick exactly two — you can still view the others, but only
            delete them (no edits, imports, or payouts on the rest). This choice cannot be changed later.
          </p>
        </div>
        <ul className="max-h-[min(50dvh,22rem)] space-y-2 overflow-y-auto px-3 py-4">
          {accounts.map((acc) => {
            const selected = acc.id === a || acc.id === b;
            return (
              <li key={acc.id}>
                <button
                  type="button"
                  onClick={() => toggle(acc.id)}
                  className={`flex w-full items-center justify-between rounded-xl border px-3 py-3 text-left text-sm transition ${
                    selected
                      ? "border-sky-400/45 bg-sky-500/15 text-sky-50"
                      : "border-white/10 bg-white/[0.03] text-white/85 hover:border-white/18"
                  }`}
                >
                  <span className="font-medium">{acc.propFirm.name}</span>
                  <span className="text-xs text-white/45">{acc.sizeLabel}</span>
                </button>
              </li>
            );
          })}
        </ul>
        <div className="border-t border-white/10 bg-black/35 px-5 py-4">
          <button
            type="button"
            disabled={!canConfirm}
            onClick={onConfirm}
            className="w-full rounded-xl border border-sky-400/45 bg-gradient-to-b from-sky-500/30 to-sky-950/40 px-4 py-3 text-sm font-semibold text-sky-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] transition hover:border-sky-300/55 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/[0.04] disabled:text-white/35"
          >
            Confirm selection
          </button>
        </div>
      </div>
    </div>
  );
}
