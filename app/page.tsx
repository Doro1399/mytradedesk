import { LandingDifferentiationSection } from "@/components/landing/differentiation-section";
import { LandingFinalCtaSection } from "@/components/landing/final-cta-section";
import { LandingHeroSection } from "@/components/landing/hero-section";
import { LandingFooter } from "@/components/landing/landing-footer";
import { LandingProductPillarsSection } from "@/components/landing/product-pillars-section";

export default function Home() {
  return (
    <main className="relative min-h-screen w-full bg-gradient-to-b from-[#0a0f18] via-[#050608] to-[#020308] text-white antialiased selection:bg-sky-500/30 selection:text-white">
      <LandingHeroSection />
      <LandingProductPillarsSection />
      <LandingDifferentiationSection />
      <LandingFinalCtaSection />
      <LandingFooter />
    </main>
  );
}
