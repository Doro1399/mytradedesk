import type { Metadata } from "next";
import Navbar from "@/components/navbar";

export const metadata: Metadata = {
  title: "Terms of service | MyTradeDesk",
  description: "Terms of service for MyTradeDesk.",
};

export default function TermsPage() {
  return (
    <main className="min-h-0 flex-1 bg-[#070a10] text-white">
      <Navbar />
      <div className="mx-auto max-w-2xl px-6 pb-16 pt-14 sm:pt-20">
        <h1 className="text-2xl font-semibold tracking-tight text-white">Terms of service</h1>
        <p className="mt-6 text-sm leading-relaxed text-white/50">
          This page is being prepared. For questions about using MyTradeDesk, contact the operator.
        </p>
      </div>
    </main>
  );
}
