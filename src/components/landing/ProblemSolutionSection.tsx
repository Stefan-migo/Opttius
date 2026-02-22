"use client";

import { CheckCircle2, XCircle } from "lucide-react";

export function ProblemSolutionSection() {
  const problems = [
    {
      icon: XCircle,
      title: "RECETAS PERDIDAS",
      description:
        "Recetas en papel que se pierden o se deterioran. Sin historial centralizado para consultar graduaciones anteriores.",
    },
    {
      icon: XCircle,
      title: "TIEMPO ADMINISTRATIVO",
      description:
        "Horas en tareas repetitivas que podrían dedicarse a atender pacientes y cerrar ventas.",
    },
    {
      icon: XCircle,
      title: "ERRORES EN LABORATORIO",
      description:
        "Errores en órdenes de laboratorio que cuestan dinero, tiempo y reputación con sus pacientes.",
    },
  ];

  const solutions = [
    {
      icon: CheckCircle2,
      title: "HISTORIAL DIGITAL",
      description:
        "Historial digital con recetas OD/OS completas. Todo accesible desde un solo lugar, siempre actualizado.",
    },
    {
      icon: CheckCircle2,
      title: "IA QUE AUTOMATIZA",
      description:
        "IA que automatiza citas, recordatorios vía WhatsApp y seguimiento de presupuestos. Recupere hasta 10 horas semanales.",
    },
    {
      icon: CheckCircle2,
      title: "ÓRDENES VERIFICADAS",
      description:
        "Órdenes verificadas antes de enviar al laboratorio. Cero errores en graduaciones. Menos devoluciones, más confianza.",
    },
  ];

  return (
    <section
      className="py-24 md:py-32 bg-epoch-background relative overflow-hidden"
      id="evolucion"
    >
      {/* Decorative center line */}
      <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-epoch-accent/10 hidden lg:block"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-20 md:mb-24 max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-4 px-6 py-2 border border-epoch-primary/10 rounded-full text-epoch-primary/60 text-[10px] font-display tracking-[0.4em] uppercase mb-8">
            <span>Problemas reales. Soluciones concretas.</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-display font-bold text-epoch-primary tracking-tight leading-none mb-10">
            DE LOS PROBLEMAS QUE CONOCE
            <br />
            <span className="text-epoch-accent italic font-serif lowercase tracking-normal">
              a la solución que necesita
            </span>
          </h2>
          <p className="text-xl md:text-2xl text-epoch-primary/90 font-serif italic tracking-wide max-w-2xl mx-auto">
            Opttius fue creado por un tecnólogo médico que conoce el día a día
            de una óptica. No es un CRM adaptado: está pensado para usted.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-16 lg:gap-32 items-start">
          {/* Problems Column */}
          <div className="space-y-16">
            <div className="flex flex-col items-start gap-4">
              <span className="font-display text-[9px] tracking-[0.5em] uppercase text-red-900/70">
                El Pasado
              </span>
              <h3 className="text-3xl font-display font-bold text-epoch-primary">
                Desafíos de Ayer
              </h3>
              <div className="w-12 h-[1px] bg-red-900/40"></div>
            </div>

            <div className="space-y-12">
              {problems.map((problem, index) => (
                <div key={index} className="group flex gap-8">
                  <div className="flex-shrink-0 w-12 h-12 border border-red-900/30 rounded-full flex items-center justify-center text-red-900/60 group-hover:bg-red-900 group-hover:text-white transition-all duration-700">
                    <problem.icon className="h-5 w-5 stroke-1" />
                  </div>
                  <div className="space-y-3">
                    <h4 className="font-display font-bold text-xs tracking-[0.2em] text-epoch-primary">
                      {problem.title}
                    </h4>
                    <p className="font-serif italic text-sm text-epoch-primary/80 leading-relaxed">
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
