/**
 * Cliente para enviar mensajes vía WhatsApp Cloud API (Meta)
 * Usado para B2B (notificaciones) y B2C (respuestas del Agent)
 */

import type { WhatsAppSendTextRequest, WhatsAppSendResponse } from "./types";
import { appLogger as logger } from "@/lib/logger";

const META_GRAPH_API_BASE = "https://graph.facebook.com/v18.0";

export interface WhatsAppClientOptions {
  phoneNumberId: string;
  accessToken: string;
}

export class WhatsAppClient {
  private phoneNumberId: string;
  private accessToken: string;

  constructor(options: WhatsAppClientOptions) {
    this.phoneNumberId = options.phoneNumberId;
    this.accessToken = options.accessToken;
  }

  /**
   * Envía un mensaje de texto a un número destino (wa_id)
   * @param to - wa_id del destinatario (ej. 56912345678)
   * @param body - Texto del mensaje (máx 4096 caracteres)
   */
  async sendText(to: string, body: string): Promise<WhatsAppSendResponse> {
    const sanitizedBody = body.slice(0, 4096);
    const request: WhatsAppSendTextRequest = {
      messaging_product: "whatsapp",
      to: to.replace(/\D/g, ""),
      type: "text",
      text: { body: sanitizedBody },
    };

    const url = `${META_GRAPH_API_BASE}/${this.phoneNumberId}/messages`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    });

    const data = (await response.json()) as WhatsAppSendResponse;

    if (!response.ok) {
      logger.error("WhatsApp send failed", {
        status: response.status,
        error: data.error,
        to,
      });
      throw new Error(
        data.error?.message || `WhatsApp API error: ${response.status}`,
      );
    }

    return data;
  }

  /**
   * Crea un cliente usando variables de entorno (número oficial Opttius)
   */
  static fromEnv(): WhatsAppClient | null {
    const token = process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    if (!token || !phoneNumberId) {
      return null;
    }
    return new WhatsAppClient({ phoneNumberId, accessToken: token });
  }

  /**
   * Crea un cliente para un organization_id (Embedded Signup)
   * Por ahora usa el token global; en Fase 3 se puede usar access_token por org
   */
  static forOrganization(
    phoneNumberId: string,
    accessToken?: string,
  ): WhatsAppClient | null {
    const token = accessToken || process.env.WHATSAPP_ACCESS_TOKEN;
    if (!token || !phoneNumberId) {
      return null;
    }
    return new WhatsAppClient({ phoneNumberId, accessToken: token });
  }
}
