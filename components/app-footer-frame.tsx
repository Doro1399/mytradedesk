"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/** Journal renders its own compact footer inside the workspace column (see {@link JournalWorkspaceShell}). */
export function AppFooterFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "";
  const isJournal = pathname === "/journal" || pathname.startsWith("/journal/");
  if (isJournal) return null;
  return children;
}
