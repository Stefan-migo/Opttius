import { z } from "zod";

import {
  uuidSchema,
  uuidOptionalSchema,
  dateISOOptionalSchema,
  priceSchema,
  priceNonNegativeSchema,
} from "./base";

export const createWorkOrderSchema = z.object({
  customer_id: uuidSchema,
  prescription_id: uuidOptionalSchema,
  quote_id: uuidOptionalSchema,
  frame_product_id: uuidOptionalSchema,
  customer_own_frame: z.boolean().default(false).optional(),
  frame_name: z
    .string()
    .min(1, "El nombre del marco es requerido")
    .max(255)
    .trim(),
  frame_brand: z.string().max(100).trim().optional().nullable(),
  frame_model: z.string().max(100).trim().optional().nullable(),
  frame_color: z.string().max(100).trim().optional().nullable(),
  frame_size: z.string().max(50).trim().optional().nullable(),
  frame_sku: z.string().max(100).trim().optional().nullable(),
  frame_serial_number: z.string().max(100).trim().optional().nullable(),
  lens_family_id: uuidOptionalSchema,
  lens_type: z.string().min(1, "El tipo de lente es requerido").max(100).trim(),
  lens_material: z
    .string()
    .min(1, "El material del lente es requerido")
    .max(100)
    .trim(),
  lens_index: z.number().positive().optional().nullable(),
  lens_treatments: z.array(z.string()).optional(),
  lens_tint_color: z.string().max(100).trim().optional().nullable(),
  lens_tint_percentage: z.number().min(0).max(100).optional().nullable(),
  presbyopia_solution: z
    .enum(["none", "two_separate", "bifocal", "trifocal", "progressive"])
    .default("none")
    .optional(),
  far_lens_family_id: uuidOptionalSchema,
  near_lens_family_id: uuidOptionalSchema,
  far_lens_cost: z
    .preprocess(
      (val) => {
        if (val === null || val === undefined || val === "") return null;
        if (typeof val === "number") return val;
        if (typeof val === "string") {
          const trimmed = val.trim();
          if (trimmed === "") return null;
          const num = parseFloat(trimmed);
          return isNaN(num) ? null : num;
        }
        return val;
      },
      z.union([
        z
          .number()
          .nonnegative("El precio debe ser un número no negativo")
          .finite("El precio debe ser un número finito"),
        z.null(),
      ]),
    )
    .optional()
    .nullable(),
  near_lens_cost: z
    .preprocess(
      (val) => {
        if (val === null || val === undefined || val === "") return null;
        if (typeof val === "number") return val;
        if (typeof val === "string") {
          const trimmed = val.trim();
          if (trimmed === "") return null;
          const num = parseFloat(trimmed);
          return isNaN(num) ? null : num;
        }
        return val;
      },
      z.union([
        z
          .number()
          .nonnegative("El precio debe ser un número no negativo")
          .finite("El precio debe ser un número finito"),
        z.null(),
      ]),
    )
    .optional()
    .nullable(),
  lab_name: z.string().max(200).trim().optional().nullable(),
  lab_contact: z.string().max(200).trim().optional().nullable(),
  lab_order_number: z.string().max(100).trim().optional().nullable(),
  lab_estimated_delivery_date: dateISOOptionalSchema,
  status: z
    .enum([
      "quote",
      "pending",
      "in_progress",
      "completed",
      "cancelled",
      "ordered",
    ])
    .default("quote")
    .optional(),
  frame_cost: priceNonNegativeSchema.default(0).optional(),
  lens_cost: priceNonNegativeSchema.default(0).optional(),
  treatments_cost: priceNonNegativeSchema.default(0).optional(),
  labor_cost: priceNonNegativeSchema.default(0).optional(),
  lab_cost: priceNonNegativeSchema.default(0).optional(),
  subtotal: priceNonNegativeSchema.default(0).optional(),
  tax_amount: priceNonNegativeSchema.default(0).optional(),
  discount_amount: priceNonNegativeSchema.default(0).optional(),
  total_amount: priceSchema,
  currency: z.string().max(10).default("CLP").optional(),
  payment_status: z
    .enum(["pending", "partial", "paid", "refunded"])
    .default("pending")
    .optional(),
  payment_method: z.string().max(50).trim().optional().nullable(),
  deposit_amount: priceNonNegativeSchema.default(0).optional(),
  balance_amount: priceSchema.optional(),
  pos_order_id: uuidOptionalSchema,
  internal_notes: z.string().max(5000).trim().optional().nullable(),
  customer_notes: z.string().max(5000).trim().optional().nullable(),
  assigned_to: uuidOptionalSchema,
  branch_id: uuidOptionalSchema,
});
