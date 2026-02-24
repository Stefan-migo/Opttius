"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthContext } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Building2,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default function OnboardingChoicePage() {
  const router = useRouter();
  const { user, loading: authLoading, refetchAdminStatus } = useAuthContext();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasOrganization, setHasOrganization] = useState<boolean | null>(null);

  // Redirigir a login si no hay usuario (en efecto, no durante render)
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  // Verificar si el usuario ya tiene organización
  useEffect(() => {
    const checkOrganization = async () => {
      if (!user || authLoading) return;

      try {
        const response = await fetch("/api/admin/check-status", {
          credentials: "include",
        });
        const data = await response.json();

        // Root/dev users: ir directo al dashboard SaaS (no necesitan organización)
        if (data.organization?.isRootUser) {
          router.push("/admin/saas-management/dashboard");
          return;
        }

        if (data.organization?.hasOrganization) {
          // Ya tiene organización, redirigir al admin
          router.push("/admin");
          return;
        }

        setHasOrganization(false);
      } catch (err) {
        console.error("Error checking organization status:", err);
        setHasOrganization(false);
      }
    };

    checkOrganization();
  }, [user, authLoading, router]);

  const handleDemoChoice = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/onboarding/assign-demo", {
        method: "POST",
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Error al asignar organización demo");
      }

      // Refrescar rol admin para que isSuperAdmin se reconozca sin reload
      await refetchAdminStatus();

      // Redirigir al admin con organización demo
      router.push("/admin");
    } catch (err: any) {
      setError(err.message || "Error al asignar organización demo");
      setIsLoading(false);
    }
  };

  const handleRealChoice = () => {
    router.push("/onboarding/create");
  };

  // Mostrar loading mientras se verifica autenticación
  if (authLoading || hasOrganization === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-epoch-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-epoch-accent" />
          <p className="text-[10px] font-display font-bold text-epoch-primary/40 uppercase tracking-widest">
            Verificando identidad...
          </p>
        </div>
      </div>
    );
  }

  // Si no está autenticado, mostrar nada mientras el useEffect redirige
  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-epoch-background relative overflow-hidden px-4 py-12">
      {/* Premium Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-epoch-accent/10 rounded-full blur-[120px] animate-premium-float" />
        <div
          className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-epoch-primary/5 rounded-full blur-[120px] animate-premium-float"
          style={{ animationDelay: "-2s" }}
        />
      </div>

      <div className="w-full max-w-5xl relative z-10">
        {/* Header */}
        <div className="text-center mb-16 animate-in fade-in slide-in-from-bottom-4 duration-1000">
          <div className="inline-flex items-center justify-center mb-10 relative group">
            <Image
              src="/OpttiusTextCentered.svg"
              alt="Opttius"
              width={144}
              height={112}
              className="h-28 w-36 relative z-10 transition-transform duration-500 group-hover:scale-105 object-contain"
            />
          </div>
          <h1 className="text-5xl md:text-6xl font-display font-bold text-epoch-primary mb-4 tracking-tight uppercase">
            BIENVENIDO A{" "}
            <span className="text-epoch-accent italic font-serif lowercase tracking-normal">
              la orden
            </span>
          </h1>
          <p className="text-[11px] font-display font-bold text-epoch-primary/40 uppercase tracking-[0.5em] max-w-xl mx-auto">
            Configuración de Infraestructura Digital
          </p>
        </div>

        {error && (
          <Alert
            variant="destructive"
            className="mb-8 animate-in zoom-in-95 duration-300"
          >
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Choice Cards */}
        <div className="grid md:grid-cols-2 gap-10 h-full">
          {/* Demo Option */}
          <Card
            variant="interactive"
            className="flex flex-col h-full group bg-white border border-epoch-primary/5 rounded-xl shadow-premium hover:shadow-premium-xl hover:border-epoch-accent/30 transition-all duration-500 overflow-hidden"
          >
            <div className="h-2 w-full bg-epoch-primary group-hover:bg-epoch-accent transition-colors duration-500" />
            <CardHeader
              padding="lg"
              className="border-b border-epoch-primary/5"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="p-4 bg-epoch-primary/5 rounded-xl group-hover:bg-epoch-primary group-hover:text-white transition-all duration-500 shadow-sm">
                  <Sparkles className="h-8 w-8 text-epoch-primary group-hover:text-epoch-accent" />
                </div>
                <Badge className="bg-epoch-accent/10 text-epoch-accent border border-epoch-accent/20 px-3 py-1 font-display font-bold text-[9px] tracking-[0.2em] uppercase rounded-xl">
                  EXPERIENCIA INICIAL
                </Badge>
              </div>
              <CardTitle
                size="lg"
                className="text-2xl font-display font-bold text-epoch-primary tracking-tight uppercase"
              >
                Entorno de Prueba
              </CardTitle>
              <CardDescription
                size="lg"
                className="mt-4 font-serif italic text-epoch-primary/60 text-[15px] leading-relaxed"
              >
                Acceda al sistema con una arquitectura pre-configurada. Ideal
                para conocer la suite técnica de Opttius en segundos.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1" padding="lg" spacing="relaxed">
              <div className="space-y-5 mb-10">
                {[
                  "Dashboard con analíticas realistas",
                  "Catálogo completo de armazones y micas",
                  "Flujo integrado de ventas y agenda",
                  "Sin compromiso, migre cuando esté listo",
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-4">
                    <div className="mt-1 bg-epoch-accent/10 rounded-full p-1 border border-epoch-accent/20">
                      <CheckCircle2 className="h-3 w-3 text-epoch-accent" />
                    </div>
                    <span className="text-sm text-epoch-primary/70 font-medium">
                      {item}
                    </span>
                  </div>
                ))}
              </div>

              <Button
                onClick={handleDemoChoice}
                disabled={isLoading}
                size="lg"
                className="w-full bg-epoch-primary hover:bg-epoch-surface text-white rounded-xl font-display font-bold uppercase text-[10px] tracking-[0.3em] h-14 transition-all shadow-xl group/btn overflow-hidden relative"
              >
                <span className="relative z-10 flex items-center justify-center">
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      SINCRONIZANDO...
                    </>
                  ) : (
                    <>
                      COMENZAR DEMO
                      <ArrowRight className="ml-2 h-5 w-5 group-hover/btn:translate-x-2 transition-transform" />
                    </>
                  )}
                </span>
                <div className="absolute inset-0 bg-epoch-accent translate-y-full group-hover/btn:translate-y-0 transition-transform duration-500 opacity-10" />
              </Button>
            </CardContent>
          </Card>

          {/* Real Option */}
          <Card
            variant="interactive"
            className="flex flex-col h-full group bg-white border border-epoch-primary/5 rounded-xl shadow-premium hover:shadow-premium-xl hover:border-epoch-accent/30 transition-all duration-500 overflow-hidden"
          >
            <div className="h-2 w-full bg-epoch-accent" />
            <CardHeader
              padding="lg"
              className="border-b border-epoch-primary/5"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="p-4 bg-epoch-accent/5 rounded-xl group-hover:bg-epoch-accent group-hover:text-white transition-all duration-500 shadow-sm border border-epoch-accent/10">
                  <Building2 className="h-8 w-8 text-epoch-accent group-hover:text-epoch-primary" />
                </div>
                <Badge className="bg-epoch-primary/10 text-epoch-primary border border-epoch-primary/20 px-3 py-1 font-display font-bold text-[9px] tracking-[0.2em] uppercase rounded-xl">
                  PRODUCCIÓN REAL
                </Badge>
              </div>
              <CardTitle
                size="lg"
                className="text-2xl font-display font-bold text-epoch-primary tracking-tight uppercase"
              >
                Configurar mi Óptica
              </CardTitle>
              <CardDescription
                size="lg"
                className="mt-4 font-serif italic text-epoch-primary/60 text-[15px] leading-relaxed"
              >
                Inicie hoy mismo con su propia infraestructura digital.
                Configure su marca, sucursales y equipo de trabajo profesional.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1" padding="lg" spacing="relaxed">
              <div className="space-y-5 mb-10">
                {[
                  "Firma e identidad única de su marca",
                  "Configuración de sedes y laboratorios",
                  "Personalización total de flujos de trabajo",
                  "Arquitectura escalable para crecimiento",
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-4">
                    <div className="mt-1 bg-epoch-accent/10 rounded-full p-1 border border-epoch-accent/20">
                      <CheckCircle2 className="h-3 w-3 text-epoch-accent" />
                    </div>
                    <span className="text-sm text-epoch-primary/70 font-medium">
                      {item}
                    </span>
                  </div>
                ))}
              </div>

              <Button
                onClick={handleRealChoice}
                disabled={isLoading}
                size="lg"
                className="w-full bg-epoch-primary hover:bg-epoch-surface text-white rounded-xl font-display font-bold uppercase text-[10px] tracking-[0.3em] h-14 transition-all shadow-xl group/btn overflow-hidden relative"
              >
                <span className="relative z-10 flex items-center justify-center">
                  INICIAR PROTOCOLO
                  <ArrowRight className="ml-2 h-5 w-5 group-hover/btn:translate-x-2 transition-transform" />
                </span>
                <div className="absolute inset-0 bg-epoch-accent translate-y-full group-hover/btn:translate-y-0 transition-transform duration-500 opacity-10" />
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="mt-16 text-center animate-in fade-in duration-1000 delay-500">
          <p className="text-[10px] font-display font-bold text-epoch-primary/40 uppercase tracking-[0.3em] flex items-center justify-center gap-3">
            ¿Requiere asistencia especializada?{" "}
            <Link
              href="/support"
              className="text-epoch-accent hover:text-epoch-primary transition-colors hover:underline underline-offset-4"
            >
              Contactar Soporte de Élite
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
