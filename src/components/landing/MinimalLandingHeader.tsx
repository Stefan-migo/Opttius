"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import Image from "next/image";

interface MinimalLandingHeaderProps {
  /** Nav items to show (e.g. for legal: Privacidad, Términos, etc.) */
  navItems?: { name: string; href: string }[];
}

export function MinimalLandingHeader({
  navItems = [],
}: MinimalLandingHeaderProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 w-full z-50 transition-all duration-500 py-6 px-4 md:px-8 ${
        isScrolled
          ? "bg-epoch-surface/90 backdrop-blur-md py-4 shadow-xl"
          : "bg-epoch-surface/95 backdrop-blur-sm"
      }`}
    >
      <nav className="max-w-7xl mx-auto flex justify-between items-center transition-all duration-300">
        <Link href="/" className="group flex items-center gap-4 pl-5">
          <div className="relative group-hover:scale-105 transition-all duration-700 flex-shrink-0">
            <Image
              src="/logo-opttius.svg"
              alt="Opttius"
              width={44}
              height={44}
              className="h-10 w-10 md:h-11 md:w-11 transition-all duration-700"
            />
          </div>
          <div className="flex flex-col items-start justify-center">
            <Image
              src="/logo-text-default.svg"
              alt="Opttius"
              width={176}
              height={40}
              className="h-10 w-40 md:w-44 object-contain object-left"
            />
          </div>
        </Link>

        {/* Desktop: nav links + Volver al inicio */}
        <div className="hidden lg:flex items-center gap-10 font-serif italic text-sm tracking-wide text-white/90">
          {navItems.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className="hover:text-epoch-accent transition-colors duration-300 relative group"
            >
              {item.name}
              <span className="absolute -bottom-1 left-0 w-0 h-[1px] bg-epoch-accent transition-all duration-500 group-hover:w-full"></span>
            </Link>
          ))}
          <Link
            href="/"
            className="text-[10px] font-display font-bold uppercase tracking-[0.2em] hover:text-epoch-accent transition-colors"
          >
            Volver al inicio
          </Link>
        </div>

        {/* Mobile menu button */}
        <div className="lg:hidden flex items-center gap-4">
          <Link
            href="/"
            className="text-[10px] font-display font-bold text-white/90 uppercase tracking-[0.2em]"
          >
            Inicio
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/10"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </Button>
        </div>
      </nav>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden py-12 px-6 space-y-8 bg-epoch-surface text-white animate-in slide-in-from-top duration-500 fixed inset-0 z-[100] flex flex-col items-center justify-center">
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="absolute top-8 right-8 text-white"
          >
            <X className="h-8 w-8" />
          </button>
          <div className="flex flex-col items-center space-y-8 font-serif italic text-xl">
            {navItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className="hover:text-epoch-accent transition-colors py-2"
              >
                {item.name}
              </Link>
            ))}
            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              className="font-display text-sm uppercase tracking-wider hover:text-epoch-accent"
            >
              Volver al inicio
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
