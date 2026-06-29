/**
 * Tests for posPricingUtils.ts — pure pricing logic.
 *
 * Coverage:
 *   - suggestLensFamily: null, with/without addition, sphere ranges, lens type mismatch
 *   - computeTreatmentsPrice: empty, selected, missing
 *   - computeLensPrice: null, contact, progressive, two_separate, single
 *   - computeNearLensPrice: null, with family
 *   - computeTotalPrice: no discount, percentage, fixed, customer own frame
 *   - computeDiscountAmount: no discount, percentage, fixed
 *   - updateTreatmentPrice: single update, multiple
 *   - filterTreatmentsByLensType: contact filter, vision passthrough
 */
import { describe, expect, it } from "vitest";
import {
  suggestLensFamily,
  computeTreatmentsPrice,
  computeLensPrice,
  computeNearLensPrice,
  computeTotalPrice,
  computeDiscountAmount,
  updateTreatmentPrice,
  filterTreatmentsByLensType,
} from "../posPricingUtils";
import type { Treatment } from "../POSAdvancedSale.types";

// ─── suggestLensFamily ────────────────────────────────────────────────────────
//
// Lens family logic (vision, with addition):
//   maxSphere ≤ 2  → lf-5 (Progresivo Básico)
//   2 < maxSphere ≤ 4 → lf-6 (Progresivo Medio)
//   maxSphere > 4  → lf-7 (Progresivo Premium)
// Near family (with addition):
//   maxNearSphere ≤ 3 → lf-1
//   3 < maxNearSphere ≤ 4 → lf-2
//   maxNearSphere > 4 → lf-3
// Without addition:
//   maxSphere ≤ 3 → lf-1
//   3 < maxSphere ≤ 6 → lf-2
//   maxSphere > 6 → lf-3

