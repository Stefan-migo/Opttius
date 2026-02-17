"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";
import Image from "next/image";
import businessConfig from "@/config/business";

export function HeroSection() {
  const router = useRouter();

  const handleDemoClick = () => {
    router.push("/onboarding/choice");
  };

  const handleSignUpClick = () => {
    router.push("/signup");
  };

  return (
    <section className="relative min-h-[110vh] flex items-center justify-center overflow-hidden bg-epoch-surface">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 z-0 scale-105 animate-pulse-slow">
        <Image
          src="/images/landing/hero-epoch.png"
          alt="Vintage Optics Background"
          fill
          className="object-cover opacity-40 mix-blend-luminosity grayscale"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-epoch-primary/90 via-epoch-primary/60 to-epoch-surface"></div>
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
      </div>

      <div className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-48 text-center">
        <div className="space-y-12 max-w-4xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-4 px-6 py-2 border border-epoch-accent/30 rounded-full text-epoch-accent text-[10px] font-display tracking-[0.4em] uppercase animate-in fade-in slide-in-from-bottom-4 duration-1000">
            <Sparkles className="h-3 w-3" />
            <span>Excelencia en Gestión Óptica</span>
          </div>

          {/* Main Title */}
          <div className="space-y-4">
            <h1 className="text-6xl md:text-8xl lg:text-9xl font-display font-bold text-white leading-none tracking-tight animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
              FORJANDO LA
              <br />
              <span className="text-epoch-accent italic font-serif lowercase tracking-normal">
                visión
              </span>
            </h1>
            <p className="font-serif italic text-xl md:text-2xl text-white/50 tracking-widest uppercase mt-4 animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-400">
              Software de Legado para la Óptica Moderna
            </p>
          </div>

          <p className="text-lg md:text-xl text-white/70 max-w-2xl mx-auto font-body leading-relaxed animate-in fade-in slide-in-from-bottom-16 duration-1000 delay-600">
            Transforme la gestión de su óptica con una herramienta que fusiona
            la precisión técnica con la elegancia de una era dorada. Diseñado
            para quienes valoran el detalle.
          </p>

          <div className="flex flex-col sm:flex-row gap-8 justify-center items-center animate-in fade-in slide-in-from-bottom-20 duration-1000 delay-800">
            <Button
              onClick={handleSignUpClick}
              size="lg"
              className="bg-epoch-accent hover:bg-white text-epoch-surface rounded-none h-16 px-16 text-xs font-display tracking-[0.3em] uppercase transition-all duration-500 shadow-2xl"
            >
              Empezar Legado
              <ArrowRight className="ml-3 h-4 w-4" />
            </Button>
            <button
              onClick={handleDemoClick}
              className="text-white/60 hover:text-white font-serif italic text-lg tracking-wide transition-all duration-300 border-b border-white/20 hover:border-white pb-1"
            >
              Solicitar Audiencia Demo
            </button>
          </div>
        </div>
      </div>

      {/* Aesthetic Arches */}
      <div className="absolute bottom-0 left-0 right-0 h-40 bg-epoch-background rounded-arch z-10"></div>
    </section>
  );
}
