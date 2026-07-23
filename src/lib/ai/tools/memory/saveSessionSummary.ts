import type { ToolDefinition, ToolResult } from "../types";

export const saveSessionSummaryTool: ToolDefinition = {
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
};
