"use client";

import Link from "next/link";
import {
  Building2,
  Mail,
  Phone,
  Facebook,
  Twitter,
  Linkedin,
  Instagram,
  Sparkles,
} from "lucide-react";
import businessConfig from "@/config/business";
import { useTheme } from "@/components/theme-provider";
import { OpttiusLogoText } from "@/components/ui/brand";

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
                <OpttiusLogoText
                  forceLight={true}
                  className="h-14 w-48 opacity-90 group-hover:opacity-100 transition-opacity"
                />
              </div>
            </Link>

            <p className="text-white/40 text-sm font-body leading-relaxed italic max-w-xs">
              Redefiniendo el estándar tecnológico en la industria óptica global
              con la elegancia de una era dorada y la precisión del mañana.
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
              Exploración
            </h3>
            <ul className="space-y-6 text-xs font-display tracking-[0.2em] uppercase">
              {["Inicio", "Características", "Beneficios", "Precios"].map(
                (item, i) => (
                  <li key={i}>
                    <Link
                      href={`#${item.toLowerCase()}`}
                      className="text-white/50 hover:text-white transition-all duration-300 flex items-center group"
                    >
                      <span className="w-0 group-hover:w-4 h-[1px] bg-epoch-accent mr-0 group-hover:mr-4 transition-all duration-500"></span>
                      {item}
                    </Link>
                  </li>
                ),
              )}
            </ul>
          </div>

          {/* Legal Column */}
          <div>
            <h3 className="font-display text-xs font-bold text-epoch-accent uppercase tracking-[0.4em] mb-12">
              Manuscritos
            </h3>
            <ul className="space-y-6 text-xs font-display tracking-[0.2em] uppercase">
              {["Privacidad", "Términos", "Cookies", "Seguridad"].map(
                (item, i) => (
                  <li key={i}>
                    <Link
                      href="#"
                      className="text-white/50 hover:text-white transition-all duration-300 flex items-center group"
                    >
                      <span className="w-0 group-hover:w-4 h-[1px] bg-epoch-accent mr-0 group-hover:mr-4 transition-all duration-500"></span>
                      {item}
                    </Link>
                  </li>
                ),
              )}
            </ul>
          </div>

          {/* Contact Column */}
          <div>
            <h3 className="font-display text-xs font-bold text-epoch-accent uppercase tracking-[0.4em] mb-12">
              Corresponsal
            </h3>
            <ul className="space-y-8 font-serif italic text-sm">
              <li className="flex flex-col gap-2">
                <span className="text-[10px] font-display tracking-[0.3em] uppercase text-white/30">
                  Despacho
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
                  Audiencias
                </span>
                <a
                  href="tel:+1234567890"
                  className="text-white/60 hover:text-white transition-colors"
                >
                  +1 (234) 567-890
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-32 pt-12 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-10">
          <p className="font-display text-[9px] text-white/20 uppercase tracking-[0.4em]">
            © {currentYear} {businessConfig.displayName}. CREADO PARA EL
            EXIGENTE.
          </p>
          <div className="flex gap-4">
            <div className="w-12 h-12 border border-white/5 flex items-center justify-center rounded-full opacity-50">
              <Sparkles className="h-4 w-4 text-epoch-accent" />
            </div>
          </div>
        </div>
      </div>

      {/* Aesthetic Arch Base */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[120%] h-40 bg-epoch-background rounded-b-[100%] z-0"></div>
    </footer>
  );
}
