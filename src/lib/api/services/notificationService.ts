/**
 * Notification Service
 *
 * Servicio centralizado para manejo de notificaciones toast en toda la aplicación.
 * Proporciona una interfaz consistente para mostrar notificaciones de éxito,
 * error, información y advertencia.
 *
 * @module lib/api/services/notificationService
 */

import { toast } from "sonner";

/**
 * Opciones para notificaciones toast
 */
interface ToastOptions {
  duration?: number;
  position?:
    | "top-left"
    | "top-right"
    | "bottom-left"
    | "bottom-right"
    | "top-center"
    | "bottom-center";
  style?: React.CSSProperties;
  className?: string;
  unstyled?: boolean;
  icons?: {
    success?: React.ReactNode;
    error?: React.ReactNode;
    info?: React.ReactNode;
    warning?: React.ReactNode;
    loading?: React.ReactNode;
  };
  closeButton?: boolean;
  actionButtonText?: string;
  cancelButtonText?: string;
  onAction?: () => void;
  onCancel?: () => void;
  onDismiss?: () => void;
}

/**
 * Opciones por defecto para notificaciones
 */
const defaultOptions: ToastOptions = {
  duration: 4000,
  position: "top-right",
};

/**
 * Opciones para notificaciones de éxito
 */
const successOptions: ToastOptions = {
  ...defaultOptions,
  duration: 3000,
};

/**
 * Opciones para notificaciones de error
 */
const errorOptions: ToastOptions = {
  ...defaultOptions,
  duration: 5000,
};

/**
 * Opciones para notificaciones de información
 */
const infoOptions: ToastOptions = {
  ...defaultOptions,
  duration: 4000,
};

/**
 * Opciones para notificaciones de advertencia
 */
const warningOptions: ToastOptions = {
  ...defaultOptions,
  duration: 4000,
};

/**
 * Muestra una notificación de éxito
 *
 * @param message - Mensaje principal
 * @param options - Opciones adicionales
 *
 * @example
 * success("Cliente creado exitosamente")
 * success("Orden procesada", { description: "Orden #1234 ha sido procesada" })
 */
export function success(message: string, options?: ToastOptions): void {
  toast.success(message, { ...successOptions, ...options });
}

/**
 * Muestra una notificación de error
 *
 * @param message - Mensaje principal
 * @param options - Opciones adicionales
 *
 * @example
 * error("Error al crear cliente")
 * error("Error de conexión", { description: "No se pudo conectar al servidor" })
 */
export function error(message: string, options?: ToastOptions): void {
  toast.error(message, { ...errorOptions, ...options });
}

/**
 * Muestra una notificación de información
 *
 * @param message - Mensaje principal
 * @param options - Opciones adicionales
 *
 * @example
 * info("Guardando cambios...")
 * info("Nueva versión disponible", { description: "Versión 2.0.0 está disponible" })
 */
export function info(message: string, options?: ToastOptions): void {
  toast(message, { ...infoOptions, ...options });
}

/**
 * Muestra una notificación de advertencia
 *
 * @param message - Mensaje principal
 * @param options - Opciones adicionales
 *
 * @example
 * warning("Stock bajo")
 * warning("Acción irreversible", { description: "Esta acción no se puede deshacer" })
 */
export function warning(message: string, options?: ToastOptions): void {
  toast.warning(message, { ...warningOptions, ...options });
}

/**
 * Muestra una notificación de carga
 *
 * @param message - Mensaje principal
 * @param options - Opciones adicionales
 * @returns Función para dismiss la notificación
 *
 * @example
 * const dismiss = loading("Procesando orden...");
 * // ... después de procesar
 * dismiss();
 */
export function loading(message: string, options?: ToastOptions): () => void {
  const id = toast.loading(message, { ...defaultOptions, ...options });
  return () => toast.dismiss(id);
}

