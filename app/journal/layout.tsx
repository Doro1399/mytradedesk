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
      <div className="flex h-full min-h-0 flex-1 flex-col">{children}</div>
    </JournalProvider>
  );
}
