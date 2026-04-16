import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard demo | MyTradeDesk",
  description: "Explore the workspace dashboard with sample prop firm accounts, fees, and payouts.",
};

export default function DemoLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
