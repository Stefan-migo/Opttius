import { z } from "zod";
import { isValidRUTFormat, normalizeRUT } from "@/lib/utils/rut";

/**
 * Base Zod Schemas - Reutilizables en todo el sistema
 *
 * Este módulo contiene schemas Zod reutilizables para validación consistente
 * de campos comunes usados en múltiples rutas API. Todos los schemas incluyen
 * transformaciones apropiadas (trim, lowercase, normalización, etc.).
 *
 * @module lib/api/validation/zod-schemas
 *
 * @example
 * ```typescript
 * import { emailSchema, rutSchema, paginationSchema } from '@/lib/api/validation/zod-schemas'
 *
 * const createCustomerSchema = z.object({
 *   email: emailSchema,
 *   rut: rutSchema,
 *   name: z.string().min(2)
 * })
 * ```
 */

// ============================================================================
// Schemas Base Reutilizables
// ============================================================================

/**
 * Schema para validar email
 */
export const emailSchema = z
  .string()
  .email("Debe ser un email válido")
  .max(255, "El email es demasiado largo")
  .toLowerCase()
  .trim();

/**
 * Schema para validar email opcional
 * Permite string vacío, null, o undefined
 */
export const emailOptionalSchema = z
  .union([
    z.string().email("Debe ser un email válido").toLowerCase().trim(),
    z.literal(""),
    z.null(),
    z.undefined(),
  ])
  .optional()
  .nullable()
  .transform((val) => {
    if (!val || val === "") return null;
    return val;
  });

/**
 * Schema para validar RUT chileno
 */
export const rutSchema = z
  .string()
  .min(1, "El RUT es requerido")
  .refine((rut) => isValidRUTFormat(rut), {
    message:
      "El formato del RUT no es válido (debe ser xx.xxx.xxx-x o x.xxx.xxx-x, dígito verificador puede ser K)",
  })
  .transform((rut) => normalizeRUT(rut));

/**
 * Schema para validar RUT opcional
 * Permite string, null, o undefined
 */
export const rutOptionalSchema = z
  .union([z.string(), z.null(), z.undefined(), z.literal("")])
  .optional()
  .nullable()
  .transform((rut) => {
    // Si es null, undefined, o string vacío, retornar null
    if (!rut || (typeof rut === "string" && rut.trim() === "")) {
      return null;
    }
    // Si es string válido, normalizar (la validación se hará con superRefine)
    if (typeof rut === "string") {
      const trimmed = rut.trim();
      if (trimmed === "") return null;
      return trimmed; // Retornar sin normalizar aún, se hará después de validar
    }
    return null;
  })
  .superRefine((rut, ctx) => {
    // Si es null, es válido (opcional)
    if (rut === null) {
      return;
    }
    // Si es string, validar formato
    if (typeof rut === "string" && rut.trim() !== "") {
      if (!isValidRUTFormat(rut)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "El formato del RUT no es válido (debe ser xx.xxx.xxx-x o x.xxx.xxx-x, dígito verificador puede ser K)",
        });
      }
    }
  })
  .transform((rut) => {
    // Normalizar después de validar
    if (rut && typeof rut === "string" && rut.trim() !== "") {
      return normalizeRUT(rut);
    }
    return null;
  });

/**
 * Schema para validar teléfono
 */
export const phoneSchema = z
  .string()
  .min(8, "El teléfono debe tener al menos 8 dígitos")
  .max(20, "El teléfono es demasiado largo")
  .regex(/^[\d\s\-\+\(\)]+$/, "El teléfono contiene caracteres inválidos")
  .trim();

/**
 * Schema para validar teléfono opcional
 */
export const phoneOptionalSchema = z
  .string()
  .optional()
  .refine((phone) => !phone || phone.length >= 8, {
    message: "El teléfono debe tener al menos 8 dígitos",
  })
  .transform((phone) => phone?.trim() || undefined);

/**
 * Schema para validar UUID
 */
export const uuidSchema = z.string().uuid("Debe ser un UUID válido");

/**
 * Schema para validar UUID opcional
 */
export const uuidOptionalSchema = z
  .union([z.string().uuid("Debe ser un UUID válido"), z.null(), z.undefined()])
  .optional()
  .nullable();

/**
 * Schema para validar URL
 */
export const urlSchema = z
  .string()
  .url("Debe ser una URL válida")
  .max(2048, "La URL es demasiado larga");

/**
 * Schema para validar URL opcional
 */
