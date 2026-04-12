"use client";

import { JournalCalendarPage } from "@/components/journal/journal-calendar-page";
import { JournalWorkspaceShell } from "@/components/journal/journal-workspace-shell";

export default function JournalCalendarRoutePage() {
  return (
    <JournalWorkspaceShell active="calendar">
      <JournalCalendarPage />
    </JournalWorkspaceShell>
  );
}
