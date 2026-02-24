"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
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
            href="/"
            className="inline-flex items-center gap-2 text-epoch-primary/70 hover:text-epoch-primary font-sans text-sm font-medium transition-colors mb-8"
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
            <Link
              href="/about"
              className="text-epoch-primary/70 hover:text-epoch-primary"
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