export const urlOptionalSchema = z
  .union([
    z
      .string()
      .url("Debe ser una URL válida")
      .max(2048, "La URL es demasiado larga"),
    z.literal(""),
    z.null(),
    z.undefined(),
  ])
  .optional()
  .nullable()
  .transform((val) => {
    if (!val || val === "") return null;
    return val;
  });

/**
 * Schema para validar precio (número positivo)
 * Acepta número o string que se convierte a número
 */
export const priceSchema = z.preprocess(
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
    .positive("El precio debe ser un número positivo")
    .finite("El precio debe ser un número finito"),
);

/**
 * Schema para crear intento de pago (create-intent)
 * Usado en POST /api/admin/payments/create-intent
 */
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

/**
 * Schema para validar precio que permite 0 (no negativo)
 * Útil para costos que pueden ser 0
 */
export const priceNonNegativeSchema = z.preprocess(
  (val) => {
    if (typeof val === "number") return val;
    if (typeof val === "string") {
      const trimmed = val.trim();
      if (trimmed === "") return 0;
      const num = parseFloat(trimmed);
      return isNaN(num) ? 0 : num;
    }
    return val;
  },
  z
    .number({
      invalid_type_error: "El precio debe ser un número",
    })
    .nonnegative("El precio debe ser un número no negativo")
    .finite("El precio debe ser un número finito"),
);

/**
 * Schema para validar precio opcional
 */
export const priceOptionalSchema = z
  .number()
  .positive("El precio debe ser un número positivo")
  .finite("El precio debe ser un número finito")
  .optional()
  .nullable()
  .or(
    z
      .string()
      .optional()
      .transform((val) => {
        if (!val || val === "") return undefined;
        const num = parseFloat(val);
        if (isNaN(num) || num < 0) {
          throw new z.ZodError([
            {
              code: "custom",
              path: [],
              message: "El precio debe ser un número positivo",
            },
          ]);
        }
        return num;
      }),
  );

/**
 * Schema para validar cantidad (número entero no negativo)
 */
export const quantitySchema = z
  .number()
  .int("La cantidad debe ser un número entero")
  .nonnegative("La cantidad no puede ser negativa")
  .finite("La cantidad debe ser un número finito")
  .or(
    z.string().transform((val) => {
      const num = parseInt(val, 10);
      if (isNaN(num) || num < 0) {
        throw new z.ZodError([
          {
            code: "custom",
            path: [],
            message: "La cantidad debe ser un número entero no negativo",
          },
        ]);
      }
      return num;
    }),
  );

/**
 * Schema para validar cantidad opcional
 */
export const quantityOptionalSchema = z
  .number()
  .int("La cantidad debe ser un número entero")
  .nonnegative("La cantidad no puede ser negativa")
  .optional()
  .nullable()
  .or(
    z
      .string()
      .optional()
      .transform((val) => {
        if (!val || val === "") return undefined;
        const num = parseInt(val, 10);
        if (isNaN(num) || num < 0) {
          throw new z.ZodError([
            {
              code: "custom",
              path: [],
              message: "La cantidad debe ser un número entero no negativo",
            },
          ]);
        }
        return num;
      }),
  );

/**
 * Schema para validar fecha ISO
 */
export const dateISOSchema = z
  .string()
  .datetime("Debe ser una fecha válida en formato ISO")
  .or(z.date());

/**
 * Schema para validar fecha ISO opcional
 * Acepta string ISO, Date object, o null/undefined
 */
export const dateISOOptionalSchema = z
  .union([
    z.string().datetime("Debe ser una fecha válida en formato ISO"),
    z.date(),
    z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Debe ser una fecha en formato YYYY-MM-DD"), // También acepta YYYY-MM-DD
    z.null(),
    z.undefined(),
  ])
  .nullable()
  .optional()
  .transform((val) => {
    if (!val || val === null || val === undefined) return null;
    if (val instanceof Date) return val.toISOString();
    if (typeof val === "string" && /^\d{4}-\d{2}-\d{2}$/.test(val)) {
      // Convert YYYY-MM-DD to ISO string
      return new Date(val + "T00:00:00.000Z").toISOString();
    }
    return val;
  });

/**
 * Schema para validar paginación
 */
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1).optional(),
  limit: z.coerce.number().int().positive().max(100).default(20).optional(),
  sort: z.enum(["asc", "desc"]).default("desc").optional(),
});

