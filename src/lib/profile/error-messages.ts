/**
 * Mapeo de códigos de error de Supabase a mensajes amigables en español.
 *
 * @module lib/profile/error-messages
 */

export interface SupabaseError {
  code?: string;
  message?: string;
}

const ERROR_MAP: Record<string, string> = {
  "23505": "El valor ya existe para otro usuario.",
  PGRST116: "No se encontró el perfil.",
  "42501": "No tienes permiso para realizar esta acción.",
  "42P01": "Error de configuración. Contacta al administrador.",
  "22P02": "Formato de datos inválido.",
  "23503": "Referencia inválida. Verifica los datos.",
  "23502": "Faltan campos requeridos.",
};

/**
 * Obtiene un mensaje de error amigable a partir de un error de Supabase.
 */
export function getProfileErrorMessage(error: SupabaseError | null): string {
  if (!error) {
    return "Error al actualizar el perfil.";
  }

  const mapped = ERROR_MAP[error.code ?? ""];
  if (mapped) {
    return mapped;
  }

  if (error.message) {
    return error.message;
  }

  return "Error al actualizar el perfil.";
}
