import { z } from "zod";

import { uuidOptionalSchema } from "./base";

export const opticalInternalSupportCategorySchema = z.enum([
  "lens_issue",
  "frame_issue",
  "prescription_issue",
  "delivery_issue",
  "payment_issue",
  "appointment_issue",
  "customer_complaint",
  "quality_issue",
  "other",
]);

export const opticalInternalSupportPrioritySchema = z.enum([
  "low",
  "medium",
  "high",
  "urgent",
]);

export const opticalInternalSupportStatusSchema = z.enum([
  "open",
  "assigned",
  "in_progress",
  "waiting_customer",
  "resolved",
  "closed",
]);

export const opticalInternalSupportMessageTypeSchema = z.enum([
  "message",
  "note",
  "status_change",
  "assignment",
  "resolution",
]);

export const createOpticalInternalSupportTicketSchema = z.object({
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
  category: opticalInternalSupportCategorySchema,
  priority: opticalInternalSupportPrioritySchema.default("medium").optional(),
  branch_id: uuidOptionalSchema,
  customer_id: uuidOptionalSchema,
  customer_name: z.string().max(255).trim().optional(),
  customer_email: z.string().email().max(255).trim().optional(),
  customer_phone: z.string().max(50).trim().optional(),
  related_order_id: uuidOptionalSchema,
  related_work_order_id: uuidOptionalSchema,
  related_appointment_id: uuidOptionalSchema,
  related_quote_id: uuidOptionalSchema,
  assigned_to: uuidOptionalSchema,
  metadata: z.record(z.unknown()).default({}),
});

export const updateOpticalInternalSupportTicketSchema = z.object({
  status: opticalInternalSupportStatusSchema.optional(),
  priority: opticalInternalSupportPrioritySchema.optional(),
  assigned_to: uuidOptionalSchema,
  resolution: z.string().max(5000).trim().optional().nullable(),
  resolution_notes: z.string().max(5000).trim().optional().nullable(),
});

export const createOpticalInternalSupportMessageSchema = z.object({
  message: z
    .string()
    .min(1, "El mensaje es requerido")
    .max(5000, "El mensaje es demasiado largo")
    .trim(),
  is_internal: z.boolean().default(true).optional(),
  message_type: opticalInternalSupportMessageTypeSchema
    .default("message")
    .optional(),
  attachments: z.array(z.record(z.unknown())).default([]),
});

export const opticalInternalSupportTicketFiltersSchema = z.object({
  branch_id: uuidOptionalSchema,
  customer_id: uuidOptionalSchema,
  status: opticalInternalSupportStatusSchema.optional(),
  priority: opticalInternalSupportPrioritySchema.optional(),
  category: opticalInternalSupportCategorySchema.optional(),
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