/**
 * Schema para validar búsqueda
 */
export const searchSchema = z.object({
  q: z
    .string()
    .min(1, "El término de búsqueda es requerido")
    .max(255)
    .optional(),
  search: z.string().min(1).max(255).optional(),
});

// ============================================================================
// Schemas para Customers
// ============================================================================

/**
 * Schema base para datos de cliente
 */
export const customerBaseSchema = z
  .object({
    first_name: z
      .string()
      .max(100)
      .optional()
      .superRefine((val, ctx) => {
        // Explicitly reject empty strings (including after trim)
        if (val !== undefined && val !== null) {
          const trimmed = String(val).trim();
          if (trimmed.length === 0) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "El nombre no puede estar vacío",
              path: ["first_name"],
            });
          }
        }
      })
      .transform((val) => {
        // Trim after validation
        return val !== undefined && val !== null ? String(val).trim() : val;
      }),
    last_name: z
      .string()
      .max(100)
      .optional()
      .superRefine((val, ctx) => {
        // Explicitly reject empty strings (including after trim)
        if (val !== undefined && val !== null) {
          const trimmed = String(val).trim();
          if (trimmed.length === 0) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "El apellido no puede estar vacío",
              path: ["last_name"],
            });
          }
        }
      })
      .transform((val) => {
        // Trim after validation
        return val !== undefined && val !== null ? String(val).trim() : val;
      }),
    email: emailOptionalSchema,
    phone: phoneOptionalSchema,
    rut: rutOptionalSchema,
    date_of_birth: dateISOOptionalSchema,
    gender: z
      .enum(["male", "female", "other", "prefer_not_to_say"])
      .optional()
      .nullable(),
    address_line_1: z.string().max(255).trim().optional().nullable(),
    address_line_2: z.string().max(255).trim().optional().nullable(),
    city: z.string().max(100).trim().optional().nullable(),
    state: z.string().max(100).trim().optional().nullable(),
    postal_code: z.string().max(20).trim().optional().nullable(),
    country: z.string().max(100).trim().default("Chile").optional(),
    medical_conditions: z.string().max(1000).trim().optional().nullable(),
    allergies: z.string().max(1000).trim().optional().nullable(),
    medications: z.string().max(1000).trim().optional().nullable(),
    medical_notes: z.string().max(5000).trim().optional().nullable(),
    last_eye_exam_date: dateISOOptionalSchema,
    next_eye_exam_due: dateISOOptionalSchema,
    preferred_contact_method: z
      .enum(["email", "phone", "sms", "whatsapp"])
      .optional()
      .nullable(),
    emergency_contact_name: z.string().max(100).trim().optional().nullable(),
    emergency_contact_phone: phoneOptionalSchema,
    insurance_provider: z.string().max(100).trim().optional().nullable(),
    insurance_policy_number: z.string().max(100).trim().optional().nullable(),
    notes: z.string().max(5000).trim().optional().nullable(),
    tags: z.array(z.string()).optional().nullable(),
    is_active: z.boolean().default(true).optional(),
    branch_id: uuidOptionalSchema,
  })
  .refine(
    (data) => {
      // After preprocess, empty strings are converted to undefined
      // So we just need to check that at least one of first_name or last_name is present and non-empty
      const hasFirstName =
        data.first_name !== undefined &&
        data.first_name !== null &&
        String(data.first_name).trim().length > 0;
      const hasLastName =
        data.last_name !== undefined &&
        data.last_name !== null &&
        String(data.last_name).trim().length > 0;

      // At least one must be present and non-empty
      if (!hasFirstName && !hasLastName) {
        return false;
      }

      return true;
    },
    {
      message:
        "Al menos el nombre o apellido es requerido y no puede estar vacío",
      path: ["first_name"],
    },
  );

/**
 * Schema para crear un cliente
 */
export const createCustomerSchema = customerBaseSchema;

/**
 * Schema para actualizar un cliente
 * Todos los campos son opcionales para actualización
 */
