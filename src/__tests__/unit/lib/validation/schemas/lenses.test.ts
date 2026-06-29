/**
 * Unit tests for lens Zod schemas.
 *
 * Tests lensFamilyBaseSchema, lensPriceMatrix schemas,
 * and contact lens schemas.
 */

import { describe, expect, it } from "vitest";

import {
  contactLensFamilyBaseSchema,
  contactLensPriceMatrixBaseSchema,
  createContactLensFamilySchema,
  createContactLensFamilyWithMatricesSchema,
  createContactLensPriceMatrixSchema,
  createLensFamilyFullSchema,
  createLensFamilySchema,
  createLensPriceMatrixSchema,
  lensFamilyBaseSchema,
  lensPriceMatrixBaseSchema,
  lensPriceMatrixV2RangeRefine,
  updateContactLensFamilySchema,
  updateContactLensFamilyWithMatricesSchema,
  updateContactLensPriceMatrixSchema,
  updateLensFamilySchema,
  updateLensPriceMatrixSchema,
  updateLensPriceMatrixSchemaV2,
} from "@/lib/validation/schemas/lenses";

const UUID = "550e8400-e29b-41d4-a716-446655440000";

const validLensFamily = {
  name: "Progresive Premium",
  lens_type: "progressive",
  lens_material: "high_index_1_67",
};

const validLensPriceMatrix = {
  lens_family_id: UUID,
  sphere_min: -6,
  sphere_max: 4,
  cylinder_min: -4,
  cylinder_max: 0,
  base_price: 150000,
  cost: 75000,
};

