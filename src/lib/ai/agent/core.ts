import type { SupabaseClient } from "@supabase/supabase-js";

import { LLMFactory } from "../factory";
import {
  getKnowledgeBase,
  type KnowledgeContext,
} from "../knowledge/base/knowledge-manager";
import type { MemoryManager } from "../memory";
import type { OrganizationalMemory } from "../memory/organizational";
import { convertToolsToLLMTools, getAllTools } from "../tools";
import type { ToolExecutionContext } from "../tools/types";
import type {
  LLMMessage,
  LLMProvider,
  LLMStreamChunk,
  ToolCall,
} from "../types";
import { logAIUsage } from "../usage-logger";
import { getAgentConfig } from "./config";
import { ToolExecutor } from "./tool-executor";

export interface AgentConfig {
  systemPrompt?: string;
  maxSteps?: number;
  temperature?: number;
  maxTokens?: number;
  enableToolCalling?: boolean;
  enabledTools?: string[];
  requireConfirmationForDestructiveActions?: boolean;
  enableSemanticContext?: boolean; // Enable RAG context injection
  enableKnowledgeBase?: boolean; // Enable knowledge base integration
}

export interface AgentOptions {
  userId: string;
  provider?: LLMProvider;
  model?: string;
  context?: string;
  sessionId?: string;
  organizationId?: string;
  config?: AgentConfig;
  currentBranchId?: string | null;
  userData?: {
    role?: string;
    isSuperAdmin?: boolean;
    name?: string;
  };
  /** Optional: for AI usage logging (cost tracking) */
  supabase?: SupabaseClient;
  /** Skip logAdminActivity (e.g. WhatsApp customer - no auth context) */
  skipAdminActivityLog?: boolean;
  /** Customer ID for WhatsApp customer context (customer-scoped tools) */
  customerId?: string | null;
}

export class Agent {
  private userId: string;
  private provider: LLMProvider | undefined;
  private model: string | undefined;
  private context: string | undefined;
  private sessionId: string | undefined;
  private customConfig: AgentConfig | undefined;
  private messages: LLMMessage[] = [];
  private toolExecutor: ToolExecutor | null = null;
  private memoryManager: MemoryManager | null = null;
  private organizationalMemory: OrganizationalMemory | null = null;
  private organizationId: string;
  private currentBranchId: string | undefined | null;
  private knowledgeBaseEnabled: boolean = false;
  private userData:
    | {
        role?: string;
        isSuperAdmin?: boolean;
        name?: string;
      }
    | undefined;
  private supabaseForUsageLog: SupabaseClient | undefined;
  private skipAdminActivityLog: boolean;
  private customerId: string | null | undefined;

  constructor(options: AgentOptions) {
    this.userId = options.userId;
    this.provider = options.provider;
    this.model = options.model;
    this.context = options.context;
    this.sessionId = options.sessionId;
    this.customConfig = options.config;
    this.organizationalMemory = null;
    this.organizationId = options.organizationId || options.userId;
    this.currentBranchId = options.currentBranchId;
    this.userData = options.userData;
    this.supabaseForUsageLog = options.supabase;
    this.knowledgeBaseEnabled = options.config?.enableKnowledgeBase ?? true;
    this.skipAdminActivityLog = options.skipAdminActivityLog ?? false;
    this.customerId = options.customerId;
  }

  /**
   * Initialize the memory manager for semantic context injection
   */
  private async initializeMemoryManager(): Promise<MemoryManager | null> {
    if (this.memoryManager) {
      return this.memoryManager;
    }

    try {
      const { createServiceRoleClient } = await import(
        "@/utils/supabase/server"
      );
      const { createMemoryManager } = await import("../memory");

      const supabase = createServiceRoleClient();

      this.memoryManager = createMemoryManager(
        {
          userId: this.userId,
          sessionId: this.sessionId,
          supabase,
        },
        {
          enableSemanticSearch: true,
          enableLongTermMemory: true,
          semanticSearchCount: 5,
          maxContextLength: 3000,
        },
      );

      return this.memoryManager;
    } catch (error) {
      console.error("Failed to initialize memory manager:", error);
      return null;
    }
  }

