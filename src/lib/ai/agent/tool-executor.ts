import { logAdminActivity } from "@/lib/api/middleware";

import { getToolByName } from "../tools";
import type { ToolExecutionContext, ToolResult } from "../tools/types";

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
