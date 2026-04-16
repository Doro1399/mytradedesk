import type { Metadata } from "next";
import { JournalProvider } from "@/components/journal/journal-provider";

export const metadata: Metadata = {
  title: "Workspace | MyTradeDesk",
  description:
    "Suivi des comptes prop, PnL, frais et payouts — données locales pour l’instant.",
};

export default function JournalLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <JournalProvider>
      {/* h-dvh: nested scroll (main overflow-y-auto) needs a definite height; flex-1+h-full alone breaks when the root layout no longer wraps children in a full-height flex item. */}
      <div className="flex h-dvh max-h-dvh w-full flex-col overflow-hidden">{children}</div>
    </JournalProvider>
  );
}
