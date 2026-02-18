import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { MinimalLandingHeader } from "@/components/landing/MinimalLandingHeader";

export const metadata: Metadata = {
  title: "Nosotros",
  description:
    "Opttius - Sistema de gestión para ópticas creado por un tecnólogo médico. Exclusivo para el sector.",
};

const aboutNavItems = [
  { name: "Inicio", href: "/" },
  { name: "Características", href: "/#caracteristicas" },
  { name: "Precios", href: "/#precios" },
];

const pillars = [
  {
    title: "Especialización",
    description:
      "Exclusivo para ópticas. Campos, flujos y reportes pensados para el sector. No es una adaptación de un CRM genérico.",
  },
  {
    title: "Origen técnico",
    description:
      "Diseñado por quien entiende la práctica clínica y operativa. Recetas, prescripciones, laboratorio y agenda desde el día a día real.",
  },
  {
    title: "Tecnología de última generación",
    description:
      "IA, integraciones y precisión de datos. Historiales inteligentes, automatización de citas y órdenes verificadas.",
  },
  {
    title: "Pragmatismo",
    description:
      "Resuelve problemas reales sin complejidad innecesaria. Menos errores, más tiempo, más ventas.",
  },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-epoch-background">
      <MinimalLandingHeader navItems={aboutNavItems} />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32 pt-32">
        <div className="mb-16">
          <div className="inline-flex items-center gap-4 px-6 py-2 border border-epoch-primary/10 rounded-full text-epoch-primary/70 text-[10px] font-display tracking-[0.4em] uppercase mb-8">
            <Sparkles className="h-3 w-3" />
            <span>Nuestra historia</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-display font-bold text-epoch-primary tracking-tight leading-tight mb-6">
            CREADO POR QUIEN
            <br />
            <span className="text-epoch-accent italic font-serif lowercase tracking-normal">
              conoce su óptica
            </span>
          </h1>
          <p className="text-xl text-epoch-primary/80 font-body leading-relaxed max-w-2xl">
            Opttius fue creado por un tecnólogo médico con experiencia en
            oftalmología. Conoce el día a día de una óptica: recetas,
            prescripciones, laboratorio, presupuestos, agenda. Por eso el
            sistema no es una adaptación de otro gestor de negocios: está
            pensado desde cero para el manejo cotidiano de su óptica.
          </p>
        </div>

        <div className="space-y-16">
          <h2 className="text-2xl font-display font-bold text-epoch-primary uppercase tracking-wider">
            Propuesta de valor
          </h2>
          <div className="grid md:grid-cols-2 gap-12">
            {pillars.map((pillar, index) => (
              <div
                key={index}
                className="space-y-4 p-6 border border-epoch-primary/5 bg-white"
              >
                <div className="w-12 h-[1px] bg-epoch-accent" />
                <h3 className="text-lg font-display font-bold text-epoch-primary uppercase tracking-wider">
                  {pillar.title}
                </h3>
                <p className="text-epoch-primary/80 font-body leading-relaxed">
                  {pillar.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-24 pt-16 border-t border-epoch-primary/10">
          <p className="text-epoch-primary/70 font-serif italic text-lg mb-8 max-w-2xl">
            Menos errores. Más tiempo. Más ventas. Ópticas que usan Opttius
            reportan ahorro de tiempo y mayor tasa de cierre en presupuestos.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-3 px-10 py-4 bg-epoch-primary hover:bg-epoch-surface text-white font-display font-bold uppercase text-xs tracking-[0.3em] transition-all duration-500 group"
          >
            Probar Gratis
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-2" />
          </Link>
        </div>
      </main>

      <footer className="border-t border-epoch-primary/10 py-8 mt-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap gap-6 justify-center text-[10px] font-display uppercase tracking-[0.2em]">
            <Link
              href="/legal/privacidad"
              className="text-epoch-primary/70 hover:text-epoch-primary"
            >
              Privacidad
            </Link>
            <Link
              href="/legal/terminos"
              className="text-epoch-primary/70 hover:text-epoch-primary"
            >
              Términos
            </Link>
            <Link
              href="/legal/cookies"
              className="text-epoch-primary/70 hover:text-epoch-primary"
            >
              Cookies
            </Link>
            <Link
              href="/legal/seguridad"
              className="text-epoch-primary/70 hover:text-epoch-primary"
            >
              Seguridad
            </Link>
          </div>
          <p className="mt-6 text-center text-[9px] text-epoch-primary/50 font-display uppercase tracking-[0.2em]">
            © {new Date().getFullYear()} Opttius. Sistema de Gestión Óptica.
          </p>
        </div>
      </footer>
    </div>
  );
}
