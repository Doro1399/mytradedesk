"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { JournalWorkspaceShell } from "@/components/journal/journal-workspace-shell";

/** Legacy URL: `/desk/sandbox` → Settings (Integrations block under Datas). */
export default function DeskSandboxRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/desk/settings#desk-sandbox");
  }, [router]);

  return (
    <JournalWorkspaceShell active="settings">
      <div className="flex min-h-[30vh] flex-1 items-center justify-center px-4 text-sm text-white/50">
        Redirecting to Settings…
      </div>
    </JournalWorkspaceShell>
  );
}