  /**
   * Initialize organizational memory for contextual information
   */
  private async initializeOrganizationalMemory(): Promise<OrganizationalMemory | null> {
    if (this.organizationalMemory) {
      return this.organizationalMemory;
    }

    try {
      const { createServiceRoleClient } = await import(
        "@/utils/supabase/server"
      );
      const { createOrganizationalMemory } = await import(
        "../memory/organizational"
      );

      const supabase = createServiceRoleClient();

      // Use the resolved organization ID
      const organizationId = this.organizationId;

      this.organizationalMemory = createOrganizationalMemory(
        organizationId,
        supabase,
      );

      return this.organizationalMemory;
    } catch (error) {
      console.error("Failed to initialize organizational memory:", error);
      return null;
    }
  }

  /**
   * Get the memory manager instance
   */
  getMemoryManager(): MemoryManager | null {
    return this.memoryManager;
  }

  getOrganizationalMemory(): OrganizationalMemory | null {
    return this.organizationalMemory;
  }

  private async initializeToolExecutor() {
    if (!this.toolExecutor) {
      const { createServiceRoleClient } = await import(
        "@/utils/supabase/server"
      );
      const supabase = createServiceRoleClient();

      // Try to resolve organizationId from profile to be sure
      let resolvedOrgId = this.organizationId;
      if (this.userId) {
        try {
          const { data: profile } = await supabase
            .from("profiles")
            .select("organization_id")
            .eq("id", this.userId)
            .single();

          if (profile?.organization_id) {
            resolvedOrgId = profile.organization_id;
          }
        } catch (e) {
          console.error("Failed to resolve organization ID from profile:", e);
        }
      }

      let currency = "USD";
      try {
        const orgMemory = await this.initializeOrganizationalMemory();
        if (orgMemory) {
          const orgContext = await orgMemory.getContextForAgent();
          currency = orgContext.organization.currency;
        }
      } catch (e) {
        console.error("Failed to fetch currency for tool executor:", e);
      }

      const context: ToolExecutionContext = {
        userId: this.userId,
        organizationId: resolvedOrgId,
        supabase,
        currency,
        userData: this.userData,
        currentBranchId: this.currentBranchId,
        skipAdminActivityLog: this.skipAdminActivityLog,
        customerId: this.customerId,
      };
      this.toolExecutor = new ToolExecutor(context);
    }
    return this.toolExecutor;
  }

  /**
   * Load conversation history from database for session continuity
   * This allows the agent to remember previous messages in the conversation
   */
  async loadSessionHistory(
    sessionId: string,
    limit: number = 50,
  ): Promise<void> {
    try {
      const { createServiceRoleClient } = await import(
        "@/utils/supabase/server"
      );
      const supabase = createServiceRoleClient();

      const { data: messages, error } = await supabase
        .from("chat_messages")
        .select("role, content, tool_calls, metadata, created_at")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true })
        .limit(limit);

      if (error) {
        console.error("Error loading session history:", error);
        return;
      }

      if (!messages || messages.length === 0) {
        console.log("No previous messages found for session:", sessionId);
        return;
      }

      console.log(`Loading ${messages.length} messages from session history`);

      // Get the system prompt from config
      const baseConfig = getAgentConfig(this.context);
      let systemPrompt =
        this.customConfig?.systemPrompt ?? baseConfig.systemPrompt;

      // Add knowledge base context if enabled
      if (this.knowledgeBaseEnabled) {
        const knowledgeContext = await this.getKnowledgeBaseContext();
        if (knowledgeContext) {
          systemPrompt = `${systemPrompt}

${knowledgeContext}`;
        }
      }

      // Initialize messages array with system prompt
      this.messages = [
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

        this.messages.push(llmMessage);
      }

