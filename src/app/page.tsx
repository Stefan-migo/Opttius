"use client";

import { BenefitsSection } from "@/components/landing/BenefitsSection";
import { CTASection } from "@/components/landing/CTASection";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { HeroSection } from "@/components/landing/HeroSection";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { PricingSection } from "@/components/landing/PricingSection";
import { ProblemSolutionSection } from "@/components/landing/ProblemSolutionSection";
import { SupportImplementationSection } from "@/components/landing/SupportImplementationSection";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <LandingHeader />
      <main>
        <section id="inicio">
          <HeroSection />
        </section>
        <ProblemSolutionSection />
        <section id="caracteristicas">
          <FeaturesSection />
        </section>
        <section id="beneficios">
          <BenefitsSection />
        </section>
        <SupportImplementationSection />
        <PricingSection />
        <CTASection />
      </main>
      <LandingFooter />
    </div>
  );
}
