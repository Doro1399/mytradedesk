"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Compact modal used by Progress's "Sync now" buttons to re-prompt the
 * user for their Rithmic password when neither localStorage (Remember
 * password) nor sessionStorage cache has a usable value.
 *
 * The submitted password is forwarded back to the caller, which will both
 * trigger the sync AND cache it in sessionStorage for the rest of the tab
 * session (see `lib/dev/sandbox-rithmic-links.ts → triggerRithmicSync`).
 *
 * UX intent: keep the modal lightweight (no datalist of past passwords, no
 * connection editing) — Settings is still the source of truth for editing
 * a connection.
 */
export function ProgressRithmicSyncModal({
  open,
  connectionName,
  rithmicAccountName,
  username,
  busy,
  errorMessage,
  onClose,
  onSubmit,
}: {
  open: boolean;
  connectionName: string;
  rithmicAccountName: string;
  username: string;
  busy: boolean;
  errorMessage?: string | null;
  onClose: () => void;
  onSubmit: (password: string) => void;
}) {
  const [password, setPassword] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) {
      setPassword("");
      const t = setTimeout(() => inputRef.current?.focus(), 30);
      return () => clearTimeout(t);
    }
  }, [open]);

  if (!open) return null;

  const submit = () => {
    const trimmed = password.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 px-4 py-6 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Sync Rithmic — enter password"
        className="w-full max-w-md rounded-2xl border border-white/12 bg-slate-950/95 p-6 shadow-2xl shadow-black/50"
      >
        <div className="mb-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-sky-400/90">
            Rithmic · Sync now
          </p>
          <h2 className="mt-1.5 text-lg font-semibold tracking-tight text-white">
            Enter your password
          </h2>
          <p className="mt-1.5 text-[12px] leading-relaxed text-white/55">
            Re-syncing <span className="font-medium text-white/85">{rithmicAccountName}</span>
            {" "}via{" "}
            <span className="font-medium text-white/85">{connectionName}</span>. Your password is
            cached in this tab&apos;s session storage and forgotten when you close the tab.
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="space-y-3"
        >
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-white/55">
              Username
            </label>
            <p className="mt-1 truncate rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-[13px] text-white/65">
              {username}
            </p>
          </div>

          <div>
            <label
              htmlFor="progress-rithmic-password"
              className="block text-[11px] font-semibold uppercase tracking-wider text-white/55"
            >
              Password
            </label>
            <input
              id="progress-rithmic-password"
              ref={inputRef}
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={busy}
              className="mt-1 w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-[13px] text-white placeholder:text-white/30 focus:border-sky-400/60 focus:outline-none"
              placeholder="Rithmic password"
            />
          </div>

          {errorMessage ? (
            <p className="rounded-lg border border-red-400/25 bg-red-500/[0.08] px-3 py-2 text-[12px] leading-snug text-red-200/95">
              {errorMessage}
            </p>
          ) : null}

          <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="rounded-lg px-3 py-2 text-[12px] font-medium text-white/65 transition hover:bg-white/[0.06] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy || password.trim().length === 0}
              className="rounded-lg bg-sky-500/90 px-4 py-2 text-[12px] font-semibold text-slate-950 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? "Syncing…" : "Sync now"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
