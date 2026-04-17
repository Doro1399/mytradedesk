"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/** TradeDesk renders its own compact footer inside the main column (see {@link JournalWorkspaceShell}). */
export function AppFooterFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "";
  const isJournal = pathname === "/desk" || pathname.startsWith("/desk/");
  if (isJournal) return null;
  return <div className="w-full shrink-0">{children}</div>;
}
