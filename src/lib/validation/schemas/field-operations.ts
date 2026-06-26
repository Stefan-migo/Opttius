import { z } from "zod";

import { uuidSchema } from "./base";

const fieldOperationDateSchema = z.union([
  z.string().regex(/^\d{4}-\d{2}-\d{2}/, "Formato fecha: YYYY-MM-DD"),
  z.coerce.date(),
]);

export const createFieldOperationSchema = z.object({
  name: z.string().min(1, "El nombre es requerido").max(255).trim(),
  scheduled_date: fieldOperationDateSchema,
  location: z.string().max(500).trim().optional().nullable(),
  branch_id: uuidSchema,
});

export const updateFieldOperationSchema = z.object({
  name: z.string().min(1).max(255).trim().optional(),
  scheduled_date: fieldOperationDateSchema.optional(),
  location: z.string().max(500).trim().optional().nullable(),
  status: z
    .enum(["draft", "prepared", "in_progress", "completed", "cancelled"])
    .optional(),
});

export const transferStockSchema = z.object({
  product_id: uuidSchema,
  quantity: z.number().int().positive("La cantidad debe ser mayor a 0"),
});

export const transferStockBulkSchema = z.object({
  items: z
    .array(transferStockSchema)
    .min(1, "Debe incluir al menos un producto"),
});

export const returnStockSchema = z.object({
  product_id: uuidSchema,
  quantity: z.number().int().positive("La cantidad debe ser mayor a 0"),
});

export const returnStockBulkSchema = z.object({
  items: z.array(returnStockSchema).min(1, "Debe incluir al menos un producto"),
});

export const deliverFieldOperationSchema = z.object({
  work_order_ids: z
    .array(uuidSchema)
    .min(1, "Debe seleccionar al menos un trabajo"),
  delivered_at: z.coerce.date().optional(),
  recipient_name: z
    .string()
    .min(1, "El nombre del receptor es requerido")
    .max(255)
    .trim(),
  notes: z.string().max(1000).trim().optional().nullable(),
});
