"use client";

import { JournalDashboard } from "@/components/journal/journal-dashboard";
import { JournalWorkspaceShell } from "@/components/journal/journal-workspace-shell";

export default function JournalPage() {
  return (
    <JournalWorkspaceShell active="dashboard">
      <JournalDashboard />
    </JournalWorkspaceShell>
  );
}
