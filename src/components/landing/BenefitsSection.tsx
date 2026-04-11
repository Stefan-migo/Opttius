"use client";

import { Clock, Heart, Shield, TrendingUp } from "lucide-react";

const benefits = [
  {
    icon: Clock,
    title: "Tiempo Administrativo Recuperado",
    description:
      "La IA y las automatizaciones asumen las tareas repetitivas. Recupera más de un día laboral a la semana para enfocarte en tus pacientes.",
    stat: "10h / sem",
  },
  {
    icon: TrendingUp,
    title: "Cierre de Presupuestos",
    description:
      "El seguimiento inteligente convierte cotizaciones en ventas reales. No dejes que ningún paciente se enfríe.",
    stat: "+35%",
  },
  {
    icon: Heart,
    title: "Retención de Pacientes",
    description:
      "Desde recordatorios automáticos por WhatsApp hasta historiales clínicos instantáneos. Una experiencia premium que garantiza el retorno.",
    stat: "+98%",
  },
  {
    icon: Shield,
    title: "Errores de Transcripción",
    description:
      "Órdenes validadas automáticamente antes de llegar al laboratorio. Elimina mermas por cristales mal procesados y devoluciones costosas.",
    stat: "-95%",
  },
];

import Image from "next/image";

export function BenefitsSection() {
  return (
    <section
      className="py-20 sm:py-32 bg-epoch-primary text-white relative overflow-hidden"
      id="beneficios"
    >
      {/* Texture overlay */}
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="flex flex-col lg:flex-row items-center gap-20">
          {/* Text Content */}
          <div className="lg:w-1/2 space-y-10">
            <div className="inline-flex items-center gap-3 px-5 py-2 bg-epoch-accent/20 border border-epoch-accent/80 rounded-full text-epoch-accent text-[10px] sm:text-[11px] font-sans font-semibold tracking-[0.35em] uppercase mb-4 shadow-md shadow-black/10">
              <span>📈 Impacto Real</span>
            </div>

            <h2 className="text-4xl sm:text-5xl md:text-7xl font-sans font-bold text-white tracking-tight leading-tight">
              Menos fricción operativa. Mayor rentabilidad.
            </h2>

            <div className="w-24 h-[1px] bg-epoch-accent" />

            <p className="text-xl text-white/70 font-sans tracking-wide max-w-xl leading-relaxed">
              Opttius no es solo un registro; es un motor de crecimiento. Las
              ópticas que migran a nuestro ecosistema recuperan su tiempo y
              escalan su facturación sin contratar más personal.
            </p>

            <div className="grid sm:grid-cols-2 gap-6">
              {benefits.map((benefit, index) => (
                <div
                  className="space-y-4 group p-6 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-epoch-accent/30 transition-all duration-500"
                  key={index}
                >
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl border border-epoch-accent/40 text-epoch-accent transition-colors duration-500 group-hover:bg-epoch-accent group-hover:text-epoch-primary">
                      <benefit.icon className="h-5 w-5 stroke-1" />
                    </div>
                    <span className="font-sans font-bold text-2xl text-epoch-accent">
                      {benefit.stat}
                    </span>
                  </div>
                  <h3 className="font-sans font-bold text-sm tracking-tight text-white/95">
                    {benefit.title}
                  </h3>
                  <p className="text-white/60 text-sm leading-relaxed font-sans">
                    {benefit.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Visual Element */}
          <div className="lg:w-1/2 relative group">
            {/* Decorative Frame */}
            <div className="absolute -inset-4 border border-epoch-accent/20 rounded-2xl -translate-x-4 -translate-y-4 pointer-events-none transition-transform duration-700 group-hover:translate-x-0 group-hover:translate-y-0" />

            <div className="relative aspect-[4/5] md:aspect-square overflow-hidden shadow-2xl rounded-xl">
              <Image
                fill
                alt="Precision Vision"
                className="object-cover grayscale hover:grayscale-0 transition-all duration-1000 scale-105 group-hover:scale-100"
                src="/images/landing/Vision.webp"
              />
              <div className="absolute inset-0 bg-epoch-primary/20 group-hover:bg-transparent transition-colors duration-1000" />
            </div>

            {/* Aesthetic Arch Background - hidden on mobile */}
            <div className="absolute -bottom-10 -right-10 w-40 h-40 border border-epoch-accent/10 rounded-full blur-2xl pointer-events-none hidden md:block" />
          </div>
        </div>
      </div>
    </section>
  );
}
