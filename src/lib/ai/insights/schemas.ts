/**
 * Zod Schemas for AI Insights
 *
 * Validates the structure of AI-generated insights to ensure consistency
 * and data integrity across the application.
 *
 * @module lib/ai/insights/schemas
 */

import { z } from "zod";

/**
 * Valid insight types
 */
export const InsightTypeSchema = z.enum([
  "warning",
  "opportunity",
  "info",
  "neutral",
]);

/**
 * Valid sections where insights can be displayed
 */
export const InsightSectionSchema = z.enum([
  "dashboard",
  "inventory",
  "clients",
  "pos",
  "analytics",
]);

/**
 * Schema for a single insight
 */
const OptionalActionLabelSchema = z.preprocess(
  (value) => (value === null || value === "" ? undefined : value),
  z.string().max(50, "Action label must be 50 characters or less").optional(),
);

const OptionalActionUrlSchema = z.preprocess(
  (value) => (value === null || value === "" ? undefined : value),
  z
    .string()
    .refine((value) => {
      if (value.startsWith("/")) return true;
      try {
        new URL(value);
        return true;
      } catch {
        return false;
      }
    }, "Action URL must be an absolute URL or relative path")
    .optional(),
);

const MetadataSchema = z.preprocess(
  (value) => (value === null || value === undefined ? {} : value),
  z.record(z.any()),
);

export const InsightSchema = z.object({
  type: InsightTypeSchema,
  title: z.string().min(1).max(100, "Title must be 100 characters or less"),
  message: z.string().min(1).max(500, "Message must be 500 characters or less"),
  action_label: OptionalActionLabelSchema,
  action_url: OptionalActionUrlSchema,
  priority: z
    .number()
    .int()
    .min(1)
    .max(10, "Priority must be between 1 and 10"),
  metadata: MetadataSchema.optional().default({}),
});

/**
 * Schema for the response from LLM containing multiple insights
 */
export const InsightsResponseSchema = z.object({
  insights: z.array(InsightSchema).default([]),
});

/**
 * Schema for creating an insight in the database
 */
export const CreateInsightSchema = InsightSchema.extend({
  organization_id: z.string().uuid("Organization ID must be a valid UUID"),
  section: InsightSectionSchema,
});

/**
 * Schema for updating an insight (all fields optional except id)
 */
export const UpdateInsightSchema = z.object({
  is_dismissed: z.boolean().optional(),
  feedback_score: z.number().int().min(1).max(5).optional(),
});

/**
 * Schema for insight feedback
 */
export const InsightFeedbackSchema = z.object({
  score: z
    .number()
    .int()
    .min(1)
    .max(5, "Feedback score must be between 1 and 5"),
  comment: z.string().max(500).optional(),
});

/**
 * TypeScript types inferred from schemas
 */
export type InsightType = z.infer<typeof InsightTypeSchema>;
export type InsightSection = z.infer<typeof InsightSectionSchema>;
export type Insight = z.infer<typeof InsightSchema>;
export type InsightsResponse = z.infer<typeof InsightsResponseSchema>;
export type CreateInsight = z.infer<typeof CreateInsightSchema>;
export type UpdateInsight = z.infer<typeof UpdateInsightSchema>;
export type InsightFeedback = z.infer<typeof InsightFeedbackSchema>;

/**
 * Database insight type (includes database fields)
 */
export type DatabaseInsight = Insight & {
  id: string;
  organization_id: string;
  section: InsightSection;
  is_dismissed: boolean;
  feedback_score?: number | null;
  created_at: string;
  updated_at: string;
};
