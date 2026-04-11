/**
 * Módulo WhatsApp - Integración con Meta Cloud API
 * B2B: Notificaciones Opttius → dueño de óptica
 * B2C: Óptica → clientes (webhook + Agent IA)
 */

export { WhatsAppClient } from "./client";
export type { WhatsAppContext } from "./context-resolver";
export {
  normalizePhoneForWhatsApp,
  resolveWhatsAppContext,
} from "./context-resolver";
export {
  getOrgOwnerPhoneForWhatsApp,
  sendAppointmentReminderWhatsApp,
  sendLowStockAlertWhatsApp,
  sendQuoteWhatsApp,
  sendWorkOrderReadyWhatsApp,
} from "./notifications-b2b";
export { getOrCreateWhatsAppSession } from "./session-manager";
export { WhatsAppSignatureValidator } from "./signature-validator";
export type { WhatsAppSendResponse, WhatsAppSendTextRequest } from "./types";
