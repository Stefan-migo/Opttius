/**
 * WhatsApp Adapter: Conecta mensajes WhatsApp con el Agent
 * Usa el mismo Agent (core.ts) con config por canal (whatsapp / whatsapp_customer)
 */

import { appLogger as logger } from "@/lib/logger";
import type { WhatsAppContext } from "@/lib/whatsapp/context-resolver";

import { createAgent } from "./core";

/** Tools permitidas para clientes (consulta + confirmación, validan ownership) */
export const CUSTOMER_SAFE_TOOLS: string[] = [
  "getAppointmentStatus",
  "getQuoteStatus",
  "getOrderStatus",
  "confirmAppointment",
];

/**
 * Procesa un mensaje WhatsApp y devuelve la respuesta del Agent
 */
export async function processWhatsAppMessage(
  userMessage: string,
  context: WhatsAppContext,
  sessionId: string,
): Promise<string> {
  const agentContext =
    context.role === "admin" ? "whatsapp" : "whatsapp_customer";

  const userId =
    context.role === "admin" && context.userId
      ? context.userId
      : `whatsapp:${context.waId}`;

  const agent = await createAgent({
    userId,
    organizationId: context.organizationId,
    currentBranchId: context.branchId,
    sessionId,
    context: agentContext,
    config: {
      enabledTools: context.role === "admin" ? undefined : CUSTOMER_SAFE_TOOLS,
      enableKnowledgeBase: true,
    },
    skipAdminActivityLog: context.role === "customer",
    customerId: context.customerId,
    userData: context.role === "admin" ? { role: "admin" } : undefined,
  });

  await agent.loadSessionHistory(sessionId);
  await agent.loadOrganizationalContext();

  try {
    const response = await agent.chat(userMessage);
    return response;
  } catch (error) {
    logger.error("WhatsApp adapter: Agent chat failed", {
      waId: context.waId,
      organizationId: context.organizationId,
      error: error instanceof Error ? error.message : String(error),
    });
    return "Lo siento, hubo un error al procesar tu mensaje. Por favor, contacta a la sucursal directamente.";
  }
}
