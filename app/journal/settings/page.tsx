"use client";

import { JournalSettingsView } from "@/components/journal/journal-settings-view";
import { JournalWorkspaceShell } from "@/components/journal/journal-workspace-shell";

export default function JournalSettingsPage() {
  return (
    <JournalWorkspaceShell active="settings">
      <JournalSettingsView />
    </JournalWorkspaceShell>
  );
}
