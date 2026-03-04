/**
 * Lens matrix templates and default configurations.
 * Ranges use 0.25 diopter increments; extreme values are included in each range.
 * E.g.: Rango base includes +6; Alta hipermetropía includes +6.25.
 */

export interface OpticalMatrixTemplateRow {
  name: string;
  sphere_min: number;
  sphere_max: number;
  cylinder_min: number;
  cylinder_max: number;
  addition_min: number;
  addition_max: number;
  base_price: number;
  cost: number;
  sourcing_type: "stock" | "surfaced";
}

/** Full template for monofocal (7 matrices, prices at 0 for user to fill) */
export const OPTICAL_MATRIX_TEMPLATE: OpticalMatrixTemplateRow[] = [
  {
    name: "Rango base",
    sphere_min: -6,
    sphere_max: 6,
    cylinder_min: -4,
    cylinder_max: 0,
    addition_min: 0,
    addition_max: 0,
    base_price: 0,
    cost: 0,
    sourcing_type: "surfaced",
  },
  {
    name: "Alta miopía",
    sphere_min: -20,
    sphere_max: -6.25,
    cylinder_min: -4,
    cylinder_max: 0,
    addition_min: 0,
    addition_max: 0,
    base_price: 0,
    cost: 0,
    sourcing_type: "surfaced",
  },
  {
    name: "Alta hipermetropía",
    sphere_min: 6.25,
    sphere_max: 20,
    cylinder_min: -4,
    cylinder_max: 0,
    addition_min: 0,
    addition_max: 0,
    base_price: 0,
    cost: 0,
    sourcing_type: "surfaced",
  },
  {
    name: "Astigmatismo alto",
    sphere_min: -6,
    sphere_max: 6,
    cylinder_min: -8,
    cylinder_max: -4.25,
    addition_min: 0,
    addition_max: 0,
    base_price: 0,
    cost: 0,
    sourcing_type: "surfaced",
  },
  {
    name: "Alta miopía + astigmatismo",
    sphere_min: -20,
    sphere_max: -6.25,
    cylinder_min: -8,
    cylinder_max: -4.25,
    addition_min: 0,
    addition_max: 0,
    base_price: 0,
    cost: 0,
    sourcing_type: "surfaced",
  },
  {
    name: "Alta hipermetropía + astigmatismo",
    sphere_min: 6.25,
    sphere_max: 20,
    cylinder_min: -8,
    cylinder_max: -4.25,
    addition_min: 0,
    addition_max: 0,
    base_price: 0,
    cost: 0,
    sourcing_type: "surfaced",
  },
  {
    name: "Fallback",
    sphere_min: -20,
    sphere_max: 20,
    cylinder_min: -8,
    cylinder_max: 0,
    addition_min: 0,
    addition_max: 4,
    base_price: 0,
    cost: 0,
    sourcing_type: "surfaced",
  },
];

/** Default matrices when creating a new optical lens family (Rango base + Fallback) */
export function getOpticalDefaultMatrices(
  lensType: string,
): OpticalMatrixTemplateRow[] {
  const isMonofocal = lensType === "single_vision";
  const additionMin = isMonofocal ? 0 : 0;
  const additionMax = isMonofocal ? 0 : 4;

  return [
    {
      name: "Rango base",
      sphere_min: -6,
      sphere_max: 6,
      cylinder_min: -4,
      cylinder_max: 0,
      addition_min: additionMin,
      addition_max: additionMax,
      base_price: 0,
      cost: 0,
      sourcing_type: "surfaced",
    },
    {
      name: "Fallback",
      sphere_min: -20,
      sphere_max: 20,
      cylinder_min: -8,
      cylinder_max: 0,
      addition_min: 0,
      addition_max: 4,
      base_price: 999999,
      cost: 999999,
      sourcing_type: "surfaced",
    },
  ];
}

export interface ContactLensMatrixTemplateRow {
  name: string;
  sphere_min: number;
  sphere_max: number;
  cylinder_min: number;
  cylinder_max: number;
  axis_min: number;
  axis_max: number;
  addition_min: number;
  addition_max: number;
  base_price: number;
  cost: number;
}

/** Default matrices when creating a new contact lens family */
export const CONTACT_LENS_DEFAULT_MATRICES: ContactLensMatrixTemplateRow[] = [
  {
    name: "Rango base",
    sphere_min: -20,
    sphere_max: 20,
    cylinder_min: -6,
    cylinder_max: 0,
    axis_min: 0,
    axis_max: 180,
    addition_min: 0,
    addition_max: 4,
    base_price: 0,
    cost: 0,
  },
  {
    name: "Fallback",
    sphere_min: -20,
    sphere_max: 20,
    cylinder_min: -6,
    cylinder_max: 0,
    axis_min: 0,
    axis_max: 180,
    addition_min: 0,
    addition_max: 4,
    base_price: 999999,
    cost: 999999,
  },
];

/** Check if a contact lens matrix has fallback ranges */
export function isContactLensFallbackMatrix(
  sphere_min: number,
  sphere_max: number,
  cylinder_min: number,
  cylinder_max: number,
): boolean {
  return (
    sphere_min <= -20 &&
    sphere_max >= 20 &&
    cylinder_min <= -6 &&
    cylinder_max >= 0
  );
}

/** Check if a matrix has fallback ranges (optical) */
export function isOpticalFallbackMatrix(
  sphere_min: number,
  sphere_max: number,
  cylinder_min: number,
  cylinder_max: number,
): boolean {
  return (
    sphere_min <= -20 &&
    sphere_max >= 20 &&
    cylinder_min <= -8 &&
    cylinder_max >= 0
  );
}
