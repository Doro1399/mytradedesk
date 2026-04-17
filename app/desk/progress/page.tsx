"use client";

import { JournalProgressView } from "@/components/journal/journal-progress-view";
import { JournalWorkspaceShell } from "@/components/journal/journal-workspace-shell";

export default function JournalProgressPage() {
  return (
    <JournalWorkspaceShell active="progress">
      <JournalProgressView />
    </JournalWorkspaceShell>
  );
}