describe("suggestLensFamily", () => {
  const lensFamilies = [
    { id: "lf-1", name: "Monofocal Básico", lens_type: "vision" as const },
    { id: "lf-2", name: "Antifatiga", lens_type: "vision" as const },
    { id: "lf-3", name: "Monofocal Premium", lens_type: "vision" as const },
    { id: "lf-5", name: "Progresivo Básico", lens_type: "vision" as const },
    { id: "lf-6", name: "Progresivo Medio", lens_type: "vision" as const },
    { id: "lf-7", name: "Progresivo Premium", lens_type: "vision" as const },
    { id: "cl-1", name: "Contact Lens", lens_type: "contact" as const },
  ];

  it("returns null when prescription is null", () => {
    expect(suggestLensFamily(null, lensFamilies, "vision")).toBeNull();
  });

  it("suggests lf-5 (progressive) when addition present and maxSphere ≤ 2", () => {
    const result = suggestLensFamily(
      { od_sphere: -1, os_sphere: -1.5, od_add: 1.5, os_add: 1.5 },
      lensFamilies,
      "vision",
    );
    // maxSphere = max(1, 1.5) = 1.5 ≤ 2 → lf-5
    // maxNearSphere = max(|-1+1.5|, |-1.5+1.5|) = max(0.5, 0) = 0.5 ≤ 3 → lf-1
    expect(result?.lens_family_id).toBe("lf-5");
    expect(result?.near_lens_family_id).toBe("lf-1");
    expect(result?.presbyopia_solution).toBe("progressive");
  });

  it("suggests lf-6 when 2 < maxSphere ≤ 4 with addition", () => {
    const result = suggestLensFamily(
      { od_sphere: -3, os_sphere: -2.5, od_add: 2, os_add: 2 },
      lensFamilies,
      "vision",
    );
    // maxSphere = max(3, 2.5) = 3 → 2 < 3 ≤ 4 → lf-6
    // maxNearSphere = max(|-3+2|, |-2.5+2|) = max(1, 0.5) = 1 ≤ 3 → lf-1
    expect(result?.lens_family_id).toBe("lf-6");
    expect(result?.presbyopia_solution).toBe("progressive");
  });

  it("suggests lf-7 when maxSphere > 4 with addition", () => {
    const result = suggestLensFamily(
      { od_sphere: -5, os_sphere: -4.5, od_add: 2.5, os_add: 2.5 },
      lensFamilies,
      "vision",
    );
    // maxSphere = max(5, 4.5) = 5 > 4 → lf-7
    // maxNearSphere = max(|-5+2.5|, |-4.5+2.5|) = max(2.5, 2) = 2.5 ≤ 3 → lf-1
    expect(result?.lens_family_id).toBe("lf-7");
    expect(result?.near_lens_family_id).toBe("lf-1");
    expect(result?.presbyopia_solution).toBe("progressive");
  });

  it("suggests lf-7 with near lf-2 when maxNearSphere > 3", () => {
    const result = suggestLensFamily(
      { od_sphere: -6, os_sphere: -5, od_add: 2, os_add: 2 },
      lensFamilies,
      "vision",
    );
    // maxSphere = max(6, 5) = 6 > 4 → lf-7
    // maxNearSphere = max(|-6+2|, |-5+2|) = max(4, 3) = 4 → 3 < 4 ≤ 4 → lf-2
    expect(result?.lens_family_id).toBe("lf-7");
    expect(result?.near_lens_family_id).toBe("lf-2");
    expect(result?.presbyopia_solution).toBe("progressive");
  });

  it("suggests lf-7 with near lf-3 when maxNearSphere > 4", () => {
    const result = suggestLensFamily(
      { od_sphere: -7, os_sphere: -5, od_add: 2, os_add: 2 },
      lensFamilies,
      "vision",
    );
    // maxSphere = max(7, 5) = 7 > 4 → lf-7
    // maxNearSphere = max(|-7+2|, |-5+2|) = max(5, 3) = 5 > 4 → lf-3
    expect(result?.lens_family_id).toBe("lf-7");
    expect(result?.near_lens_family_id).toBe("lf-3");
    expect(result?.near_lens_family_name).toBe("Monofocal Premium");
  });

  it("suggests single vision without addition — lf-1 for maxSphere ≤ 3", () => {
    const result = suggestLensFamily(
      { od_sphere: -2, os_sphere: -1.5, od_add: 0, os_add: 0 },
      lensFamilies,
      "vision",
    );
    // maxSphere = max(2, 1.5) = 2 ≤ 3 → lf-1
    // No addition → single, near_lens_family_id = null
    expect(result?.lens_family_id).toBe("lf-1");
    expect(result?.presbyopia_solution).toBe("single");
    expect(result?.near_lens_family_id).toBeNull();
  });

  it("suggests lf-2 when 3 < maxSphere ≤ 6 without addition", () => {
    const result = suggestLensFamily(
      { od_sphere: -5, os_sphere: -4 },
      lensFamilies,
      "vision",
    );
    // maxSphere = max(5, 4) = 5 → 3 < 5 ≤ 6 → lf-2
    expect(result?.lens_family_id).toBe("lf-2");
    expect(result?.presbyopia_solution).toBe("single");
  });

  it("suggests lf-3 when maxSphere > 6 without addition", () => {
    const result = suggestLensFamily(
      { od_sphere: -7, os_sphere: -6.5 },
      lensFamilies,
      "vision",
    );
    // maxSphere = max(7, 6.5) = 7 > 6 → lf-3
    expect(result?.lens_family_id).toBe("lf-3");
  });

  it("suggests lf-1 when maxSphere ≤ 3 without addition", () => {
    const result = suggestLensFamily(
      { od_sphere: -1, os_sphere: -0.5 },
      lensFamilies,
      "vision",
    );
    expect(result?.lens_family_id).toBe("lf-1");
  });

  it("returns fallback when lens type mismatches suggested family", () => {
    const result = suggestLensFamily(
      { od_sphere: -1, os_sphere: -1, od_add: 1.5, os_add: 1.5 },
      lensFamilies,
      "contact",
    );
    // lf-5 is vision type — lens_type mismatch → fallback to single
    expect(result?.lens_family_id).toBe("lf-5");
    expect(result?.presbyopia_solution).toBe("single");
  });

  it("handles only one eye having addition", () => {
    const result = suggestLensFamily(
      { od_sphere: -1, os_sphere: -1, od_add: 0, os_add: 1.5 },
      lensFamilies,
      "vision",
    );
    // hasAddition = (0 > 0) || (1.5 > 0) = true
    // maxSphere = 1 → lf-5
    expect(result?.presbyopia_solution).toBe("progressive");
    expect(result?.lens_family_id).toBe("lf-5");
  });
});

