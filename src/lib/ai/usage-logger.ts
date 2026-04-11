/**
 * AI Usage Logger
 * Logs LLM token usage to ai_usage_log for cost monitoring.
 *
 * @module lib/ai/usage-logger
 */

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
 * Log AI usage to the database. Fire-and-forget - does not throw.
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
