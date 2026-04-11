"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { MinimalLandingHeader } from "@/components/landing/MinimalLandingHeader";

const legalNavItems = [
  { name: "Privacidad", href: "/legal/privacidad" },
  { name: "Términos", href: "/legal/terminos" },
  { name: "Cookies", href: "/legal/cookies" },
  { name: "Seguridad", href: "/legal/seguridad" },
  { name: "Nosotros", href: "/about" },
];

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-epoch-background">
      <MinimalLandingHeader navItems={legalNavItems} />

      <main className="flex-1 pt-24 md:pt-28">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
          <Link
            className="inline-flex items-center gap-2 text-epoch-primary/70 hover:text-epoch-primary font-sans text-sm font-medium transition-colors mb-8"
            href="/"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver al inicio
          </Link>
        </div>
        {children}
      </main>

      <footer className="border-t border-epoch-primary/10 py-8 mt-auto">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap gap-6 justify-center text-[10px] font-display uppercase tracking-[0.2em]">
            <Link
              className="text-epoch-primary/70 hover:text-epoch-primary"
              href="/legal/privacidad"
            >
              Privacidad
            </Link>
            <Link
              className="text-epoch-primary/70 hover:text-epoch-primary"
              href="/legal/terminos"
            >
              Términos
            </Link>
            <Link
              className="text-epoch-primary/70 hover:text-epoch-primary"
              href="/legal/cookies"
            >
              Cookies
            </Link>
            <Link
              className="text-epoch-primary/70 hover:text-epoch-primary"
              href="/legal/seguridad"
            >
              Seguridad
            </Link>
            <Link
              className="text-epoch-primary/70 hover:text-epoch-primary"
              href="/about"
            >
              Nosotros
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
