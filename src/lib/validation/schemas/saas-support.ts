import { z } from "zod";

import { emailSchema, uuidOptionalSchema } from "./base";

export const saasSupportCategorySchema = z.enum([
  "technical",
  "billing",
  "feature_request",
  "bug_report",
  "account",
  "other",
]);

export const saasSupportPrioritySchema = z.enum([
  "low",
  "medium",
  "high",
  "urgent",
]);

export const saasSupportStatusSchema = z.enum([
  "open",
  "assigned",
  "in_progress",
  "waiting_customer",
  "resolved",
  "closed",
]);

export const saasSupportMessageTypeSchema = z.enum([
  "message",
  "note",
  "status_change",
  "assignment",
  "resolution",
]);

export const createSaasSupportTicketSchema = z.object({
  subject: z
    .string()
    .min(1, "El asunto es requerido")
    .max(255, "El asunto es demasiado largo")
    .trim(),
  description: z
    .string()
    .min(10, "La descripción debe tener al menos 10 caracteres")
    .max(5000, "La descripción es demasiado larga")
    .trim(),
  category: saasSupportCategorySchema,
  priority: saasSupportPrioritySchema.default("medium").optional(),
  metadata: z.record(z.unknown()).default({}),
});

export const createPublicSaasSupportTicketSchema = z.object({
  requester_name: z
    .string()
    .min(1, "El nombre es requerido")
    .max(255, "El nombre es demasiado largo")
    .trim(),
  requester_email: emailSchema,
  organization_name: z.string().max(255).trim().optional(),
  subject: z
    .string()
    .min(1, "El asunto es requerido")
    .max(255, "El asunto es demasiado largo")
    .trim(),
  description: z
    .string()
    .min(10, "La descripción debe tener al menos 10 caracteres")
    .max(5000, "La descripción es demasiado larga")
    .trim(),
  category: saasSupportCategorySchema,
  priority: saasSupportPrioritySchema.default("medium").optional(),
  metadata: z.record(z.unknown()).default({}),
});

export const updateSaasSupportTicketSchema = z.object({
  status: saasSupportStatusSchema.optional(),
  priority: saasSupportPrioritySchema.optional(),
  assigned_to: uuidOptionalSchema,
  resolution: z.string().max(5000).trim().optional().nullable(),
  customer_satisfaction_rating: z
    .number()
    .int()
    .min(1)
    .max(5)
    .optional()
    .nullable(),
  customer_feedback: z.string().max(2000).trim().optional().nullable(),
});

export const createSaasSupportMessageSchema = z.object({
  message: z
    .string()
    .min(1, "El mensaje es requerido")
    .max(5000, "El mensaje es demasiado largo")
    .trim(),
  is_internal: z.boolean().default(false).optional(),
  message_type: saasSupportMessageTypeSchema.default("message").optional(),
  attachments: z.array(z.record(z.unknown())).default([]),
});

export const createSaasSupportTemplateSchema = z.object({
  name: z
    .string()
    .min(1, "El nombre es requerido")
    .max(255, "El nombre es demasiado largo")
    .trim(),
  subject: z.string().max(255).trim().optional().nullable(),
  content: z
    .string()
    .min(1, "El contenido es requerido")
    .max(10000, "El contenido es demasiado largo")
    .trim(),
  category: saasSupportCategorySchema.optional().nullable(),
  variables: z.array(z.string()).optional().default([]),
  is_active: z.boolean().default(true).optional(),
});

export const updateSaasSupportTemplateSchema = z.object({
  name: z.string().min(1).max(255).trim().optional(),
  subject: z.string().max(255).trim().optional().nullable(),
  content: z.string().min(1).max(10000).trim().optional(),
  category: saasSupportCategorySchema.optional().nullable(),
  variables: z.array(z.string()).optional(),
  is_active: z.boolean().optional(),
});

export const saasSupportTicketFiltersSchema = z.object({
  organization_id: uuidOptionalSchema,
  status: saasSupportStatusSchema.optional(),
  priority: saasSupportPrioritySchema.optional(),
  category: saasSupportCategorySchema.optional(),
  assigned_to: uuidOptionalSchema,
  search: z.string().max(255).trim().optional(),
  page: z.coerce.number().int().min(1).default(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20).optional(),
  sort_by: z
    .enum(["created_at", "updated_at", "priority", "status"])
    .default("created_at")
    .optional(),
  sort_order: z.enum(["asc", "desc"]).default("desc").optional(),
});
