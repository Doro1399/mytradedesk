"use client";

import { useMemo, type ReactNode } from "react";

import { JournalProvider } from "@/components/journal/journal-provider";
import { createDemoJournalData } from "@/lib/journal/demo-journal-seed";

export default function DeskOnboardingLayout({ children }: { children: ReactNode }) {
  const seed = useMemo(() => createDemoJournalData(), []);

  return <JournalProvider ephemeralSeed={seed}>{children}</JournalProvider>;
}
