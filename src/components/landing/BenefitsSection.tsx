"use client";

import { Clock, TrendingUp, Heart, Shield, Sparkles } from "lucide-react";
import businessConfig from "@/config/business";

const benefits = [
  {
    icon: Clock,
    title: "Ahorro de Tiempo",
    description:
      "Automatiza procesos repetitivos y recupera hasta 10 horas semanales de gestión administrativa.",
    stat: "10h/sem",
  },
  {
    icon: TrendingUp,
    title: "Crecimiento Orgánico",
    description:
      "Incrementa la tasa de cierre de presupuestos con seguimiento inteligente y proactivo.",
    stat: "+35%",
  },
  {
    icon: Heart,
    title: "Fidelización de Pacientes",
    description:
      "Ofrece una experiencia profesional y rápida que genera lealtad a largo plazo con tu marca.",
    stat: "+98%",
  },
  {
    icon: Shield,
    title: "Precisión de Datos",
    description:
      "Minimiza errores humanos y garantiza que cada orden de laboratorio sea perfecta.",
    stat: "-95%",
  },
];

import Image from "next/image";

export function BenefitsSection() {
  return (
    <section
      className="py-32 bg-epoch-primary text-white relative overflow-hidden"
      id="beneficios"
    >
      {/* Texture overlay */}
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="flex flex-col lg:flex-row items-center gap-20">
          {/* Text Content */}
          <div className="lg:w-1/2 space-y-10">
            <div className="inline-flex items-center gap-4 px-6 py-2 border border-epoch-accent/30 rounded-full text-epoch-accent text-[10px] font-display tracking-[0.4em] uppercase mb-4">
              <Sparkles className="h-3 w-3" />
              <span>Legado de Valor</span>
            </div>

            <h2 className="text-5xl md:text-7xl font-display font-bold text-white tracking-tight leading-none">
              GUIADOS POR LA
              <br />
              <span className="text-epoch-accent italic font-serif lowercase tracking-normal">
                luz de la precisión
              </span>
            </h2>

            <div className="w-24 h-[1px] bg-epoch-accent"></div>

            <p className="text-xl text-white/70 font-serif italic tracking-wide max-w-xl">
              Más que un software, una filosofía de gestión. Descubra el impacto
              de la maestría digital en cada aspecto de su óptica.
            </p>

            <div className="grid sm:grid-cols-2 gap-10">
              {benefits.map((benefit, index) => (
                <div key={index} className="space-y-4 group">
                  <div className="flex items-center gap-4">
                    <div className="p-3 border border-epoch-accent/30 text-epoch-accent transition-colors duration-500 group-hover:bg-epoch-accent group-hover:text-epoch-primary">
                      <benefit.icon className="h-5 w-5 stroke-1" />
                    </div>
                    <span className="font-display text-2xl text-epoch-accent/80">
                      {benefit.stat}
                    </span>
                  </div>
                  <h3 className="font-display font-bold text-sm tracking-widest uppercase text-white/90">
                    {benefit.title}
                  </h3>
                  <p className="text-white/50 text-xs leading-relaxed font-body italic">
                    {benefit.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Visual Element */}
          <div className="lg:w-1/2 relative group">
            {/* Decorative Frame */}
            <div className="absolute -inset-4 border border-epoch-accent/20 -translate-x-4 -translate-y-4 pointer-events-none transition-transform duration-700 group-hover:translate-x-0 group-hover:translate-y-0"></div>

            <div className="relative aspect-[4/5] md:aspect-square overflow-hidden shadow-2xl">
              <Image
                src="/images/landing/vision-epoch.png"
                alt="Precision Vision"
                fill
                className="object-cover grayscale hover:grayscale-0 transition-all duration-1000 scale-105 group-hover:scale-100"
              />
              <div className="absolute inset-0 bg-epoch-primary/20 group-hover:bg-transparent transition-colors duration-1000"></div>
            </div>

            {/* Aesthetic Arch Background */}
            <div className="absolute -bottom-10 -right-10 w-40 h-40 border border-epoch-accent/10 rounded-full blur-2xl pointer-events-none"></div>
          </div>
        </div>
      </div>
    </section>
  );
}
