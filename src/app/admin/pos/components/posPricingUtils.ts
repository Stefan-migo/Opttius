/**
 * posPricingUtils — Pure pricing logic for the Optical Sale form.
 *
 * These are stateless functions that take state in and return values out.
 * They do NOT use React hooks — the component wraps them in useMemo/useCallback.
 */

import type { POSProduct, Treatment } from "./POSAdvancedSale.types";
interface PrescriptionView {
  od_sphere?: number | null;
  os_sphere?: number | null;
  od_add?: number | null;
  os_add?: number | null;
}

interface LensFamily {
  id: string;
  name: string;
  lens_type: "vision" | "contact";
  is_stock_available?: boolean;
}

/**
 * Suggest lens family and presbyopia solution based on prescription.
 * Returns suggested values or null if no change needed.
 */
export function suggestLensFamily(
  prescription: PrescriptionView | null,
  lensFamilies: readonly LensFamily[],
  currentLensType: "vision" | "contact",
): {
  lens_family_id: string;
  lens_family_name: string;
  near_lens_family_id: string | null;
  near_lens_family_name: string | null;
  presbyopia_solution: "single" | "two_separate" | "progressive";
} | null {
  if (!prescription) return null;

  const { od_sphere, os_sphere, od_add, os_add } = prescription;

  const hasAddition = (od_add && od_add > 0) || (os_add && os_add > 0);
  const maxSphere = Math.max(
    Math.abs(od_sphere || 0),
    Math.abs(os_sphere || 0),
  );
  const addValue = od_add || os_add || 0;
  const nearSphere = (od_sphere || 0) + addValue;
  const maxNearSphere = Math.max(
    Math.abs(nearSphere),
    Math.abs((os_sphere || 0) + addValue),
  );

  let suggestedFamily = "";
  let suggestedNearFamily = "";
  let suggestedSolution: "single" | "two_separate" | "progressive" = "single";

  if (hasAddition) {
    if (maxSphere > 4) {
      suggestedFamily = "lf-7";
    } else if (maxSphere > 2) {
      suggestedFamily = "lf-6";
    } else {
      suggestedFamily = "lf-5";
    }

    if (maxNearSphere > 4) {
      suggestedNearFamily = "lf-3";
    } else if (maxNearSphere > 3) {
      suggestedNearFamily = "lf-2";
    } else {
      suggestedNearFamily = "lf-1";
    }
  } else {
    if (maxSphere > 6) {
      suggestedFamily = "lf-3";
    } else if (maxSphere > 3) {
      suggestedFamily = "lf-2";
    } else {
      suggestedFamily = "lf-1";
    }
  }

  const family = lensFamilies.find((f) => f.id === suggestedFamily);
  const nearFamily = lensFamilies.find((f) => f.id === suggestedNearFamily);

  if (family && currentLensType === family.lens_type) {
    const newSolution = hasAddition ? "progressive" : "single";
    return {
      lens_family_id: suggestedFamily,
      lens_family_name: family.name,
      near_lens_family_id: hasAddition ? suggestedNearFamily : null,
      near_lens_family_name: hasAddition && nearFamily ? nearFamily.name : null,
      presbyopia_solution: newSolution,
    };
  }

  return {
    lens_family_id: suggestedFamily,
    lens_family_name: family?.name || "",
    near_lens_family_id: null,
    near_lens_family_name: null,
    presbyopia_solution: "single",
  };
}

/**
 * Compute total treatments price from selected IDs.
 */
export function computeTreatmentsPrice(
  treatmentIds: string[],
  treatments: Treatment[],
): number {
  return treatmentIds.reduce((total, id) => {
    const treatment = treatments.find((t) => t.id === id);
    return total + (treatment?.cost || 0);
  }, 0);
}

/**
 * Compute lens price based on family and solution type.
 */
export function computeLensPrice(
  lensFamilyId: string | null,
  presbyopiaSolution: string,
  lensFamilies: readonly LensFamily[],
): number {
  if (!lensFamilyId) return 0;
  const family = lensFamilies.find((f) => f.id === lensFamilyId);
  if (!family) return 0;
  if (family.lens_type === "contact") return 25000;

  switch (presbyopiaSolution) {
    case "progressive":
      return 120000;
    case "two_separate":
      return 80000;
    default:
      return 45000;
  }
}

/**
 * Compute near lens price for two_separate solution.
 */
export function computeNearLensPrice(
  nearLensFamilyId: string | null,
  lensFamilies: readonly LensFamily[],
): number {
  if (!nearLensFamilyId) return 0;
  const family = lensFamilies.find((f) => f.id === nearLensFamilyId);
  if (!family) return 0;
  return 35000;
}

/**
 * Compute total price including frame, lenses, treatments, labor, and discount.
 */
export function computeTotalPrice(
  selectedFrame: POSProduct | null,
  customerOwnFrame: boolean,
  lensPrice: number,
  treatmentsPrice: number,
  laborCost: number,
  discountType: "none" | "percentage" | "fixed",
  discountValue: number,
): number {
  let total = 0;

  if (selectedFrame && !customerOwnFrame) {
    total += selectedFrame.price || 0;
  }
  total += lensPrice;
  total += treatmentsPrice;
  total += laborCost;

  if (discountType === "percentage" && discountValue > 0) {
    total = total * (1 - discountValue / 100);
  } else if (discountType === "fixed" && discountValue > 0) {
    total = Math.max(0, total - discountValue);
  }

  return total;
}

/**
 * Calculate discount amount for display.
 */
export function computeDiscountAmount(
  selectedFrame: POSProduct | null,
  customerOwnFrame: boolean,
  lensPrice: number,
  treatmentsPrice: number,
  laborCost: number,
  discountType: "none" | "percentage" | "fixed",
  discountValue: number,
): number {
  let subtotal = 0;

  if (selectedFrame && !customerOwnFrame) {
    subtotal += selectedFrame.price || 0;
  }
  subtotal += lensPrice;
  subtotal += treatmentsPrice;
  subtotal += laborCost;

  if (discountType === "percentage" && discountValue > 0) {
    return subtotal * (discountValue / 100);
  } else if (discountType === "fixed" && discountValue > 0) {
    return discountValue;
  }
  return 0;
}

/**
 * Update a treatment's price in the treatments array.
 */
export function updateTreatmentPrice(
  treatments: Treatment[],
  treatmentId: string,
  newPrice: number,
): Treatment[] {
  return treatments.map((t) =>
    t.id === treatmentId ? { ...t, cost: newPrice } : t,
  );
}

/**
 * Filter treatments based on lens type.
 */
export function filterTreatmentsByLensType(
  treatments: Treatment[],
  lensType: "vision" | "contact",
): Treatment[] {
  if (lensType === "contact") {
    return treatments.filter(
      (t) =>
        t.category === "coating" &&
        !["photochromic", "polarized", "tint"].includes(t.value),
    );
  }
  return treatments;
}
