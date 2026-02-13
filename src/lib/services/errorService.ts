/**
 * Error Service
 * 
 * Servicio centralizado para manejo consistente de errores en toda la aplicación.
 * Proporciona funciones para extraer mensajes de error, manejar errores de API,
 * y mostrar notificaciones de error al usuario.
 * 
 * @module lib/services/errorService
 */

import { toast } from "sonner";

/**
 * Tipos de error conocidos
 */
export type ErrorType = 
  | "network"
  | "authentication"
  | "authorization"
  | "validation"
  | "not_found"
  | "server"
  | "unknown";

/**
 * Interfaz para errores estandarizados
 */
export interface StandardError {
  type: ErrorType;
  message: string;
  userMessage: string;
  code?: string;
  details?: any;
  timestamp: string;
}

/**
 * Extrae el mensaje de error de un error desconocido
 * 
 * @param error - Error a procesar
 * @returns Mensaje de error extraído
 * 
 * @example
 * extractErrorMessage(new Error("Something went wrong")) // "Something went wrong"
 * extractErrorMessage("Custom error message") // "Custom error message"
 * extractErrorMessage({ message: "Error object" }) // "Error object"
 * extractErrorMessage(null) // "An unexpected error occurred"
 */
export function extractErrorMessage(error: unknown): string {
  if (!error) {
    return "An unexpected error occurred";
  }

  // Error de tipo Error
  if (error instanceof Error) {
    return error.message;
  }

  // String
  if (typeof error === "string") {
    return error;
  }

  // Objeto con propiedad message
  if (typeof error === "object" && error !== null) {
    if ("message" in error && typeof error.message === "string") {
      return error.message;
    }
    if ("error" in error && typeof error.error === "string") {
      return error.error;
    }
    if ("error" in error && typeof error.error === "object" && error.error !== null) {
      if ("message" in error.error && typeof error.error.message === "string") {
        return error.error.message;
      }
    }
  }

  // Fallback
  return "An unexpected error occurred";
}

/**
 * Determina el tipo de error basado en el error
 * 
 * @param error - Error a clasificar
 * @returns Tipo de error
 */
export function classifyError(error: unknown): ErrorType {
  if (!error) {
    return "unknown";
  }

  const message = extractErrorMessage(error).toLowerCase();

  // Network errors
  if (message.includes("network") || message.includes("fetch") || message.includes("connection")) {
    return "network";
  }

  // Authentication errors
  if (message.includes("unauthorized") || message.includes("authentication") || message.includes("not authenticated")) {
    return "authentication";
  }

  // Authorization errors
  if (message.includes("forbidden") || message.includes("permission") || message.includes("not authorized")) {
    return "authorization";
  }

  // Validation errors
  if (message.includes("validation") || message.includes("invalid") || message.includes("required")) {
    return "validation";
  }

  // Not found errors
  if (message.includes("not found") || message.includes("404")) {
    return "not_found";
  }

  // Server errors
  if (message.includes("server") || message.includes("500") || message.includes("internal")) {
    return "server";
  }

  return "unknown";
}

/**
 * Crea un error estandarizado
 * 
 * @param error - Error original
 * @param context - Contexto adicional del error
 * @returns Error estandarizado
 */
