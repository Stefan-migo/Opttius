"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";
import Image from "next/image";

export function HeroSection() {
  const router = useRouter();

  const handleDemoClick = () => {
    router.push("/onboarding/choice");
  };

  const handleSignUpClick = () => {
    router.push("/signup");
  };

  return (
    <section className="relative min-h-screen md:min-h-[110vh] flex items-center justify-center overflow-hidden bg-epoch-surface">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 z-0 scale-105 animate-pulse-slow">
        <Image
          src="/images/landing/Hero.webp"
          alt="Vintage Optics Background"
          fill
          className="object-cover opacity-40 mix-blend-luminosity grayscale"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-epoch-primary/90 via-epoch-primary/60 to-epoch-surface"></div>
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
      </div>

      <div className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 sm:pt-32 pb-28 sm:pb-48 md:pb-72 text-center">
        <div className="space-y-12 sm:space-y-20 max-w-4xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 sm:gap-3 px-4 sm:px-5 py-2 bg-epoch-accent/20 border border-epoch-accent/80 rounded-full text-epoch-accent text-[10px] sm:text-[11px] font-sans font-semibold tracking-[0.35em] uppercase animate-in fade-in slide-in-from-bottom-4 duration-1000 shadow-lg shadow-black/20">
            <Sparkles className="h-3.5 w-3.5 flex-shrink-0" />
            <span>De la clínica al código. 100% nativo para ópticas.</span>
          </div>

          {/* Main Title */}
          <div className="space-y-4 sm:space-y-6">
            <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-sans font-bold text-white leading-tight tracking-tight animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
              El motor inteligente para las ópticas modernas.
            </h1>
            <p className="font-sans text-base sm:text-xl md:text-2xl text-white/70 mt-4 animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-400">
              Desde el examen visual hasta la entrega del lente. Centraliza tus
              recetas, inventario, flujos de laboratorio y ventas en una única
              plataforma.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 sm:gap-8 justify-center items-center animate-in fade-in slide-in-from-bottom-20 duration-1000 delay-600">
            <Button
              onClick={handleSignUpClick}
              size="lg"
              className="bg-epoch-accent hover:bg-white text-epoch-surface rounded-xl h-16 px-16 text-xs font-sans font-semibold tracking-[0.2em] uppercase transition-all duration-500 shadow-2xl"
            >
              Probar Gratis
              <ArrowRight className="ml-3 h-4 w-4" />
            </Button>
            <button
              onClick={handleDemoClick}
              className="text-white/60 hover:text-white font-sans text-lg tracking-wide transition-all duration-300 border-b border-white/20 hover:border-white pb-1"
            >
              Ver demo en vivo
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