      console.log(
        `Session history loaded: ${this.messages.length} total messages (including system prompt)`,
      );
    } catch (error) {
      console.error("Failed to load session history:", error);
    }
  }

  /**
   * Load organizational context into the agent's memory
   */
  async loadOrganizationalContext(): Promise<void> {
    try {
      const orgMemory = await this.initializeOrganizationalMemory();
      if (!orgMemory) {
        console.log("Organizational memory not available");
        return;
      }

      const context = await orgMemory.getContextForAgent();

      // Add organizational context to system prompt
      const baseConfig = getAgentConfig(this.context);
      const systemPrompt =
        this.customConfig?.systemPrompt ?? baseConfig.systemPrompt;

      const contextEnhancedPrompt = `${systemPrompt}

ORGANIZATIONAL CONTEXT:
- Óptica: ${context.organization.name}
- Especialidad: ${context.organization.specialty}
- Total de clientes: ${context.organization.customerCount}
- Órdenes mensuales: ${context.activity.monthlyOrders}
- Madurez: ${context.maturity.description}
- Horario: ${context.organization.businessHours.open} - ${context.organization.businessHours.close}
- Servicios: ${context.organization.services.join(", ") || "No especificados"}
- Ubicación: ${context.organization.location}
- Moneda: ${context.organization.currency}

IMPORTANTE - MONEDA Y UBICACIÓN:
- La óptica opera en ${context.organization.location} con moneda ${context.organization.currency}
- SIEMPRE expresa precios, montos e ingresos en ${context.organization.currency} (ej: $150.000 CLP, no USD)
- No asumas otra moneda ni país; usa exclusivamente la indicada arriba

TOP 10 PRODUCTOS:
${context.organization.topProducts.map((p) => `- ${p.name}: $${p.price} (Stock: ${p.inventory})`).join("\n")}

ACTIVIDAD RECENTE:
- Total de órdenes: ${context.activity.totalOrders}
- Ingresos totales: $${context.activity.totalRevenue.toLocaleString()}
- Valor promedio por orden: $${context.activity.averageOrderValue.toFixed(2)}
- Tasa de retención: ${context.activity.customerRetentionRate}%
- Tasa de completación: ${context.activity.orderCompletionRate}%

INSTRUCCIONES:
- Usa esta información para contextualizar todas las respuestas
- Menciona el nombre de la óptica específica cuando sea apropiado
- Proporciona recomendaciones basadas en el contexto de esta óptica
- Considera la madurez organizacional al dar consejos
- SÉ BREVE Y DIRECTO: Tus respuestas deben ser concisas y responder exactamente lo que el usuario pregunta. Evita saludos largos o explicaciones innecesarias a menos que se pidan.`;

      // Update the system prompt
      this.messages[0].content = contextEnhancedPrompt;

      console.log("Organizational context loaded successfully");
    } catch (error) {
      console.error("Failed to load organizational context:", error);
    }
  }

  /**
   * Get relevant knowledge base context for the current conversation
   */
  private async getKnowledgeBaseContext(): Promise<string | null> {
    try {
      const knowledgeBase = getKnowledgeBase();

      // Get the last user message to understand context
      const lastUserMessage = this.messages
        .slice()
        .reverse()
        .find((msg) => msg.role === "user");

      if (!lastUserMessage) return null;

      // Create knowledge context based on user role and recent conversation
      const knowledgeContext: KnowledgeContext = {
        userId: this.userId,
        organizationId: this.organizationId,
        userRole: this.userData?.role,
        recentActions: this.extractRecentActions(),
      };

      // Search for relevant knowledge
      const results = await knowledgeBase.searchKnowledge(
        lastUserMessage.content,
        knowledgeContext,
      );

      if (results.length === 0) return null;

      // Format the most relevant knowledge into context
      const topResult = results[0];
      const contextSections = [
        `=== SYSTEM KNOWLEDGE ===`,
        `Relevant Documentation: ${topResult.document.title}`,
        `Category: ${topResult.document.category}`,
        `Confidence: ${(topResult.similarity * 100).toFixed(1)}%`,
        ``,
        `Key Information:`,
        this.extractKeyInformation(topResult.document.content),
        `========================`,
      ];

      console.log(
        `Knowledge base context injected for query: "${lastUserMessage.content}"`,
      );
      console.log(
        `Top result: ${topResult.document.title} (${(topResult.similarity * 100).toFixed(1)}% confidence)`,
      );

      return contextSections.join("\n");
    } catch (error) {
      console.error("Failed to get knowledge base context:", error);
      return null;
    }
  }

  /**
   * Extract recent actions from conversation history
   */
  private extractRecentActions(): string[] {
    const actions: string[] = [];
    const recentMessages = this.messages.slice(-10); // Last 10 messages

    for (const message of recentMessages) {
      if (message.role === "user") {
        // Extract action verbs and key terms
        const actionWords = [
          "create",
          "add",
          "delete",
          "update",
          "configure",
          "setup",
          "install",
          "activate",
          "deactivate",
          "enable",
          "disable",
          "schedule",
          "cancel",
          "modify",
          "change",
          "adjust",
        ];

        const messageLower = message.content.toLowerCase();
        for (const action of actionWords) {
          if (messageLower.includes(action)) {
            actions.push(action);
          }
        }
      }
    }

    return [...new Set(actions)]; // Remove duplicates
  }

  /**
   * Extract key information from document content
   */
  private extractKeyInformation(content: string): string {
    // Extract key sections (Overview, Steps, Configuration, etc.)
    const keySections = [
      "## Overview",
      "## Key Workflows",
      "## Configuration Options",
      "## Troubleshooting",
      "## Steps:",
      "**Steps:**",
    ];

    let extracted = "";

    for (const section of keySections) {
      const sectionIndex = content.indexOf(section);
      if (sectionIndex !== -1) {
        // Extract the section content (up to next ## header or end)
        const sectionContent = content.substring(sectionIndex);
        const nextHeader = sectionContent.indexOf("\n## ", 3);
        const relevantContent =
          nextHeader !== -1
            ? sectionContent.substring(0, nextHeader)
            : sectionContent.substring(0, 500); // Limit length

        extracted += `${relevantContent}\n\n`;
      }
    }

    // If no specific sections found, return first part of content
    if (!extracted) {
      extracted = content.substring(0, 300) + "...";
    }

    return extracted.trim();
  }

  /**
   * Check if history has been loaded
   */
  hasLoadedHistory(): boolean {
    return this.messages.length > 1; // More than just system prompt
  }

  async *streamChat(userMessage: string): AsyncGenerator<LLMStreamChunk> {
    try {
      const executor = await this.initializeToolExecutor();
      const baseConfig = getAgentConfig(this.context);
      const config = {
        systemPrompt:
          this.customConfig?.systemPrompt ?? baseConfig.systemPrompt,
        maxSteps: this.customConfig?.maxSteps ?? baseConfig.maxSteps,
        temperature: this.customConfig?.temperature ?? baseConfig.temperature,
        maxTokens: this.customConfig?.maxTokens,
        enableToolCalling:
          this.customConfig?.enableToolCalling ?? baseConfig.enableToolCalling,
        requireConfirmationForDestructiveActions:
          this.customConfig?.requireConfirmationForDestructiveActions ??
          baseConfig.requireConfirmationForDestructiveActions,
      };

      const factory = LLMFactory.getInstance();

      let providerInstance;
      let llmConfig;

      try {
        const result = await factory.createProviderWithFallback(this.provider);
        providerInstance = result.provider;
        llmConfig = {
          ...result.config,
          model: this.model || result.config.model,
          temperature: config.temperature,
          maxTokens: config.maxTokens,
        };
      } catch (error: unknown) {
        yield {
          content: `Error: No hay proveedores de IA configurados. Por favor, configura al menos un proveedor en las variables de entorno.`,
          done: true,
        };
        return;
      }

      let tools = getAllTools();
      if (
        this.customConfig?.enabledTools &&
        this.customConfig.enabledTools.length > 0
      ) {
        tools = tools.filter((tool) =>
          this.customConfig!.enabledTools!.includes(tool.name),
        );
      }
      const llmTools = config.enableToolCalling
        ? convertToolsToLLMTools(tools)
        : undefined;

      // Get semantic context if enabled
      // NOTE: Disabled by default until migrations are run and embeddings table exists
      let semanticContext = "";
      const enableSemanticContext =
        this.customConfig?.enableSemanticContext ?? false;

      if (enableSemanticContext) {
        try {
          const memoryManager = await this.initializeMemoryManager();
          if (memoryManager) {
            const context = await memoryManager.getRelevantContext(userMessage);
            semanticContext = context.formattedContext;
            if (semanticContext) {
              console.log(
                "Semantic context loaded, length:",
                semanticContext.length,
              );
            }
          }
        } catch (error) {
          console.error("Failed to load semantic context:", error);
        }
      }

      // Build enhanced system prompt with semantic context
      let enhancedSystemPrompt = config.systemPrompt;
      if (semanticContext) {
        enhancedSystemPrompt = `${config.systemPrompt}\n\n${semanticContext}`;
      }

      // Only add system prompt if messages array is empty
      // (if loadSessionHistory was called, it already added the system prompt)
      if (this.messages.length === 0) {
        this.messages.push({
          role: "system",
          content: enhancedSystemPrompt,
        });
      } else if (semanticContext && this.messages[0]?.role === "system") {
        // Update existing system prompt with semantic context
        this.messages[0].content = enhancedSystemPrompt;
      }

      // Check if the last message is already this user message (avoid duplicates)
      const lastMessage = this.messages[this.messages.length - 1];
      const isUserMessageDuplicate =
        lastMessage?.role === "user" && lastMessage?.content === userMessage;

      if (!isUserMessageDuplicate) {
        this.messages.push({
          role: "user",
          content: userMessage,
        });
      }

      let stepCount = 0;
      let fullResponse = "";
      let userReceivedContent = false;

      while (stepCount < config.maxSteps) {
        try {
          const stream = providerInstance.streamText(
            this.messages,
            llmTools,
            llmConfig,
          );

          let assistantMessage = "";
          const collectedToolCallsMap = new Map<string, ToolCall>();
          let lastChunk: LLMStreamChunk | null = null;

          // Buffer content - only emit to user when there are NO tool calls (final response).
          // When there are tool calls, the buffered content is reasoning and should be hidden.
          for await (const chunk of stream) {
            lastChunk = chunk;
            if (chunk.content) {
              assistantMessage += chunk.content;
              // Do NOT yield here - we'll decide after the loop based on tool calls
            }
            if (chunk.toolCalls && chunk.toolCalls.length > 0) {
              console.log(
                "Agent received tool calls from stream:",
                chunk.toolCalls.map((tc) => ({ name: tc.name, id: tc.id })),
              );
              // Accumulate tool calls by ID to handle incremental updates
              for (const tc of chunk.toolCalls) {
                if (tc.name && tc.name.trim()) {
                  const toolId =
                    tc.id ||
                    `generated-${Date.now()}-${collectedToolCallsMap.size}`;
                  // If we already have this tool call, merge arguments
                  if (collectedToolCallsMap.has(toolId)) {
                    const existing = collectedToolCallsMap.get(toolId)!;
                    // Merge arguments (prefer new ones if they're more complete)
                    if (
                      tc.arguments &&
                      typeof tc.arguments === "object" &&
                      Object.keys(tc.arguments).length > 0
                    ) {
                      existing.arguments = {
                        ...existing.arguments,
                        ...tc.arguments,
                      };
                    }
                  } else {
                    collectedToolCallsMap.set(toolId, {
                      id: toolId,
                      name: tc.name.trim(),
                      arguments: tc.arguments || {},
                    });
                  }
                }
              }
            }
            if (chunk.done) break;
          }

          if (
            this.supabaseForUsageLog &&
            this.organizationId &&
            lastChunk?.usage &&
            (lastChunk.usage.promptTokens > 0 ||
              lastChunk.usage.completionTokens > 0)
          ) {
            logAIUsage(this.supabaseForUsageLog, {
              organizationId: this.organizationId,
              provider: providerInstance.name,
              model: llmConfig.model || "unknown",
              promptTokens: lastChunk.usage.promptTokens,
              completionTokens: lastChunk.usage.completionTokens,
              endpoint: "chat",
            });
          }

          // Convert map to array
          const collectedToolCalls = Array.from(collectedToolCallsMap.values());

          console.log(
            "Agent step",
            stepCount,
            "- collected tool calls:",
            collectedToolCalls.length,
            collectedToolCalls.map((tc) => ({
              name: tc.name,
              args: tc.arguments,
            })),
          );
          console.log(
            "Agent step",
            stepCount,
            "- assistant message length:",
            assistantMessage.length,
          );

          fullResponse += assistantMessage;

          // Add assistant message with tool calls if any
          if (assistantMessage.trim() || collectedToolCalls.length > 0) {
            const assistantMsg: LLMMessage = {
              role: "assistant",
              content: assistantMessage || "",
            };

            // Add tool calls to the message if available
            if (collectedToolCalls.length > 0) {
              assistantMsg.toolCalls = collectedToolCalls;
            }

            this.messages.push(assistantMsg);
          }

          // Only emit content to user when there are NO tool calls (final response).
          // When there are tool calls, the content is reasoning - hide it.
          if (collectedToolCalls.length === 0 && assistantMessage) {
            userReceivedContent = true;
            yield { content: assistantMessage, done: false };
          }

          if (collectedToolCalls.length === 0 || !config.enableToolCalling) {
            break;
          }

          for (const toolCall of collectedToolCalls) {
            try {
              // Validate tool call name
              if (!toolCall.name || !toolCall.name.trim()) {
                const errorMsg = `Error: Nombre de herramienta inválido o vacío`;
                console.error("Tool validation:", errorMsg);
                this.messages.push({
                  role: "tool",
                  content: errorMsg,
                  toolCallId: toolCall.id,
                  name: "unknown",
                });
                continue;
              }

              const toolName = toolCall.name.trim();

              // Tool execution messages are hidden from user - only log for debugging
              console.log(`[Agent] Executing tool: ${toolName}`);

              // Log tool call details for debugging
              console.log("=== TOOL EXECUTION DEBUG ===");
              console.log("Tool name:", toolName);
              console.log(
                "Tool arguments:",
                JSON.stringify(toolCall.arguments, null, 2),
              );
              console.log("Arguments type:", typeof toolCall.arguments);
              console.log(
                "Arguments keys:",
                toolCall.arguments ? Object.keys(toolCall.arguments) : [],
              );
              console.log(
                "Arguments values:",
                toolCall.arguments ? Object.values(toolCall.arguments) : [],
              );
              console.log("===========================");

              const validation = executor.validateToolCall(
                toolName,
                toolCall.arguments,
              );
              if (!validation.valid) {
                const errorMsg = `Error validando herramienta: ${validation.error}`;
                console.error("Tool validation failed:", {
                  toolName,
                  arguments: toolCall.arguments,
                  error: validation.error,
                });
                this.messages.push({
                  role: "tool",
                  content: errorMsg,
                  toolCallId: toolCall.id,
                  name: toolName,
                });
                continue;
              }

              if (
                executor.requiresConfirmation(toolName) &&
                config.requireConfirmationForDestructiveActions
              ) {
                console.log(
                  `[Agent] Tool ${toolName} requires confirmation, executing anyway`,
                );
              }

              const result = await executor.executeTool(
                toolName,
                toolCall.arguments,
              );

              const toolResultMessage = result.success
                ? JSON.stringify(result.data || result.message || "Success")
                : `Error: ${result.error || "Unknown error"}`;

              this.messages.push({
                role: "tool",
                content: toolResultMessage,
                toolCallId: toolCall.id,
                name: toolName,
              });

              if (result.success) {
                // Tool success - LLM receives result via messages, no user-facing yield
                console.log(`[Agent] Tool ${toolName} completed successfully`);
              } else {
                // Tool error - LLM receives it via messages, can include in final response
                console.error(`[Agent] Tool ${toolName} failed:`, result.error);
              }
            } catch (toolError: unknown) {
              const toolName =
                toolCall.name?.trim() || "herramienta desconocida";
              const errorMsg = `Error ejecutando ${toolName}: ${toolError.message}`;
              console.error("[Agent] Tool execution error:", errorMsg);
              this.messages.push({
                role: "tool",
                content: errorMsg,
                toolCallId: toolCall.id,
                name: toolName,
              });
            }
          }

          stepCount++;
        } catch (streamError: unknown) {
          console.error("Stream error in agent:", streamError);
          const errorMessage =
            streamError.message || "Error procesando la solicitud";
          yield {
            content: `\n\n❌ Error: ${errorMessage}`,
            done: false,
          };
          // Don't break immediately, let the error propagate so fallback can catch it
          throw streamError;
        }
      }

      // If the user never received any content (LLM stuck in tool calls or empty response),
      // yield a fallback so the chat is not silent
      if (!userReceivedContent) {
        const fallbackMsg =
          stepCount >= config.maxSteps
            ? "Llegué al límite de pasos sin poder completar tu solicitud. Por favor, sé más específico: indica los nombres o IDs de los productos, o la sucursal si aplica."
            : "No pude generar una respuesta. ¿Puedes reformular tu pregunta de forma más específica?";
        yield { content: fallbackMsg, done: false };
      }

      yield { content: "", done: true };
    } catch (error: unknown) {
      yield {
        content: `Error: ${error.message || "Error desconocido"}`,
        done: true,
      };
    }
  }

  async chat(userMessage: string): Promise<string> {
    let fullResponse = "";
    for await (const chunk of this.streamChat(userMessage)) {
      if (chunk.content) {
        fullResponse += chunk.content;
      }
    }
    return fullResponse;
  }

  getMessages(): LLMMessage[] {
    return [...this.messages];
  }

  clearMessages() {
    this.messages = [];
  }

  addMessage(role: LLMMessage["role"], content: string) {
    this.messages.push({ role, content });
  }
}

export async function createAgent(options: AgentOptions): Promise<Agent> {
  return new Agent(options);
}
