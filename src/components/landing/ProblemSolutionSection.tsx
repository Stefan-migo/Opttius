"use client";

import { CheckCircle2, XCircle } from "lucide-react";

export function ProblemSolutionSection() {
  const problems = [
    {
      icon: XCircle,
      title: "Fichas Fragmentadas",
      description:
        "Recetas físicas o en Excel. Sin un historial clínico rápido para consultar graduaciones anteriores frente al paciente.",
    },
    {
      icon: XCircle,
      title: "Carga Operativa Manual",
      description:
        "Horas perdidas cuadrando caja, contactando pacientes a mano y buscando presupuestos traspapelados.",
    },
    {
      icon: XCircle,
      title: "Fricción con el Laboratorio",
      description:
        "Errores de transcripción manual que terminan en mermas económicas, cristales devueltos y pacientes molestos.",
    },
  ];

  const solutions = [
    {
      icon: CheckCircle2,
      title: "Historial Clínico Unificado (Controla)",
      description:
        "Fichas nativas con OD/OS, ejes y adiciones. El perfil visual completo de tu paciente a un clic de distancia.",
    },
    {
      icon: CheckCircle2,
      title: "Piloto Automático con IA (Automatiza)",
      description:
        "Agenda inteligente, seguimientos automáticos y cotizaciones en segundos. Recupera hasta 10 horas semanales para enfocarte en vender.",
    },
    {
      icon: CheckCircle2,
      title: "Trazabilidad Absoluta (Crece)",
      description:
        "Órdenes validadas por el sistema antes de enviarse. Cero errores de transcripción, cero mermas y entregas exactas.",
    },
  ];

  return (
    <section
      className="py-24 md:py-32 bg-epoch-background relative overflow-hidden"
      id="evolucion"
    >
      {/* Decorative center line */}
      <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-epoch-accent/10 hidden lg:block" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-20 md:mb-24 max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-3 px-5 py-2 bg-epoch-primary/10 border border-epoch-primary/40 rounded-full text-epoch-primary text-[10px] sm:text-[11px] font-sans font-semibold tracking-[0.35em] uppercase mb-8">
            <span>Creado desde la experiencia.</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-sans font-bold text-epoch-primary tracking-tight leading-tight mb-4">
            Usted conoce el problema.
          </h2>
          <p className="text-xl md:text-2xl text-epoch-accent font-sans font-semibold tracking-wide mb-8">
            Nosotros construimos la respuesta.
          </p>
          <p className="text-lg md:text-xl text-epoch-primary/80 font-sans leading-relaxed max-w-2xl mx-auto">
            Perder tiempo cuadrando el laboratorio con las ventas es cosa del
            pasado. Opttius fue desarrollado por un tecnólogo médico que vivió
            el día a día de una óptica. No adaptamos un sistema contable;
            creamos el estándar definitivo para la visión.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-16 lg:gap-32 items-start">
          {/* Problems Column - El Problema */}
          <div className="space-y-16">
            <div className="flex flex-col items-start gap-2">
              <h3 className="text-2xl sm:text-3xl font-sans font-bold text-epoch-primary">
                Gestión Tradicional ❌
              </h3>
              <p className="text-sm text-epoch-accent font-sans font-medium">
                (Sistemas genéricos y papel)
              </p>
              <div className="w-12 h-[1px] bg-red-900/60" />
            </div>

            <div className="space-y-12">
              {problems.map((problem, index) => (
                <div className="group flex gap-8" key={index}>
                  <div className="flex-shrink-0 w-12 h-12 border-2 border-red-900/40 rounded-full flex items-center justify-center text-red-900/70 group-hover:bg-red-900 group-hover:text-white group-hover:border-red-900 transition-all duration-700">
                    <problem.icon className="h-5 w-5 stroke-1" />
                  </div>
                  <div className="space-y-3">
                    <h4 className="font-sans font-bold text-sm tracking-tight text-epoch-primary">
                      {problem.title}
                    </h4>
                    <p className="font-sans text-sm text-epoch-primary/80 leading-relaxed">
                      {problem.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Solutions Column - La Solución */}
          <div className="space-y-16">
            <div className="flex flex-col items-start gap-2">
              <h3 className="text-2xl sm:text-3xl font-sans font-bold text-epoch-primary">
                El Ecosistema Opttius ✅
              </h3>
              <p className="text-sm text-epoch-accent font-sans font-medium">
                (Inteligencia Operativa)
              </p>
              <div className="w-12 h-[1px] bg-epoch-accent" />
            </div>

            <div className="space-y-12">
              {solutions.map((solution, index) => (
                <div className="group flex gap-8" key={index}>
                  <div className="flex-shrink-0 w-12 h-12 border-2 border-epoch-accent/60 rounded-full flex items-center justify-center text-epoch-accent bg-epoch-accent/10 group-hover:bg-epoch-accent group-hover:text-epoch-primary transition-all duration-700">
                    <solution.icon className="h-5 w-5 stroke-1" />
                  </div>
                  <div className="space-y-3">
                    <h4 className="font-sans font-bold text-sm tracking-tight text-epoch-primary">
                      {solution.title}
                    </h4>
                    <p className="font-sans text-sm text-epoch-primary/80 leading-relaxed">
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
      <div className="absolute top-0 right-0 w-64 h-64 bg-epoch-accent/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-epoch-primary/5 rounded-full blur-3xl pointer-events-none" />
    </section>
  );
}
