/**
 * Tipos para el módulo WhatsApp (Meta Cloud API)
 * @see https://developers.facebook.com/docs/whatsapp/cloud-api
 */

/** Payload webhook entrante de Meta */
export interface WhatsAppWebhookPayload {
  object: string;
  entry?: WhatsAppWebhookEntry[];
}

export interface WhatsAppWebhookEntry {
  id: string;
  changes?: WhatsAppWebhookChange[];
}

export interface WhatsAppWebhookChange {
  value: WhatsAppWebhookValue;
  field: string;
}

export interface WhatsAppWebhookValue {
  messaging_product: "whatsapp";
  metadata: {
    display_phone_number: string;
    phone_number_id: string;
  };
  contacts?: Array<{
    wa_id: string;
    profile: { name: string };
  }>;
  messages?: WhatsAppIncomingMessage[];
  statuses?: WhatsAppStatus[];
  errors?: WhatsAppError[];
}

export interface WhatsAppIncomingMessage {
  from: string;
  id: string;
  timestamp: string;
  type: "text" | "image" | "audio" | "video" | "document" | "location";
  text?: { body: string };
  image?: { id: string; caption?: string };
  audio?: { id: string };
  video?: { id: string; caption?: string };
  document?: { id: string; filename?: string; caption?: string };
  location?: {
    latitude: number;
    longitude: number;
    name?: string;
    address?: string;
  };
}

export interface WhatsAppStatus {
  id: string;
  status: "sent" | "delivered" | "read";
  timestamp: string;
  recipient_id: string;
}

export interface WhatsAppError {
  code: number;
  title: string;
  message: string;
  error_data?: Record<string, unknown>;
}

/** Request para enviar mensaje de texto */
export interface WhatsAppSendTextRequest {
  messaging_product: "whatsapp";
  to: string;
  type: "text";
  text: { body: string };
}

/** Response de la API de envío */
export interface WhatsAppSendResponse {
  messaging_product: "whatsapp";
  contacts?: Array<{
    input: string;
    wa_id: string;
  }>;
  messages?: Array<{
    id: string;
  }>;
  error?: {
    message: string;
    type: string;
    code: number;
    error_subcode?: number;
    fbtrace_id: string;
  };
}
