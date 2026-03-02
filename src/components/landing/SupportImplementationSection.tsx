"use client";

import {
  Database,
  Shield,
  FileCheck,
  Headphones,
  Sparkles,
} from "lucide-react";

const items = [
  {
    icon: Database,
    title: "Migración de Datos",
    description:
      "Soporte personalizado para migrar sus datos con seguridad. Priorizamos la integridad y confidencialidad de la información de su óptica.",
  },
  {
    icon: Shield,
    title: "Integraciones",
    description:
      "SII y FONASA disponibles como implementaciones extras. Conecte su óptica con los sistemas que requiere su operación.",
  },
  {
    icon: FileCheck,
    title: "Libro Digital de Recetas",
    description:
      "Registro cronológico de recetas despachadas, requerido por ley (Código Sanitario Chile). Listo para fiscalización Seremi.",
  },
  {
    icon: Headphones,
    title: "Soporte Técnico Personalizado",
    description:
      "Acompañamiento técnico dedicado que va de la mano con la migración. Desde la implementación hasta el día a día.",
  },
];

export function SupportImplementationSection() {
  return (
    <section
      className="py-20 sm:py-32 bg-epoch-background relative overflow-hidden"
      id="soporte"
    >
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.03] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-16 md:mb-24 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-3 px-5 py-2 bg-epoch-primary/10 border border-epoch-primary/40 rounded-full text-epoch-primary text-[10px] sm:text-[11px] font-sans font-semibold tracking-[0.35em] uppercase mb-8">
            <Sparkles className="h-3 w-3" />
            <span>Implementación y soporte</span>
          </div>
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-sans font-bold text-epoch-primary tracking-tight mb-6">
            Lo acompañamos en cada paso
          </h2>
          <p className="text-lg md:text-xl text-epoch-primary/70 font-sans leading-relaxed">
            Migración segura, integraciones y soporte técnico personalizado para
            que su óptica opere con tranquilidad.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {items.map((item, index) => (
            <div
              key={index}
              className="group p-6 sm:p-8 rounded-xl border border-epoch-primary/5 bg-white hover:shadow-2xl hover:-translate-y-1 transition-all duration-500 flex flex-col"
            >
              <div className="mb-6 p-3 inline-block rounded-xl border border-epoch-primary/10 text-epoch-primary group-hover:bg-epoch-primary group-hover:text-white transition-all duration-500 w-fit">
                <item.icon className="h-6 w-6 stroke-1" />
              </div>
              <h3 className="font-sans font-bold text-lg text-epoch-primary tracking-tight mb-3">
                {item.title}
              </h3>
              <p className="text-sm text-epoch-primary/70 font-sans leading-relaxed flex-1">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
