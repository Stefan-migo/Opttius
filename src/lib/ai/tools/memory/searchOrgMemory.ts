import type { ToolDefinition, ToolResult } from "../types";

// ponytail: threshold 0.7 hardcoded — make configurable if multiple orgs need different values
const SEARCH_THRESHOLD = 0.7;
const DEFAULT_LIMIT = 10;

export const searchOrgMemoryTool: ToolDefinition = {
  name: "searchOrgMemory",
  description:
    'Search organizational memory for facts matching the query. Performs semantic search on memory_facts with relevance threshold. Returns matching facts with similarity scores. Use when the user asks "what do we know about X" or "have we dealt with X before".',
  type: "memory",
  minRole: "vendedor",
  category: "memory",
  parameters: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Search query to find relevant memories",
      },
      limit: {
        type: "number",
        default: DEFAULT_LIMIT,
        description: "Maximum number of results (default 10)",
      },
    },
    required: ["query"],
  },
  execute: async (params, context): Promise<ToolResult> => {
    try {
      const { query, limit = DEFAULT_LIMIT } = params as {
        query: string;
        limit?: number;
      };
      const { supabase, organizationId } = context;

      if (!organizationId) {
        return {
          success: false,
          error: "Organization ID is missing in context",
        };
      }

      // ponytail: pgvector match_memory_facts RPC — falls back to ILIKE if RPC not available
      const { data, error } = await supabase.rpc("match_memory_facts", {
        query_embedding: null, // ponytail: embedding generated externally; pass null to use ILIKE fallback
        match_threshold: SEARCH_THRESHOLD,
        match_count: limit,
        p_org_id: organizationId,
      });

      if (error) {
        // fallback to ILIKE search
        const { data: fallback, error: fallbackError } = await supabase
          .from("memory_facts")
          .select("*")
          .eq("organization_id", organizationId)
          .ilike("content", `%${query}%`)
          .order("created_at", { ascending: false })
          .limit(limit);

        if (fallbackError) {
          return { success: false, error: fallbackError.message };
        }

        return {
          success: true,
          data: { facts: fallback || [], method: "ilike_fallback" },
          message: `Found ${fallback?.length || 0} memory facts matching "${query}"`,
        };
      }

      return {
        success: true,
        data: { facts: data || [], method: "semantic" },
        message: `Found ${data?.length || 0} memory facts matching "${query}"`,
      };
    } catch (error: unknown) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to search organizational memory",
      };
    }
  },
};
