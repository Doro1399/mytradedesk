import { LandingDifferentiationSection } from "@/components/landing/differentiation-section";
import { LandingFinalCtaSection } from "@/components/landing/final-cta-section";
import { LandingHeroSection } from "@/components/landing/hero-section";
import { LandingFooter } from "@/components/landing/landing-footer";
import { LandingProductPillarsSection } from "@/components/landing/product-pillars-section";
import Navbar from "@/components/navbar";

export default function Home() {
  return (
    <main className="relative isolate min-h-screen w-full bg-[#030508] text-white antialiased selection:bg-cyan-500/35 selection:text-white">
      {/* Layered atmosphere — low contrast, no loud gradients */}
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden"
        aria-hidden
      >
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a1020] via-[#05070f] to-[#020308]" />
        <div className="absolute -left-[22%] top-[-12%] h-[min(72vh,680px)] w-[min(92vw,920px)] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(34,211,238,0.085),transparent_72%)] opacity-90" />
        <div className="absolute -right-[28%] top-[18%] h-[min(58vh,540px)] w-[min(88vw,760px)] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(56,189,248,0.055),transparent_70%)]" />
        <div className="absolute bottom-0 left-1/2 h-[42vh] w-[130%] max-w-[1400px] -translate-x-1/2 bg-[radial-gradient(ellipse_at_50%_100%,rgba(0,0,0,0.5),transparent_58%)]" />
        <div className="absolute inset-0 opacity-[0.12] [background-image:radial-gradient(rgba(255,255,255,0.1)_1px,transparent_1px)] [background-size:24px_24px]" />
      </div>

      <div className="relative">
        <Navbar variant="landing" />
        <LandingHeroSection />
        <LandingDifferentiationSection />
        <LandingProductPillarsSection />
        <LandingFinalCtaSection />
        <LandingFooter />
      </div>
    </main>
  );
}
