/**
 * Módulo WhatsApp - Integración con Meta Cloud API
 * B2B: Notificaciones Opttius → dueño de óptica
 * B2C: Óptica → clientes (webhook + Agent IA)
 */

export { WhatsAppClient } from "./client";
export type { WhatsAppSendTextRequest, WhatsAppSendResponse } from "./types";
export { WhatsAppSignatureValidator } from "./signature-validator";
export {
  resolveWhatsAppContext,
  normalizePhoneForWhatsApp,
} from "./context-resolver";
export type { WhatsAppContext } from "./context-resolver";
export { getOrCreateWhatsAppSession } from "./session-manager";
export {
  sendLowStockAlertWhatsApp,
  sendAppointmentReminderWhatsApp,
  sendQuoteWhatsApp,
  sendWorkOrderReadyWhatsApp,
  getOrgOwnerPhoneForWhatsApp,
} from "./notifications-b2b";
