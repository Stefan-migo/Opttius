"use client";

import { useEffect, useState } from "react";

/**
 * Hook para detectar el breakpoint actual y tipo de dispositivo
 *
 * Proporciona estado reactivo para responsive design:
 * - isMobile: < 1024px (para lógica de navegación móvil)
 * - isTablet: 640px - 1023px
 * - isDesktop: >= 1024px
 * - isTouch: dispositivo táctil
 * - breakpoint: breakpoint actual
 *
 * @returns Objeto con estados de viewport
 *
 * @example
 * ```typescript
 * function MyComponent() {
 *   const { isMobile, isDesktop, breakpoint } = useMobileView()
 *
 *   if (isMobile) {
 *     // Mostrar bottom nav
 *   }
 * }
 * ```
 */
export function useMobileView() {
  const [viewportState, setViewportState] = useState({
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    isTouch: false,
    breakpoint: "xl" as "xs" | "sm" | "md" | "lg" | "xl" | "2xl",
    width: 0,
  });

  useEffect(() => {
    // Función para determinar el breakpoint actual
    const getBreakpoint = (width: number): typeof viewportState.breakpoint => {
      if (width < 640) return "xs";
      if (width < 768) return "sm";
      if (width < 1024) return "md";
      if (width < 1280) return "lg";
      if (width < 1536) return "xl";
      return "2xl";
    };

    // Función para detectar si es dispositivo táctil
    const detectTouch = (): boolean => {
      if (typeof window === "undefined") return false;
      return (
        "ontouchstart" in window ||
        navigator.maxTouchPoints > 0 ||
        // @ts-expect-error - msMaxTouchPoints es una propiedad legacy pero válida
        navigator.msMaxTouchPoints > 0
      );
    };

    // Actualizar estado
    const updateViewport = () => {
      const width = window.innerWidth;
      const breakpoint = getBreakpoint(width);

      setViewportState({
        isMobile: width < 1024, // lg breakpoint de Tailwind
        isTablet: width >= 640 && width < 1024,
        isDesktop: width >= 1024,
        isTouch: detectTouch(),
        breakpoint,
        width,
      });
    };

    // Ejecutar inicial
    updateViewport();

    // Listener para resize
    window.addEventListener("resize", updateViewport);

    // Cleanup
    return () => window.removeEventListener("resize", updateViewport);
  }, []);

  return viewportState;
}

/**
 * Hook para detectar si el viewport es menor que un breakpoint específico
 *
 * @param maxBreakpoint - Breakpoint máximo (exclusivo)
 * @returns true si el viewport es menor que el breakpoint especificado
 *
 * @example
 * ```typescript
 * function MyComponent() {
 *   const isSmall = useBreakpoint("md") // true si < 768px
 * }
 * ```
 */
export function useBreakpoint(
  maxBreakpoint: "xs" | "sm" | "md" | "lg" | "xl" | "2xl",
) {
  const { isMobile, width } = useMobileView();

  const breakpointValues: Record<string, number> = {
    xs: 640,
    sm: 768,
    md: 1024,
    lg: 1280,
    xl: 1536,
    "2xl": 9999,
  };

  return width < breakpointValues[maxBreakpoint];
}

/**
 * Hook para detectar cambio de orientación en dispositivos móviles
 *
 * @returns "portrait" | "landscape"
 *
 * @example
 * ```typescript
 * function MyComponent() {
 *   const orientation = useOrientation()
 *   // Ajustar layout según orientación
 * }
 * ```
 */
export function useOrientation() {
  const [orientation, setOrientation] = useState<"portrait" | "landscape">(
    "portrait",
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    const checkOrientation = () => {
      setOrientation(
        window.innerHeight > window.innerWidth ? "portrait" : "landscape",
      );
    };

    checkOrientation();
    window.addEventListener("resize", checkOrientation);

    return () => window.removeEventListener("resize", checkOrientation);
  }, []);

  return orientation;
}
