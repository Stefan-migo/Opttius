"use client";

import { LayoutDashboard, Menu, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import { createClient } from "@/utils/supabase/client";

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
  const [signupEnabled, setSignupEnabled] = useState(false);

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

  useEffect(() => {
    fetch("/api/landing/onboarding-config", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => setSignupEnabled(data.signupEnabled ?? false))
      .catch(() => setSignupEnabled(false));
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
          className="group flex items-center gap-2 sm:gap-4 pl-2 sm:pl-5"
          href="/"
        >
          <div className="relative group-hover:scale-105 transition-all duration-700 flex-shrink-0">
            <Image
              alt="Opttius"
              className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 transition-all duration-700"
              height={36}
              src="/logo-opttius.svg"
              width={36}
            />
          </div>
          <div className="flex flex-col items-start justify-center">
            <Image
              alt="Opttius"
              className="h-5 w-24 sm:h-6 sm:w-28 md:h-7 md:w-32 transition-all duration-700 object-contain object-left"
              height={36}
              src="/OpttiusTextAlone.svg"
              width={140}
            />
          </div>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden lg:flex items-center gap-10 font-serif italic text-sm tracking-wide text-white/90">
          {navigation.map((item) => (
            <button
              className="hover:text-epoch-accent transition-colors duration-300 relative group"
              key={item.name}
              onClick={() => handleNavClick(item.href)}
            >
              {item.name}
              <span className="absolute -bottom-1 left-0 w-0 h-[1px] bg-epoch-accent transition-all duration-500 group-hover:w-full" />
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
                className="bg-transparent border border-white/30 hover:bg-white hover:text-epoch-surface text-white rounded-xl px-8 py-2 font-display text-xs tracking-widest uppercase transition-all duration-500"
                onClick={() => router.push("/admin")}
              >
                <LayoutDashboard className="mr-2 h-3 w-3" />
                Dashboard
              </Button>
            ) : (
              <div className="flex gap-4">
                <Button
                  className="bg-epoch-accent hover:bg-white text-epoch-surface rounded-xl px-8 py-2 font-display text-xs tracking-widest uppercase transition-all duration-500"
                  onClick={() => router.push("/onboarding/create")}
                >
                  Activar
                </Button>
                <Button
                  className="bg-transparent border-white/30 hover:border-white text-white rounded-xl px-8 py-2 font-display text-xs tracking-widest uppercase transition-all duration-500"
                  variant="outline"
                  onClick={() => router.push("/onboarding/choice")}
                >
                  Demo
                </Button>
              </div>
            )
          ) : (
            <div className="flex items-center gap-8">
              <button
                className="text-white/80 hover:text-white font-serif italic text-sm tracking-wide transition-colors"
                onClick={() => router.push("/login")}
              >
                Acceso
              </button>
              <Button
                className="bg-transparent border border-white/30 hover:bg-white hover:text-epoch-surface text-white rounded-xl px-10 py-5 font-display text-xs tracking-widest uppercase transition-all duration-502 animate-in fade-in zoom-in"
                onClick={() => router.push("/solicitar-demo")}
              >
                Solicitar Demo
              </Button>
              {signupEnabled && (
                <Button
                  className="border-white/30 hover:bg-white/10 text-white rounded-xl px-6 py-5 font-display text-xs tracking-widest uppercase"
                  variant="outline"
                  onClick={() => router.push("/signup")}
                >
                  Registrarse
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Mobile menu button */}
        <div className="lg:hidden">
          <Button
            className="text-white hover:bg-white/10"
            size="icon"
            variant="ghost"
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

      {/* Mobile menu - full-screen overlay (portal), same behavior as MinimalLandingHeader on accessory pages */}
      {mobileMenuOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            aria-label="Menú de navegación"
            aria-modal="true"
            className="fixed inset-0 top-0 left-0 right-0 bottom-0 w-full min-h-screen z-[100] bg-epoch-surface text-white animate-in slide-in-from-top duration-500 flex flex-col items-center justify-center py-12 px-6 overflow-y-auto"
            role="dialog"
          >
            <button
              aria-label="Cerrar menú"
              className="absolute top-8 right-8 text-white hover:text-epoch-accent transition-colors p-2 z-10"
              onClick={() => setMobileMenuOpen(false)}
            >
              <X className="h-8 w-8" />
            </button>
            <div className="flex flex-col items-center space-y-8 font-serif italic text-xl">
              {navigation.map((item) => (
                <button
                  className="hover:text-epoch-accent transition-colors py-2"
                  key={item.name}
                  onClick={() => handleNavClick(item.href)}
                >
                  {item.name}
                </button>
              ))}
            </div>
            <div className="pt-12 w-full max-w-xs space-y-4 border-t border-white/20 flex flex-col items-center">
              {isLoading ? (
                <div className="h-12 w-full bg-white/10 animate-pulse rounded-xl" />
              ) : isAuthenticated ? (
                orgStatus?.hasOrganization && !orgStatus?.isDemoMode ? (
                  <Button
                    className="w-full bg-epoch-accent text-epoch-surface rounded-xl h-14 font-display tracking-widest uppercase hover:bg-white hover:text-epoch-surface"
                    onClick={() => {
                      router.push("/admin");
                      setMobileMenuOpen(false);
                    }}
                  >
                    <LayoutDashboard className="mr-2 h-5 w-5" />
                    Dashboard
                  </Button>
                ) : (
                  <div className="w-full space-y-3">
                    <Button
                      className="w-full bg-epoch-accent text-epoch-surface rounded-xl h-14 font-display tracking-widest uppercase hover:bg-white hover:text-epoch-surface"
                      onClick={() => {
                        router.push("/onboarding/create");
                        setMobileMenuOpen(false);
                      }}
                    >
                      Activar mi Óptica
                    </Button>
                    <Button
                      className="w-full border-white/30 bg-white/10 text-white rounded-xl h-14 font-display tracking-widest uppercase hover:bg-white/20"
                      variant="outline"
                      onClick={() => {
                        router.push("/onboarding/choice");
                        setMobileMenuOpen(false);
                      }}
                    >
                      Ver Demo
                    </Button>
                  </div>
                )
              ) : (
                <div className="w-full space-y-3">
                  <Button
                    className="w-full border-white/30 bg-white/10 text-white rounded-xl h-14 font-display tracking-widest uppercase hover:bg-white/20"
                    variant="outline"
                    onClick={() => {
                      router.push("/login");
                      setMobileMenuOpen(false);
                    }}
                  >
                    Iniciar Sesión
                  </Button>
                  <Button
                    className="w-full bg-epoch-accent text-epoch-surface rounded-xl h-14 font-display tracking-widest uppercase hover:bg-white hover:text-epoch-surface"
                    onClick={() => {
                      router.push("/solicitar-demo");
                      setMobileMenuOpen(false);
                    }}
                  >
                    Solicitar Demo
                  </Button>
                  {signupEnabled && (
                    <Button
                      className="w-full border-white/30 bg-white/10 text-white rounded-xl h-14 font-display tracking-widest uppercase hover:bg-white/20"
                      variant="outline"
                      onClick={() => {
                        router.push("/signup");
                        setMobileMenuOpen(false);
                      }}
                    >
                      Registrarse
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>,
          document.body,
        )}
    </header>
  );
}