// ─── computeTreatmentsPrice ───────────────────────────────────────────────────

describe("computeTreatmentsPrice", () => {
  const treatments: Treatment[] = [
    { id: "t1", label: "AR", value: "ar", cost: 15000, category: "coating" },
    { id: "t2", label: "Fotocromático", value: "photochromic", cost: 30000, category: "coating" },
  ];

  it("returns 0 for empty treatment IDs", () => {
    expect(computeTreatmentsPrice([], treatments)).toBe(0);
  });

  it("sums costs of selected treatments", () => {
    expect(computeTreatmentsPrice(["t1", "t2"], treatments)).toBe(45000);
  });

  it("treats missing treatment IDs as 0", () => {
    expect(computeTreatmentsPrice(["t1", "nonexistent"], treatments)).toBe(15000);
  });
});

// ─── computeLensPrice ─────────────────────────────────────────────────────────

describe("computeLensPrice", () => {
  const lensFamilies = [
    { id: "lf-1", name: "Monofocal", lens_type: "vision" as const },
    { id: "cl-1", name: "Contact", lens_type: "contact" as const },
  ];

  it("returns 0 for null lensFamilyId", () => {
    expect(computeLensPrice(null, "single", lensFamilies)).toBe(0);
  });

  it("returns 0 for unknown lens family", () => {
    expect(computeLensPrice("unknown", "single", lensFamilies)).toBe(0);
  });

  it("returns 25000 for contact lenses", () => {
    expect(computeLensPrice("cl-1", "single", lensFamilies)).toBe(25000);
  });

  it("returns 120000 for progressive", () => {
    expect(computeLensPrice("lf-1", "progressive", lensFamilies)).toBe(120000);
  });

  it("returns 80000 for two_separate", () => {
    expect(computeLensPrice("lf-1", "two_separate", lensFamilies)).toBe(80000);
  });

  it("returns 45000 for single (default)", () => {
    expect(computeLensPrice("lf-1", "single", lensFamilies)).toBe(45000);
  });
});

// ─── computeNearLensPrice ─────────────────────────────────────────────────────

describe("computeNearLensPrice", () => {
  const lensFamilies = [
    { id: "lf-1", name: "Monofocal", lens_type: "vision" as const },
  ];

  it("returns 0 for null nearLensFamilyId", () => {
    expect(computeNearLensPrice(null, lensFamilies)).toBe(0);
  });

  it("returns 0 for unknown family", () => {
    expect(computeNearLensPrice("unknown", lensFamilies)).toBe(0);
  });

  it("returns 35000 for known near lens family", () => {
    expect(computeNearLensPrice("lf-1", lensFamilies)).toBe(35000);
  });
});

// ─── computeTotalPrice ────────────────────────────────────────────────────────

describe("computeTotalPrice", () => {
  const frame = { id: "f-1", name: "Frame", price: 100000 };

  it("sums frame, lens, treatments, labor without discount", () => {
    const total = computeTotalPrice(frame, false, 60000, 15000, 10000, "none", 0);
    expect(total).toBe(185000); // 100000 + 60000 + 15000 + 10000
  });

  it("excludes frame when customerOwnFrame is true", () => {
    const total = computeTotalPrice(frame, true, 60000, 15000, 10000, "none", 0);
    expect(total).toBe(85000); // 60000 + 15000 + 10000
  });

  it("handles null frame price", () => {
    const total = computeTotalPrice({ id: "f-1", name: "Frame", price: 0 }, false, 50000, 0, 0, "none", 0);
    expect(total).toBe(50000);
  });

  it("applies percentage discount", () => {
    const total = computeTotalPrice(frame, false, 50000, 0, 0, "percentage", 10);
    expect(total).toBe(135000); // 150000 * 0.9
  });

  it("applies fixed discount", () => {
    const total = computeTotalPrice(frame, false, 50000, 0, 0, "fixed", 20000);
    expect(total).toBe(130000); // 150000 - 20000
  });

  it("caps fixed discount at 0 minimum", () => {
    const total = computeTotalPrice(frame, false, 0, 0, 0, "fixed", 200000);
    expect(total).toBe(0);
  });

  it("returns 0 when all inputs are 0", () => {
    const total = computeTotalPrice(null, false, 0, 0, 0, "none", 0);
    expect(total).toBe(0);
  });
});

