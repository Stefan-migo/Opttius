"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/**
 * Opciones para el hook useFormProtection
 *
 * @property {boolean} [enabled=true] - Si la protección está habilitada
 * @property {string} [message] - Mensaje a mostrar en la confirmación
 * @property {() => void} [onBeforeUnload] - Callback antes de cerrar/refrescar la página
 */
interface UseFormProtectionOptions {
  enabled?: boolean;
  message?: string;
  onBeforeUnload?: () => void;
}

/**
 * Hook para proteger formularios contra navegación accidental o refresh de página
 * cuando hay cambios sin guardar
 *
 * Este hook intercepta:
 * - Cierre/refresh del navegador (beforeunload)
 * - Navegación programática (router.push/replace)
 * - Navegación por Link de Next.js
 *
 * @param hasUnsavedChanges - Si hay cambios sin guardar en el formulario
 * @param options - Opciones de configuración
 * @returns Objeto con estado y funciones de control:
 * - `isNavigating`: Si se está navegando actualmente
 * - `allowNavigation()`: Función para permitir navegación programáticamente
 *
 * @example
 * ```typescript
 * function MyForm() {
 *   const [hasChanges, setHasChanges] = useState(false)
 *   const { allowNavigation } = useFormProtection(hasChanges)
 *
 *   const handleSave = async () => {
 *     await saveData()
 *     allowNavigation() // Permitir navegación después de guardar
 *     router.push('/success')
 *   }
 * }
 * ```
 */
export function useFormProtection(
  hasUnsavedChanges: boolean,
  options: UseFormProtectionOptions = {},
) {
  const {
    enabled = true,
    message = "Tienes cambios sin guardar. ¿Estás seguro de que quieres salir?",
    onBeforeUnload,
  } = options;

  const router = useRouter();
  const [isNavigating, setIsNavigating] = useState(false);
  const originalPush = useRef(router.push);
  const originalReplace = useRef(router.replace);

  useEffect(() => {
    if (!enabled || !hasUnsavedChanges) {
      return;
    }

    // Prevent browser refresh/close with unsaved changes
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = message;
      onBeforeUnload?.();
      return message;
    };

    // Prevent programmatic navigation with unsaved changes
    const preventNavigation = (url: string) => {
      if (hasUnsavedChanges && !isNavigating) {
        const confirmLeave = window.confirm(message);
        if (!confirmLeave) {
          return false;
        }
      }
      setIsNavigating(true);
      return true;
    };

    // Override router methods to add confirmation
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    router.push = ((url: string, ...args: any[]) => {
      if (preventNavigation(url)) {
        return originalPush.current.call(router, url, ...args);
      }
      return Promise.resolve(false);
    }) as typeof router.push;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    router.replace = ((url: string, ...args: any[]) => {
      if (preventNavigation(url)) {
        return originalReplace.current.call(router, url, ...args);
      }
      return Promise.resolve(false);
    }) as typeof router.replace;

    // Add event listener for browser navigation
    window.addEventListener("beforeunload", handleBeforeUnload);

    // Cleanup function
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      // Restore original router methods
      router.push = originalPush.current;
      router.replace = originalReplace.current;
      setIsNavigating(false);
    };
  }, [
    enabled,
    hasUnsavedChanges,
    message,
    onBeforeUnload,
    router,
    isNavigating,
  ]);

  // Method to manually allow navigation (e.g., after successful save)
  const allowNavigation = () => {
    setIsNavigating(true);
  };

  // Method to block navigation again
  const blockNavigation = () => {
    setIsNavigating(false);
  };

  return {
    allowNavigation,
    blockNavigation,
    isNavigating,
  };
}

/**
 * Simple hook for form state tracking with automatic protection
 */
export function useProtectedForm<T extends Record<string, unknown>>(
  initialData: T,
) {
  const [formData, setFormData] = useState<T>(initialData);
  const [originalData] = useState<T>(initialData);
  const [isSaving, setIsSaving] = useState(false);

  // Check if form has changes
  const hasChanges = JSON.stringify(formData) !== JSON.stringify(originalData);

  // Form protection
  const { allowNavigation, blockNavigation } = useFormProtection(
    hasChanges && !isSaving,
    {
      message:
        "Tienes cambios sin guardar en este formulario. ¿Estás seguro de que quieres salir?",
    },
  );

  // Update form data
  const updateFormData = (updates: Partial<T>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  };

  // Reset form to original state
  const resetForm = () => {
    setFormData(originalData);
    blockNavigation();
  };

  // Mark form as saved (allows navigation)
  const markAsSaved = () => {
    setIsSaving(false);
    allowNavigation();
  };

  // Mark form as saving
  const markAsSaving = () => {
    setIsSaving(true);
    allowNavigation(); // Allow navigation during save
  };

  return {
    formData,
    setFormData,
    updateFormData,
    resetForm,
    hasChanges,
    isSaving,
    markAsSaved,
    markAsSaving,
  };
}
