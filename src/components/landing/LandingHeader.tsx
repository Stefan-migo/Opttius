"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Menu, X, LayoutDashboard } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import Image from "next/image";
import businessConfig from "@/config/business";
import { useTheme } from "@/components/theme-provider";

type OrgStatus = {
  hasOrganization: boolean;
  isDemoMode: boolean;
} | null;

export function LandingHeader() {
  const router = useRouter();
  const { theme } = useTheme();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [orgStatus, setOrgStatus] = useState<OrgStatus>(null);
  const [isLoading, setIsLoading] = useState(true);

  const navigation = [
    { name: "Inicio", href: "#inicio" },
    { name: "Características", href: "#caracteristicas" },
    { name: "Beneficios", href: "#beneficios" },
    { name: "Precios", href: "#precios" },
    { name: "Nosotros", href: "/about" },
  ];

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    handleScroll(); // Check initial position (e.g. if page loads scrolled)
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    async function checkAuthAndOrg() {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        const authenticated = !!user;
        setIsAuthenticated(authenticated);

        if (authenticated) {
          try {
            const res = await fetch("/api/admin/check-status", {
              credentials: "include",
            });
            if (res.ok) {
              const data = await res.json();
              setOrgStatus({
                hasOrganization: data.organization?.hasOrganization ?? false,
                isDemoMode: data.organization?.isDemoMode ?? false,
              });
            } else {
              setOrgStatus({ hasOrganization: false, isDemoMode: false });
            }
          } catch {
            setOrgStatus({ hasOrganization: false, isDemoMode: false });
          }
        } else {
          setOrgStatus(null);
        }
      } catch (error) {
        console.error("Error checking auth:", error);
        setIsAuthenticated(false);
        setOrgStatus(null);
      } finally {
        setIsLoading(false);
      }
    }
    checkAuthAndOrg();
  }, []);

  const handleNavClick = (href: string) => {
    setMobileMenuOpen(false);
    if (href.startsWith("#")) {
      const element = document.querySelector(href);
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
      }
    } else {
      router.push(href);
    }
  };

  return (
    <header
      className={`fixed top-0 w-full z-50 transition-all duration-500 py-6 px-4 md:px-8 ${
        isScrolled
          ? "bg-epoch-surface py-4 shadow-xl backdrop-blur-md"
          : "bg-epoch-surface/70 backdrop-blur-md"
      }`}
    >
      <nav className="max-w-7xl mx-auto flex justify-between items-center transition-all duration-300">
        {/* Logo - same structure as admin sidebar */}
        <Link
          href="/"
          className="group flex items-center gap-2 sm:gap-4 pl-2 sm:pl-5"
        >
          <div className="relative group-hover:scale-105 transition-all duration-700 flex-shrink-0">
            <Image
              src="/logo-opttius.svg"
              alt="Opttius"
              width={44}
              height={44}
              className="h-8 w-8 sm:h-10 sm:w-10 md:h-11 md:w-11 transition-all duration-700"
            />
          </div>
          <div className="flex flex-col items-start justify-center">
            <Image
              src="/logo-text-default.svg"
              alt="Opttius"
              width={176}
              height={40}
              className="h-8 w-32 sm:h-10 sm:w-40 md:w-44 transition-all duration-700 object-contain object-left"
            />
          </div>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden lg:flex items-center gap-10 font-serif italic text-sm tracking-wide text-white/90">
          {navigation.map((item) => (
            <button
              key={item.name}
              onClick={() => handleNavClick(item.href)}
              className="hover:text-epoch-accent transition-colors duration-300 relative group"
            >
              {item.name}
              <span className="absolute -bottom-1 left-0 w-0 h-[1px] bg-epoch-accent transition-all duration-500 group-hover:w-full"></span>
            </button>
          ))}
        </div>

        {/* CTA Buttons */}
        <div className="hidden md:flex items-center gap-6">
          {isLoading ? (
            <div className="h-8 w-24 bg-white/10 animate-pulse rounded-full" />
          ) : isAuthenticated ? (
            orgStatus?.hasOrganization && !orgStatus?.isDemoMode ? (
              <Button
                onClick={() => router.push("/admin")}
                className="bg-transparent border border-white/30 hover:bg-white hover:text-epoch-surface text-white rounded-none px-8 py-2 font-display text-xs tracking-widest uppercase transition-all duration-500"
              >
                <LayoutDashboard className="mr-2 h-3 w-3" />
                Dashboard
              </Button>
            ) : (
              <div className="flex gap-4">
                <Button
                  onClick={() => router.push("/onboarding/create")}
                  className="bg-epoch-accent hover:bg-white text-epoch-surface rounded-none px-8 py-2 font-display text-xs tracking-widest uppercase transition-all duration-500"
                >
                  Activar
                </Button>
                <Button
                  onClick={() => router.push("/onboarding/choice")}
                  variant="outline"
                  className="bg-transparent border-white/30 hover:border-white text-white rounded-none px-8 py-2 font-display text-xs tracking-widest uppercase transition-all duration-500"
                >
                  Demo
                </Button>
              </div>
            )
          ) : (
            <div className="flex items-center gap-8">
              <button
                onClick={() => router.push("/login")}
                className="text-white/80 hover:text-white font-serif italic text-sm tracking-wide transition-colors"
              >
                Acceso
              </button>
              <Button
                onClick={() => router.push("/signup")}
                className="bg-transparent border border-white/30 hover:bg-white hover:text-epoch-surface text-white rounded-none px-10 py-5 font-display text-xs tracking-widest uppercase transition-all duration-502 animate-in fade-in zoom-in"
              >
                Empezar Ahora
              </Button>
            </div>
          )}
        </div>

        {/* Mobile menu button */}
        <div className="lg:hidden">
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
            {navigation.map((item) => (
              <button
                key={item.name}
                onClick={() => handleNavClick(item.href)}
                className="hover:text-epoch-accent transition-colors py-2"
              >
                {item.name}
              </button>
            ))}
          </div>
          <div className="pt-12 w-full max-w-xs space-y-6 border-t border-white/10 flex flex-col items-center">
            {isLoading ? (
              <div className="h-12 w-full bg-white/10 animate-pulse rounded-none" />
            ) : isAuthenticated ? (
              <Button
                onClick={() => {
                  router.push("/admin");
                  setMobileMenuOpen(false);
                }}
                className="w-full bg-epoch-accent text-epoch-surface rounded-none h-14 font-display tracking-widest uppercase"
              >
                <LayoutDashboard className="mr-2 h-5 w-5" />
                Dashboard
              </Button>
            ) : (
              <div className="w-full space-y-4">
                <button
                  onClick={() => {
                    router.push("/login");
                    setMobileMenuOpen(false);
                  }}
                  className="w-full py-4 text-white font-serif italic text-lg text-center"
                >
                  Iniciar Sesión
                </button>
                <Button
                  onClick={() => {
                    router.push("/signup");
                    setMobileMenuOpen(false);
                  }}
                  className="w-full bg-transparent border border-white/30 text-white rounded-none h-14 font-display tracking-widest uppercase transition-colors hover:bg-white hover:text-epoch-surface"
                >
                  Registrarse
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