export const updateCustomerSchema = z.object({
  first_name: z
    .string()
    .min(1, "El nombre es requerido")
    .max(100)
    .trim()
    .optional(),
  last_name: z
    .string()
    .min(1, "El apellido es requerido")
    .max(100)
    .trim()
    .optional(),
  email: emailOptionalSchema,
  phone: phoneOptionalSchema,
  rut: rutOptionalSchema,
  date_of_birth: dateISOOptionalSchema,
  gender: z
    .enum(["male", "female", "other", "prefer_not_to_say"])
    .optional()
    .nullable(),
  address_line_1: z.string().max(255).trim().optional().nullable(),
  address_line_2: z.string().max(255).trim().optional().nullable(),
  city: z.string().max(100).trim().optional().nullable(),
  state: z.string().max(100).trim().optional().nullable(),
  postal_code: z.string().max(20).trim().optional().nullable(),
  country: z.string().max(100).trim().default("Chile").optional(),
  medical_conditions: z.string().max(1000).trim().optional().nullable(),
  allergies: z.string().max(1000).trim().optional().nullable(),
  medications: z.string().max(1000).trim().optional().nullable(),
  medical_notes: z.string().max(5000).trim().optional().nullable(),
  last_eye_exam_date: dateISOOptionalSchema,
  next_eye_exam_due: dateISOOptionalSchema,
  preferred_contact_method: z
    .enum(["email", "phone", "sms", "whatsapp"])
    .optional()
    .nullable(),
  emergency_contact_name: z.string().max(100).trim().optional().nullable(),
  emergency_contact_phone: phoneOptionalSchema,
  insurance_provider: z.string().max(100).trim().optional().nullable(),
  insurance_policy_number: z.string().max(100).trim().optional().nullable(),
  notes: z.string().max(5000).trim().optional().nullable(),
  tags: z.array(z.string()).optional().nullable(),
  is_active: z.boolean().default(true).optional(),
  branch_id: uuidOptionalSchema,
});

/**
 * Schema para búsqueda de clientes
 */
export const searchCustomerSchema = searchSchema.extend({
  branch_id: uuidOptionalSchema,
  is_active: z.boolean().optional(),
});

// ============================================================================
// Schemas para Products
// ============================================================================

/**
 * Schema para ingredientes de productos
 */
const ingredientSchema = z.object({
  name: z.string().min(1).max(200),
  percentage: z.number().min(0).max(100).optional(),
});

/**
 * Schema base para datos de producto
 */
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
  // inventory_quantity removed - use product_branch_stock table instead
  // Use stock_quantity in createProductSchema for initial stock per branch
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
  // Frame fields
  frame_type: z.string().max(100).trim().optional().nullable(),
  frame_material: z.string().max(100).trim().optional().nullable(),
  frame_shape: z.string().max(100).trim().optional().nullable(),
  frame_color: z.string().max(100).trim().optional().nullable(),
  frame_size: z.string().max(50).trim().optional().nullable(),
  frame_bridge_width: z.number().positive().optional().nullable(),
  frame_temple_length: z.number().positive().optional().nullable(),
  frame_lens_width: z.number().positive().optional().nullable(),
  frame_lens_height: z.number().positive().optional().nullable(),
  // Lens fields
  lens_type: z.string().max(100).trim().optional().nullable(),
  lens_material: z.string().max(100).trim().optional().nullable(),
  lens_coating: z.string().max(100).trim().optional().nullable(),
  lens_prescription_type: z.string().max(100).trim().optional().nullable(),
  // Cosmetic/Skincare fields
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

/**
 * Schema para crear un producto
 * Includes optional stock_quantity for initial stock in the branch
 */
export const createProductSchema = productBaseSchema.extend({
  stock_quantity: quantityOptionalSchema, // Optional: initial stock for branch (handled separately in product_branch_stock)
});

/**
 * Schema para actualizar un producto
 */
export const updateProductSchema = productBaseSchema.partial().extend({
  name: z.string().min(1).max(255).trim().optional(),
});

/**
 * Schema para búsqueda de productos
 */
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

// ============================================================================
// Schemas para POS (Point of Sale)
// ============================================================================

/**
 * Schema para precio que permite negativos (para descuentos)
 */
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

/**
 * Schema para item de venta POS
 * Permite product_id null para servicios, descuentos, etc.
 * Permite precios negativos para descuentos
 */
const posSaleItemSchema = z.object({
  product_id: z
    .union([
      uuidSchema,
      z.string().min(1), // Allow non-UUID strings for special items (e.g., "discount-xxx")
      z.null(),
      z.undefined(),
    ])
    .optional()
    .nullable(),
  quantity: quantitySchema,
  unit_price: priceAllowNegativeSchema, // Allow negative prices for discounts
  total_price: priceAllowNegativeSchema.optional().nullable(), // Allow negative prices for discounts
  product_name: z.string().min(1).max(255).trim(),
  product_type: z.string().optional().nullable(), // Product type for inventory and work order logic
});

