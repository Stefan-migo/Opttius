import { z } from "zod";

import {
  uuidSchema,
  uuidOptionalSchema,
  dateISOOptionalSchema,
  priceNonNegativeSchema,
} from "./base";

export const createQuoteSchema = z.object({
  customer_id: uuidSchema,
  prescription_id: uuidOptionalSchema,
  frame_product_id: uuidOptionalSchema,
  customer_own_frame: z.boolean().default(false).optional(),
  frame_name: z.string().max(255).trim().optional().nullable(),
  frame_brand: z.string().max(100).trim().optional().nullable(),
  frame_model: z.string().max(100).trim().optional().nullable(),
  frame_color: z.string().max(100).trim().optional().nullable(),
  frame_size: z.string().max(50).trim().optional().nullable(),
  frame_sku: z.string().max(100).trim().optional().nullable(),
  frame_price: priceNonNegativeSchema.default(0).optional(),
  lens_family_id: uuidOptionalSchema,
  lens_type: z.string().max(100).trim().optional().nullable(),
  lens_material: z.string().max(100).trim().optional().nullable(),
  lens_index: z
    .union([z.number().positive().finite(), z.null()])
    .optional()
    .nullable(),
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
  near_frame_product_id: uuidOptionalSchema,
  near_frame_name: z.string().max(255).trim().optional().nullable(),
  near_frame_brand: z.string().max(100).trim().optional().nullable(),
  near_frame_model: z.string().max(100).trim().optional().nullable(),
  near_frame_color: z.string().max(100).trim().optional().nullable(),
  near_frame_size: z.string().max(50).trim().optional().nullable(),
  near_frame_sku: z.string().max(100).trim().optional().nullable(),
  near_frame_price: priceNonNegativeSchema.default(0).optional(),
  near_frame_price_includes_tax: z.boolean().default(false).optional(),
  near_frame_cost: priceNonNegativeSchema.default(0).optional(),
  customer_own_near_frame: z.boolean().default(false).optional(),
  contact_lens_family_id: uuidOptionalSchema,
  contact_lens_rx_sphere_od: z.number().optional().nullable(),
  contact_lens_rx_cylinder_od: z.number().optional().nullable(),
  contact_lens_rx_axis_od: z
    .number()
    .int()
    .min(0)
    .max(180)
    .optional()
    .nullable(),
  contact_lens_rx_add_od: z.number().optional().nullable(),
  contact_lens_rx_base_curve_od: z.number().optional().nullable(),
  contact_lens_rx_diameter_od: z.number().optional().nullable(),
  contact_lens_rx_sphere_os: z.number().optional().nullable(),
  contact_lens_rx_cylinder_os: z.number().optional().nullable(),
  contact_lens_rx_axis_os: z
    .number()
    .int()
    .min(0)
    .max(180)
    .optional()
    .nullable(),
  contact_lens_rx_add_os: z.number().optional().nullable(),
  contact_lens_rx_base_curve_os: z.number().optional().nullable(),
  contact_lens_rx_diameter_os: z.number().optional().nullable(),
  contact_lens_quantity: z
    .preprocess((v) => (v == null ? 1 : v), z.number().int().positive())
    .optional(),
  contact_lens_cost: z
    .preprocess((v) => (v == null ? 0 : v), priceNonNegativeSchema)
    .optional(),
  contact_lens_price: z
    .preprocess((v) => (v == null ? 0 : v), priceNonNegativeSchema)
    .optional(),
  frame_cost: priceNonNegativeSchema.default(0).optional(),
  lens_cost: priceNonNegativeSchema.default(0).optional(),
  treatments_cost: priceNonNegativeSchema.default(0).optional(),
  labor_cost: priceNonNegativeSchema.default(0).optional(),
  subtotal: priceNonNegativeSchema.default(0).optional(),
  tax_amount: priceNonNegativeSchema.default(0).optional(),
  discount_amount: priceNonNegativeSchema.default(0).optional(),
  discount_percentage: z.number().min(0).max(100).default(0).optional(),
  total_amount: priceNonNegativeSchema.default(0).optional(),
  currency: z.string().max(10).default("CLP").optional(),
  status: z
    .enum(["draft", "sent", "accepted", "rejected", "expired"])
    .default("draft")
    .optional(),
  notes: z.string().max(5000).trim().optional().nullable(),
  customer_notes: z.string().max(5000).trim().optional().nullable(),
  terms_and_conditions: z.string().max(5000).trim().optional().nullable(),
  expiration_date: dateISOOptionalSchema,
  branch_id: uuidOptionalSchema,
  field_operation_id: uuidOptionalSchema,
});
