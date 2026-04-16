"use client";

import Link from "next/link";
import { useMemo } from "react";
import { AccountOverviewContent } from "@/components/journal/account-overview-content";
import {
  resolveAccountDisplayName,
  useAutoAccountLabelById,
} from "@/components/journal/account-auto-labels";
import { JournalWorkspaceShell } from "@/components/journal/journal-workspace-shell";
import { useJournal } from "@/components/journal/journal-provider";

export function JournalAccountDetailClient({ accountId }: { accountId: string }) {
  const { state, dispatch, hydrated } = useJournal();
  const accounts = useMemo(() => Object.values(state.accounts), [state.accounts]);
  const autoAccountLabelById = useAutoAccountLabelById(accounts);
  const account = accountId ? state.accounts[accountId] : undefined;
  const resolvedName = account
    ? resolveAccountDisplayName(account, autoAccountLabelById)
    : "";

  if (!hydrated) {
    return (
      <JournalWorkspaceShell active="accounts">
        <div className="relative z-[1] px-6 py-10 text-sm text-white/55">Loading…</div>
      </JournalWorkspaceShell>
    );
  }

  if (!account) {
    return (
      <JournalWorkspaceShell active="accounts">
        <div className="relative z-[1] mx-auto max-w-lg px-6 py-20 text-center">
          <p className="text-lg font-medium text-white/90">Account not found</p>
          <Link
            href="/journal/accounts"
            className="mt-5 inline-block text-sm font-medium text-sky-400/90 hover:text-sky-300"
          >
            ← Back to Accounts
          </Link>
        </div>
      </JournalWorkspaceShell>
    );
  }

  return (
    <JournalWorkspaceShell active="accounts">
      <header className="relative z-10 border-b border-white/10 bg-black/55 px-[clamp(16px,2.2vw,34px)] py-3 backdrop-blur-xl">
        <div className="flex items-center justify-between gap-4">
          <p className="text-xs uppercase tracking-[0.2em] text-white/40">Workspace</p>
          <div className="flex items-center gap-3">
            <Link
              href="/compare"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl border border-white/14 bg-gradient-to-b from-white/[0.08] to-white/[0.02] px-4 py-2.5 text-sm font-semibold text-white/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition hover:border-sky-400/35 hover:from-sky-500/15 hover:to-sky-950/25"
            >
              Start a new challenge
            </Link>
          </div>
        </div>
      </header>
      <AccountOverviewContent
        account={account}
        state={state}
        resolvedName={resolvedName}
        dispatch={dispatch}
      />
    </JournalWorkspaceShell>
  );
}