/**
 * Schema para datos de lentes en venta POS
 */
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

/**
 * Schema para datos de marco en venta POS
 */
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

/**
 * Schema para procesar una venta POS
 */
export const processSaleSchema = z
  .object({
    email: emailOptionalSchema,
    customer_id: uuidOptionalSchema, // Optional - allow sales without registered customer
    customer_name: z.string().max(200).trim().optional().nullable(),
    customer_rut: rutOptionalSchema, // Optional RUT for unregistered customers
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
    change_amount: priceNonNegativeSchema.optional().nullable(), // Can be 0 or null
    deposit_amount: priceNonNegativeSchema.optional().nullable(), // Monto de abono para pagos parciales
    branch_id: uuidOptionalSchema,
    notes: z.string().max(1000).trim().optional().nullable(),
    // Nuevos campos estructurados para lentes y marcos
    lens_data: lensDataSchema,
    frame_data: frameDataSchema,
    // Presbyopia solution fields
    presbyopia_solution: z
      .enum(["none", "two_separate", "bifocal", "trifocal", "progressive"])
      .optional()
      .nullable(),
    far_lens_family_id: uuidOptionalSchema,
    near_lens_family_id: uuidOptionalSchema,
    far_lens_cost: priceOptionalSchema,
    near_lens_cost: priceOptionalSchema,
    // Contact lens fields
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
    quote_id: uuidOptionalSchema, // Quote ID if sale comes from a quote
  })
  .refine(
    (data) => {
      // Validar que el total sea consistente (permitir pequeña diferencia por redondeo)
      const calculatedTotal = (data.subtotal || 0) + (data.tax_amount || 0);
      return Math.abs(calculatedTotal - data.total_amount) < 0.01;
    },
    {
      message:
        "El total_amount no coincide con el cálculo (subtotal + tax_amount)",
      path: ["total_amount"],
    },
  );

// ============================================================================
// Schemas para Work Orders
// ============================================================================

/**
 * Schema para crear un work order
 */
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
  // Presbyopia solution fields
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

// ============================================================================
// Schemas para Quotes
// ============================================================================

/**
 * Schema para crear un presupuesto
 */
// ============================================================================
// Lens Families Schemas
// ============================================================================

export const lensFamilyBaseSchema = z.object({
  name: z.string().min(1, "El nombre es requerido").max(255),
  brand: z.string().max(255).optional().nullable(),
  lens_type: z.enum([
    "single_vision",
    "bifocal",
    "trifocal",
    "progressive",
    "reading",
    "computer",
    "sports",
  ]),
  lens_material: z.enum([
    "cr39",
    "polycarbonate",
    "high_index_1_67",
    "high_index_1_74",
    "trivex",
    "glass",
  ]),
  description: z.string().optional().nullable(),
  is_active: z.boolean().default(true),
});

export const createLensFamilySchema = lensFamilyBaseSchema;
export const updateLensFamilySchema = lensFamilyBaseSchema.partial();

// Moved createLensFamilyFullSchema to after lensPriceMatrixBaseSchema to avoid ReferenceError

// ============================================================================
// Lens Price Matrices Schemas
// ============================================================================

const lensPriceMatrixBaseObject = z.object({
  lens_family_id: uuidSchema,
  sphere_min: z.number().min(-30).max(30).multipleOf(0.25),
  sphere_max: z.number().min(-30).max(30).multipleOf(0.25),
  cylinder_min: z.number().min(-30).max(30).multipleOf(0.25),
  cylinder_max: z.number().min(-30).max(30).multipleOf(0.25),
  addition_min: z.number().min(0).max(4).multipleOf(0.25).default(0).optional(),
  addition_max: z
    .number()
    .min(0)
    .max(4)
    .multipleOf(0.25)
    .default(4.0)
    .optional(),
  base_price: z.number().min(0),
  sourcing_type: z.enum(["stock", "surfaced"]).default("surfaced"),
  cost: z.number().min(0),
  is_active: z.boolean().default(true),
});

export const lensPriceMatrixBaseSchema = lensPriceMatrixBaseObject.refine(
  (data) => data.sphere_min <= data.sphere_max,
  {
    message: "sphere_min debe ser menor o igual a sphere_max",
    path: ["sphere_max"],
  },
);

