import type { SupabaseClient } from "@supabase/supabase-js";

import { appLogger } from '@/lib/logger';

import { LLMFactory } from "../factory";
import type { MemoryManager } from "../memory";
import { convertToolsToLLMTools, getAllTools } from "../tools";
import type {
  LLMConfig,
  LLMMessage,
  LLMProvider,
  LLMProviderInterface,
  LLMStreamChunk,
  ToolCall,
} from "../types";
import { logAIUsage } from "../usage-logger";
import { getAgentConfig } from "./config";
import type { AgentConfig } from "./core";
import type { ToolExecutor } from "./tool-executor";

export interface StreamChatParams {
  userMessage: string;
  provider: LLMProvider | undefined;
  model: string | undefined;
  context: string | undefined;
  sessionId: string | undefined;
  customConfig: AgentConfig | undefined;
  organizationId: string;
  currentBranchId: string | undefined | null;
  userData:
    | {
        role?: string;
        isSuperAdmin?: boolean;
        name?: string;
      }
    | undefined;
  supabaseForUsageLog: SupabaseClient | undefined;
  skipAdminActivityLog: boolean;
  customerId: string | null | undefined;
  knowledgeBaseEnabled: boolean;
  userId: string;
  messages: LLMMessage[];
}

export interface StreamChatDeps {
  initializeToolExecutor: () => Promise<ToolExecutor>;
  initializeMemoryManager: () => Promise<MemoryManager | null>;
  executeToolCalls: (
    toolCalls: ToolCall[],
    executor: ToolExecutor,
    config: { requireConfirmationForDestructiveActions: boolean },
  ) => Promise<void>;
}

export async function* streamChatImpl(
  params: StreamChatParams,
  deps: StreamChatDeps,
): AsyncGenerator<LLMStreamChunk> {
  try {
    const executor = await deps.initializeToolExecutor();
    const baseConfig = getAgentConfig(params.context);
    const config = {
      systemPrompt:
        params.customConfig?.systemPrompt ?? baseConfig.systemPrompt,
      maxSteps: params.customConfig?.maxSteps ?? baseConfig.maxSteps,
      temperature:
        params.customConfig?.temperature ?? baseConfig.temperature,
      maxTokens: params.customConfig?.maxTokens,
      enableToolCalling:
        params.customConfig?.enableToolCalling ??
        baseConfig.enableToolCalling,
      requireConfirmationForDestructiveActions:
        params.customConfig?.requireConfirmationForDestructiveActions ??
        baseConfig.requireConfirmationForDestructiveActions,
    };

    const factory = LLMFactory.getInstance();

    let providerInstance: LLMProviderInterface | undefined;
    let llmConfig: LLMConfig | undefined;

    try {
      const result = await factory.createProviderWithFallback(params.provider);
      providerInstance = result.provider;
      llmConfig = {
        ...result.config,
        model: params.model || result.config.model,
        temperature: config.temperature,
        maxTokens: config.maxTokens,
        timeout: params.customConfig?.timeout ?? 30000,
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
      params.customConfig?.enabledTools &&
      params.customConfig.enabledTools.length > 0
    ) {
      tools = tools.filter((tool) =>
        params.customConfig!.enabledTools!.includes(tool.name),
      );
    }
    const llmTools = config.enableToolCalling
      ? convertToolsToLLMTools(tools)
      : undefined;

    // Get semantic context if enabled
    // NOTE: Disabled by default until migrations are run and embeddings table exists
    let semanticContext = "";
    const enableSemanticContext =
      params.customConfig?.enableSemanticContext ?? false;

    if (enableSemanticContext) {
      try {
        const memoryManager = await deps.initializeMemoryManager();
        if (memoryManager) {
          const context = await memoryManager.getRelevantContext(
            params.userMessage,
          );
          semanticContext = context.formattedContext;
          if (semanticContext) {
            appLogger.info(
              "Semantic context loaded, length:",
              semanticContext.length,
            );
          }
        }
      } catch (error) {
        appLogger.error("Failed to load semantic context:", error);
      }
    }

    // Build enhanced system prompt with semantic context
    let enhancedSystemPrompt = config.systemPrompt;
    if (semanticContext) {
      enhancedSystemPrompt = `${config.systemPrompt}\n\n${semanticContext}`;
    }

    // Only add system prompt if messages array is empty
    // (if loadSessionHistory was called, it already added the system prompt)
    if (params.messages.length === 0) {
      params.messages.push({
        role: "system",
        content: enhancedSystemPrompt,
      });
    } else if (semanticContext && params.messages[0]?.role === "system") {
      // Update existing system prompt with semantic context
      params.messages[0].content = enhancedSystemPrompt;
    }

    // Check if the last message is already this user message (avoid duplicates)
    const lastMessage = params.messages[params.messages.length - 1];
    const isUserMessageDuplicate =
      lastMessage?.role === "user" && lastMessage?.content === params.userMessage;

    if (!isUserMessageDuplicate) {
      params.messages.push({
        role: "user",
        content: params.userMessage,
      });
    }

    let stepCount = 0;
    let fullResponse = "";
    let userReceivedContent = false;

    while (stepCount < config.maxSteps) {
      try {
        const stream = providerInstance.streamText(
          params.messages,
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
            appLogger.info(
              `Agent received tool calls from stream: ${JSON.stringify(chunk.toolCalls?.map((tc: ToolCall) => ({ name: tc.name, id: tc.id })))}`,
            );
            // Accumulate tool calls by ID to handle incremental updates
            for (const tc of chunk.toolCalls as ToolCall[]) {
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
                    Object.keys(tc.arguments as Record<string, unknown>).length > 0
                  ) {
                    existing.arguments = {
                      ...(existing.arguments as Record<string, unknown>),
                      ...(tc.arguments as Record<string, unknown>),
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
          params.supabaseForUsageLog &&
          params.organizationId &&
          lastChunk?.usage &&
          (lastChunk.usage.promptTokens > 0 ||
            lastChunk.usage.completionTokens > 0)
        ) {
          logAIUsage(params.supabaseForUsageLog, {
            organizationId: params.organizationId,
            provider: providerInstance?.name ?? "unknown",
            model: llmConfig?.model ?? "unknown",
            promptTokens: lastChunk.usage.promptTokens,
            completionTokens: lastChunk.usage.completionTokens,
            endpoint: "chat",
          });
        }

        // Convert map to array
        const collectedToolCalls = Array.from(collectedToolCallsMap.values());

        appLogger.info(`Agent step ${stepCount} - collected tool calls: ${collectedToolCalls.length}`, { toolCalls: collectedToolCalls.map((tc) => ({ name: tc.name })) });
        appLogger.info(`Agent step ${stepCount} - assistant message length: ${assistantMessage.length}`);

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

          params.messages.push(assistantMsg);
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

        await deps.executeToolCalls(collectedToolCalls, executor, config);

        stepCount++;
      } catch (streamError: unknown) {
        appLogger.error("Stream error in agent:", streamError);
        const errorMessage =
          (streamError as Error).message || "Error procesando la solicitud";
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
      content: `Error: ${(error as Error).message || "Error desconocido"}`,
      done: true,
    };
  }
}
