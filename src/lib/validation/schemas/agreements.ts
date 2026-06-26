import { z } from "zod";

import { rutSchema, uuidOptionalSchema, uuidSchema } from "./base";

const billingRulesSchema = z
  .object({
    copago_percent: z.number().min(0).max(100).optional(),
    institutional_percent: z.number().min(0).max(100).optional(),
    copago_per_product: z.record(z.string(), z.number()).optional(),
    max_monthly_deduction_per_worker: z.number().optional(),
    require_oc: z.boolean().optional().default(true),
  })
  .optional()
  .nullable();

export const createAgreementSchema = z.object({
  name: z
    .string()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(200)
    .trim(),
  agreement_type: z.enum(["empresa", "sindicato", "mutual"]),
  institution_name: z
    .string()
    .min(2, "La razón social es requerida")
    .max(200)
    .trim(),
  institution_rut: rutSchema,
  representative_name: z.string().max(200).trim().optional().nullable(),
  representative_email: z
    .union([z.string().email("Email inválido").max(200).trim(), z.literal("")])
    .optional()
    .nullable()
    .transform((v) => (!v || v === "" ? null : v)),
  representative_phone: z.string().max(50).trim().optional().nullable(),
  valid_from: z.union([
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato YYYY-MM-DD"),
    z.coerce.date(),
  ]),
  valid_until: z
    .union([
      z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      z.coerce.date(),
      z.literal(""),
    ])
    .optional()
    .nullable()
    .transform((v) => (!v || v === "" ? null : v)),
  branch_id: uuidOptionalSchema,
  billing_rules: billingRulesSchema,
  max_installments_by_product: z
    .record(z.string(), z.number().int().positive())
    .optional()
    .nullable(),
  discount_percent: z.number().min(0).max(100).optional().nullable(),
  notes: z.string().max(1000).trim().optional().nullable(),
});

export const updateAgreementSchema = createAgreementSchema.partial();

export const createPurchaseOrderSchema = z.object({
  agreement_id: uuidSchema,
  oc_number: z.string().min(1, "El número de OC es requerido").max(100).trim(),
  issued_at: z
    .union([
      z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      z.coerce.date(),
      z.literal(""),
    ])
    .optional()
    .nullable()
    .transform((v) => (!v || v === "" ? null : v)),
  valid_until: z
    .union([
      z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      z.coerce.date(),
      z.literal(""),
    ])
    .optional()
    .nullable()
    .transform((v) => (!v || v === "" ? null : v)),
  max_amount: z.number().positive().optional().nullable(),
  notes: z.string().max(500).trim().optional().nullable(),
});

export const updatePurchaseOrderSchema = createPurchaseOrderSchema
  .omit({ agreement_id: true })
  .extend({
    status: z.enum(["active", "exhausted", "expired", "cancelled"]).optional(),
  })
  .partial();

export const reconcileSchema = z.object({
  balance_ids: z
    .array(uuidSchema)
    .min(1, "Debe seleccionar al menos un balance"),
  paid_at: z.union([z.string().datetime(), z.coerce.date()]),
  payment_reference: z.string().max(200).trim().optional().nullable(),
  emit_invoice: z.boolean().optional().default(true),
});

export const agreementListQuerySchema = z.object({
  status: z.enum(["active", "suspended", "expired", "cancelled"]).optional(),
  branch_id: uuidOptionalSchema,
  agreement_type: z.enum(["empresa", "sindicato", "mutual"]).optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
});
