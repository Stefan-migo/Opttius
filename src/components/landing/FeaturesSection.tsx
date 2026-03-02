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
  Briefcase,
  MapPin,
} from "lucide-react";
import Image from "next/image";

/* Grid uniforme: 5 cols x 2 rows = 10 items. Orden por importancia percibida por el usuario. */
const features = [
  {
    icon: ShoppingCart,
    title: "POS (Punto de Venta)",
    subtitle: "Punto de Venta Clínico",
    description:
      "Facturación ágil integrada al historial del paciente. Descuentos de laboratorio, pagos mixtos y sincronización de stock en tiempo real.",
    className: "bg-epoch-primary text-white",
    image: "/images/landing/pos.webp",
  },
  {
    icon: Users,
    title: "Expediente Clínico Unificado",
    description:
      "Centraliza la salud visual y el historial comercial. Recetas, citas, presupuestos y órdenes de laboratorio sincronizados en una línea de tiempo perfecta.",
    className: "bg-white",
    image: "/images/landing/LamparaW.webp",
  },
  {
    icon: Package,
    title: "Inventario",
    subtitle: "Inventario Inteligente",
    description:
      "Control de armazones, lentes y accesorios con alertas de stock bajo. Movimientos, ajustes y valoración de inventario al día.",
    className: "bg-epoch-accent/10",
    image: "/images/landing/mesaW.webp",
  },
  {
    icon: FileText,
    title: "Laboratorio",
    subtitle: "Trazabilidad de Órdenes",
    description:
      "Adiós a las llamadas al laboratorio. Monitoree el estado de cada trabajo (tallado, biselado, entrega) paso a paso en el sistema.",
    className: "bg-white",
    image: "/images/landing/laboratorio.webp",
  },
  {
    icon: Calendar,
    title: "Agenda (Comunicación)",
    subtitle: "Agenda Inteligente",
    description:
      "Reduzca el ausentismo con recordatorios automáticos por WhatsApp. Confirmaciones directas y reprogramación sin fricción.",
    className: "bg-white",
    image: "/images/landing/agenda.webp",
  },
  {
    icon: MessageSquare,
    title: "Agente IA",
    subtitle: "Chatbot con Conocimiento de tu Óptica",
    description:
      "Un asistente que conoce tu negocio. Consulta stock, clientes, órdenes de trabajo y obtén recomendaciones ópticas. Disponible en el panel y por WhatsApp.",
    className: "bg-epoch-surface text-white",
    image: "/images/landing/asistente.webp",
  },
  {
    icon: BarChart3,
    title: "Inteligencia de Negocio",
    subtitle: "Analítica Comercial",
    description:
      "Tome decisiones con datos reales. Visualice márgenes de ganancia, productos estrella y rendimiento por vendedor al instante.",
    className: "bg-white",
    image: "/images/landing/analytics.webp",
  },
  {
    icon: Building2,
    title: "Multi-Sucursal",
    subtitle: "Control Multi-Sede",
    description:
      "Gestione una o diez sucursales desde un solo panel. Inventarios compartidos, reportes consolidados y permisos por ubicación.",
    className: "bg-epoch-accent/10",
    image: "/images/landing/multisucursal.webp",
  },
  {
    icon: Briefcase,
    title: "Gestión de Convenios",
    subtitle: "Próximamente",
    description:
      "Convenios con empresas e instituciones. Copago, órdenes de compra, descuento por planilla y cobranza institucional.",
    className: "bg-white",
    comingSoon: true,
  },
  {
    icon: MapPin,
    title: "Operativos en Terreno",
    subtitle: "Próximamente",
    description:
      "Bodega móvil, registro masivo en empresa, receta digital en sitio y sincronización offline.",
    className: "bg-epoch-accent/10",
    comingSoon: true,
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

  const isComingSoon = "comingSoon" in feature && feature.comingSoon;

  return (
    <div
      className={`group relative overflow-hidden rounded-xl p-6 sm:p-8 border border-epoch-primary/5 transition-all duration-700 flex flex-col justify-between hover:shadow-2xl hover:-translate-y-1 ${feature.className} ${isComingSoon ? "opacity-90" : ""}`}
    >
      {isComingSoon && (
        <div className="absolute top-4 right-4 z-20">
          <span className="inline-flex px-3 py-1 rounded-full text-[9px] font-sans font-semibold tracking-wider uppercase bg-epoch-accent/20 text-epoch-accent border border-epoch-accent/40">
            En construcción
          </span>
        </div>
      )}
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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 lg:grid-rows-2 gap-4 auto-rows-[minmax(180px,auto)]">
          {features.map((feature, index) => (
            <FeatureCard key={index} feature={feature} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}
