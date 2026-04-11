import { useCallback, useEffect, useState } from "react";

import { useDebounce } from "./useDebounce";

export type SlugValidationState = {
  isValidating: boolean;
  isAvailable: boolean | null;
  error: string | null;
};

/**
 * Hook para validar disponibilidad de slug en tiempo real
 *
 * @param slug - El slug a validar
 * @param debounceMs - Tiempo de espera antes de validar (default: 500ms)
 * @returns Estado de validación del slug
 */
export function useSlugValidation(
  slug: string,
  debounceMs: number = 500,
): SlugValidationState {
  const [isValidating, setIsValidating] = useState(false);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  const debouncedSlug = useDebounce(slug, debounceMs);

  const validateSlug = useCallback(async (slugToValidate: string) => {
    // No validar si el slug está vacío o es muy corto
    if (!slugToValidate || slugToValidate.length < 2) {
      setIsAvailable(null);
      setIsValidating(false);
      setError(null);
      return;
    }

    setIsValidating(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/admin/organizations/check-slug?slug=${encodeURIComponent(slugToValidate)}`,
      );

      const data = await response.json();

      if (!response.ok) {
        // Si hay un error de validación (400), el slug no es válido
        if (response.status === 400) {
          setIsAvailable(false);
          setError(data.error || "Formato de slug inválido");
        } else {
          setError("Error al verificar disponibilidad");
          setIsAvailable(null);
        }
      } else {
        setIsAvailable(data.available);
        if (!data.available) {
          setError("Ese identificador ya está en uso. Elige otro.");
        } else {
          setError(null);
        }
      }
    } catch (err) {
      setError("Error al verificar disponibilidad");
      setIsAvailable(null);
    } finally {
      setIsValidating(false);
    }
  }, []);

  useEffect(() => {
    validateSlug(debouncedSlug);
  }, [debouncedSlug, validateSlug]);

  return {
    isValidating,
    isAvailable,
    error,
  };
}
