import { LandingDifferentiationSection } from "@/components/landing/differentiation-section";
import { LandingFinalCtaSection } from "@/components/landing/final-cta-section";
import { LandingHeroSection } from "@/components/landing/hero-section";
import { LandingFooter } from "@/components/landing/landing-footer";
import { LandingProductPillarsSection } from "@/components/landing/product-pillars-section";
import { LandingShowcaseSection } from "@/components/landing/showcase-section";

export default function Home() {
  return (
    <main className="min-h-screen w-full bg-[#050608] text-white antialiased selection:bg-sky-500/30 selection:text-white">
      <LandingHeroSection />
      <LandingProductPillarsSection />
      <LandingShowcaseSection />
      <LandingDifferentiationSection />
      <LandingFinalCtaSection />
      <LandingFooter />
    </main>
  );
}
