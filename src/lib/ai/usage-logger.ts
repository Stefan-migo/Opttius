/**
 * AI Usage Logger — logs LLM token usage for cost tracking.
 *
 * Two persistence paths:
 * 1. `logAIUsage()` → `ai_usage_log` table (org-level cost aggregation, existing)
 * 2. `logTokenUsage()` → `chat_messages.metadata.token_count` per message +
 *    `chat_sessions.metadata.token_count` accumulated per session (Phase 4)
 *
 * @module lib/ai/usage-logger
 */

// @deprecated Migrate to agent_conversations/agent_messages after database-reformation.
import type { SupabaseClient } from "@supabase/supabase-js";

import { appLogger as logger } from "@/lib/logger";

export interface UsageLogEntry {
  organizationId: string;
  provider: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  endpoint?: string;
}

/**
 * Log AI usage to ai_usage_log. Fire-and-forget — does not throw.
 * Use when you have a Supabase client (user or service role) and usage info.
 */
export async function logAIUsage(
  supabase: SupabaseClient,
  entry: UsageLogEntry,
): Promise<void> {
  try {
    const { error } = await supabase.from("ai_usage_log").insert({
      organization_id: entry.organizationId,
      provider: entry.provider,
      model: entry.model,
      prompt_tokens: entry.promptTokens,
      completion_tokens: entry.completionTokens,
      endpoint: entry.endpoint ?? null,
    });

    if (error) {
      logger.warn("Failed to log AI usage", { error: error.message, entry });
    }
  } catch (err) {
    logger.warn("AI usage logging error", { err, entry });
  }
}

/**
 * Log token usage per message and accumulate per session.
 * Persists in chat_messages.metadata.token_count and chat_sessions.metadata.
 * Fire-and-forget — does not throw.
 */
export async function logTokenUsage(
  supabase: SupabaseClient,
  params: {
    sessionId: string;
    messageId: string;
    promptTokens: number;
    completionTokens: number;
  },
): Promise<void> {
  const { sessionId, messageId, promptTokens, completionTokens } = params;
  const tokenCount = {
    prompt: promptTokens,
    completion: completionTokens,
    total: promptTokens + completionTokens,
  };

  try {
    // 1. Persist per-message token_count in chat_messages.metadata
    // @deprecated Migrate to agent_messages after database-reformation
    const { error: msgError } = await supabase
      .from("chat_messages")
      .update({ metadata: { token_count: tokenCount } })
      .eq("id", messageId);

    if (msgError) {
      logger.warn("Failed to log per-message token usage", {
        error: msgError.message,
        sessionId,
        messageId,
      });
    }

    // 2. Accumulate in chat_sessions.metadata.token_count
    // @deprecated Migrate to agent_conversations after database-reformation
    const { data: session } = await supabase
      .from("chat_sessions")
      .select("metadata")
      .eq("id", sessionId)
      .single();

    if (session) {
      const currentMeta = (session.metadata as Record<string, unknown>) || {};
      const existingTokens = (currentMeta.token_count as {
        prompt: number;
        completion: number;
        total: number;
      }) || { prompt: 0, completion: 0, total: 0 };
      const accumulated = {
        prompt: (existingTokens.prompt || 0) + promptTokens,
        completion: (existingTokens.completion || 0) + completionTokens,
        total: (existingTokens.total || 0) + promptTokens + completionTokens,
      };

      await supabase
        .from("chat_sessions")
        .update({ metadata: { ...currentMeta, token_count: accumulated } })
        .eq("id", sessionId);
    }
  } catch (err) {
    logger.warn("Token usage logging error", { err, sessionId, messageId });
  }
}
