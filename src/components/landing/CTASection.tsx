"use client";

import { ArrowRight, Sparkles } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

export function CTASection() {
  const router = useRouter();

  const handleExploreClick = () => {
    const element = document.querySelector("#caracteristicas");
    if (element) element.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="py-24 px-4 md:px-8 bg-epoch-background">
      <div className="max-w-7xl mx-auto bg-epoch-primary rounded-2xl overflow-hidden relative shadow-2xl">
        {/* Background Image Overlay */}
        <div className="absolute inset-0 z-0">
          <Image
            fill
            alt="Legacy Pattern"
            className="object-cover opacity-20 grayscale scale-110"
            src="/images/landing/Hero.webp"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-epoch-primary via-epoch-primary/50 to-transparent" />
        </div>

        <div className="relative z-10 py-20 sm:py-32 px-4 sm:px-6 flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-3 px-5 py-2 bg-epoch-accent/20 border border-epoch-accent/80 rounded-full text-epoch-accent text-[10px] sm:text-[11px] font-sans font-semibold tracking-[0.35em] uppercase mb-10 shadow-lg shadow-black/20">
            <Sparkles className="h-3 w-3" />
            <span>Prueba sin compromiso</span>
          </div>

          <h2 className="text-4xl md:text-6xl font-sans font-bold text-white tracking-tight mb-8">
            PRUEBE OPTTIUS hoy
          </h2>

          <p className="text-lg md:text-xl text-white/60 max-w-2xl mx-auto font-sans mb-12">
            Únase a ópticas que ya gestionan recetas, presupuestos y laboratorio
            con precisión. Prueba gratuita. Sin tarjeta. Configuración guiada.
          </p>

          <div className="flex flex-col sm:flex-row gap-8 w-full justify-center items-center">
            <Button
              className="bg-epoch-accent hover:bg-white text-epoch-surface rounded-xl h-16 px-16 text-xs font-sans font-semibold tracking-[0.2em] uppercase transition-all duration-500 w-full sm:w-auto shadow-2xl"
              size="lg"
              onClick={() => router.push("/solicitar-demo")}
            >
              Solicitar Demo
              <ArrowRight className="ml-3 h-4 w-4" />
            </Button>
            <button
              className="text-white/60 hover:text-white font-sans text-lg tracking-wide transition-all duration-300 border-b border-white/20 hover:border-white pb-1"
              onClick={handleExploreClick}
            >
              Explorar la plataforma
            </button>
          </div>

          <div className="mt-20 flex flex-wrap justify-center gap-12 text-[9px] uppercase font-display tracking-[0.3em] text-white/30">
            <span className="flex items-center gap-3">
              <div className="h-1 w-1 bg-epoch-accent rounded-full animate-pulse" />
              Sin Tarjeta
            </span>
            <span className="flex items-center gap-3">
              <div className="h-1 w-1 bg-epoch-accent rounded-full animate-pulse" />
              Configuración guiada
            </span>
            <span className="flex items-center gap-3">
              <div className="h-1 w-1 bg-epoch-accent rounded-full animate-pulse" />
              Soporte especializado
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
