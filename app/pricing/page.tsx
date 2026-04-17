import type { Metadata } from "next";

import Navbar from "@/components/navbar";
import { PricingPageClient } from "@/components/landing/pricing-section";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Built for serious prop traders — Lite, Premium monthly ($24.99/mo), and yearly ($19.99/mo billed annually) for MyTradeDesk.",
};

export default function PricingPage() {
  return (
    <main className="relative isolate flex min-h-0 w-full max-w-[100vw] flex-1 flex-col overflow-hidden bg-[#070a10] text-white antialiased selection:bg-cyan-500/30 selection:text-white">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute inset-0 bg-[#070a10]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_100%_50%_at_50%_-10%,rgba(255,255,255,0.04),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_100%,rgba(0,0,0,0.22),transparent_50%)]" />
        <div className="absolute inset-0 opacity-[0.045] [background-image:radial-gradient(rgba(255,255,255,0.07)_1px,transparent_1px)] [background-size:32px_32px]" />
      </div>

      <Navbar variant="landing" />
      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <PricingPageClient />
      </div>
    </main>
  );
}
