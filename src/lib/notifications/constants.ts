import {
  AlertTriangle,
  Calendar,
  FileText,
  Info,
  type LucideIcon,
  MessageSquare,
  Package,
  Shield,
  ShoppingCart,
  TrendingUp,
  UserPlus,
} from "lucide-react";

/**
 * Mapeo de tipos de notificación a iconos Lucide.
 * Usado en AdminNotificationDropdown, NotificationsPage y NotificationSettings.
 */
export const NOTIFICATION_ICONS: Record<string, LucideIcon> = {
  // Óptica
  quote_new: FileText,
  quote_status_change: FileText,
  quote_converted: FileText,
  work_order_new: Package,
  work_order_status_change: Package,
  work_order_completed: Package,
  appointment_new: Calendar,
  appointment_cancelled: Calendar,
  // General
  new_customer: UserPlus,
  sale_new: ShoppingCart,
  order_new: ShoppingCart,
  order_status_change: Package,
  // Inventario
  low_stock: AlertTriangle,
  out_of_stock: AlertTriangle,
  // Pagos
  payment_received: TrendingUp,
  payment_failed: AlertTriangle,
  // Soporte
  support_ticket_new: MessageSquare,
  support_ticket_update: MessageSquare,
  // Sistema
  system_alert: Shield,
  system_update: Shield,
  security_alert: Shield,
  custom: Info,
  // Legacy
  new_review: MessageSquare,
  review_pending: MessageSquare,
};

/**
 * Labels en español para cada tipo de notificación.
 */
export const NOTIFICATION_TYPE_LABELS: Record<string, string> = {
  quote_new: "Nuevo Presupuesto",
  quote_status_change: "Cambio de Estado de Presupuesto",
  quote_converted: "Presupuesto Convertido",
  work_order_new: "Nuevo Trabajo",
  work_order_status_change: "Cambio de Estado de Trabajo",
  work_order_completed: "Trabajo Completado",
  new_customer: "Nuevo Cliente",
  sale_new: "Nueva Venta",
  appointment_new: "Nueva Cita",
  appointment_cancelled: "Cita Cancelada",
  order_new: "Nuevo Pedido",
  order_status_change: "Cambio de Estado de Pedido",
  low_stock: "Stock Bajo",
  out_of_stock: "Producto Agotado",
  payment_received: "Pago Recibido",
  payment_failed: "Pago Fallido",
  support_ticket_new: "Nuevo Ticket de Soporte",
  support_ticket_update: "Actualización de Ticket",
  system_alert: "Alerta del Sistema",
  system_update: "Actualización del Sistema",
  security_alert: "Alerta de Seguridad",
  custom: "Personalizada",
  new_review: "Nueva Reseña",
  review_pending: "Reseña Pendiente",
};

/**
 * Labels de prioridad en español.
 */
export const PRIORITY_LABELS: Record<string, string> = {
  low: "Baja",
  medium: "Media",
  high: "Alta",
  urgent: "Urgente",
};

/**
 * Colores de prioridad usando tokens admin (Epoch design system).
 * Para badges y pills en dropdown y página.
 */
export const PRIORITY_COLORS: Record<string, string> = {
  low: "text-admin-text-tertiary bg-admin-bg-tertiary",
  medium: "text-admin-info bg-admin-info/10",
  high: "text-admin-warning bg-admin-warning/10",
  urgent: "text-admin-error bg-admin-error/10",
};

/**
 * Colores de prioridad para NotificationSettings (badges más compactos).
 */
export const PRIORITY_BADGE_COLORS: Record<string, string> = {
  low: "bg-admin-bg-tertiary text-admin-text-tertiary",
  medium: "bg-admin-info/20 text-admin-info",
  high: "bg-admin-warning/20 text-admin-warning",
  urgent: "bg-admin-error/20 text-admin-error",
};

/**
 * Formatea la fecha relativa ("Hace X min/h/días").
 */
export function formatTimeSince(date: string): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);

  if (seconds < 60) return "Hace un momento";
  if (seconds < 3600) return `Hace ${Math.floor(seconds / 60)} min`;
  if (seconds < 86400) return `Hace ${Math.floor(seconds / 3600)} h`;
  if (seconds < 604800) return `Hace ${Math.floor(seconds / 86400)} días`;
  return new Date(date).toLocaleDateString("es-AR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
