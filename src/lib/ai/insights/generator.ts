/**
 * AI Insights Generator
 *
 * Generates contextual insights using LLMs with structured output validation.
 * Handles LLM calls, response parsing, and schema validation.
 * Now enhanced with organizational maturity awareness for adaptive prompts.
 *
 * @module lib/ai/insights/generator
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import { appLogger as logger } from "@/lib/logger";

import { LLMFactory } from "../factory";
import type { MaturityLevel } from "../memory/organizational";
import { logAIUsage } from "../usage-logger";
import { OrganizationalMaturitySystem } from "./maturity";
import {
  getDailySummaryPrompt,
  getSectionPrompt,
  getUserMessage,
} from "./prompts";
import {
  type Insight,
  InsightSchema,
  type InsightSection,
  InsightsResponseSchema,
} from "./schemas";

export interface GenerateInsightsOptions {
  section: InsightSection;
  data: unknown;
  organizationName: string;
  organizationId?: string;
  maturityLevel?: MaturityLevel;
  additionalContext?: Record<string, unknown>;
  temperature?: number;
  maxRetries?: number;
  useMaturityAdaptation?: boolean;
  /** Optional: if provided, AI usage will be logged for cost tracking */
  supabase?: SupabaseClient;
  /** Optional: "daily_summary" uses a specialized prompt for yesterday's executive summary */
  variant?: "daily_summary";
  /** For daily_summary: the date string (YYYY-MM-DD) */
  variantDate?: string;
}

/**
 * Generate insights for a specific section using LLM
 *
 * @param options - Options for insight generation
 * @returns Array of validated insights
 * @throws Error if LLM call fails or validation fails
 */
export async function generateInsights(
  options: GenerateInsightsOptions,
): Promise<Insight[]> {
  const {
    section,
    data,
    organizationName,
    organizationId,
    maturityLevel,
    additionalContext,
    temperature = 0.7,
    maxRetries = 2,
    useMaturityAdaptation = true,
    supabase,
    variant,
    variantDate,
  } = options;

  const factory = LLMFactory.getInstance();

  // Try to get a provider with fallback
  let provider;
  let config;
  try {
    const result = await factory.createProviderWithFallback(undefined, {
      temperature,
      maxTokens: 2000, // Limit tokens for cost control
    });
    provider = result.provider;
    config = result.config;
  } catch (error) {
    logger.error("Failed to initialize LLM provider", { error });
    throw new Error("No available LLM providers configured");
  }

  // Get prompts - with maturity adaptation if available
  let systemPrompt: string;

  if (useMaturityAdaptation && maturityLevel && organizationId) {
    // Use maturity-adapted prompts
    const maturitySystem = new OrganizationalMaturitySystem(organizationId);
    systemPrompt = await maturitySystem.getAdaptivePrompts(
      section,
      maturityLevel,
      data,
      organizationName,
      additionalContext,
    );

    logger.info("Using maturity-adapted prompts", {
      section,
      maturityLevel: maturityLevel.level,
      organizationAge: maturityLevel.daysSinceCreation,
    });
  } else if (variant === "daily_summary" && variantDate) {
    systemPrompt = getDailySummaryPrompt(
      organizationName,
      data,
      variantDate,
      additionalContext,
    );
  } else {
    // Use standard prompts
    systemPrompt = getSectionPrompt(
      section,
      data,
      organizationName,
      additionalContext,
    );
  }

  const userMessage =
    variant === "daily_summary"
      ? `Genera el resumen ejecutivo del día ${variantDate} con los datos proporcionados.`
      : getUserMessage(section, data);

  // Retry logic for LLM calls
  let lastError: Error | null = null;
  let lastResponseContent: string | undefined;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Call LLM
      const response = await provider.generateText(
        [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        undefined, // No tools needed for insights generation
        config,
      );

      lastResponseContent = response.content;

      if (
        supabase &&
        organizationId &&
        response.usage &&
        (response.usage.promptTokens > 0 || response.usage.completionTokens > 0)
      ) {
        logAIUsage(supabase, {
          organizationId,
          provider: provider.name,
          model: config.model || "unknown",
          promptTokens: response.usage.promptTokens,
          completionTokens: response.usage.completionTokens,
          endpoint: "insights",
        });
      }

      // Parse JSON from response
      let parsedResponse: unknown;
      try {
        // Try to parse as JSON first
        parsedResponse = JSON.parse(response.content);
      } catch (parseError) {
        // If parsing fails, try to extract JSON from markdown code blocks
        const jsonMatch = response.content.match(
          /```(?:json)?\s*(\{[\s\S]*\})\s*```/,
        );
        if (jsonMatch) {
          parsedResponse = JSON.parse(jsonMatch[1]);
        } else {
          // Try to find JSON object in the response
          const jsonObjectMatch = response.content.match(/\{[\s\S]*\}/);
          if (jsonObjectMatch) {
            parsedResponse = JSON.parse(jsonObjectMatch[0]);
          } else {
            logger.error("No valid JSON found in LLM response", {
              section,
              provider: provider.name,
              contentPreview: response.content.slice(0, 2000),
            });
            throw new Error("No valid JSON found in LLM response");
          }
        }
      }

      // Validate with Zod schema
      const validated = InsightsResponseSchema.parse(parsedResponse);

      logger.info("Insights generated successfully", {
        section,
        count: validated.insights.length,
        provider: provider.name,
      });

      return validated.insights;
    } catch (error: unknown) {
      lastError = error;
      logger.warn(`Insight generation attempt ${attempt + 1} failed`, {
        section,
        error: error.message,
        attempt: attempt + 1,
      });

      // If it's a validation error, don't retry
      if (error.name === "ZodError") {
        logger.error("Schema validation failed for insights", {
          section,
          provider: provider.name,
          errors: error.errors,
          contentPreview: lastResponseContent?.slice(0, 2000),
        });
        throw new Error(`Invalid insight format: ${error.message}`);
      }

      // If it's the last attempt, throw the error
      if (attempt === maxRetries) {
        throw new Error(
          `Failed to generate insights after ${maxRetries + 1} attempts: ${lastError?.message}`,
        );
      }

      // Wait before retrying (exponential backoff)
      await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
    }
  }

  throw new Error(`Failed to generate insights: ${lastError?.message}`);
}

/**
 * Generate a single insight (for real-time scenarios like POS)
 *
 * @param options - Options for insight generation
 * @returns Single validated insight or null if no insight needed
 */
export async function generateSingleInsight(
  options: GenerateInsightsOptions,
): Promise<Insight | null> {
  const insights = await generateInsights(options);

  // Return the highest priority insight, or null if empty
  if (insights.length === 0) {
    return null;
  }

  // Sort by priority (descending) and return the first one
  return insights.sort((a, b) => b.priority - a.priority)[0];
}

/**
 * Validate insights without generating new ones
 * Useful for testing or re-validation
 */
export function validateInsights(insights: unknown[]): Insight[] {
  return insights.map((insight) => InsightSchema.parse(insight));
}
