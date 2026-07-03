/**
 * Unit tests for lens-matrices constants.
 *
 * Tests OPTICAL_MATRIX_TEMPLATE, getOpticalDefaultMatrices,
 * CONTACT_LENS_DEFAULT_MATRICES, isContactLensFallbackMatrix,
 * and isOpticalFallbackMatrix.
 */

import { describe, expect, it } from "vitest";

import {
  OPTICAL_MATRIX_TEMPLATE,
  getOpticalDefaultMatrices,
  CONTACT_LENS_DEFAULT_MATRICES,
  isContactLensFallbackMatrix,
  isOpticalFallbackMatrix,
} from "@/lib/lens-matrices/constants";

describe("OPTICAL_MATRIX_TEMPLATE", () => {
  it("has exactly 7 matrix entries", () => {
    expect(OPTICAL_MATRIX_TEMPLATE).toHaveLength(7);
  });

  it("contains all expected names in order", () => {
    const names = OPTICAL_MATRIX_TEMPLATE.map((r) => r.name);
    expect(names).toEqual([
      "Rango base",
      "Alta miopía",
      "Alta hipermetropía",
      "Astigmatismo alto",
      "Alta miopía + astigmatismo",
      "Alta hipermetropía + astigmatismo",
      "Fallback",
    ]);
  });

  it("all entries have sourcing_type surfaced", () => {
    for (const row of OPTICAL_MATRIX_TEMPLATE) {
      expect(row.sourcing_type).toBe("surfaced");
    }
  });

  it("all entries have base_price and cost at 0 (template values)", () => {
    for (const row of OPTICAL_MATRIX_TEMPLATE) {
      expect(row.base_price).toBe(0);
      expect(row.cost).toBe(0);
    }
  });

  it("has correct range structure for Rango base", () => {
    const base = OPTICAL_MATRIX_TEMPLATE[0];
    expect(base.sphere_min).toBe(-6);
    expect(base.sphere_max).toBe(6);
    expect(base.cylinder_min).toBe(-4);
    expect(base.cylinder_max).toBe(0);
    expect(base.addition_min).toBe(0);
    expect(base.addition_max).toBe(0);
  });

  it("has fallback as the last entry with full ranges", () => {
    const fallback = OPTICAL_MATRIX_TEMPLATE[6];
    expect(fallback.name).toBe("Fallback");
    expect(fallback.sphere_min).toBe(-20);
    expect(fallback.sphere_max).toBe(20);
    expect(fallback.cylinder_min).toBe(-8);
    expect(fallback.cylinder_max).toBe(0);
  });
});

describe("getOpticalDefaultMatrices", () => {
  it("returns 2 entries for any lens type", () => {
    const matrices = getOpticalDefaultMatrices("single_vision");
    expect(matrices).toHaveLength(2);
  });

  it("returns Rango base and Fallback as first and second entries", () => {
    const matrices = getOpticalDefaultMatrices("progressive");
    expect(matrices[0].name).toBe("Rango base");
    expect(matrices[1].name).toBe("Fallback");
  });

  it("sets addition range 0-0 for monofocal (single_vision)", () => {
    const matrices = getOpticalDefaultMatrices("single_vision");
    expect(matrices[0].addition_min).toBe(0);
    expect(matrices[0].addition_max).toBe(0);
  });

  it("sets addition range 0-4 for multifocal/progressive", () => {
    const matrices = getOpticalDefaultMatrices("progressive");
    expect(matrices[0].addition_min).toBe(0);
    expect(matrices[0].addition_max).toBe(4);
  });

  it("sets Fallback base_price and cost to 999999", () => {
    const matrices = getOpticalDefaultMatrices("bifocal");
    expect(matrices[1].base_price).toBe(999999);
    expect(matrices[1].cost).toBe(999999);
  });

  it("each returned entry is a valid OpticalMatrixTemplateRow", () => {
    const matrices = getOpticalDefaultMatrices("reading");
    for (const row of matrices) {
      expect(row).toHaveProperty("name");
      expect(row).toHaveProperty("sphere_min");
      expect(row).toHaveProperty("sphere_max");
      expect(row).toHaveProperty("cylinder_min");
      expect(row).toHaveProperty("cylinder_max");
      expect(row).toHaveProperty("addition_min");
      expect(row).toHaveProperty("addition_max");
      expect(row).toHaveProperty("sourcing_type", "surfaced");
    }
  });
});

describe("CONTACT_LENS_DEFAULT_MATRICES", () => {
  it("has exactly 2 entries", () => {
    expect(CONTACT_LENS_DEFAULT_MATRICES).toHaveLength(2);
  });

  it("has Rango base and Fallback as first and second entries", () => {
    expect(CONTACT_LENS_DEFAULT_MATRICES[0].name).toBe("Rango base");
    expect(CONTACT_LENS_DEFAULT_MATRICES[1].name).toBe("Fallback");
  });

  it("has sphere range -20 to 20 for Rango base", () => {
    const base = CONTACT_LENS_DEFAULT_MATRICES[0];
    expect(base.sphere_min).toBe(-20);
    expect(base.sphere_max).toBe(20);
    expect(base.cylinder_min).toBe(-6);
    expect(base.cylinder_max).toBe(0);
    expect(base.axis_min).toBe(0);
    expect(base.axis_max).toBe(180);
  });

  it("Fallback has 999999 prices and 0 for base_price", () => {
    const base = CONTACT_LENS_DEFAULT_MATRICES[0];
    const fallback = CONTACT_LENS_DEFAULT_MATRICES[1];

    expect(base.base_price).toBe(0);
    expect(base.cost).toBe(0);
    expect(fallback.base_price).toBe(999999);
    expect(fallback.cost).toBe(999999);
  });

  it("each entry has all required properties", () => {
    for (const row of CONTACT_LENS_DEFAULT_MATRICES) {
      expect(row).toHaveProperty("name");
      expect(row).toHaveProperty("sphere_min");
      expect(row).toHaveProperty("sphere_max");
      expect(row).toHaveProperty("cylinder_min");
      expect(row).toHaveProperty("cylinder_max");
      expect(row).toHaveProperty("axis_min");
      expect(row).toHaveProperty("axis_max");
      expect(row).toHaveProperty("addition_min");
      expect(row).toHaveProperty("addition_max");
    }
  });
});

describe("isContactLensFallbackMatrix", () => {
  it("returns true for fallback ranges", () => {
    expect(isContactLensFallbackMatrix(-20, 20, -6, 0)).toBe(true);
  });

  it("returns true for wider-than-fallback ranges", () => {
    expect(isContactLensFallbackMatrix(-25, 25, -8, 2)).toBe(true);
  });

  it("returns false for narrower sphere range", () => {
    expect(isContactLensFallbackMatrix(-10, 10, -6, 0)).toBe(false);
  });

  it("returns false for narrower cylinder range", () => {
    expect(isContactLensFallbackMatrix(-20, 20, -4, 0)).toBe(false);
  });
});

describe("isOpticalFallbackMatrix", () => {
  it("returns true for fallback ranges", () => {
    expect(isOpticalFallbackMatrix(-20, 20, -8, 0)).toBe(true);
  });

  it("returns true for wider-than-fallback ranges", () => {
    expect(isOpticalFallbackMatrix(-25, 25, -10, 2)).toBe(true);
  });

  it("returns false for narrower sphere range", () => {
    expect(isOpticalFallbackMatrix(-10, 10, -8, 0)).toBe(false);
  });

  it("returns false for narrower cylinder range", () => {
    expect(isOpticalFallbackMatrix(-20, 20, -4, 0)).toBe(false);
  });
});
