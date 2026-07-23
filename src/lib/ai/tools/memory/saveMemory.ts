import type { ToolDefinition, ToolResult } from "../types";

export const saveMemoryTool: ToolDefinition = {
  name: "saveMemory",
  description:
    "Save a fact, decision, or pattern to organizational memory. Vendedor role can only read memory (writes are silently dropped). Admin and dueño can persist new facts. Use when the user says 'remember that X' or 'save this for later'.",
  type: "memory",
  minRole: "vendedor",
  category: "memory",
  parameters: {
    type: "object",
    properties: {
      content: {
        type: "string",
        description: "The fact or information to remember",
      },
      category: {
        type: "string",
        enum: ["preference", "decision", "context", "workflow", "insight"],
        description: "Category of the memory fact",
      },
      importance: {
        type: "number",
        default: 1,
        description: "Importance level 1-5 (default 1)",
      },
    },
    required: ["content"],
  },
  execute: async (params, context): Promise<ToolResult> => {
    try {
      const {
        content,
        category = "fact",
        importance = 1,
      } = params as {
        content: string;
        category?: string;
        importance?: number;
      };
      const { supabase, organizationId, userId, userData } = context;

      // Vendedor: read-only for memory writes
      if (
        userData?.role === "vendedor" ||
        (context as Record<string, unknown>).role === "vendedor"
      ) {
        return {
          success: false,
          error:
            "Tu rol no tiene permisos para guardar información. Consulta a un administrador o dueño.",
        };
      }

      if (!organizationId) {
        return {
          success: false,
          error: "Organization ID is missing in context",
        };
      }

      const { data, error } = await supabase
        .from("memory_facts")
        .insert({
          organization_id: organizationId,
          user_id: userId,
          content,
          category,
          importance,
          fact_type: category === "insight" ? "insight" : "fact",
          source_session_id: null,
        })
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      return {
        success: true,
        data,
        message: "Recorded successfully",
      };
    } catch (error: unknown) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to save memory",
      };
    }
  },
};
