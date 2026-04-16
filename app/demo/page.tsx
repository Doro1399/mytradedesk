"use client";

import { useMemo } from "react";
import { DemoModeBanner } from "@/components/demo/demo-mode-banner";
import { JournalDashboard } from "@/components/journal/journal-dashboard";
import { JournalProvider } from "@/components/journal/journal-provider";
import { createDemoJournalData } from "@/lib/journal/demo-journal-seed";

export default function DemoPage() {
  const seed = useMemo(() => createDemoJournalData(), []);

  return (
    <JournalProvider ephemeralSeed={seed}>
      {/* Natural document scroll: avoid nested flex overflow traps (often block wheel/trackpad). */}
      <div className="bg-black text-white">
        <DemoModeBanner />
        <div className="relative">
          <div className="pointer-events-none absolute inset-x-0 top-0 min-h-full">
            <div className="absolute left-16 top-10 h-56 w-56 rounded-full bg-blue-700/15 blur-3xl" />
            <div className="absolute right-10 top-40 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl" />
          </div>
          <div className="relative z-[1] w-full">
            <JournalDashboard presentation="demo" />
          </div>
        </div>
      </div>
    </JournalProvider>
  );
}
