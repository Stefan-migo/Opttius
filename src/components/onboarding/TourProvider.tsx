"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTour } from "@/hooks/useTour";
import { useRoot } from "@/hooks/useRoot";
import { TourOverlay } from "./TourOverlay";
import { TourCard } from "./TourCard";
import { TourProgress } from "./TourProgress";
import { TOUR_STEPS, TOUR_CONFIG } from "@/lib/onboarding/tour-config";

interface TourProviderProps {
  children: React.ReactNode;
}

export function TourProvider({ children }: TourProviderProps) {
  const {
    progress,
    isLoading,
    currentStep,
    totalSteps,
    isActive,
    isNotStarted,
    startTour,
    completeStep,
    completeTour,
    skipTour,
    isStarting,
    goToStep,
  } = useTour();

  const { isRoot } = useRoot();

  const pathname = usePathname();
  const router = useRouter();
  const [elementBounds, setElementBounds] = useState<DOMRect | null>(null);
  const [mounted, setMounted] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [forceDisabled, setForceDisabled] = useState(false);
  const [hasCompletedInvalidStep, setHasCompletedInvalidStep] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Deshabilitar tour cuando está desactivado por configuración (feature flag)
  useEffect(() => {
    if (!TOUR_CONFIG.enabled) {
      setForceDisabled(true);
    }
  }, []);

  // Deshabilitar tour para usuarios root/dev
  useEffect(() => {
    if (isRoot) {
      setForceDisabled(true);
    }
  }, [isRoot]);

  // Auto-iniciar tour en primera visita - optimizado para evitar múltiples renders
  const hasAutoStartedRef = useRef(false);
  useEffect(() => {
    // No iniciar tour si es usuario root/dev o ya se inició
    if (isRoot || forceDisabled || hasAutoStartedRef.current) {
      return;
    }

    if (
      !isLoading &&
      isNotStarted &&
      TOUR_CONFIG.autoStart &&
      !isStarting &&
      mounted &&
      !forceDisabled &&
      pathname.startsWith("/admin")
    ) {
      // Marcar como iniciado inmediatamente para evitar múltiples llamadas
      hasAutoStartedRef.current = true;

      // Esperar un tiempo reducido ya que usamos páginas mockup (más rápidas)
      const timer = setTimeout(
        () => {
          startTour();
        },
        TOUR_CONFIG.useMockupPages ? 500 : 1500,
      );
      return () => clearTimeout(timer);
    }
  }, [
    isLoading,
    isNotStarted,
    startTour,
    isStarting,
    mounted,
    pathname,
    forceDisabled,
    isRoot,
  ]);

  // Navegar a la página correcta si el paso requiere una página específica
  useEffect(() => {
    if (!isActive || !mounted || isNavigating) return;

    const currentStepData = TOUR_STEPS[currentStep];
    if (!currentStepData) return;

    // Usar páginas mockup si está habilitado para mejor performance
    const useMockup = TOUR_CONFIG.useMockupPages;
    const basePath = useMockup ? TOUR_CONFIG.mockupBasePath : "/admin";

    // Mapear secciones a rutas
    const sectionToRoute: Record<string, string> = {
      dashboard: useMockup ? `${basePath}?section=dashboard` : "/admin",
      customers: useMockup
        ? `${basePath}?section=customers`
        : "/admin/customers",
      products: useMockup ? `${basePath}?section=products` : "/admin/products",
      quotes: useMockup ? `${basePath}?section=quotes` : "/admin/quotes",
      "work-orders": useMockup
        ? `${basePath}?section=work-orders`
        : "/admin/work-orders",
      appointments: useMockup
        ? `${basePath}?section=appointments`
        : "/admin/appointments",
      pos: useMockup ? `${basePath}?section=pos` : "/admin/pos",
      analytics: useMockup
        ? `${basePath}?section=analytics`
        : "/admin/analytics",
      system: useMockup ? `${basePath}?section=system` : "/admin/system",
    };

    const requiredRoute = sectionToRoute[currentStepData.section];
    if (!requiredRoute) return;

    // Para páginas mockup, comparar también los query params
    if (useMockup) {
      // Leer query params del URL actual
      const currentSection =
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search).get("section")
          : null;
      const requiredSection = currentStepData.section;

      // Si estamos en la ruta base pero con una sección diferente, navegar
      if (pathname === basePath) {
        if (currentSection !== requiredSection) {
          setIsNavigating(true);
          router.push(requiredRoute);
          setTimeout(() => setIsNavigating(false), 50);
          return;
        }
      } else {
        // Si no estamos en la ruta base, navegar a ella
        setIsNavigating(true);
        router.push(requiredRoute);
        setTimeout(() => setIsNavigating(false), 50);
        return;
      }
    } else {
      // Para páginas reales, comparar solo el pathname
      const requiredPath = requiredRoute.split("?")[0];
      if (pathname !== requiredPath) {
        setIsNavigating(true);
        router.push(requiredRoute);
        setTimeout(() => setIsNavigating(false), 100);
        return;
      }
    }
  }, [currentStep, isActive, pathname, mounted, router, isNavigating]);

  // Función para buscar el elemento con múltiples intentos - optimizada
  const findElement = useCallback(
    (
      selector: string,
      maxAttempts = 8,
      delay = 200,
    ): Promise<DOMRect | null> => {
      return new Promise((resolve) => {
        let attempts = 0;
        const warned = false; // Solo loguear una vez

        const tryFind = () => {
          attempts++;
          const element = document.querySelector(selector);

          if (element) {
            const rect = element.getBoundingClientRect();
            // Verificar que el elemento sea visible
            if (rect.width > 0 && rect.height > 0) {
              resolve(rect);
              return;
            }
          }

          if (attempts < maxAttempts) {
            setTimeout(tryFind, delay);
          } else {
            // No loguear - el tour funcionará sin el elemento (mostrando la tarjeta centrada)
            resolve(null);
          }
        };

        tryFind();
      });
    },
    [],
  );

  // Actualizar bounds del elemento cuando cambia el paso o la ruta
  useEffect(() => {
    if (!isActive || !mounted || isNavigating) {
      setElementBounds(null);
      return;
    }

    const currentStepData = TOUR_STEPS[currentStep];
    if (!currentStepData) {
      setElementBounds(null);
      return;
    }

    // Buscar el elemento con múltiples intentos - optimizado para páginas mockup
    const findElementAsync = async () => {
      // Reducir delay para páginas mockup (carga más rápida)
      const delay = TOUR_CONFIG.useMockupPages ? 100 : 300;
      await new Promise((resolve) => setTimeout(resolve, delay));

      // Reducir intentos para páginas mockup (elementos siempre presentes)
      const maxAttempts = TOUR_CONFIG.useMockupPages ? 3 : 8;
      const attemptDelay = TOUR_CONFIG.useMockupPages ? 50 : 200;

      const bounds = await findElement(
        currentStepData.selector,
        maxAttempts,
        attemptDelay,
      );
      setElementBounds(bounds);
    };

    findElementAsync();
  }, [currentStep, isActive, pathname, mounted, isNavigating, findElement]);

  // Si no hay datos del paso, completar el tour automáticamente en un efecto
  // DEBE estar antes de cualquier return condicional
  const currentStepData = TOUR_STEPS[currentStep];
  useEffect(() => {
    if (isActive && !currentStepData && !hasCompletedInvalidStep) {
      setHasCompletedInvalidStep(true);
      completeTour();
    }
  }, [isActive, currentStepData, completeTour, hasCompletedInvalidStep]);

  // Handlers - deben estar antes de cualquier return para cumplir con las reglas de hooks
  const handleSkip = useCallback(() => {
    // Deshabilitar inmediatamente el tour localmente
    setForceDisabled(true);
    // Llamar a skipTour para actualizar el servidor
    skipTour();
  }, [skipTour]);

  const handleNext = useCallback(() => {
    if (currentStep < totalSteps - 1) {
      completeStep(currentStep);
    } else {
      completeTour();
    }
  }, [currentStep, totalSteps, completeStep, completeTour]);

  const handlePrevious = useCallback(() => {
    if (currentStep > 0 && goToStep) {
      // Retroceder al paso anterior usando goToStep
      goToStep(currentStep - 1);
    }
  }, [currentStep, goToStep]);

  // Si el tour está desactivado por config, no está activo, fue forzado a deshabilitarse, o es usuario root/dev, solo renderizar children
  if (
    !TOUR_CONFIG.enabled ||
    !isActive ||
    !mounted ||
    forceDisabled ||
    isRoot
  ) {
    return <>{children}</>;
  }

  if (!currentStepData) {
    return <>{children}</>;
  }

  return (
    <>
      {children}
      {TOUR_CONFIG.showProgress && (
        <TourProgress
          currentStep={currentStep}
          totalSteps={totalSteps}
          onSkip={handleSkip}
        />
      )}
      {/* Mostrar overlay y tarjeta incluso si no se encuentra el elemento */}
      <TourOverlay selector={currentStepData.selector} isActive={isActive}>
        <TourCard
          step={currentStepData}
          currentStep={currentStep}
          totalSteps={totalSteps}
          onNext={handleNext}
          onPrevious={handlePrevious}
          onSkip={handleSkip}
          onComplete={completeTour}
          position={currentStepData.position}
          elementBounds={elementBounds}
        />
      </TourOverlay>
    </>
  );
}