/**
 * Muestra una notificación de promesa
 *
 * @param promise - Promesa a ejecutar
 * @param messages - Mensajes para loading, success y error
 * @returns Promesa con el resultado
 *
 * @example
 * await promise(
 *   fetchCustomers(),
 *   {
 *     loading: "Cargando clientes...",
 *     success: "Clientes cargados",
 *     error: "Error al cargar clientes"
 *   }
 * )
 */
export function promise<T>(
  promise: Promise<T>,
  messages: {
    loading: string;
    success: string | ((data: T) => string);
    error: string | ((error: unknown) => string);
  },
): Promise<T> {
  return toast.promise(promise, {
    loading: messages.loading,
    success: messages.success,
    error: messages.error,
  }) as unknown as Promise<T>;
}

/**
 * Muestra una notificación personalizada
 *
 * @param message - Mensaje principal
 * @param options - Opciones adicionales
 *
 * @example
 * custom("Notificación personalizada", { icon: <Icon /> })
 */
export function custom(message: string, options?: ToastOptions): void {
  toast(message, { ...defaultOptions, ...options });
}

/**
 * Descarta todas las notificaciones activas
 *
 * @example
 * dismissAll();
 */
export function dismissAll(): void {
  toast.dismiss();
}

/**
 * Descarta una notificación específica
 *
 * @param id - ID de la notificación a descartar
 *
 * @example
 * dismiss(toastId);
 */
export function dismiss(id: string | number): void {
  toast.dismiss(id);
}

/**
 * Muestra una notificación de éxito con acción
 *
 * @param message - Mensaje principal
 * @param action - Objeto con la acción
 * @param options - Opciones adicionales
 *
 * @example
 * successWithAction("Cliente creado", {
 *   label: "Ver cliente",
 *   onClick: () => router.push(`/customers/${id}`)
 * })
 */
export function successWithAction(
  message: string,
  action: {
    label: string;
    onClick: () => void;
  },
  options?: ToastOptions,
): void {
  toast.success(message, {
    ...successOptions,
    ...options,
    action,
  });
}

/**
 * Muestra una notificación de error con acción
 *
 * @param message - Mensaje principal
 * @param action - Objeto con la acción
 * @param options - Opciones adicionales
 *
 * @example
 * errorWithAction("Error al guardar", {
 *   label: "Reintentar",
 *   onClick: () => retry()
 * })
 */
export function errorWithAction(
  message: string,
  action: {
    label: string;
    onClick: () => void;
  },
  options?: ToastOptions,
): void {
  toast.error(message, {
    ...errorOptions,
    ...options,
    action,
  });
}

/**
 * Muestra una notificación de información con acción
 *
 * @param message - Mensaje principal
 * @param action - Objeto con la acción
 * @param options - Opciones adicionales
 *
 * @example
 * infoWithAction("Nuevas actualizaciones", {
 *   label: "Ver más",
 *   onClick: () => router.push("/updates")
 * })
 */
export function infoWithAction(
  message: string,
  action: {
    label: string;
    onClick: () => void;
  },
  options?: ToastOptions,
): void {
  toast(message, {
    ...infoOptions,
    ...options,
    action,
  });
}

/**
 * Muestra una notificación de advertencia con acción
 *
 * @param message - Mensaje principal
 * @param action - Objeto con la acción
 * @param options - Opciones adicionales
 *
 * @example
 * warningWithAction("Cambios sin guardar", {
 *   label: "Guardar",
 *   onClick: () => saveChanges()
 * })
 */
export function warningWithAction(
  message: string,
  action: {
    label: string;
    onClick: () => void;
  },
  options?: ToastOptions,
): void {
  toast.warning(message, {
    ...warningOptions,
    ...options,
    action,
  });
}

/**
 * Exportar el servicio completo
 */
export const NotificationService = {
  success,
  error,
  info,
  warning,
  loading,
  promise,
  custom,
  dismissAll,
  dismiss,
  successWithAction,
  errorWithAction,
  infoWithAction,
  warningWithAction,
};

// Re-exportar toast de sonner para compatibilidad
export { toast };
