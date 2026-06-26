import { z } from "zod";

import { uuidOptionalSchema, uuidSchema } from "./base";

// ============================================================================
// Lens Families Schemas
// ============================================================================

export const lensFamilyBaseSchema = z.object({
  name: z.string().min(1, "El nombre es requerido").max(255),
  brand: z.string().max(255).optional().nullable(),
  category_id: uuidOptionalSchema,
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

// ============================================================================
// Lens Price Matrices Schemas
// ============================================================================

const lensPriceMatrixBaseObject = z.object({
  lens_family_id: uuidSchema,
  name: z.string().max(50).optional().nullable(),
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
    .optional()
    .default([]),
  create_with_defaults: z.boolean().optional(),
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
  category_id: uuidOptionalSchema,
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

const contactLensPriceMatrixInputSchema = z
  .object({
    name: z.string().max(50).optional().nullable(),
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
  })
  .refine((data) => data.sphere_min <= data.sphere_max, {
    message: "sphere_min debe ser menor o igual a sphere_max",
    path: ["sphere_max"],
  })
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

export const createContactLensFamilyWithMatricesSchema =
  createContactLensFamilySchema.extend({
    matrices: z.array(contactLensPriceMatrixInputSchema).optional().default([]),
  });

export const updateContactLensFamilyWithMatricesSchema =
  updateContactLensFamilySchema.extend({
    matrices: z.array(contactLensPriceMatrixInputSchema).optional(),
  });

// ============================================================================
// Contact Lens Price Matrices Schemas
// ============================================================================

const contactLensPriceMatrixBaseObject = z.object({
  contact_lens_family_id: uuidSchema,
  name: z.string().max(50).optional().nullable(),
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
