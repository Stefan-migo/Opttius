"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";
import Image from "next/image";

export function CTASection() {
  const router = useRouter();

  const handleDemoClick = () => {
    router.push("/onboarding/choice");
  };

  return (
    <section className="py-24 px-4 md:px-8 bg-epoch-background">
      <div className="max-w-7xl mx-auto bg-epoch-primary rounded-arch overflow-hidden relative shadow-2xl">
        {/* Background Image Overlay */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/images/landing/Hero.webp"
            alt="Legacy Pattern"
            fill
            className="object-cover opacity-20 grayscale scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-epoch-primary via-epoch-primary/50 to-transparent"></div>
        </div>

        <div className="relative z-10 py-20 sm:py-32 px-4 sm:px-6 flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-4 px-6 py-2 border border-epoch-accent/30 rounded-full text-epoch-accent text-[10px] font-display tracking-[0.4em] uppercase mb-10">
            <Sparkles className="h-3 w-3" />
            <span>Prueba sin compromiso</span>
          </div>

          <h2 className="text-4xl md:text-6xl font-display font-bold text-white tracking-tight mb-8">
            PRUEBE OPTTIUS <br />
            <span className="text-epoch-accent italic font-serif lowercase tracking-normal">
              hoy
            </span>
          </h2>

          <p className="text-lg md:text-xl text-white/60 max-w-2xl mx-auto font-body italic mb-12">
            Únase a ópticas que ya gestionan recetas, presupuestos y laboratorio
            con precisión. Prueba gratuita. Sin tarjeta. Configuración guiada.
          </p>

          <div className="flex flex-col sm:flex-row gap-8 w-full justify-center items-center">
            <Button
              onClick={() => router.push("/signup")}
              size="lg"
              className="bg-epoch-accent hover:bg-white text-epoch-surface rounded-none h-16 px-16 text-xs font-display tracking-[0.3em] uppercase transition-all duration-500 w-full sm:w-auto shadow-2xl"
            >
              Comenzar prueba gratis
              <ArrowRight className="ml-3 h-4 w-4" />
            </Button>
            <button
              onClick={handleDemoClick}
              className="text-white/60 hover:text-white font-serif italic text-lg tracking-wide transition-all duration-300 border-b border-white/20 hover:border-white pb-1"
            >
              Ver demo en vivo
            </button>
          </div>

          <div className="mt-20 flex flex-wrap justify-center gap-12 text-[9px] uppercase font-display tracking-[0.3em] text-white/30">
            <span className="flex items-center gap-3">
              <div className="h-1 w-1 bg-epoch-accent rounded-full animate-pulse"></div>
              Sin Tarjeta
            </span>
            <span className="flex items-center gap-3">
              <div className="h-1 w-1 bg-epoch-accent rounded-full animate-pulse"></div>
              Configuración guiada
            </span>
            <span className="flex items-center gap-3">
              <div className="h-1 w-1 bg-epoch-accent rounded-full animate-pulse"></div>
              Soporte especializado
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