describe("lensFamilyBaseSchema", () => {
  it("accepts valid lens family data", () => {
    const result = lensFamilyBaseSchema.safeParse(validLensFamily);
    expect(result.success).toBe(true);
  });

  it("rejects missing name", () => {
    const result = lensFamilyBaseSchema.safeParse({
      lens_type: "progressive",
      lens_material: "polycarbonate",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty name", () => {
    const result = lensFamilyBaseSchema.safeParse({
      ...validLensFamily,
      name: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid lens_type", () => {
    const result = lensFamilyBaseSchema.safeParse({
      ...validLensFamily,
      // @ts-expect-error testing invalid enum
      lens_type: "invalid",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid lens_material", () => {
    const result = lensFamilyBaseSchema.safeParse({
      ...validLensFamily,
      // @ts-expect-error testing invalid enum
      lens_material: "plastic",
    });
    expect(result.success).toBe(false);
  });

  it("accepts all lens_type enum values", () => {
    const types = [
      "single_vision",
      "bifocal",
      "trifocal",
      "progressive",
      "reading",
      "computer",
      "sports",
    ] as const;
    for (const lens_type of types) {
      const result = lensFamilyBaseSchema.safeParse({
        ...validLensFamily,
        lens_type,
      });
      expect(result.success).toBe(true);
    }
  });

  it("accepts all lens_material enum values", () => {
    const materials = [
      "cr39",
      "polycarbonate",
      "high_index_1_67",
      "high_index_1_74",
      "trivex",
      "glass",
    ] as const;
    for (const lens_material of materials) {
      const result = lensFamilyBaseSchema.safeParse({
        ...validLensFamily,
        lens_material,
      });
      expect(result.success).toBe(true);
    }
  });

  it("accepts optional fields", () => {
    const result = lensFamilyBaseSchema.safeParse({
      ...validLensFamily,
      brand: "Essilor",
      category_id: UUID,
      description: "Premium progressive lens",
      is_active: true,
    });
    expect(result.success).toBe(true);
  });

  it("defaults is_active to true", () => {
    const result = lensFamilyBaseSchema.safeParse(validLensFamily);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.is_active).toBe(true);
    }
  });
});

describe("createLensFamilySchema", () => {
  it("accepts valid create data", () => {
    const result = createLensFamilySchema.safeParse(validLensFamily);
    expect(result.success).toBe(true);
  });
});

describe("updateLensFamilySchema", () => {
  it("accepts partial update", () => {
    const result = updateLensFamilySchema.safeParse({ name: "Updated" });
    expect(result.success).toBe(true);
  });

  it("accepts empty update", () => {
    const result = updateLensFamilySchema.safeParse({});
    expect(result.success).toBe(true);
  });
});

describe("createLensFamilyFullSchema", () => {
  it("accepts lens family with matrices", () => {
    const result = createLensFamilyFullSchema.safeParse({
      ...validLensFamily,
      matrices: [
        {
          sphere_min: -6,
          sphere_max: 4,
          cylinder_min: -4,
          cylinder_max: 0,
          base_price: 150000,
          cost: 75000,
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("defaults matrices to empty array", () => {
    const result = createLensFamilyFullSchema.safeParse(validLensFamily);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.matrices).toEqual([]);
    }
  });

  it("rejects invalid sphere range (min > max)", () => {
    const result = createLensFamilyFullSchema.safeParse({
      ...validLensFamily,
      matrices: [
        {
          sphere_min: 4,
          sphere_max: -6,
          cylinder_min: -4,
          cylinder_max: 0,
          base_price: 150000,
          cost: 75000,
        },
      ],
    });
    expect(result.success).toBe(false);
  });
});

describe("lensPriceMatrixBaseSchema", () => {
  it("accepts valid price matrix", () => {
    const result = lensPriceMatrixBaseSchema.safeParse(validLensPriceMatrix);
    expect(result.success).toBe(true);
  });

  it("rejects sphere_min > sphere_max", () => {
    const result = lensPriceMatrixBaseSchema.safeParse({
      ...validLensPriceMatrix,
      sphere_min: 4,
      sphere_max: -6,
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative base_price", () => {
    const result = lensPriceMatrixBaseSchema.safeParse({
      ...validLensPriceMatrix,
      base_price: -100,
    });
    expect(result.success).toBe(false);
  });

  it("rejects sphere outside -30..30 range", () => {
    const result = lensPriceMatrixBaseSchema.safeParse({
      ...validLensPriceMatrix,
      sphere_min: -40,
    });
    expect(result.success).toBe(false);
  });

  it("accepts multipleOf 0.25 for sphere", () => {
    const result = lensPriceMatrixBaseSchema.safeParse({
      ...validLensPriceMatrix,
      sphere_min: -5.75,
    });
    expect(result.success).toBe(true);
  });

  it("rejects sphere not multiple of 0.25", () => {
    const result = lensPriceMatrixBaseSchema.safeParse({
      ...validLensPriceMatrix,
      sphere_min: -5.5,
      sphere_max: -5.33,
    });
    expect(result.success).toBe(false);
  });

  it("defaults sourcing_type to surfaced", () => {
    const result = lensPriceMatrixBaseSchema.safeParse({
      ...validLensPriceMatrix,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sourcing_type).toBe("surfaced");
    }
  });

  it("accepts stock sourcing_type", () => {
    const result = lensPriceMatrixBaseSchema.safeParse({
      ...validLensPriceMatrix,
      sourcing_type: "stock",
    });
    expect(result.success).toBe(true);
  });

  it("defaults is_active to true", () => {
    const result = lensPriceMatrixBaseSchema.safeParse(validLensPriceMatrix);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.is_active).toBe(true);
    }
  });

  it("accepts price matrix without addition fields (they remain undefined)", () => {
    const result = lensPriceMatrixBaseSchema.safeParse(validLensPriceMatrix);
    expect(result.success).toBe(true);
    if (result.success) {
      // ponytail: .default() before .optional() means absent keys stay undefined
      expect(result.data.addition_min).toBeUndefined();
      expect(result.data.addition_max).toBeUndefined();
    }
  });

  it("accepts addition values within range", () => {
    const result = lensPriceMatrixBaseSchema.safeParse({
      ...validLensPriceMatrix,
      addition_min: 0.75,
      addition_max: 3.5,
    });
    expect(result.success).toBe(true);
  });

  it("rejects addition outside 0..4 range", () => {
    const result = lensPriceMatrixBaseSchema.safeParse({
      ...validLensPriceMatrix,
      addition_min: -0.25,
    });
    expect(result.success).toBe(false);
  });
});

describe("lensPriceMatrixV2RangeRefine", () => {
  it("rejects cylinder_min > cylinder_max", () => {
    const result = lensPriceMatrixV2RangeRefine.safeParse({
      ...validLensPriceMatrix,
      cylinder_min: 0,
      cylinder_max: -4,
    });
    expect(result.success).toBe(false);
  });

  it("accepts valid cylinder range", () => {
    const result = lensPriceMatrixV2RangeRefine.safeParse(validLensPriceMatrix);
    expect(result.success).toBe(true);
  });
});

describe("createLensPriceMatrixSchema", () => {
  it("accepts valid create data", () => {
    const result = createLensPriceMatrixSchema.safeParse(validLensPriceMatrix);
    expect(result.success).toBe(true);
  });
});

describe("updateLensPriceMatrixSchema", () => {
  it("accepts partial update", () => {
    const result = updateLensPriceMatrixSchema.safeParse({
      base_price: 200000,
    });
    expect(result.success).toBe(true);
  });

  it("accepts empty object", () => {
    const result = updateLensPriceMatrixSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("rejects sphere update where min > max", () => {
    const result = updateLensPriceMatrixSchema.safeParse({
      sphere_min: 4,
      sphere_max: -6,
    });
    expect(result.success).toBe(false);
  });
});

describe("updateLensPriceMatrixSchemaV2", () => {
  it("rejects cylinder update where min > max", () => {
    const result = updateLensPriceMatrixSchemaV2.safeParse({
      cylinder_min: 1,
      cylinder_max: -2,
    });
    expect(result.success).toBe(false);
  });

  it("accepts partial cylinder update with valid range", () => {
    const result = updateLensPriceMatrixSchemaV2.safeParse({
      cylinder_min: -4,
      cylinder_max: 0,
    });
    expect(result.success).toBe(true);
  });
});

describe("contactLensFamilyBaseSchema", () => {
  const validContactLens = {
    name: "Biofinity",
    use_type: "monthly",
    modality: "spherical",
    packaging: "box_6",
  };

  it("accepts valid contact lens family", () => {
    const result = contactLensFamilyBaseSchema.safeParse(validContactLens);
    expect(result.success).toBe(true);
  });

  it("rejects missing name", () => {
    const result = contactLensFamilyBaseSchema.safeParse({
      use_type: "monthly",
      modality: "spherical",
      packaging: "box_6",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid use_type", () => {
    const result = contactLensFamilyBaseSchema.safeParse({
      ...validContactLens,
      // @ts-expect-error testing invalid enum
      use_type: "yearly",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid modality", () => {
    const result = contactLensFamilyBaseSchema.safeParse({
      ...validContactLens,
      // @ts-expect-error testing invalid enum
      modality: "toric_rx",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid packaging", () => {
    const result = contactLensFamilyBaseSchema.safeParse({
      ...validContactLens,
      // @ts-expect-error testing invalid enum
      packaging: "box_12",
    });
    expect(result.success).toBe(false);
  });

  it("accepts all use_type values", () => {
    const types = ["daily", "bi_weekly", "monthly", "extended_wear"] as const;
    for (const use_type of types) {
      const result = contactLensFamilyBaseSchema.safeParse({
        ...validContactLens,
        use_type,
      });
      expect(result.success).toBe(true);
    }
  });

  it("accepts optional fields (brand, base_curve, diameter)", () => {
    const result = contactLensFamilyBaseSchema.safeParse({
      ...validContactLens,
      brand: "CooperVision",
      base_curve: 8.6,
      diameter: 14.2,
    });
    expect(result.success).toBe(true);
  });

  it("rejects base_curve below 7.0", () => {
    const result = contactLensFamilyBaseSchema.safeParse({
      ...validContactLens,
      base_curve: 6.9,
    });
    expect(result.success).toBe(false);
  });

  it("rejects diameter above 15.0", () => {
    const result = contactLensFamilyBaseSchema.safeParse({
      ...validContactLens,
      diameter: 15.1,
    });
    expect(result.success).toBe(false);
  });

  it("defaults is_active to true", () => {
    const result = contactLensFamilyBaseSchema.safeParse(validContactLens);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.is_active).toBe(true);
    }
  });
});

describe("contactLensPriceMatrixBaseSchema", () => {
  const validRow = {
    contact_lens_family_id: UUID,
    sphere_min: -10,
    sphere_max: 10,
    base_price: 120000,
    cost: 60000,
  };

  it("accepts valid price matrix", () => {
    const result = contactLensPriceMatrixBaseSchema.safeParse(validRow);
    expect(result.success).toBe(true);
  });

  it("rejects sphere_min > sphere_max", () => {
    const result = contactLensPriceMatrixBaseSchema.safeParse({
      ...validRow,
      sphere_min: 10,
      sphere_max: -10,
    });
    expect(result.success).toBe(false);
  });

  it("defaults cylinder and axis ranges", () => {
    const result = contactLensPriceMatrixBaseSchema.safeParse(validRow);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.cylinder_min).toBe(0);
      expect(result.data.cylinder_max).toBe(0);
      expect(result.data.axis_min).toBe(0);
      expect(result.data.axis_max).toBe(180);
      expect(result.data.addition_min).toBe(0);
      expect(result.data.addition_max).toBe(4.0);
    }
  });

  it("defaults is_active to true", () => {
    const result = contactLensPriceMatrixBaseSchema.safeParse(validRow);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.is_active).toBe(true);
    }
  });
});

describe("contactLens schemas with matrices", () => {
  const validContactLens = {
    name: "Biofinity Multifocal",
    use_type: "monthly",
    modality: "multifocal",
    packaging: "box_6",
  };

  it("createContactLensFamilyWithMatricesSchema accepts data with matrices", () => {
    const result = createContactLensFamilyWithMatricesSchema.safeParse({
      ...validContactLens,
      matrices: [
        {
          sphere_min: -10,
          sphere_max: 10,
          base_price: 120000,
          cost: 60000,
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("createContactLensFamilyWithMatricesSchema defaults matrices to []", () => {
    const result = createContactLensFamilyWithMatricesSchema.safeParse(
      validContactLens,
    );
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.matrices).toEqual([]);
    }
  });

  it("rejects invalid sphere range in matrix", () => {
    const result = createContactLensFamilyWithMatricesSchema.safeParse({
      ...validContactLens,
      matrices: [
        {
          sphere_min: 10,
          sphere_max: -10,
          base_price: 120000,
          cost: 60000,
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid addition range", () => {
    const result = createContactLensFamilyWithMatricesSchema.safeParse({
      ...validContactLens,
      matrices: [
        {
          sphere_min: -10,
          sphere_max: 10,
          addition_min: 3.0,
          addition_max: 1.0,
          base_price: 120000,
          cost: 60000,
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("updateContactLensFamilyWithMatricesSchema accepts partial", () => {
    const result = updateContactLensFamilyWithMatricesSchema.safeParse({
      name: "Updated Lens",
      matrices: [],
    });
    expect(result.success).toBe(true);
  });
});

describe("updateContactLensPriceMatrixSchema", () => {
  it("accepts partial update", () => {
    const result = updateContactLensPriceMatrixSchema.safeParse({
      base_price: 130000,
    });
    expect(result.success).toBe(true);
  });

  it("rejects sphere_min > sphere_max when both present", () => {
    const result = updateContactLensPriceMatrixSchema.safeParse({
      sphere_min: 10,
      sphere_max: -10,
    });
    expect(result.success).toBe(false);
  });

  it("rejects cylinder_min > cylinder_max when both present", () => {
    const result = updateContactLensPriceMatrixSchema.safeParse({
      cylinder_min: 2,
      cylinder_max: -2,
    });
    expect(result.success).toBe(false);
  });

  it("rejects axis_min > axis_max when both present", () => {
    const result = updateContactLensPriceMatrixSchema.safeParse({
      axis_min: 150,
      axis_max: 30,
    });
    expect(result.success).toBe(false);
  });

  it("rejects addition_min > addition_max when both present", () => {
    const result = updateContactLensPriceMatrixSchema.safeParse({
      addition_min: 3.0,
      addition_max: 1.0,
    });
    expect(result.success).toBe(false);
  });

  it("accepts single-field updates", () => {
    const result = updateContactLensPriceMatrixSchema.safeParse({
      is_active: false,
    });
    expect(result.success).toBe(true);
  });
});

describe("createContactLensFamilySchema / updateContactLensFamilySchema", () => {
  const validContactLens = {
    name: "Dailies Total 1",
    use_type: "daily",
    modality: "spherical",
    packaging: "box_30",
  };

  it("createContactLensFamilySchema accepts valid data", () => {
    const result = createContactLensFamilySchema.safeParse(validContactLens);
    expect(result.success).toBe(true);
  });

  it("updateContactLensFamilySchema accepts partial data", () => {
    const result = updateContactLensFamilySchema.safeParse({
      name: "Updated",
    });
    expect(result.success).toBe(true);
  });
});

describe("createContactLensPriceMatrixSchema", () => {
  it("accepts valid data", () => {
    const result = createContactLensPriceMatrixSchema.safeParse({
      contact_lens_family_id: UUID,
      sphere_min: -10,
      sphere_max: 10,
      base_price: 120000,
      cost: 60000,
    });
    expect(result.success).toBe(true);
  });
});
