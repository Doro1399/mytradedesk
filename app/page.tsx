import { LandingDifferentiationSection } from "@/components/landing/differentiation-section";
import { LandingFinalCtaSection } from "@/components/landing/final-cta-section";
import { LandingHeroSection } from "@/components/landing/hero-section";
import { LandingProductPillarsSection } from "@/components/landing/product-pillars-section";
import Navbar from "@/components/navbar";

export default function Home() {
  return (
    <main className="relative isolate flex min-h-screen w-full max-w-[100vw] flex-col bg-[#070a10] text-white antialiased selection:bg-cyan-500/30 selection:text-white">
      {/* Uniform dark base + one veil + light noise (premium, non-competing with content) */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute inset-0 bg-[#070a10]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_100%_50%_at_50%_-10%,rgba(255,255,255,0.04),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_100%,rgba(0,0,0,0.22),transparent_50%)]" />
        <div className="absolute inset-0 opacity-[0.045] [background-image:radial-gradient(rgba(255,255,255,0.07)_1px,transparent_1px)] [background-size:32px_32px]" />
      </div>

      {/* Navbar outside overflow-x wrapper so `position: sticky` stays pinned (overflow:hidden on an ancestor breaks sticky). */}
      <Navbar variant="landing" />
      <div className="relative min-w-0 flex-1 overflow-x-hidden">
        <LandingHeroSection />
        <LandingDifferentiationSection />
        <LandingProductPillarsSection />
        <LandingFinalCtaSection />
      </div>
    </main>
  );
}
