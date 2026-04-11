/**
 * Webhook Handler: Parsea payload de Meta y despacha a procesadores
 */

import { processWhatsAppMessage } from "@/lib/ai/agent/whatsapp-adapter";
import { appLogger as logger } from "@/lib/logger";
import { createServiceRoleClient } from "@/utils/supabase/server";

import { WhatsAppClient } from "./client";
import { resolveWhatsAppContext } from "./context-resolver";
import { getOrCreateWhatsAppSession } from "./session-manager";
import type {
  WhatsAppIncomingMessage,
  WhatsAppWebhookPayload,
  WhatsAppWebhookValue,
} from "./types";

export interface ProcessedMessage {
  waId: string;
  phoneNumberId: string;
  messageId: string;
  text: string;
}

/**
 * Procesa el payload del webhook y maneja mensajes entrantes
 */
export async function handleWebhookPayload(
  payload: WhatsAppWebhookPayload,
): Promise<void> {
  if (payload.object !== "whatsapp_business_account") {
    return;
  }

  const entries = payload.entry ?? [];
  for (const entry of entries) {
    const changes = entry.changes ?? [];
    for (const change of changes) {
      if (change.field !== "messages") continue;
      await handleWebhookValue(change.value);
    }
  }
}

async function handleWebhookValue(value: WhatsAppWebhookValue): Promise<void> {
  const messages = value.messages ?? [];
  const phoneNumberId = value.metadata?.phone_number_id;
  if (!phoneNumberId) {
    logger.warn("WhatsApp webhook: missing phone_number_id in metadata");
    return;
  }

  const supabase = createServiceRoleClient();

  for (const msg of messages) {
    const text = extractTextFromMessage(msg);
    if (!text) continue;

    const waId = msg.from;
    const messageId = msg.id;

    const context = await resolveWhatsAppContext(waId, phoneNumberId, supabase);
    if (!context) {
      logger.warn("WhatsApp webhook: could not resolve context", {
        waId,
        phoneNumberId,
      });
      await sendFallbackMessage(phoneNumberId, waId);
      return;
    }

    const sessionId = await getOrCreateWhatsAppSession(
      waId,
      context.organizationId,
      supabase,
    );
    if (!sessionId) {
      logger.error("WhatsApp webhook: could not create session", {
        waId,
        organizationId: context.organizationId,
      });
      await sendFallbackMessage(phoneNumberId, waId);
      return;
    }

    await supabase.from("chat_messages").insert({
      session_id: sessionId,
      role: "user",
      content: text,
      metadata: { channel: "whatsapp", wa_id: waId, message_id: messageId },
    });

    const response = await processWhatsAppMessage(text, context, sessionId);

    await supabase.from("chat_messages").insert({
      session_id: sessionId,
      role: "assistant",
      content: response,
      metadata: { channel: "whatsapp", wa_id: waId },
    });

    const client = WhatsAppClient.forOrganization(phoneNumberId);
    if (client) {
      await client.sendText(waId, response);
    } else {
      logger.error(
        "WhatsApp webhook: could not create client to send response",
        {
          phoneNumberId,
        },
      );
    }
  }
}

function extractTextFromMessage(msg: WhatsAppIncomingMessage): string | null {
  if (msg.type === "text" && msg.text?.body) {
    return msg.text.body.slice(0, 4096);
  }
  const msgAny = msg as { type: string; button?: { text?: string } };
  if (msgAny.type === "button" && msgAny.button?.text) {
    return msgAny.button.text;
  }
  return null;
}

async function sendFallbackMessage(
  phoneNumberId: string,
  waId: string,
): Promise<void> {
  const client = WhatsAppClient.forOrganization(phoneNumberId);
  if (client) {
    await client.sendText(
      waId,
      "Lo siento, no pude identificar tu cuenta. Por favor, contacta directamente a la sucursal.",
    );
  }
}
