/**
 * Helper functions for handling presbyopia (addition) in prescriptions
 */

export type PresbyopiaSolution =
  | "none"
  | "two_separate"
  | "bifocal"
  | "trifocal"
  | "progressive";

export interface Prescription {
  od_sphere?: number | null;
  os_sphere?: number | null;
  od_cylinder?: number | null;
  os_cylinder?: number | null;
  od_add?: number | null;
  os_add?: number | null;
  prescription_type?: string | null;
}

/**
 * Check if a prescription has addition (presbyopia)
 */
export function hasAddition(
  prescription: Prescription | null | undefined,
): boolean {
  if (!prescription) return false;
  const odAdd = prescription.od_add ?? 0;
  const osAdd = prescription.os_add ?? 0;
  return odAdd > 0 || osAdd > 0;
}

/**
 * Get the maximum addition value from a prescription
 */
export function getMaxAddition(
  prescription: Prescription | null | undefined,
): number {
  if (!prescription) return 0;
  const odAdd = prescription.od_add ?? 0;
  const osAdd = prescription.os_add ?? 0;
  return Math.max(odAdd, osAdd);
}

/**
 * Get the average addition value from a prescription
 */
export function getAverageAddition(
  prescription: Prescription | null | undefined,
): number {
  if (!prescription) return 0;
  const odAdd = prescription.od_add ?? 0;
  const osAdd = prescription.os_add ?? 0;
  if (odAdd === 0 && osAdd === 0) return 0;
  if (odAdd === 0) return osAdd;
  if (osAdd === 0) return odAdd;
  return (odAdd + osAdd) / 2;
}

/**
 * Get sphere values for far vision (highest absolute value)
 */
export function getFarSphere(
  prescription: Prescription | null | undefined,
): number {
  if (!prescription) return 0;
  const odSphere = prescription.od_sphere ?? 0;
  const osSphere = prescription.os_sphere ?? 0;
  return Math.abs(odSphere) >= Math.abs(osSphere) ? odSphere : osSphere;
}

/**
 * Get cylinder value (highest absolute value)
 */
export function getCylinder(
  prescription: Prescription | null | undefined,
): number {
  if (!prescription) return 0;
  const odCylinder = prescription.od_cylinder ?? 0;
  const osCylinder = prescription.os_cylinder ?? 0;
  return Math.abs(odCylinder) >= Math.abs(osCylinder) ? odCylinder : osCylinder;
}

/**
 * Calculate near sphere (far sphere + addition)
 */
export function getNearSphere(
  prescription: Prescription | null | undefined,
): number {
  const farSphere = getFarSphere(prescription);
  const addition = getMaxAddition(prescription);
  return farSphere + addition;
}

/**
 * Get default presbyopia solution based on prescription type
 */
export function getDefaultPresbyopiaSolution(
  prescription: Prescription | null | undefined,
): PresbyopiaSolution {
  if (!prescription || !hasAddition(prescription)) {
    return "none";
  }

  // If prescription_type is set, use it
  if (prescription.prescription_type) {
    const type = prescription.prescription_type.toLowerCase();
    if (type === "progressive") return "progressive";
    if (type === "bifocal") return "bifocal";
    if (type === "trifocal") return "trifocal";
  }

  // Default to progressive for presbyopia
  return "progressive";
}

/**
 * Check if a lens family type matches the presbyopia solution
 */
export function isLensFamilyCompatible(
  lensFamilyType: string | null | undefined,
  solution: PresbyopiaSolution,
): boolean {
  if (!lensFamilyType) return false;

  switch (solution) {
    case "none":
      return (
        lensFamilyType === "single_vision" ||
        lensFamilyType === "reading" ||
        lensFamilyType === "computer"
      );
    case "progressive":
      return lensFamilyType === "progressive";
    case "bifocal":
      return lensFamilyType === "bifocal";
    case "trifocal":
      return lensFamilyType === "trifocal";
    case "two_separate":
      // For two separate lenses, we need one for far and one for near
      return lensFamilyType === "single_vision" || lensFamilyType === "reading";
    default:
      return false;
  }
}

/**
 * Get recommended lens family types for a presbyopia solution
 */
export function getRecommendedLensTypes(
  solution: PresbyopiaSolution,
): string[] {
  switch (solution) {
    case "none":
      return ["single_vision", "reading", "computer", "sports"];
    case "progressive":
      return ["progressive"];
    case "bifocal":
      return ["bifocal"];
    case "trifocal":
      return ["trifocal"];
    case "two_separate":
      return ["single_vision", "reading"];
    default:
      return [];
  }
}

/**
 * Mapping from presbyopia solution to category slugs for filtering lens families.
 * Used by LensFamilyCombobox to show only relevant families.
 * Trifocals deprecated - no category.
 */
export const PRESBYOPIA_TO_CATEGORY_SLUGS: Record<
  PresbyopiaSolution,
  string[]
> = {
  none: ["lectura", "ocupacional", "deportivo"],
  progressive: [], // lens_type is source of truth; category eliminated
  bifocal: [], // lens_type is source of truth; category eliminated
  trifocal: [], // Deprecated - no category
  two_separate: ["lectura"],
};

/**
 * Mapping from presbyopia solution to lens_type values for filtering lens families.
 * Preferred over category_slug for API filtering.
 */
export const PRESBYOPIA_TO_LENS_TYPES: Record<PresbyopiaSolution, string[]> = {
  none: ["single_vision", "reading", "computer", "sports"],
  progressive: ["progressive"],
  bifocal: ["bifocal"],
  trifocal: ["trifocal"],
  two_separate: ["single_vision", "reading"],
};

/**
 * Get lens_type values for filtering lens families by presbyopia solution.
 * Returns empty array for null/undefined.
 */
export function getLensTypesForPresbyopia(
  solution: PresbyopiaSolution | null | undefined,
): string[] {
  if (solution == null) return [];
  return PRESBYOPIA_TO_LENS_TYPES[solution] ?? [];
}

/**
 * Get category slugs for filtering lens families by presbyopia solution.
 * Returns empty array for null/undefined or when no mapping exists (e.g. trifocal).
 */
export function getCategorySlugsForPresbyopia(
  solution: PresbyopiaSolution | null | undefined,
): string[] {
  if (solution == null) return [];
  return PRESBYOPIA_TO_CATEGORY_SLUGS[solution] ?? [];
}
