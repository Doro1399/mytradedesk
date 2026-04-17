import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Compare prop firms",
  description:
    "Side-by-side comparison of prop trading firms: programs, drawdowns, fees, and funded rules to pick your next evaluation.",
};

export default function CompareLayout({ children }: { children: ReactNode }) {
  return children;
}
