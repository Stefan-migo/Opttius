import { z } from "zod";

import {
  priceSchema,
  priceOptionalSchema,
  urlOptionalSchema,
  urlSchema,
  uuidOptionalSchema,
  dateISOOptionalSchema,
  quantityOptionalSchema,
  searchSchema,
} from "./base";

const ingredientSchema = z.object({
  name: z.string().min(1).max(200),
  percentage: z.number().min(0).max(100).optional(),
});

export const productBaseSchema = z.object({
  name: z
    .string()
    .min(1, "El nombre del producto es requerido")
    .max(255)
    .trim(),
  slug: z.string().max(255).trim().optional(),
  short_description: z.string().max(500).trim().optional().nullable(),
  description: z.string().max(10000).trim().optional().nullable(),
  price: priceSchema,
  compare_at_price: priceOptionalSchema,
  cost_price: priceOptionalSchema,
  price_includes_tax: z.boolean().default(false).optional(),
  category_id: uuidOptionalSchema,
  branch_id: uuidOptionalSchema,
  featured_image: urlOptionalSchema,
  gallery: z
    .array(urlSchema)
    .optional()
    .nullable()
    .transform((val) => {
      if (!val || val.length === 0) return [];
      return val.filter((url) => url && url !== "");
    }),
  tags: z.array(z.string()).optional(),
  product_type: z
    .enum(["frame", "lens", "accessory", "service", "other"])
    .default("frame")
    .optional(),
  optical_category: z.string().max(100).trim().optional().nullable(),
  sku: z.string().max(100).trim().optional().nullable(),
  barcode: z.string().max(100).trim().optional().nullable(),
  brand: z.string().max(100).trim().optional().nullable(),
  manufacturer: z.string().max(100).trim().optional().nullable(),
  model_number: z.string().max(100).trim().optional().nullable(),
  frame_type: z.string().max(100).trim().optional().nullable(),
  frame_material: z.string().max(100).trim().optional().nullable(),
  frame_shape: z.string().max(100).trim().optional().nullable(),
  frame_color: z.string().max(100).trim().optional().nullable(),
  frame_size: z.string().max(50).trim().optional().nullable(),
  frame_bridge_width: z.number().positive().optional().nullable(),
  frame_temple_length: z.number().positive().optional().nullable(),
  frame_lens_width: z.number().positive().optional().nullable(),
  frame_lens_height: z.number().positive().optional().nullable(),
  lens_type: z.string().max(100).trim().optional().nullable(),
  lens_material: z.string().max(100).trim().optional().nullable(),
  lens_coating: z.string().max(100).trim().optional().nullable(),
  lens_prescription_type: z.string().max(100).trim().optional().nullable(),
  skin_type: z.array(z.string()).optional(),
  benefits: z.array(z.string()).optional(),
  certifications: z.array(z.string()).optional(),
  ingredients: z.array(ingredientSchema).optional(),
  usage_instructions: z.string().max(2000).trim().optional().nullable(),
  precautions: z.string().max(2000).trim().optional().nullable(),
  weight: z.number().positive().optional().nullable(),
  dimensions: z.string().max(100).trim().optional().nullable(),
  package_characteristics: z.string().max(500).trim().optional().nullable(),
  is_featured: z.boolean().default(false).optional(),
  status: z.enum(["active", "draft", "archived"]).default("draft").optional(),
  published_at: dateISOOptionalSchema,
});

export const createProductSchema = productBaseSchema.extend({
  stock_quantity: quantityOptionalSchema,
});

export const updateProductSchema = productBaseSchema.partial().extend({
  name: z.string().min(1).max(255).trim().optional(),
});

export const searchProductSchema = searchSchema.extend({
  category_id: uuidOptionalSchema,
  product_type: z
    .enum(["frame", "lens", "accessory", "service", "other"])
    .optional(),
  status: z.enum(["active", "draft", "archived"]).optional(),
  branch_id: uuidOptionalSchema,
  min_price: z.coerce.number().positive().optional(),
  max_price: z.coerce.number().positive().optional(),
});
