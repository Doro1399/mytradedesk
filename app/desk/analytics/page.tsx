"use client";

import { JournalWorkspaceShell } from "@/components/journal/journal-workspace-shell";

export default function JournalAnalyticsPage() {
  return (
    <JournalWorkspaceShell active="analytics">
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-6 py-20">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-sky-400/85">Analytics</p>
        <p className="mt-4 text-2xl font-semibold tracking-tight text-white">Coming Soon</p>
      </div>
    </JournalWorkspaceShell>
  );
}
