import { z } from "zod";

import {
  completeRUTIfNeeded,
  isValidRUTFormat,
  normalizeRUT,
} from "@/lib/utils/rut";

// ============================================================================
// Base Zod Schemas - Reutilizables en todo el sistema
// ============================================================================

export const emailSchema = z
  .string()
  .email("Debe ser un email válido")
  .max(255, "El email es demasiado largo")
  .toLowerCase()
  .trim();

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

export const rutSchema = z
  .string()
  .min(1, "El RUT es requerido")
  .refine((rut) => isValidRUTFormat(rut), {
    message:
      "El formato del RUT no es válido (debe ser xx.xxx.xxx-x o x.xxx.xxx-x, dígito verificador puede ser K)",
  })
  .transform((rut) => normalizeRUT(rut));

export const rutOptionalSchema = z
  .union([z.string(), z.null(), z.undefined(), z.literal("")])
  .optional()
  .nullable()
  .transform((rut) => {
    if (!rut || (typeof rut === "string" && rut.trim() === "")) {
      return null;
    }
    if (typeof rut === "string") {
      const trimmed = rut.trim();
      if (trimmed === "") return null;
      const completed = completeRUTIfNeeded(trimmed) || trimmed;
      if (!isValidRUTFormat(completed)) return null;
      return completed;
    }
    return null;
  })
  .transform((rut) => {
    if (rut && typeof rut === "string" && rut.trim() !== "") {
      return normalizeRUT(rut);
    }
    return null;
  });

export const phoneSchema = z
  .string()
  .min(8, "El teléfono debe tener al menos 8 dígitos")
  .max(20, "El teléfono es demasiado largo")
  .regex(/^[\d\s\-\+\(\)]+$/, "El teléfono contiene caracteres inválidos")
  .trim();

export const phoneOptionalSchema = z
  .string()
  .optional()
  .refine((phone) => !phone || phone.length >= 8, {
    message: "El teléfono debe tener al menos 8 dígitos",
  })
  .transform((phone) => phone?.trim() || undefined);

export const uuidSchema = z.string().uuid("Debe ser un UUID válido");

export const uuidOptionalSchema = z
  .union([z.string().uuid("Debe ser un UUID válido"), z.null(), z.undefined()])
  .optional()
  .nullable();

export function createConfigValueSchema(valueType: string) {
  switch (valueType) {
    case "string":
      return z
        .union([z.string(), z.number(), z.boolean()])
        .transform((v) => String(v));
    case "number":
      return z
        .union([z.number(), z.string().transform((v) => parseFloat(v))])
        .refine((n) => !isNaN(n) && isFinite(n), {
          message: "El valor debe ser un número válido",
        });
    case "boolean":
      return z.union([
        z.boolean(),
        z.string().transform((v) => v === "true" || v === "1"),
      ]);
    case "json":
      return z.union([z.record(z.unknown()), z.array(z.unknown())]);
    case "array":
      return z.array(z.unknown());
    default:
      return z.unknown();
  }
}

export const urlSchema = z
  .string()
  .url("Debe ser una URL válida")
  .max(2048, "La URL es demasiado larga");

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

export const dateISOSchema = z
  .string()
  .datetime("Debe ser una fecha válida en formato ISO")
  .or(z.date());

export const dateISOOptionalSchema = z
  .union([
    z.string().datetime("Debe ser una fecha válida en formato ISO"),
    z.date(),
    z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Debe ser una fecha en formato YYYY-MM-DD"),
    z.null(),
    z.undefined(),
  ])
  .nullable()
  .optional()
  .transform((val) => {
    if (!val || val === null || val === undefined) return null;
    if (val instanceof Date) return val.toISOString();
    if (typeof val === "string" && /^\d{4}-\d{2}-\d{2}$/.test(val)) {
      return new Date(val + "T00:00:00.000Z").toISOString();
    }
    return val;
  });

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1).optional(),
  limit: z.coerce.number().int().positive().max(100).default(20).optional(),
  sort: z.enum(["asc", "desc"]).default("desc").optional(),
});

export const prescriptionListQuerySchema = z.object({
  q: z.string().optional(),
  search: z.string().optional(),
  rut: z.string().optional(),
  date_from: z
    .string()
    .optional()
    .transform((v) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined)),
  date_to: z
    .string()
    .optional()
    .transform((v) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined)),
  issued_by: z.string().optional(),
  branch_id: z
    .string()
    .optional()
    .transform((v) =>
      v && v.trim() !== "" && /^[0-9a-f-]{36}$/i.test(v) ? v : undefined,
    ),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

export const analyticsDashboardParamsSchema = z.object({
  period: z.coerce.number().int().min(7).max(365).default(30),
});

export const searchSchema = z.object({
  q: z
    .string()
    .min(1, "El término de búsqueda es requerido")
    .max(255)
    .optional(),
  search: z.string().min(1).max(255).optional(),
});
