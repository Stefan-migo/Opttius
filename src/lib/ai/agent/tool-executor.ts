import type { SupabaseClient } from "@supabase/supabase-js";

import { logAdminActivity } from "@/lib/api/middleware";
import { appLogger } from '@/lib/logger';

import { getToolByName } from "../tools";
import type { ToolExecutionContext, ToolResult } from "../tools/types";
import type { LLMMessage, ToolCall } from "../types";
import { initializeOrganizationalMemory } from "./memory-init";

export class ToolExecutor {
  private context: ToolExecutionContext;

  constructor(context: ToolExecutionContext) {
    this.context = context;
  }

  async executeTool(toolName: string, params: unknown): Promise<ToolResult> {
    const tool = getToolByName(toolName);

    if (!tool) {
      return {
        success: false,
        error: `Tool ${toolName} not found`,
      };
    }

    try {
      if (!this.context.skipAdminActivityLog) {
        if (tool.requiresConfirmation) {
          await logAdminActivity(
            this.context.userId,
            `tool_call_${toolName}`,
            "ai_agent",
            undefined,
            { tool: toolName, params, requiresConfirmation: true },
          );
        }
      }

      const result = await tool.execute(params, this.context);

      if (!this.context.skipAdminActivityLog) {
        await logAdminActivity(
          this.context.userId,
          `tool_executed_${toolName}`,
          "ai_agent",
          undefined,
          {
            tool: toolName,
            params,
            success: result.success,
            error: result.error,
          },
        );
      }

      return result;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Tool execution failed";
      if (!this.context.skipAdminActivityLog) {
        await logAdminActivity(
          this.context.userId,
          `tool_error_${toolName}`,
          "ai_agent",
          undefined,
          { tool: toolName, params, error: msg },
        );
      }

      return {
        success: false,
        error: msg,
      };
    }
  }

  validateToolCall(
    toolName: string,
    params: unknown,
  ): { valid: boolean; error?: string } {
    const tool = getToolByName(toolName);
    if (!tool) {
      return { valid: false, error: `Tool ${toolName} not found` };
    }

    if (!params || typeof params !== "object") {
      return { valid: false, error: "Invalid parameters" };
    }

    return { valid: true };
  }

  requiresConfirmation(toolName: string): boolean {
    const tool = getToolByName(toolName);
    return tool?.requiresConfirmation || false;
  }
}

// ─── Factory ────────────────────────────────────────────────────────────────

export interface CreateToolExecutorOptions {
  userId: string;
  organizationId: string;
  currentBranchId?: string | null;
  userData?: { role?: string; isSuperAdmin?: boolean; name?: string };
  skipAdminActivityLog?: boolean;
  customerId?: string | null;
  /** Authenticated supabase client. If provided, service_role creation is skipped. */
  supabase?: SupabaseClient;
}

/**
 * Create a ToolExecutor with resolved organization and currency context.
 * Extracted from agent.ts initializeToolExecutor().
 */
export async function createToolExecutor(
  options: CreateToolExecutorOptions,
): Promise<ToolExecutor> {
  // ponytail: fallback to service_role if no auth'd client provided
  const supabase: SupabaseClient =
    options.supabase ?? (await import("@/utils/supabase/server")).createServiceRoleClient();

  // Try to resolve organizationId from profile to be sure
  let resolvedOrgId = options.organizationId;
  if (options.userId) {
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("id", options.userId)
        .single();

      if (profile?.organization_id) {
        resolvedOrgId = profile.organization_id;
      }
    } catch (e) {
      appLogger.error("Failed to resolve organization ID from profile:", e);
    }
  }

  let currency = "USD";
  try {
    const orgMemory = await initializeOrganizationalMemory(resolvedOrgId);
    if (orgMemory) {
      const orgContext = await orgMemory.getContextForAgent();
      currency = orgContext.organization.currency;
    }
  } catch (e) {
    appLogger.error("Failed to fetch currency for tool executor:", e);
  }

  const context: ToolExecutionContext = {
    userId: options.userId,
    organizationId: resolvedOrgId,
    supabase,
    currency,
    userData: options.userData,
    currentBranchId: options.currentBranchId,
    skipAdminActivityLog: options.skipAdminActivityLog,
    customerId: options.customerId,
  };
  return new ToolExecutor(context);
}

/**
 * Execute collected tool calls with validation, single retry, and error reporting.
 * Results are pushed to messages as tool-role entries for the LLM to consume.
 * Extracted from agent.ts #executeToolCalls.
 */
export async function executeToolCalls(
  toolCalls: ToolCall[],
  executor: ToolExecutor,
  config: { requireConfirmationForDestructiveActions: boolean },
  messages: LLMMessage[],
): Promise<void> {
  for (const toolCall of toolCalls) {
    if (!toolCall.name || !toolCall.name.trim()) {
      const errorMsg = `Error: Nombre de herramienta inválido o vacío`;
      appLogger.error("Tool validation:", errorMsg);
      messages.push({
        role: "tool",
        content: errorMsg,
        toolCallId: toolCall.id,
        name: "unknown",
      });
      continue;
    }

    const toolName = toolCall.name.trim();

    appLogger.info(`[Agent] Executing tool: ${toolName}`);
    appLogger.info("=== TOOL EXECUTION DEBUG ===");
    appLogger.info("Tool name:", toolName);
    appLogger.info("Tool arguments:", JSON.stringify(toolCall.arguments, null, 2));
    appLogger.info("Arguments type:", typeof toolCall.arguments);
    appLogger.info("Arguments keys:", toolCall.arguments ? Object.keys(toolCall.arguments) : []);
    appLogger.info("Arguments values:", toolCall.arguments ? Object.values(toolCall.arguments) : []);
    appLogger.info("===========================");

    const validation = executor.validateToolCall(toolName, toolCall.arguments);
    if (!validation.valid) {
      const errorMsg = `Error validando herramienta: ${validation.error}`;
      appLogger.error("Tool validation failed:", { toolName, arguments: toolCall.arguments, error: validation.error });
      messages.push({ role: "tool", content: errorMsg, toolCallId: toolCall.id, name: toolName });
      continue;
    }

    if (executor.requiresConfirmation(toolName) && config.requireConfirmationForDestructiveActions) {
      appLogger.info(`[Agent] Tool ${toolName} requires confirmation, executing anyway`);
    }

    // ponytail: simple retry-once — exponential backoff if retries > 1 needed
    let lastError: string | undefined;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const result = await executor.executeTool(toolName, toolCall.arguments);

        if (result.success) {
          messages.push({
            role: "tool",
            content: JSON.stringify(result.data || result.message || "Success"),
            toolCallId: toolCall.id,
            name: toolName,
          });
          appLogger.info(`[Agent] Tool ${toolName} completed successfully`);
          break;
        }

        lastError = result.error || "Unknown error";
        appLogger.error(`[Agent] Tool ${toolName} failed (attempt ${attempt + 1}):`, lastError);

        if (attempt === 0) {
          appLogger.info(`[Agent] Retrying tool ${toolName}...`);
          continue;
        }
      } catch (innerError: unknown) {
        lastError = (innerError as Error).message || "Error desconocido";
        appLogger.error(`[Agent] Tool ${toolName} threw (attempt ${attempt + 1}):`, lastError);

        if (attempt === 0) {
          continue;
        }
        break;
      }
    }

    const finalMsg = lastError
      ? `Error ejecutando ${toolName}: ${lastError}`
      : `Ejecutado: ${toolName}`;
    messages.push({
      role: "tool",
      content: finalMsg,
      toolCallId: toolCall.id,
      name: toolName,
    });
  }
}
