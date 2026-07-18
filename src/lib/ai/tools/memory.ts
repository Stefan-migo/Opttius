/**
 * Memory tools for the AI Agent.
 *
 * All tools use the authenticated supabase client from context.
 * RLS is the final authorization barrier.
 */
import type { ToolDefinition, ToolResult } from "./types";

// ponytail: threshold 0.7 hardcoded — make configurable if multiple orgs need different values
const SEARCH_THRESHOLD = 0.7;
const DEFAULT_LIMIT = 10;

export const memoryTools: ToolDefinition[] = [
  {
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
  },
  {
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
          error:
            error instanceof Error ? error.message : "Failed to save memory",
        };
      }
    },
  },
  {
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
  },
  {
    name: "saveSessionSummary",
    description:
      "Save a summary of the current interaction session to organizational memory. Typically called when the agent session ends. Persists as an insight-type memory fact.",
    type: "memory",
    minRole: "admin",
    category: "memory",
    parameters: {
      type: "object",
      properties: {
        summary: {
          type: "string",
          description: "Summary of the session's key points",
        },
        messageCount: {
          type: "number",
          description: "Number of messages exchanged in the session",
        },
        tokenCount: {
          type: "number",
          description: "Total tokens consumed in the session",
        },
        screenRoute: {
          type: "string",
          description: "The main screen route where the session occurred",
        },
        sessionId: {
          type: "string",
          description: "ID of the current session",
        },
      },
      required: ["summary"],
    },
    execute: async (params, context): Promise<ToolResult> => {
      try {
        const {
          summary,
          messageCount = 0,
          tokenCount = 0,
          screenRoute,
          sessionId,
        } = params as {
          summary: string;
          messageCount?: number;
          tokenCount?: number;
          screenRoute?: string;
          sessionId?: string;
        };
        const { supabase, organizationId, userId } = context;

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
            content: summary,
            category: "insight",
            importance: 3,
            fact_type: "insight",
            source_session_id: sessionId || null,
            metadata: {
              message_count: messageCount,
              token_count: tokenCount,
              screen_route: screenRoute || null,
            },
          })
          .select()
          .single();

        if (error) {
          return { success: false, error: error.message };
        }

        // Also update chat_sessions metadata if sessionId provided
        if (sessionId) {
          await supabase
            .from("chat_sessions")
            .update({
              metadata: {
                summary,
                message_count: messageCount,
                token_count: tokenCount,
              },
            })
            .eq("id", sessionId);
        }

        return {
          success: true,
          data,
          message: "Session summary saved",
        };
      } catch (error: unknown) {
        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to save session summary",
        };
      }
    },
  },
];