export const createLensFamilyFullSchema = lensFamilyBaseSchema.extend({
  matrices: z
    .array(
      lensPriceMatrixBaseObject
        .omit({ lens_family_id: true })
        .refine((data) => data.sphere_min <= data.sphere_max, {
          message: "sphere_min debe ser menor o igual a sphere_max",
          path: ["sphere_max"],
        }),
    )
    .min(1, "Debe agregar al menos una matriz de precios"),
});

export const lensPriceMatrixV2RangeRefine = lensPriceMatrixBaseSchema.refine(
  (data) => data.cylinder_min <= data.cylinder_max,
  {
    message: "cylinder_min debe ser menor o igual a cylinder_max",
    path: ["cylinder_max"],
  },
);

export const createLensPriceMatrixSchema = lensPriceMatrixV2RangeRefine;
export const updateLensPriceMatrixSchema = lensPriceMatrixBaseObject
  .partial()
  .refine(
    (data) => {
      // Only validate sphere range if both values are provided
      if (data.sphere_min !== undefined && data.sphere_max !== undefined) {
        return data.sphere_min <= data.sphere_max;
      }
      return true;
    },
    {
      message: "sphere_min debe ser menor o igual a sphere_max",
      path: ["sphere_max"],
    },
  );

export const updateLensPriceMatrixSchemaV2 = updateLensPriceMatrixSchema.refine(
  (data) => {
    // Only validate cylinder range if both values are provided
    if (data.cylinder_min !== undefined && data.cylinder_max !== undefined) {
      return data.cylinder_min <= data.cylinder_max;
    }
    return true;
  },
  {
    message: "cylinder_min debe ser menor o igual a cylinder_max",
    path: ["cylinder_max"],
  },
);

// ============================================================================
// Contact Lens Families Schemas
// ============================================================================

export const contactLensFamilyBaseSchema = z.object({
  name: z.string().min(1, "El nombre es requerido").max(255),
  brand: z.string().max(255).optional().nullable(),
  description: z.string().optional().nullable(),
  use_type: z.enum(["daily", "bi_weekly", "monthly", "extended_wear"]),
  modality: z.enum(["spherical", "toric", "multifocal", "cosmetic"]),
  material: z
    .enum(["silicone_hydrogel", "hydrogel", "rigid_gas_permeable"])
    .optional()
    .nullable(),
  packaging: z.enum(["box_30", "box_6", "box_3", "bottle"]),
  base_curve: z
    .number()
    .min(7.0)
    .max(10.0)
    .multipleOf(0.1)
    .optional()
    .nullable(),
  diameter: z
    .number()
    .min(13.0)
    .max(15.0)
    .multipleOf(0.1)
    .optional()
    .nullable(),
  is_active: z.boolean().default(true),
});

export const createContactLensFamilySchema = contactLensFamilyBaseSchema;
export const updateContactLensFamilySchema =
  contactLensFamilyBaseSchema.partial();

// ============================================================================
// Contact Lens Price Matrices Schemas
// ============================================================================

const contactLensPriceMatrixBaseObject = z.object({
  contact_lens_family_id: uuidSchema,
  sphere_min: z.number().min(-30).max(30).multipleOf(0.25),
  sphere_max: z.number().min(-30).max(30).multipleOf(0.25),
  cylinder_min: z.number().min(-6).max(6).multipleOf(0.25).default(0),
  cylinder_max: z.number().min(-6).max(6).multipleOf(0.25).default(0),
  axis_min: z.number().int().min(0).max(180).default(0),
  axis_max: z.number().int().min(0).max(180).default(180),
  addition_min: z.number().min(0).max(4).multipleOf(0.25).default(0),
  addition_max: z.number().min(0).max(4).multipleOf(0.25).default(4.0),
  base_price: z.number().min(0),
  cost: z.number().min(0),
  is_active: z.boolean().default(true),
});

export const contactLensPriceMatrixBaseSchema =
  contactLensPriceMatrixBaseObject.refine(
    (data) => data.sphere_min <= data.sphere_max,
    {
      message: "sphere_min debe ser menor o igual a sphere_max",
      path: ["sphere_max"],
    },
  );

export const contactLensPriceMatrixRangeRefine =
  contactLensPriceMatrixBaseSchema
    .refine((data) => data.cylinder_min <= data.cylinder_max, {
      message: "cylinder_min debe ser menor o igual a cylinder_max",
      path: ["cylinder_max"],
    })
    .refine((data) => data.axis_min <= data.axis_max, {
      message: "axis_min debe ser menor o igual a axis_max",
      path: ["axis_max"],
    })
    .refine((data) => data.addition_min <= data.addition_max, {
      message: "addition_min debe ser menor o igual a addition_max",
      path: ["addition_max"],
    });

