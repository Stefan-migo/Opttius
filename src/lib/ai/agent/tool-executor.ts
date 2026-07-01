import { logAdminActivity } from "@/lib/api/middleware";

import { getToolByName } from "../tools";
import type { ToolExecutionContext, ToolResult } from "../tools/types";
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
      if (!this.context.skipAdminActivityLog) {
        await logAdminActivity(
          this.context.userId,
          `tool_error_${toolName}`,
          "ai_agent",
          undefined,
          { tool: toolName, params, error: error.message },
        );
      }

      return {
        success: false,
        error: error.message || "Tool execution failed",
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
}

/**
 * Create a ToolExecutor with resolved organization and currency context.
 * Extracted from agent.ts initializeToolExecutor().
 */
export async function createToolExecutor(
  options: CreateToolExecutorOptions,
): Promise<ToolExecutor> {
  const { createServiceRoleClient } = await import(
    "@/utils/supabase/server"
  );
  const supabase = createServiceRoleClient();

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
      console.error("Failed to resolve organization ID from profile:", e);
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
    console.error("Failed to fetch currency for tool executor:", e);
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
