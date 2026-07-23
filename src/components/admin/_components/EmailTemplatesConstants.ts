export interface EmailTemplate {
  id: string;
  name: string;
  type: string;
  subject: string;
  content: string;
  variables: string[];
  is_active: boolean;
  is_system: boolean;
  usage_count: number;
  created_at: string;
  updated_at: string;
  template_group?: string | null;
}

export const ESSENTIAL_TYPES = [
  "appointment_confirmation", "appointment_reminder", "appointment_reminder_2h",
  "appointment_cancelation", "appointment_rescheduled", "appointment_follow_up_reminder",
  "prescription_expiring", "low_stock_alert", "order_confirmation", "quote_sent",
  "work_order_ready", "work_order_delivered", "order_delivered", "quote_expiring", "account_welcome",
] as const;

export const TYPE_DESCRIPTIONS: Record<string, string> = {
  appointment_confirmation: "Se envía automáticamente al crear la cita",
  appointment_reminder: "Se envía automáticamente 24h antes (cron diario)",
  appointment_reminder_2h: "Se envía automáticamente 2h antes (cron cada hora)",
  appointment_cancelation: "Se envía cuando se cancela una cita",
  appointment_rescheduled: "Se envía cuando se reprograma una cita (cambio fecha/hora)",
  appointment_follow_up_reminder: "Se envía 7 días antes de follow_up_date (Requiere Seguimiento)",
  prescription_expiring: "Se envía 30 días antes de que venza la receta (cron diario)",
  low_stock_alert: "Se envía automáticamente al email de la óptica (contacto/reply-to)",
  order_confirmation: "Se envía automáticamente al crear la orden",
  quote_sent: "Se envía automáticamente al enviar el presupuesto",
  work_order_ready: "Se envía automáticamente cuando los lentes están listos para retiro",
  work_order_delivered: "Se envía automáticamente al marcar entregado, incluye link a encuesta",
  order_delivered: "Se envía automáticamente al confirmar entrega (requiere flujo de entrega)",
  quote_expiring: "Se envía automáticamente 48h antes de expirar (cron diario)",
  account_welcome: "Se envía automáticamente al crear cliente con email",
};

export function getTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    appointment_confirmation: "Confirmación de Cita",
    appointment_reminder: "Recordatorio de Cita (24h)",
    appointment_reminder_2h: "Recordatorio de Cita (2h)",
    appointment_cancelation: "Cancelación de Cita",
    appointment_rescheduled: "Cita Reprogramada",
    appointment_follow_up_reminder: "Recordatorio de Control",
    prescription_expiring: "Receta por Vencer",
    low_stock_alert: "Alerta de Stock Bajo",
    order_confirmation: "Confirmación de Orden",
    quote_sent: "Presupuesto Enviado",
    work_order_ready: "Lentes listo para retiro",
    order_delivered: "Confirmación de entrega",
    quote_expiring: "Presupuesto por expirar",
    account_welcome: "Bienvenida de cuenta",
    order_shipped: "Pedido Enviado",
    password_reset: "Restablecer Contraseña",
    membership_welcome: "Bienvenida Membresía",
    membership_reminder: "Recordatorio Membresía",
    marketing: "Marketing",
    custom: "Personalizado",
    saas_welcome: "Bienvenida SaaS",
    saas_trial_ending: "Fin de Prueba",
    saas_subscription_success: "Suscripción Exitosa",
    saas_subscription_failed: "Error Suscripción",
    saas_payment_reminder: "Recordatorio Pago",
    saas_onboarding_step_1: "Onboarding Paso 1",
    saas_support_ticket_created: "Ticket Creado",
    saas_support_new_response: "Nueva Respuesta",
    saas_support_ticket_assigned: "Ticket Asignado",
    saas_support_ticket_resolved: "Ticket Resuelto",
    demo_approved: "Demo Aprobada",
    demo_expiring: "Demo por Vencer",
    demo_expired: "Demo Expirada",
    demo_post_meeting_followup: "Post-Reunión Followup",
  };
  return labels[type] || type;
}