export const createContactLensPriceMatrixSchema =
  contactLensPriceMatrixRangeRefine;
export const updateContactLensPriceMatrixSchema =
  contactLensPriceMatrixBaseObject
    .partial()
    .refine(
      (data) => {
        if (data.sphere_min !== undefined && data.sphere_max !== undefined) {
          return data.sphere_min <= data.sphere_max;
        }
        return true;
      },
      {
        message: "sphere_min debe ser menor o igual a sphere_max",
        path: ["sphere_max"],
      },
    )
    .refine(
      (data) => {
        if (
          data.cylinder_min !== undefined &&
          data.cylinder_max !== undefined
        ) {
          return data.cylinder_min <= data.cylinder_max;
        }
        return true;
      },
      {
        message: "cylinder_min debe ser menor o igual a cylinder_max",
        path: ["cylinder_max"],
      },
    )
    .refine(
      (data) => {
        if (data.axis_min !== undefined && data.axis_max !== undefined) {
          return (
            data.axis_min <= data.axis_max &&
            data.axis_min >= 0 &&
            data.axis_max <= 180
          );
        }
        return true;
      },
      {
        message:
          "axis_min debe ser menor o igual a axis_max y ambos entre 0 y 180",
        path: ["axis_max"],
      },
    )
    .refine(
      (data) => {
        if (
          data.addition_min !== undefined &&
          data.addition_max !== undefined
        ) {
          return data.addition_min <= data.addition_max;
        }
        return true;
      },
      {
        message: "addition_min debe ser menor o igual a addition_max",
        path: ["addition_max"],
      },
    );

// ============================================================================
// Quote Schemas
// ============================================================================

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
  // Presbyopia solution fields
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
  // Near frame fields (for two_separate solution)
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
  // Contact lens fields
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
});

// ============================================================================
// Schemas para Appointments
// ============================================================================

/**
 * Schema para datos de cliente invitado (guest customer)
 */
const guestCustomerSchema = z.object({
  first_name: z.string().min(1, "El nombre es requerido").max(100).trim(),
  last_name: z.string().min(1, "El apellido es requerido").max(100).trim(),
  rut: z.string().max(20).trim().optional().nullable(),
  email: emailSchema.optional().nullable(),
  phone: z.string().max(20).trim().optional().nullable(),
});

/**
 * Schema para crear una cita
 * Permite customer_id (cliente registrado) o guest_customer (cliente invitado)
 */
export const createAppointmentSchema = z
  .object({
    customer_id: uuidOptionalSchema, // Opcional si hay guest_customer
    guest_customer: guestCustomerSchema.optional().nullable(), // Opcional si hay customer_id
    appointment_type: z
      .string()
      .min(1, "El tipo de cita es requerido")
      .max(100)
      .trim(),
    appointment_date: z
      .string()
      .regex(
        /^\d{4}-\d{2}-\d{2}$/,
        "La fecha debe estar en formato YYYY-MM-DD",
      ),
    appointment_time: z
      .string()
      .regex(/^\d{2}:\d{2}:\d{2}$/, "La hora debe estar en formato HH:MM:SS"),
    duration_minutes: z.number().int().positive().default(30).optional(),
    notes: z.string().max(5000).trim().optional().nullable(),
    branch_id: uuidOptionalSchema,
    // Campos adicionales que pueden venir del formulario
    status: z
      .enum(["scheduled", "confirmed", "completed", "cancelled", "no_show"])
      .optional(),
    assigned_to: uuidOptionalSchema,
    reason: z.string().max(500).trim().optional().nullable(),
    follow_up_required: z.boolean().optional(),
    follow_up_date: dateISOOptionalSchema,
    prescription_id: uuidOptionalSchema,
    order_id: uuidOptionalSchema,
    cancellation_reason: z.string().max(500).trim().optional().nullable(),
  })
  .refine(
    (data) => {
      // Al menos uno de customer_id o guest_customer debe estar presente
      return (
        (data.customer_id !== null && data.customer_id !== undefined) ||
        (data.guest_customer !== null && data.guest_customer !== undefined)
      );
    },
    {
      message:
        "Debe proporcionar un customer_id (cliente registrado) o guest_customer (cliente invitado)",
      path: ["customer_id"],
    },
  );

