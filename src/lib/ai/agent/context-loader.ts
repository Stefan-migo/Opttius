import type { SupabaseClient } from "@supabase/supabase-js";

import { appLogger } from '@/lib/logger';

import type { OrganizationalMemory } from "../memory/organizational";
import type { LLMMessage } from "../types";
import { getAgentConfig } from "./config";
import type { AgentConfig } from "./core";
/**
 * Load conversation history from database for session continuity.
 * Returns the messages array (including system prompt) or empty array on failure.
 */
export async function loadSessionHistory(
  supabase: SupabaseClient | undefined,
  sessionId: string,
  context: string | undefined,
  customConfig: AgentConfig | undefined,
  knowledgeBaseEnabled: boolean,
  getKnowledgeBaseContext: () => Promise<string | null>,
  limit: number = 50,
): Promise<LLMMessage[]> {
  try {
    if (!supabase) return [];

    const { data: messages, error } = await supabase
      .from("chat_messages")
      .select("role, content, tool_calls, metadata, created_at")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true })
      .limit(limit);

    if (error) {
      appLogger.error("Error loading session history:", error);
      return [];
    }

    if (!messages || messages.length === 0) {
      appLogger.info("No previous messages found for session:", sessionId);
      return [];
    }

    appLogger.info(`Loading ${messages.length} messages from session history`);

    // Get the system prompt from config
    const baseConfig = getAgentConfig(context);
    let systemPrompt =
      customConfig?.systemPrompt ?? baseConfig.systemPrompt;

    // Add knowledge base context if enabled
    if (knowledgeBaseEnabled) {
      const knowledgeContext = await getKnowledgeBaseContext();
      if (knowledgeContext) {
        systemPrompt = `${systemPrompt}

${knowledgeContext}`;
      }
    }

    // Initialize messages array with system prompt
    const result: LLMMessage[] = [
      {
        role: "system",
        content: systemPrompt,
      },
    ];

    // Add historical messages
    for (const msg of messages) {
      // Skip system messages as we already added our own
      if (msg.role === "system") continue;

      const llmMessage: LLMMessage = {
        role: msg.role as "user" | "assistant" | "tool",
        content: msg.content || "",
      };

      // Restore tool calls if present
      if (msg.tool_calls) {
        llmMessage.toolCalls = msg.tool_calls;
      }

      // Handle metadata that might contain tool calls
      if (msg.metadata?.toolCalls) {
        llmMessage.toolCalls = msg.metadata.toolCalls;
      }

      result.push(llmMessage);
    }

    appLogger.info(
      `Session history loaded: ${result.length} total messages (including system prompt)`,
    );

    return result;
  } catch (error) {
    appLogger.error("Failed to load session history:", error);
    return [];
  }
}

/**
 * Load organizational context into the agent's system prompt.
 * Modifies messages[0].content in-place with organizational context.
 */
export async function loadOrganizationalContext(
  context: string | undefined,
  customConfig: AgentConfig | undefined,
  initializeOrganizationalMemory: () => Promise<OrganizationalMemory | null>,
  messages: LLMMessage[],
): Promise<void> {
  try {
    const orgMemory = await initializeOrganizationalMemory();
    if (!orgMemory) {
      appLogger.info("Organizational memory not available");
      return;
    }

    const orgContext = await orgMemory.getContextForAgent();

    // Add organizational context to system prompt
    const baseConfig = getAgentConfig(context);
    const systemPrompt =
      customConfig?.systemPrompt ?? baseConfig.systemPrompt;

    const contextEnhancedPrompt = `${systemPrompt}

ORGANIZATIONAL CONTEXT:
- Óptica: ${orgContext.organization.name}
- Especialidad: ${orgContext.organization.specialty}
- Total de clientes: ${orgContext.organization.customerCount}
- Órdenes mensuales: ${orgContext.activity.monthlyOrders}
- Madurez: ${orgContext.maturity.description}
- Horario: ${orgContext.organization.businessHours.open} - ${orgContext.organization.businessHours.close}
- Servicios: ${orgContext.organization.services.join(", ") || "No especificados"}
- Ubicación: ${orgContext.organization.location}
- Moneda: ${orgContext.organization.currency}

IMPORTANTE - MONEDA Y UBICACIÓN:
- La óptica opera en ${orgContext.organization.location} con moneda ${orgContext.organization.currency}
- SIEMPRE expresa precios, montos e ingresos en ${orgContext.organization.currency} (ej: $150.000 CLP, no USD)
- No asumas otra moneda ni país; usa exclusivamente la indicada arriba

TOP 10 PRODUCTOS:
${orgContext.organization.topProducts.map((p) => `- ${p.name}: $${p.price} (Stock: ${p.inventory})`).join("\n")}

ACTIVIDAD RECENTE:
- Total de órdenes: ${orgContext.activity.totalOrders}
- Ingresos totales: $${orgContext.activity.totalRevenue.toLocaleString()}
- Valor promedio por orden: $${orgContext.activity.averageOrderValue.toFixed(2)}
- Tasa de retención: ${orgContext.activity.customerRetentionRate}%
- Tasa de completación: ${orgContext.activity.orderCompletionRate}%

INSTRUCCIONES:
- Usa esta información para contextualizar todas las respuestas
- Menciona el nombre de la óptica específica cuando sea apropiado
- Proporciona recomendaciones basadas en el contexto de esta óptica
- Considera la madurez organizacional al dar consejos
- SÉ BREVE Y DIRECTO: Tus respuestas deben ser concisas y responder exactamente lo que el usuario pregunta. Evita saludos largos o explicaciones innecesarias a menos que se pidan.`;

    // Update the system prompt in-place
    if (messages.length > 0 && messages[0]?.role === "system") {
      messages[0].content = contextEnhancedPrompt;
    }

    appLogger.info("Organizational context loaded successfully");
  } catch (error) {
    appLogger.error("Failed to load organizational context:", error);
  }
}
