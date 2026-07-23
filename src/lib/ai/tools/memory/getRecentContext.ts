import type { ToolDefinition, ToolResult } from "../types";

export const getRecentContextTool: ToolDefinition = {
  name: "getRecentContext",
  description:
    "Retrieve the most recent memory facts for the organization. Used to provide context about what has been happening recently. Cached server-side for performance.",
  type: "memory",
  minRole: "vendedor",
  category: "memory",
  parameters: {
    type: "object",
    properties: {
      limit: {
        type: "number",
        default: 5,
        description: "Number of recent facts to return (default 5, max 20)",
      },
    },
  },
  execute: async (params, context): Promise<ToolResult> => {
    try {
      const { limit = 5 } = params as { limit?: number };
      const { supabase, organizationId } = context;

      if (!organizationId) {
        return {
          success: false,
          error: "Organization ID is missing in context",
        };
      }

      const cappedLimit = Math.min(limit, 20);

      const { data, error } = await supabase
        .from("memory_facts")
        .select("*")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false })
        .limit(cappedLimit);

      if (error) {
        return { success: false, error: error.message };
      }

      return {
        success: true,
        data: { facts: data || [] },
        message: `Retrieved ${data?.length || 0} recent memory facts`,
      };
    } catch (error: unknown) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to get recent context",
      };
    }
  },
};