// ============================================================================
// Schemas para SaaS Support System
// ============================================================================

/**
 * Schema para categorías de tickets SaaS
 */
export const saasSupportCategorySchema = z.enum([
  "technical",
  "billing",
  "feature_request",
  "bug_report",
  "account",
  "other",
]);

/**
 * Schema para prioridades de tickets SaaS
 */
export const saasSupportPrioritySchema = z.enum([
  "low",
  "medium",
  "high",
  "urgent",
]);

/**
 * Schema para estados de tickets SaaS
 */
export const saasSupportStatusSchema = z.enum([
  "open",
  "assigned",
  "in_progress",
  "waiting_customer",
  "resolved",
  "closed",
]);

/**
 * Schema para tipos de mensajes SaaS
 */
export const saasSupportMessageTypeSchema = z.enum([
  "message",
  "note",
  "status_change",
  "assignment",
  "resolution",
]);

/**
 * Schema para crear un ticket SaaS (desde organización)
 */
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
  metadata: z.record(z.unknown()).optional().default({}),
});

/**
 * Schema para crear un ticket SaaS público (sin login)
 */
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
  metadata: z.record(z.unknown()).optional().default({}),
});

/**
 * Schema para actualizar un ticket SaaS
 */
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

/**
 * Schema para crear un mensaje en un ticket SaaS
 */
export const createSaasSupportMessageSchema = z.object({
  message: z
    .string()
    .min(1, "El mensaje es requerido")
    .max(5000, "El mensaje es demasiado largo")
    .trim(),
  is_internal: z.boolean().default(false).optional(),
  message_type: saasSupportMessageTypeSchema.default("message").optional(),
  attachments: z.array(z.record(z.unknown())).optional().default([]),
});

/**
 * Schema para crear un template SaaS
 */
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

/**
 * Schema para actualizar un template SaaS
 */
export const updateSaasSupportTemplateSchema = z.object({
  name: z.string().min(1).max(255).trim().optional(),
  subject: z.string().max(255).trim().optional().nullable(),
  content: z.string().min(1).max(10000).trim().optional(),
  category: saasSupportCategorySchema.optional().nullable(),
  variables: z.array(z.string()).optional(),
  is_active: z.boolean().optional(),
});

/**
 * Schema para filtros de búsqueda de tickets SaaS
 */
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

// ============================================================================
// Schemas para Soporte Interno de Ópticas (Optical Internal Support)
// ============================================================================

/**
 * Schema para categorías de soporte interno de ópticas
 */
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

/**
 * Schema para prioridades de soporte interno
 */
export const opticalInternalSupportPrioritySchema = z.enum([
  "low",
  "medium",
  "high",
  "urgent",
]);

/**
 * Schema para estados de soporte interno
 */
export const opticalInternalSupportStatusSchema = z.enum([
  "open",
  "assigned",
  "in_progress",
  "waiting_customer",
  "resolved",
  "closed",
]);

/**
 * Schema para tipos de mensaje de soporte interno
 */
export const opticalInternalSupportMessageTypeSchema = z.enum([
  "message",
  "note",
  "status_change",
  "assignment",
  "resolution",
]);

/**
 * Schema para crear un ticket de soporte interno
 */
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
  metadata: z.record(z.unknown()).optional().default({}),
});

/**
 * Schema para actualizar un ticket de soporte interno
 */
export const updateOpticalInternalSupportTicketSchema = z.object({
  status: opticalInternalSupportStatusSchema.optional(),
  priority: opticalInternalSupportPrioritySchema.optional(),
  assigned_to: uuidOptionalSchema,
  resolution: z.string().max(5000).trim().optional().nullable(),
  resolution_notes: z.string().max(5000).trim().optional().nullable(),
});

/**
 * Schema para crear un mensaje en un ticket de soporte interno
 */
export const createOpticalInternalSupportMessageSchema = z.object({
  message: z
    .string()
    .min(1, "El mensaje es requerido")
    .max(5000, "El mensaje es demasiado largo")
    .trim(),
  is_internal: z.boolean().default(false).optional(),
  message_type: opticalInternalSupportMessageTypeSchema
    .default("message")
    .optional(),
  attachments: z.array(z.record(z.unknown())).optional().default([]),
});

/**
 * Schema para filtros de búsqueda de tickets de soporte interno
 */
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
