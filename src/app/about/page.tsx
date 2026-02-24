import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
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
    title: "ADN Clínico (No Adaptaciones)",
    subtitle: "Anti-Genérico por Diseño",
    description:
      'Mientras otros sistemas intentan venderle un punto de venta de supermercado "adaptado", nosotros diseñamos flujos para recetas, curvas base y distancias pupilares. Opttius respira óptica porque fue forjado por especialistas de la visión.',
  },
  {
    title: "Ingeniería de Precisión",
    subtitle: "Obsesión por el Detalle",
    description:
      "En nuestra profesión, un milímetro cambia todo. Trasladamos ese rigor clínico al código: validaciones automáticas, trazabilidad de laboratorio y cero tolerancia al error de transcripción.",
  },
  {
    title: "El Socio Invisible",
    subtitle: "Tecnología que Trabaja por Usted",
    description:
      "No creemos en el software pasivo. Integramos Inteligencia Artificial y automatización para que el sistema agende, cobre y notifique por usted. Su foco debe estar en el paciente, no en la administración.",
  },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-epoch-background">
      <MinimalLandingHeader navItems={aboutNavItems} />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32 pt-32">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-epoch-primary/70 hover:text-epoch-primary font-sans text-sm font-medium transition-colors mb-12"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al inicio
        </Link>

        {/* Hero: La Historia */}
        <section className="mb-24">
          <div className="inline-flex items-center gap-4 px-6 py-2 border border-epoch-primary/10 rounded-full text-epoch-primary/70 text-[10px] font-display tracking-[0.4em] uppercase mb-8">
            <span>La Historia</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-display font-bold text-epoch-primary tracking-tight leading-tight mb-6">
            De la Clínica al Código
          </h1>
          <p className="text-xl text-epoch-primary/80 font-body leading-relaxed mb-12 max-w-2xl">
            Opttius no nació en una sala de juntas. Nació en el laboratorio,
            entre recetas complejas y pacientes reales.
          </p>
          <blockquote className="border-l-4 border-epoch-accent pl-8 py-4 space-y-6">
            <p className="text-epoch-primary/90 font-body text-lg leading-relaxed italic">
              Durante años, vi cómo las ópticas más brillantes luchaban contra
              herramientas mediocres. Usaban un software para cobrar, un Excel
              para el laboratorio y notas adhesivas para los pacientes. El
              resultado siempre era el mismo: caos operativo y errores humanos.
            </p>
            <p className="text-epoch-primary/90 font-body text-lg leading-relaxed italic">
              Como Tecnólogo Médico, entendí que un CRM genérico nunca podría
              entender la diferencia entre un eje y una adición. Por eso
              construí Opttius. No para adaptar un sistema contable, sino para
              crear el primer Sistema Operativo Nativo que habla el idioma
              exacto de la oftalmología.
            </p>
            <footer className="text-epoch-primary/70 font-display text-sm uppercase tracking-wider">
              — Fundador de Opttius
            </footer>
          </blockquote>
        </section>

        {/* Grid: Nuestra Filosofía */}
        <section className="space-y-16">
          <h2 className="text-2xl font-display font-bold text-epoch-primary uppercase tracking-wider">
            Nuestra Filosofía
          </h2>
          <div className="grid md:grid-cols-1 gap-12">
            {pillars.map((pillar, index) => (
              <div
                key={index}
                className="space-y-4 p-6 border border-epoch-primary/5 bg-white"
              >
                <div className="w-12 h-[1px] bg-epoch-accent" />
                <h3 className="text-lg font-display font-bold text-epoch-primary uppercase tracking-wider">
                  Pilar {index + 1}: {pillar.title}
                </h3>
                <p className="text-epoch-accent font-display text-sm uppercase tracking-wider">
                  {pillar.subtitle}
                </p>
                <p className="text-epoch-primary/80 font-body leading-relaxed">
                  {pillar.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Cierre: El Manifiesto */}
        <section className="mt-24 pt-16 border-t border-epoch-primary/10">
          <h2 className="text-2xl font-display font-bold text-epoch-primary uppercase tracking-wider mb-6">
            El Nuevo Estándar
          </h2>
          <p className="text-epoch-primary/70 font-body text-lg mb-8 max-w-2xl">
            Ya no es necesario elegir entre la precisión clínica y la
            rentabilidad comercial. Hemos unido ambos mundos.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-3 px-10 py-4 bg-epoch-primary hover:bg-epoch-surface text-white font-display font-bold uppercase text-xs tracking-[0.3em] transition-all duration-500 group"
          >
            Elevar el Estándar de mi Óptica
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-2" />
          </Link>
        </section>
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