export function createStandardError(error: unknown, context?: string): StandardError {
  const message = extractErrorMessage(error);
  const type = classifyError(error);
  const userMessage = getUserFriendlyMessage({ type, message, userMessage: "", timestamp: new Date().toISOString() });

  return {
    type,
    message: context ? `[${context}] ${message}` : message,
    userMessage,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Maneja un error de API de manera consistente
 * 
 * @param error - Error a manejar
 * @param context - Contexto del error (ej: "Customer API", "Order API")
 * @param showToast - Si debe mostrar notificación toast (default: true)
 * @returns Error estandarizado
 * 
 * @example
 * try {
 *   await fetchCustomers();
 * } catch (error) {
 *   handleApiError(error, "Customer API");
 * }
 */
export function handleApiError(error: unknown, context: string = "API", showToast: boolean = true): StandardError {
  const standardError = createStandardError(error, context);

  // Log del error para debugging
  console.error(`[${context}] Error:`, error);

  // Mostrar notificación toast si está habilitado
  if (showToast) {
    const userMessage = getUserFriendlyMessage(standardError);
    toast.error(userMessage, {
      description: standardError.message,
      duration: 5000,
    });
  }

  return standardError;
}

/**
 * Obtiene un mensaje amigable para el usuario basado en el tipo de error
 * 
 * @param error - Error estandarizado
 * @returns Mensaje amigable para el usuario
 */
export function getUserFriendlyMessage(error: StandardError): string {
  switch (error.type) {
    case "network":
      return "Error de conexión";
    case "authentication":
      return "Error de autenticación";
    case "authorization":
      return "No tienes permiso para realizar esta acción";
    case "validation":
      return "Error de validación";
    case "not_found":
      return "Recurso no encontrado";
    case "server":
      return "Error del servidor";
    default:
      return "Error inesperado";
  }
}

/**
 * Maneja un error de validación
 * 
 * @param error - Error de validación
 * @param context - Contexto del error
 * @returns Error estandarizado
 */
export function handleValidationError(error: unknown, context: string = "Validation"): StandardError {
  return handleApiError(error, context, true);
}

/**
 * Maneja un error de red
 * 
 * @param error - Error de red
 * @param context - Contexto del error
 * @returns Error estandarizado
 */
export function handleNetworkError(error: unknown, context: string = "Network"): StandardError {
  return handleApiError(error, context, true);
}

/**
 * Maneja un error de autenticación
 * 
 * @param error - Error de autenticación
 * @param context - Contexto del error
 * @returns Error estandarizado
 */
export function handleAuthenticationError(error: unknown, context: string = "Authentication"): StandardError {
  const standardError = handleApiError(error, context, true);
  
  // Redirigir a login si es un error de autenticación
  if (typeof window !== "undefined") {
    // Opcional: redirigir a login
    // window.location.href = "/login";
  }
  
  return standardError;
}

/**
 * Maneja un error de autorización
 * 
 * @param error - Error de autorización
 * @param context - Contexto del error
 * @returns Error estandarizado
 */
export function handleAuthorizationError(error: unknown, context: string = "Authorization"): StandardError {
  return handleApiError(error, context, true);
}

/**
 * Maneja un error de servidor
 * 
 * @param error - Error de servidor
 * @param context - Contexto del error
 * @returns Error estandarizado
 */
export function handleServerError(error: unknown, context: string = "Server"): StandardError {
  return handleApiError(error, context, true);
}

/**
 * Maneja un error genérico
 * 
 * @param error - Error a manejar
 * @param context - Contexto del error
 * @returns Error estandarizado
 */
export function handleGenericError(error: unknown, context: string = "Error"): StandardError {
  return handleApiError(error, context, true);
}

/**
 * Wrapper para funciones asíncronas que maneja errores automáticamente
 * 
 * @param fn - Función asíncrona a ejecutar
 * @param context - Contexto del error
 * @returns Resultado de la función o null si hay error
 * 
 * @example
 * const result = await withErrorHandling(async () => {
 *   return await fetchCustomers();
 * }, "Customer API");
 */
export async function withErrorHandling<T>(
  fn: () => Promise<T>,
  context: string = "Operation"
): Promise<T | null> {
  try {
    return await fn();
  } catch (error) {
    handleApiError(error, context);
    return null;
  }
}

/**
 * Exportar el servicio completo
 */
export const ErrorService = {
  extractErrorMessage,
  classifyError,
  createStandardError,
  handleApiError,
  handleValidationError,
  handleNetworkError,
  handleAuthenticationError,
  handleAuthorizationError,
  handleServerError,
  handleGenericError,
  getUserFriendlyMessage,
  withErrorHandling,
};
