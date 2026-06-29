/**
 * Unit tests for presbyopia helper functions.
 *
 * Tests hasAddition, getMaxAddition, getAverageAddition,
 * getFarSphere, getCylinder, getNearSphere,
 * getDefaultPresbyopiaSolution, isLensFamilyCompatible,
 * getRecommendedLensTypes, getLensTypesForPresbyopia,
 * and getCategorySlugsForPresbyopia.
 */

import { describe, expect, it } from "vitest";

import type { Prescription } from "@/lib/presbyopia-helpers";
import {
  getAverageAddition,
  getCategorySlugsForPresbyopia,
  getCylinder,
  getDefaultPresbyopiaSolution,
  getFarSphere,
  getLensTypesForPresbyopia,
  getMaxAddition,
  getNearSphere,
  getRecommendedLensTypes,
  hasAddition,
  isLensFamilyCompatible,
} from "@/lib/presbyopia-helpers";

describe("hasAddition", () => {
  it("returns false for null/undefined prescription", () => {
    expect(hasAddition(null)).toBe(false);
    expect(hasAddition(undefined)).toBe(false);
  });

  it("returns false when both adds are 0 or null", () => {
    expect(hasAddition({})).toBe(false);
    expect(hasAddition({ od_add: 0, os_add: 0 })).toBe(false);
    expect(hasAddition({ od_add: null, os_add: null })).toBe(false);
  });

  it("returns true when either eye has addition", () => {
    expect(hasAddition({ od_add: 1.5 })).toBe(true);
    expect(hasAddition({ os_add: 2.0 })).toBe(true);
    expect(hasAddition({ od_add: 1.5, os_add: 2.0 })).toBe(true);
  });
});

describe("getMaxAddition", () => {
  it("returns 0 for null/undefined prescription", () => {
    expect(getMaxAddition(null)).toBe(0);
    expect(getMaxAddition(undefined)).toBe(0);
  });

  it("returns 0 when no addition exists", () => {
    expect(getMaxAddition({})).toBe(0);
  });

  it("returns the max addition value", () => {
    expect(getMaxAddition({ od_add: 1.5, os_add: 2.0 })).toBe(2.0);
    expect(getMaxAddition({ od_add: 2.5, os_add: 1.0 })).toBe(2.5);
  });

  it("handles one eye null and the other with addition", () => {
    expect(getMaxAddition({ od_add: null, os_add: 1.75 })).toBe(1.75);
    expect(getMaxAddition({ od_add: 1.25, os_add: null })).toBe(1.25);
  });
});

describe("getAverageAddition", () => {
  it("returns 0 for null/undefined prescription", () => {
    expect(getAverageAddition(null)).toBe(0);
    expect(getAverageAddition(undefined)).toBe(0);
  });

  it("returns 0 when both adds are 0", () => {
    expect(getAverageAddition({ od_add: 0, os_add: 0 })).toBe(0);
  });

  it("returns the single value when only one eye has addition", () => {
    expect(getAverageAddition({ od_add: 1.5, os_add: 0 })).toBe(1.5);
    expect(getAverageAddition({ od_add: 0, os_add: 2.0 })).toBe(2.0);
  });

  it("returns the average when both eyes have addition", () => {
    expect(getAverageAddition({ od_add: 1.5, os_add: 2.5 })).toBe(2.0);
  });
});

describe("getFarSphere", () => {
  it("returns 0 for null/undefined prescription", () => {
    expect(getFarSphere(null)).toBe(0);
    expect(getFarSphere(undefined)).toBe(0);
  });

  it("returns sphere with highest absolute value", () => {
    expect(getFarSphere({ od_sphere: -3.0, os_sphere: -1.5 })).toBe(-3.0);
    expect(getFarSphere({ od_sphere: 1.0, os_sphere: -2.5 })).toBe(-2.5);
    expect(getFarSphere({ od_sphere: 0.5, os_sphere: 0.75 })).toBe(0.75);
  });

  it("handles null spheres", () => {
    expect(getFarSphere({ od_sphere: null, os_sphere: -2.0 })).toBe(-2.0);
    expect(getFarSphere({ od_sphere: -1.5, os_sphere: null })).toBe(-1.5);
  });
});

describe("getCylinder", () => {
  it("returns 0 for null/undefined prescription", () => {
    expect(getCylinder(null)).toBe(0);
    expect(getCylinder(undefined)).toBe(0);
  });

  it("returns cylinder with highest absolute value", () => {
    expect(getCylinder({ od_cylinder: -1.5, os_cylinder: -0.75 })).toBe(-1.5);
    expect(getCylinder({ od_cylinder: -0.5, os_cylinder: -2.0 })).toBe(-2.0);
  });

  it("handles null cylinders", () => {
    expect(getCylinder({ od_cylinder: null, os_cylinder: -1.0 })).toBe(-1.0);
    expect(getCylinder({ od_cylinder: -0.75, os_cylinder: null })).toBe(-0.75);
  });

  it("handles equal values", () => {
    expect(getCylinder({ od_cylinder: -1.0, os_cylinder: -1.0 })).toBe(-1.0);
  });
});

describe("getNearSphere", () => {
  it("returns far sphere + max addition", () => {
    const rx: Prescription = { od_sphere: -3.0, od_add: 1.5 };
    expect(getNearSphere(rx)).toBe(-1.5); // -3.0 + 1.5
  });

  it("returns 0 for null prescription", () => {
    expect(getNearSphere(null)).toBe(0);
  });

  it("works with positive sphere values", () => {
    const rx: Prescription = { od_sphere: 2.0, os_add: 2.0 };
    expect(getNearSphere(rx)).toBe(4.0); // 2.0 + 2.0
  });

  it("returns far sphere when no addition", () => {
    const rx: Prescription = { od_sphere: -1.5 };
    expect(getNearSphere(rx)).toBe(-1.5);
  });
});