// ─── computeDiscountAmount ────────────────────────────────────────────────────

describe("computeDiscountAmount", () => {
  const frame = { id: "f-1", name: "Frame", price: 100000 };

  it("returns 0 for no discount", () => {
    expect(computeDiscountAmount(frame, false, 50000, 0, 0, "none", 0)).toBe(0);
  });

  it("calculates percentage discount", () => {
    const discount = computeDiscountAmount(frame, false, 50000, 0, 0, "percentage", 10);
    expect(discount).toBe(15000); // 150000 * 0.1
  });

  it("returns fixed discount value", () => {
    expect(computeDiscountAmount(frame, false, 50000, 0, 0, "fixed", 25000)).toBe(25000);
  });

  it("excludes frame from subtotal when customer owns frame", () => {
    const discount = computeDiscountAmount(frame, true, 50000, 0, 0, "percentage", 10);
    expect(discount).toBe(5000); // 50000 * 0.1
  });
});

// ─── updateTreatmentPrice ─────────────────────────────────────────────────────

describe("updateTreatmentPrice", () => {
  const treatments: Treatment[] = [
    { id: "t1", label: "AR", value: "ar", cost: 10000, category: "coating" },
    { id: "t2", label: "Tinte", value: "tint", cost: 8000, category: "coating" },
  ];

  it("updates cost for the matching treatment", () => {
    const updated = updateTreatmentPrice(treatments, "t1", 15000);
    expect(updated.find((t) => t.id === "t1")?.cost).toBe(15000);
    expect(updated.find((t) => t.id === "t2")?.cost).toBe(8000); // unchanged
  });

  it("returns unchanged array when no treatment matches", () => {
    const updated = updateTreatmentPrice(treatments, "nonexistent", 99999);
    expect(updated).toEqual(treatments);
  });

  it("does not mutate the original array", () => {
    const original = [...treatments];
    updateTreatmentPrice(treatments, "t1", 99999);
    expect(treatments[0].cost).toBe(10000); // unchanged
  });
});

// ─── filterTreatmentsByLensType ───────────────────────────────────────────────

describe("filterTreatmentsByLensType", () => {
  const treatments: Treatment[] = [
    { id: "t1", label: "AR", value: "ar", cost: 10000, category: "coating" },
    { id: "t2", label: "Fotocromático", value: "photochromic", cost: 25000, category: "coating" },
    { id: "t3", label: "Polarizado", value: "polarized", cost: 20000, category: "coating" },
    { id: "t4", label: "Tinte", value: "tint", cost: 8000, category: "coating" },
    { id: "t5", label: "Garantía", value: "warranty", cost: 5000, category: "service" },
  ];

  it("returns all treatments for vision lens type", () => {
    const result = filterTreatmentsByLensType(treatments, "vision");
    expect(result).toHaveLength(5);
  });

  it("excludes photochromic, polarized, tint for contact lenses", () => {
    const result = filterTreatmentsByLensType(treatments, "contact");
    // Only AR (coating, not excluded) survives — service is not coating
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("t1");
    expect(result.every((t) => t.category === "coating")).toBe(true);
    expect(result.find((t) => t.value === "photochromic")).toBeUndefined();
    expect(result.find((t) => t.value === "polarized")).toBeUndefined();
    expect(result.find((t) => t.value === "tint")).toBeUndefined();
    expect(result.find((t) => t.value === "ar")).toBeDefined();
  });

  it("returns empty array when all treatments filtered out for contact", () => {
    const onlyFiltered: Treatment[] = [
      { id: "t2", label: "Fotocromático", value: "photochromic", cost: 25000, category: "coating" },
    ];
    expect(filterTreatmentsByLensType(onlyFiltered, "contact")).toHaveLength(0);
  });
});
