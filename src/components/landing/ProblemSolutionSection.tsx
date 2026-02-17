"use client";

import { AlertCircle, CheckCircle2, XCircle } from "lucide-react";
import businessConfig from "@/config/business";

export function ProblemSolutionSection() {
  const problems = [
    {
      icon: XCircle,
      title: "GESTIÓN MANUAL",
      description:
        "Sistemas arcaicos y papel que sepultan la eficiencia bajo el peso del desorden.",
    },
    {
      icon: XCircle,
      title: "TIEMPO PERDIDO",
      description:
        "Horas de labor administrativa que podrían dedicarse al arte de la atención.",
    },
    {
      icon: XCircle,
      title: "ERROR HUMANO",
      description:
        "Cálculos imprecisos que resultan en fracturas financieras y operativa imperfecta.",
    },
  ];

  const solutions = [
    {
      icon: CheckCircle2,
      title: "MAESTRÍA DIGITAL",
      description:
        "Una sinfonía de procesos orquestados con precisión suiza y visión de futuro.",
    },
    {
      icon: CheckCircle2,
      title: "INTELIGENCIA PURA",
      description:
        "IA que refina cada decisión, permitiéndole alcanzar la cúspide de su potencial.",
    },
    {
      icon: CheckCircle2,
      title: "PERFECCIÓN TÉCNICA",
      description:
        "Órdenes grabadas con exactitud matemática, eliminando el margen de error.",
    },
  ];

  return (
    <section
      className="py-32 bg-epoch-background relative overflow-hidden"
      id="evolucion"
    >
      {/* Decorative center line */}
      <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-epoch-accent/10 hidden lg:block"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-32 max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-4 px-6 py-2 border border-epoch-primary/10 rounded-full text-epoch-primary/60 text-[10px] font-display tracking-[0.4em] uppercase mb-8">
            <span>Trascendencia Operativa</span>
          </div>
          <h2 className="text-5xl md:text-7xl font-display font-bold text-epoch-primary tracking-tight leading-none mb-10">
            DEL CAOS A LA
            <br />
            <span className="text-epoch-accent italic font-serif lowercase tracking-normal">
              maestría absoluta
            </span>
          </h2>
          <p className="text-xl md:text-2xl text-epoch-primary/90 font-serif italic tracking-wide max-w-2xl mx-auto">
            Comprendemos que la excelencia no es un acto, sino un hábito
            facilitado por las herramientas correctas.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-16 lg:gap-32 items-start">
          {/* Problems Column */}
          <div className="space-y-16">
            <div className="flex flex-col items-start gap-4">
              <span className="font-display text-[9px] tracking-[0.5em] uppercase text-red-900/40">
                El Pasado
              </span>
              <h3 className="text-3xl font-display font-bold text-epoch-primary/80">
                Desafíos de Ayer
              </h3>
              <div className="w-12 h-[1px] bg-red-900/20"></div>
            </div>

            <div className="space-y-12">
              {problems.map((problem, index) => (
                <div key={index} className="group flex gap-8">
                  <div className="flex-shrink-0 w-12 h-12 border border-red-900/10 rounded-full flex items-center justify-center text-red-900/20 group-hover:bg-red-900 group-hover:text-white transition-all duration-700">
                    <problem.icon className="h-5 w-5 stroke-1" />
                  </div>
                  <div className="space-y-3">
                    <h4 className="font-display font-bold text-xs tracking-[0.2em] text-epoch-primary/90">
                      {problem.title}
                    </h4>
                    <p className="font-serif italic text-sm text-epoch-primary/50 leading-relaxed">
                      {problem.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Solutions Column */}
          <div className="space-y-16">
            <div className="flex flex-col items-start gap-4">
              <span className="font-display text-[9px] tracking-[0.5em] uppercase text-epoch-accent">
                El Futuro
              </span>
              <h3 className="text-3xl font-display font-bold text-epoch-primary">
                El Estándar Opttius
              </h3>
              <div className="w-12 h-[1px] bg-epoch-accent/50"></div>
            </div>

            <div className="space-y-12">
              {solutions.map((solution, index) => (
                <div key={index} className="group flex gap-8">
                  <div className="flex-shrink-0 w-12 h-12 border border-epoch-accent/30 rounded-full flex items-center justify-center text-epoch-accent group-hover:bg-epoch-accent group-hover:text-epoch-primary transition-all duration-700">
                    <solution.icon className="h-5 w-5 stroke-1" />
                  </div>
                  <div className="space-y-3">
                    <h4 className="font-display font-bold text-xs tracking-[0.2em] text-epoch-primary">
                      {solution.title}
                    </h4>
                    <p className="font-serif italic text-sm text-epoch-primary/70 leading-relaxed">
                      {solution.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Aesthetic corner accents */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-epoch-accent/5 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-epoch-primary/5 rounded-full blur-3xl pointer-events-none"></div>
    </section>
  );
}
