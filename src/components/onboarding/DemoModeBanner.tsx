"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { X, Sparkles, ArrowRight } from "lucide-react";

// Tiempo en milisegundos antes de volver a mostrar el banner (24 horas)
const BANNER_REAPPEAR_DELAY = 24 * 60 * 60 * 1000; // 24 horas

export function DemoModeBanner() {
  const router = useRouter();
  const [showBanner, setShowBanner] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    const checkDemoMode = async () => {
      try {
        const response = await fetch("/api/admin/check-status");
        const data = await response.json();

        if (
          data.organization?.isDemoMode &&
          data.organization?.showActivateBanner
        ) {
          setShowBanner(true);
          // Verificar si el banner fue descartado previamente
          const dismissedTimestamp = localStorage.getItem(
            "demo-banner-dismissed-timestamp",
          );
          if (dismissedTimestamp) {
            const dismissedTime = parseInt(dismissedTimestamp, 10);
            const now = Date.now();
            const timeSinceDismissed = now - dismissedTime;

            // Si ha pasado el tiempo determinado, volver a mostrar el banner
            if (timeSinceDismissed >= BANNER_REAPPEAR_DELAY) {
              // Limpiar el timestamp para volver a mostrar el banner
              localStorage.removeItem("demo-banner-dismissed-timestamp");
              setIsDismissed(false);
            } else {
              setIsDismissed(true);
            }
          }
        }
      } catch (err) {
        console.error("Error checking demo mode:", err);
      }
    };

    checkDemoMode();
  }, []);

  const handleActivate = () => {
    router.push("/onboarding/create");
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    // Guardar timestamp en lugar de solo "true"
    localStorage.setItem(
      "demo-banner-dismissed-timestamp",
      Date.now().toString(),
    );
  };

  if (!showBanner || isDismissed) {
    return null;
  }

  return (
    <Alert className="border-admin-accent-secondary/30 bg-admin-bg-secondary/5 mb-6 relative rounded-xl overflow-hidden group shadow-xl backdrop-blur-md">
      {/* Decorative background element */}
      <div className="absolute top-0 right-0 p-4 opacity-[0.03] pointer-events-none group-hover:opacity-[0.06] transition-opacity">
        <Sparkles size={80} />
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-4 py-4 px-4 sm:py-2 sm:px-0">
        <div className="flex items-start sm:items-center gap-4 flex-1 min-w-0">
          <div className="h-10 w-10 sm:h-12 sm:w-12 bg-admin-accent-secondary/10 border border-admin-accent-secondary/20 flex items-center justify-center relative shrink-0">
            <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-admin-accent-secondary animate-pulse" />
            <div className="absolute inset-x-0 bottom-0 h-[2px] bg-admin-accent-secondary shadow-[0_0_8px_rgba(197,160,89,0.5)]" />
          </div>
          <div className="flex flex-col min-w-0">
            <h4 className="text-[10px] font-display font-bold text-admin-accent-secondary uppercase tracking-[0.2em] mb-1">
              Modo Exploración Activo
            </h4>
            <AlertDescription className="text-admin-text-primary text-sm font-medium tracking-tight">
              Estás visualizando el potencial de Opttius con datos de muestra.
              <span className="hidden sm:inline text-admin-text-tertiary ml-2 font-serif italic normal-case">
                ¿Preparado para trascender al control total de tu propia óptica?
              </span>
            </AlertDescription>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 shrink-0">
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              onClick={handleActivate}
              size="sm"
              className="w-full sm:w-auto bg-admin-accent-secondary hover:bg-admin-accent-secondary/90 text-[#1A2B23] font-display font-bold rounded-xl uppercase tracking-widest text-[9px] h-10 sm:h-9 px-4 shadow-lg shadow-admin-accent-secondary/10"
            >
              Activar mi Óptica
              <ArrowRight className="ml-2 h-3.5 w-3.5" />
            </Button>
            <Button
              onClick={handleDismiss}
              variant="ghost"
              size="sm"
              className="w-full sm:w-auto text-admin-text-tertiary hover:text-admin-text-primary hover:bg-admin-bg-secondary/10 font-display font-bold rounded-xl uppercase tracking-widest text-[9px] h-10 sm:h-9"
            >
              Más tarde
            </Button>
          </div>

          <Button
            onClick={handleDismiss}
            variant="ghost"
            size="icon"
            className="h-10 w-10 sm:h-8 sm:w-8 text-admin-text-tertiary/40 hover:text-admin-error hover:bg-admin-error/5 rounded-xl transition-colors self-end sm:self-center"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Alert>
  );
}
