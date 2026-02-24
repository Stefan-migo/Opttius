"use client";

import { useState } from "react";
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

/* Bento grid: 4 cols. Row 1: [1: col-2 row-2][2: col-1][3: col-1]. Row 2: [1 cont.][4: col-1][5: col-1]. Row 3: [6: col-1][7: col-1][8: col-2] */
/* Cada tarjeta puede tener una imagen. Estilo: grayscale, opacity-10, hover: grayscale-0 opacity-20 */
const features = [
  {
    icon: Users,
    title: "Expediente Clínico Unificado",
    description:
      "Centraliza la salud visual y el historial comercial. Recetas, citas, presupuestos y órdenes de laboratorio sincronizados en una línea de tiempo perfecta.",
    className: "lg:col-span-2 lg:row-span-2 bg-epoch-primary text-white",
    image: "/images/landing/LamparaW.webp",
  },
  {
    icon: ShoppingCart,
    title: "POS (Punto de Venta)",
    subtitle: "Punto de Venta Clínico",
    description:
      "Facturación ágil integrada al historial del paciente. Descuentos de laboratorio, pagos mixtos y sincronización de stock en tiempo real.",
    className: "lg:col-span-1 bg-white",
    image: "/images/landing/pos.webp",
  },
  {
    icon: Building2,
    title: "Multi-Sucursal",
    subtitle: "Control Multi-Sede",
    description:
      "Gestione una o diez sucursales desde un solo panel. Inventarios compartidos, reportes consolidados y permisos por ubicación.",
    className: "lg:col-span-1 bg-epoch-accent/10",
    image: "/images/landing/multisucursal.webp",
  },
  {
    icon: MessageSquare,
    title: "Asistente AI (Agenda)",
    subtitle: "Recepción Automatizada",
    description:
      "Su asistente virtual trabaja 24/7. Responde consultas básicas, agenda citas y confirma asistencias automáticamente.",
    className: "lg:col-span-1 bg-white",
    image: "/images/landing/asistente.webp",
  },
  {
    icon: BarChart3,
    title: "Inteligencia de Negocio",
    subtitle: "Analítica Comercial",
    description:
      "Tome decisiones con datos reales. Visualice márgenes de ganancia, productos estrella y rendimiento por vendedor al instante.",
    className: "lg:col-span-1 bg-epoch-surface text-white",
    image: "/images/landing/analytics.webp",
  },
  {
    icon: Calendar,
    title: "Agenda (Comunicación)",
    subtitle: "Agenda Inteligente",
    description:
      "Reduzca el ausentismo con recordatorios automáticos por WhatsApp. Confirmaciones directas y reprogramación sin fricción.",
    className: "lg:col-span-1 bg-white",
    image: "/images/landing/agenda.webp",
  },
  {
    icon: FileText,
    title: "Laboratorio",
    subtitle: "Trazabilidad de Órdenes",
    description:
      "Adiós a las llamadas al laboratorio. Monitoree el estado de cada trabajo (tallado, biselado, entrega) paso a paso en el sistema.",
    className: "lg:col-span-1 bg-epoch-accent/10",
    image: "/images/landing/laboratorio.webp",
  },
  {
    icon: Package,
    title: "Inventario",
    subtitle: "Inventario Inteligente",
    description:
      "Control de armazones, lentes y accesorios con alertas de stock bajo. Movimientos, ajustes y valoración de inventario al día.",
    className: "lg:col-span-2 bg-white",
    image: "/images/landing/mesaW.webp",
  },
];

function FeatureCard({
  feature,
  index,
}: {
  feature: (typeof features)[number];
  index: number;
}) {
  const [imageError, setImageError] = useState(false);
  const showImage = feature.image && !imageError;

  return (
    <div
      className={`group relative overflow-hidden rounded-xl p-6 sm:p-8 border border-epoch-primary/5 transition-all duration-700 flex flex-col justify-between hover:shadow-2xl hover:-translate-y-1 ${feature.className}`}
    >
      {showImage && (
        <div className="absolute inset-0 z-0">
          <Image
            src={feature.image!}
            alt={feature.title}
            fill
            className="object-cover opacity-10 grayscale group-hover:grayscale-0 group-hover:opacity-20 transition-all duration-700"
            onError={() => setImageError(true)}
          />
          <div
            className={`absolute inset-0 bg-gradient-to-t ${
              feature.className.includes("bg-epoch-primary")
                ? "from-epoch-primary via-epoch-primary/40"
                : "from-white via-white/40"
            } to-transparent`}
          />
        </div>
      )}

      <div className="relative z-10">
        <div
          className={`mb-6 p-3 inline-block rounded-xl border ${
            feature.className.includes("text-white")
              ? "border-white/20 text-epoch-accent"
              : "border-epoch-primary/10 text-epoch-primary group-hover:bg-epoch-primary group-hover:text-white"
          } transition-all duration-500`}
        >
          <feature.icon className="h-6 w-6 stroke-1" />
        </div>

        <h3
          className={`text-lg font-display font-bold tracking-widest uppercase mb-1 ${
            feature.className.includes("text-white")
              ? "text-white"
              : "text-epoch-primary"
          }`}
        >
          {feature.title}
        </h3>
        {"subtitle" in feature && feature.subtitle ? (
          <p
            className={`text-[10px] font-display font-medium tracking-wider uppercase mb-3 ${
              feature.className.includes("text-white")
                ? "text-white/60"
                : "text-epoch-primary/60"
            }`}
          >
            {feature.subtitle}
          </p>
        ) : (
          <div className="mb-3" />
        )}

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

      <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
        <div className="w-12 h-12 border-t border-r border-epoch-accent/30"></div>
      </div>
    </div>
  );
}

export function FeaturesSection() {
  return (
    <section
      className="py-20 sm:py-32 bg-epoch-background relative"
      id="caracteristicas"
    >
      {/* Texture Overlay */}
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.03] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-24 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-3 px-5 py-2 bg-epoch-primary/10 border border-epoch-primary/40 rounded-full text-epoch-primary text-[10px] sm:text-[11px] font-sans font-semibold tracking-[0.35em] uppercase mb-8">
            <Sparkles className="h-3 w-3" />
            <span>Diseñado por quien conoce su óptica</span>
          </div>
          <h2 className="text-4xl sm:text-5xl md:text-7xl font-display font-bold text-epoch-primary tracking-tight mb-8">
            herramientas que
            <br />
            <span className="text-epoch-accent italic font-serif lowercase tracking-normal">
              resuelven
            </span>
          </h2>
          <div className="w-24 h-[1px] bg-epoch-accent mx-auto mb-8"></div>
          <p className="text-xl text-epoch-primary/70 font-serif italic tracking-wide">
            Cada módulo fue pensado para el flujo real de una óptica: desde la
            receta hasta la entrega.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 auto-rows-[minmax(160px,auto)]">
          {features.map((feature, index) => (
            <FeatureCard key={index} feature={feature} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}
