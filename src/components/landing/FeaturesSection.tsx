"use client";

import {
  Users,
  ShoppingCart,
  Building2,
  MessageSquare,
  BarChart3,
  Calendar,
  FileText,
  Package,
  Sparkles,
  ArrowUpRight,
} from "lucide-react";
import Image from "next/image";

const features = [
  {
    icon: Users,
    title: "Gestión de Pacientes IA",
    description:
      "Historiales inteligentes con análisis predictivo de graduación y recetas digitales completas.",
    className: "lg:col-span-2 lg:row-span-2 bg-epoch-primary text-white",
  },
  {
    icon: ShoppingCart,
    title: "POS de Nueva Generación",
    description: "Venta rápida e intuitiva con integración de inventario.",
    className: "lg:col-span-2 bg-white",
  },
  {
    icon: Building2,
    title: "Multi-Sucursal",
    description: "Gestiona tu imperio óptico 24/7.",
    className: "lg:col-span-1 bg-epoch-accent/10",
  },
  {
    icon: MessageSquare,
    title: "Asistente AI",
    description: "Atención automatizada que agenda citas.",
    className: "lg:col-span-1 bg-white",
  },
  {
    icon: BarChart3,
    title: "Inteligencia de Negocio",
    description: "Reportes ejecutivos que revelan su rentabilidad real.",
    className: "lg:col-span-2 bg-epoch-surface text-white",
  },
  {
    icon: Calendar,
    title: "Agenda",
    description: "Recordatorios vía WhatsApp.",
    className: "lg:col-span-1 bg-white",
  },
  {
    icon: FileText,
    title: "Laboratorio",
    description: "Seguimiento de órdenes en tiempo real.",
    className: "lg:col-span-1 bg-epoch-accent/10",
  },
  {
    icon: Package,
    title: "Inventario Infinito",
    description:
      "Control de stock con IA predictiva para reposición artesanal.",
    className: "lg:col-span-2 bg-white",
  },
];

export function FeaturesSection() {
  return (
    <section
      className="py-32 bg-epoch-background relative"
      id="caracteristicas"
    >
      {/* Texture Overlay */}
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.03] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-24 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-4 px-6 py-2 border border-epoch-primary/10 rounded-full text-epoch-primary/60 text-[10px] font-display tracking-[0.4em] uppercase mb-8">
            <Sparkles className="h-3 w-3" />
            <span>Maestría Digital</span>
          </div>
          <h2 className="text-5xl md:text-7xl font-display font-bold text-epoch-primary tracking-tight mb-8">
            capacidades
            <br />
            <span className="text-epoch-accent italic font-serif lowercase tracking-normal">
              REFINADAS
            </span>
          </h2>
          <div className="w-24 h-[1px] bg-epoch-accent mx-auto mb-8"></div>
          <p className="text-xl text-epoch-primary/70 font-serif italic tracking-wide">
            Herramientas diseñadas con la precisión de un artesano y la potencia
            de la inteligencia moderna.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 auto-rows-[180px]">
          {features.map((feature, index) => (
            <div
              key={index}
              className={`group relative overflow-hidden p-8 border border-epoch-primary/5 transition-all duration-700 flex flex-col justify-between hover:shadow-2xl hover:-translate-y-1 ${feature.className}`}
            >
              <div className="relative z-10">
                <div
                  className={`mb-6 p-3 inline-block rounded-none border ${
                    feature.className.includes("text-white")
                      ? "border-white/20 text-epoch-accent"
                      : "border-epoch-primary/10 text-epoch-primary group-hover:bg-epoch-primary group-hover:text-white"
                  } transition-all duration-500`}
                >
                  <feature.icon className="h-6 w-6 stroke-1" />
                </div>

                <h3
                  className={`text-lg font-display font-bold tracking-widest uppercase mb-3 ${
                    feature.className.includes("text-white")
                      ? "text-white"
                      : "text-epoch-primary"
                  }`}
                >
                  {feature.title}
                </h3>

                <p
                  className={`text-xs leading-relaxed font-body italic ${
                    feature.className.includes("text-white")
                      ? "text-white/60"
                      : "text-epoch-primary/60"
                  }`}
                >
                  {feature.description}
                </p>
              </div>

              <div className="relative z-10 flex justify-between items-end">
                <span
                  className={`font-display text-4xl opacity-10 ${
                    feature.className.includes("text-white")
                      ? "text-white"
                      : "text-epoch-primary"
                  }`}
                >
                  {(index + 1).toString().padStart(2, "0")}
                </span>
                <ArrowUpRight
                  className={`h-4 w-4 opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-2 group-hover:translate-y-0 ${
                    feature.className.includes("text-white")
                      ? "text-epoch-accent"
                      : "text-epoch-primary"
                  }`}
                />
              </div>

              {/* Decorative hover effect */}
              <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
                <div className="w-12 h-12 border-t border-r border-epoch-accent/30"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
