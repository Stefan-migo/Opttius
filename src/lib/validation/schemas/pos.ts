import { z } from "zod";

import {
  emailOptionalSchema,
  uuidOptionalSchema,
  rutOptionalSchema,
  priceSchema,
  priceOptionalSchema,
  priceNonNegativeSchema,
  quantitySchema,
  uuidSchema,
} from "./base";

const priceAllowNegativeSchema = z.preprocess(
  (val) => {
    if (typeof val === "number") return val;
    if (typeof val === "string") {
      const trimmed = val.trim();
      if (trimmed === "") return undefined;
      const num = parseFloat(trimmed);
      return isNaN(num) ? undefined : num;
    }
    return val;
  },
  z
    .number({
      required_error: "El precio es requerido",
      invalid_type_error: "El precio debe ser un número",
    })
    .finite("El precio debe ser un número finito"),
);

const posSaleItemSchema = z.object({
  product_id: z
    .union([uuidSchema, z.string().min(1), z.null(), z.undefined()])
    .optional()
    .nullable(),
  quantity: quantitySchema,
  unit_price: priceAllowNegativeSchema,
  total_price: priceAllowNegativeSchema.optional().nullable(),
  product_name: z.string().min(1).max(255).trim(),
  product_type: z.string().optional().nullable(),
});

const lensDataSchema = z
  .object({
    lens_family_id: uuidOptionalSchema,
    lens_type: z.string().max(100).trim().optional().nullable(),
    lens_material: z.string().max(100).trim().optional().nullable(),
    lens_index: z.number().positive().optional().nullable(),
    lens_treatments: z.array(z.string()).optional().nullable(),
    lens_tint_color: z.string().max(100).trim().optional().nullable(),
    lens_tint_percentage: z.number().min(0).max(100).optional().nullable(),
    prescription_id: uuidOptionalSchema,
  })
  .optional()
  .nullable();

const frameDataSchema = z
  .object({
    frame_product_id: uuidOptionalSchema,
    frame_name: z.string().max(255).trim().optional().nullable(),
    frame_brand: z.string().max(100).trim().optional().nullable(),
    frame_model: z.string().max(100).trim().optional().nullable(),
    frame_color: z.string().max(100).trim().optional().nullable(),
    frame_size: z.string().max(50).trim().optional().nullable(),
    frame_sku: z.string().max(100).trim().optional().nullable(),
    customer_own_frame: z.boolean().optional().default(false),
  })
  .optional()
  .nullable();

export const processSaleSchema = z
  .object({
    email: emailOptionalSchema,
    customer_id: uuidOptionalSchema,
    customer_name: z.string().max(200).trim().optional().nullable(),
    customer_rut: rutOptionalSchema,
    payment_method_type: z.enum([
      "cash",
      "card",
      "credit",
      "debit_card",
      "credit_card",
      "deposit",
      "transfer",
    ]),
    payment_status: z
      .enum(["paid", "pending", "partial", "failed", "refunded"])
      .default("paid")
      .optional(),
    status: z
      .enum(["pending", "processing", "delivered", "cancelled"])
      .default("delivered")
      .optional(),
    subtotal: priceSchema,
    tax_amount: priceNonNegativeSchema.default(0).optional(),
    total_amount: priceSchema,
    currency: z.string().max(10).default("CLP").optional(),
    installments_count: z.number().int().positive().default(1).optional(),
    sii_invoice_type: z
      .enum(["none", "invoice", "credit_note", "debit_note", "boleta"])
      .default("none")
      .optional(),
    sii_rut: rutOptionalSchema,
    sii_business_name: z.string().max(200).trim().optional().nullable(),
    items: z.array(posSaleItemSchema).min(1, "Debe incluir al menos un item"),
    cash_received: priceOptionalSchema,
    change_amount: priceNonNegativeSchema.optional().nullable(),
    deposit_amount: priceNonNegativeSchema.optional().nullable(),
    payments: z
      .array(
        z.object({
          method: z.enum([
            "cash",
            "debit_card",
            "credit_card",
            "transfer",
            "card",
          ]),
          amount: priceSchema,
        }),
      )
      .min(1)
      .optional()
      .nullable(),
    fiscal_reference: z.string().max(100).trim().optional().nullable(),
    branch_id: uuidOptionalSchema,
    notes: z.string().max(1000).trim().optional().nullable(),
    lens_data: lensDataSchema,
    frame_data: frameDataSchema,
    presbyopia_solution: z
      .enum(["none", "two_separate", "bifocal", "trifocal", "progressive"])
      .optional()
      .nullable(),
    far_lens_family_id: uuidOptionalSchema,
    near_lens_family_id: uuidOptionalSchema,
    far_lens_cost: priceOptionalSchema,
    near_lens_cost: priceOptionalSchema,
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
    contact_lens_quantity: z.number().int().positive().optional().nullable(),
    contact_lens_cost: priceOptionalSchema,
    contact_lens_price: priceOptionalSchema,
    quote_id: uuidOptionalSchema,
    agreement_id: uuidOptionalSchema,
    purchase_order_id: uuidOptionalSchema,
    field_operation_id: uuidOptionalSchema,
    idempotency_key: z.string().uuid().optional().nullable(),
  })
  .refine(
    (data) => {
      const calculatedTotal = (data.subtotal || 0) + (data.tax_amount || 0);
      return Math.abs(calculatedTotal - data.total_amount) < 0.01;
    },
    {
      message:
        "El total_amount no coincide con el cálculo (subtotal + tax_amount)",
      path: ["total_amount"],
    },
  )
  .refine(
    (data) => {
      if (data.payments && data.payments.length > 0) {
        const sum = data.payments.reduce((s, p) => s + p.amount, 0);
        return sum >= data.total_amount - 0.01;
      }
      return true;
    },
    {
      message:
        "La suma de pagos divididos debe ser al menos el total de la venta",
      path: ["payments"],
    },
  )
  .refine(
    (data) => {
      if (!data.agreement_id) return true;
      return !!data.purchase_order_id;
    },
    {
      message:
        "Si se selecciona un convenio, la orden de compra (OC) es obligatoria",
      path: ["purchase_order_id"],
    },
  );

export const createPaymentIntentSchema = z.object({
  amount: priceSchema,
  currency: z
    .string()
    .min(1, "La moneda es requerida")
    .max(10)
    .default("CLP")
    .transform((s) => s.toUpperCase()),
  gateway: z.enum(["flow", "mercadopago", "paypal"], {
    errorMap: () => ({
      message: "gateway debe ser flow, mercadopago o paypal",
    }),
  }),
  order_id: uuidOptionalSchema,
});

export const pendingBalancePaySchema = z.object({
  order_id: z.string().uuid("order_id debe ser un UUID válido"),
  payment_amount: priceSchema,
  payment_method: z.enum(["cash", "debit", "credit", "transfer", "check"], {
    errorMap: () => ({
      message: "payment_method debe ser cash, debit, credit, transfer o check",
    }),
  }),
  notes: z.string().max(500).trim().optional(),
  fiscal_reference: z.string().max(100).trim().optional(),
});
