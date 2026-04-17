"use client";

import { ChoosePlanModal } from "@/components/landing/choose-plan-modal";
import { JournalDashboard } from "@/components/journal/journal-dashboard";
import { JournalWorkspaceShell } from "@/components/journal/journal-workspace-shell";

export default function DeskOnboardingPage() {
  return (
    <JournalWorkspaceShell active="dashboard">
      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <JournalDashboard presentation="demo" />
        <ChoosePlanModal />
      </div>
    </JournalWorkspaceShell>
  );
}
