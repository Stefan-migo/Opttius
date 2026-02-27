"use client";

import Link from "next/link";
import Image from "next/image";
import {
  Building2,
  Mail,
  Phone,
  Facebook,
  Twitter,
  Linkedin,
  Instagram,
} from "lucide-react";
import businessConfig from "@/config/business";
import { useTheme } from "@/components/theme-provider";

export function LandingFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-epoch-surface text-white relative overflow-hidden">
      {/* Texture overlay */}
      <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-epoch-accent/30 to-transparent"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-64 pb-32">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-20">
          {/* Brand Column */}
          <div className="space-y-10">
            <Link href="/" className="group flex flex-col items-start">
              <div className="relative group-hover:scale-105 transition-all duration-700">
                <Image
                  src="/logo-text-default.svg"
                  alt="Opttius"
                  width={192}
                  height={48}
                  className="h-14 w-48 opacity-90 group-hover:opacity-100 transition-opacity object-contain object-left"
                />
              </div>
            </Link>

            <p className="text-white/40 text-sm font-sans leading-relaxed max-w-xs">
              De la clínica al código. 100% nativo para ópticas.
            </p>

            <div className="flex gap-8">
              {[Facebook, Twitter, Linkedin, Instagram].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="text-white/30 hover:text-epoch-accent transition-all duration-500"
                >
                  <Icon className="h-5 w-5 stroke-1" />
                </a>
              ))}
            </div>
          </div>

          {/* Product Column */}
          <div>
            <h3 className="font-display text-xs font-bold text-epoch-accent uppercase tracking-[0.4em] mb-12">
              Navegación
            </h3>
            <ul className="space-y-6 text-xs font-display tracking-[0.2em] uppercase">
              {[
                { name: "Inicio", href: "#inicio" },
                { name: "Características", href: "#caracteristicas" },
                { name: "Beneficios", href: "#beneficios" },
                { name: "Precios", href: "#precios" },
                { name: "Nosotros", href: "/about" },
              ].map((item) => (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className="text-white/50 hover:text-white transition-all duration-300 flex items-center group"
                  >
                    <span className="w-0 group-hover:w-4 h-[1px] bg-epoch-accent mr-0 group-hover:mr-4 transition-all duration-500"></span>
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Column */}
          <div>
            <h3 className="font-display text-xs font-bold text-epoch-accent uppercase tracking-[0.4em] mb-12">
              Legal
            </h3>
            <ul className="space-y-6 text-xs font-display tracking-[0.2em] uppercase">
              {[
                { name: "Privacidad", href: "/legal/privacidad" },
                { name: "Términos", href: "/legal/terminos" },
                { name: "Cookies", href: "/legal/cookies" },
                { name: "Seguridad", href: "/legal/seguridad" },
              ].map((item) => (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className="text-white/50 hover:text-white transition-all duration-300 flex items-center group"
                  >
                    <span className="w-0 group-hover:w-4 h-[1px] bg-epoch-accent mr-0 group-hover:mr-4 transition-all duration-500"></span>
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Column */}
          <div>
            <h3 className="font-display text-xs font-bold text-epoch-accent uppercase tracking-[0.4em] mb-12">
              Contacto
            </h3>
            <ul className="space-y-8 font-sans text-sm">
              <li className="flex flex-col gap-2">
                <span className="text-[10px] font-display tracking-[0.3em] uppercase text-white/30">
                  Email
                </span>
                <a
                  href={`mailto:${businessConfig.contactEmail}`}
                  className="text-white/60 hover:text-white transition-colors"
                >
                  {businessConfig.contactEmail}
                </a>
              </li>
              <li className="flex flex-col gap-2">
                <span className="text-[10px] font-display tracking-[0.3em] uppercase text-white/30">
                  Teléfono
                </span>
                <a
                  href={`https://wa.me/${businessConfig.contactPhone?.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/60 hover:text-white transition-colors"
                >
                  {businessConfig.contactPhone}
                </a>
                <span className="text-[9px] text-white/40 font-sans">
                  Solo disponible por WhatsApp
                </span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-32 pt-12 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-10">
          <p className="font-display text-[9px] text-white/20 uppercase tracking-[0.4em]">
            © {currentYear} {businessConfig.displayName}. DISEÑADO PARA ÓPTICAS
            EXIGENTES.
          </p>
        </div>
      </div>

      {/* Aesthetic Arch Base - subtler curve on mobile */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[120%] h-40 bg-epoch-background rounded-b-[30%] sm:rounded-b-[50%] md:rounded-b-[70%] lg:rounded-b-[100%] z-0"></div>
    </footer>
  );
}