describe("getDefaultPresbyopiaSolution", () => {
  it("returns none for null/undefined prescription", () => {
    expect(getDefaultPresbyopiaSolution(null)).toBe("none");
    expect(getDefaultPresbyopiaSolution(undefined)).toBe("none");
  });

  it("returns none when no addition present", () => {
    expect(getDefaultPresbyopiaSolution({})).toBe("none");
    expect(getDefaultPresbyopiaSolution({ od_add: 0 })).toBe("none");
  });

  it("returns progressive by default when addition exists", () => {
    expect(getDefaultPresbyopiaSolution({ od_add: 1.5 })).toBe("progressive");
  });

  it("respects prescription_type when set", () => {
    expect(
      getDefaultPresbyopiaSolution({ od_add: 1.5, prescription_type: "bifocal" }),
    ).toBe("bifocal");
    expect(
      getDefaultPresbyopiaSolution({
        od_add: 1.5,
        prescription_type: "progressive",
      }),
    ).toBe("progressive");
    expect(
      getDefaultPresbyopiaSolution({
        od_add: 1.5,
        prescription_type: "trifocal",
      }),
    ).toBe("trifocal");
  });

  it("is case-insensitive with prescription_type", () => {
    expect(
      getDefaultPresbyopiaSolution({
        od_add: 1.5,
        prescription_type: "BIFOCAL",
      }),
    ).toBe("bifocal");
  });
});

describe("isLensFamilyCompatible", () => {
  it("returns false for null/undefined lens family type", () => {
    expect(isLensFamilyCompatible(null, "none")).toBe(false);
    expect(isLensFamilyCompatible(undefined, "progressive")).toBe(false);
  });

  it("checks single_vision/reading/computer for 'none' solution", () => {
    expect(isLensFamilyCompatible("single_vision", "none")).toBe(true);
    expect(isLensFamilyCompatible("reading", "none")).toBe(true);
    expect(isLensFamilyCompatible("computer", "none")).toBe(true);
    expect(isLensFamilyCompatible("progressive", "none")).toBe(false);
  });

  it("checks progressive for 'progressive' solution", () => {
    expect(isLensFamilyCompatible("progressive", "progressive")).toBe(true);
    expect(isLensFamilyCompatible("single_vision", "progressive")).toBe(false);
  });

  it("checks bifocal for 'bifocal' solution", () => {
    expect(isLensFamilyCompatible("bifocal", "bifocal")).toBe(true);
    expect(isLensFamilyCompatible("progressive", "bifocal")).toBe(false);
  });

  it("checks trifocal for 'trifocal' solution", () => {
    expect(isLensFamilyCompatible("trifocal", "trifocal")).toBe(true);
    expect(isLensFamilyCompatible("single_vision", "trifocal")).toBe(false);
  });

  it("checks single_vision/reading for 'two_separate' solution", () => {
    expect(isLensFamilyCompatible("single_vision", "two_separate")).toBe(true);
    expect(isLensFamilyCompatible("reading", "two_separate")).toBe(true);
    expect(isLensFamilyCompatible("progressive", "two_separate")).toBe(false);
  });
});

describe("getRecommendedLensTypes", () => {
  it("returns multiple types for 'none'", () => {
    expect(getRecommendedLensTypes("none")).toEqual([
      "single_vision",
      "reading",
      "computer",
      "sports",
    ]);
  });

  it("returns only progressive for 'progressive'", () => {
    expect(getRecommendedLensTypes("progressive")).toEqual(["progressive"]);
  });

  it("returns only bifocal for 'bifocal'", () => {
    expect(getRecommendedLensTypes("bifocal")).toEqual(["bifocal"]);
  });

  it("returns only trifocal for 'trifocal'", () => {
    expect(getRecommendedLensTypes("trifocal")).toEqual(["trifocal"]);
  });

  it("returns single_vision and reading for 'two_separate'", () => {
    expect(getRecommendedLensTypes("two_separate")).toEqual([
      "single_vision",
      "reading",
    ]);
  });
});

describe("getLensTypesForPresbyopia", () => {
  it("returns empty array for null/undefined", () => {
    expect(getLensTypesForPresbyopia(null)).toEqual([]);
    expect(getLensTypesForPresbyopia(undefined)).toEqual([]);
  });

  it("returns mapped types for each solution", () => {
    expect(getLensTypesForPresbyopia("none")).toEqual([
      "single_vision",
      "reading",
      "computer",
      "sports",
    ]);
    expect(getLensTypesForPresbyopia("progressive")).toEqual(["progressive"]);
    expect(getLensTypesForPresbyopia("two_separate")).toEqual([
      "single_vision",
      "reading",
    ]);
  });
});

describe("getCategorySlugsForPresbyopia", () => {
  it("returns empty array for null/undefined", () => {
    expect(getCategorySlugsForPresbyopia(null)).toEqual([]);
    expect(getCategorySlugsForPresbyopia(undefined)).toEqual([]);
  });

  it("returns category slugs for 'none'", () => {
    expect(getCategorySlugsForPresbyopia("none")).toEqual([
      "lectura",
      "ocupacional",
      "deportivo",
    ]);
  });

  it("returns empty array for progressive, bifocal, trifocal", () => {
    expect(getCategorySlugsForPresbyopia("progressive")).toEqual([]);
    expect(getCategorySlugsForPresbyopia("bifocal")).toEqual([]);
    expect(getCategorySlugsForPresbyopia("trifocal")).toEqual([]);
  });

  it("returns lectura for 'two_separate'", () => {
    expect(getCategorySlugsForPresbyopia("two_separate")).toEqual(["lectura"]);
  });
});
