import type { Metadata } from "next";
import Navbar from "@/components/navbar";

export const metadata: Metadata = {
  title: "Privacy | MyTradeDesk",
  description: "Privacy policy for MyTradeDesk.",
};

export default function PrivacyPage() {
  return (
    <main className="min-h-0 flex-1 bg-[#070a10] text-white">
      <Navbar />
      <div className="mx-auto max-w-2xl px-6 pb-16 pt-14 sm:pt-20">
        <h1 className="text-2xl font-semibold tracking-tight text-white">Privacy</h1>
        <p className="mt-6 text-sm leading-relaxed text-white/50">
          This page is being prepared. For privacy-related questions, contact the operator.
        </p>
      </div>
    </main>
  );
}
