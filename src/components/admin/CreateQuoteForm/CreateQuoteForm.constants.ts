/**
 * Constants extracted from CreateQuoteForm.tsx
 */

// Mapa de materiales a índices de refracción
export const MATERIAL_INDICES: Record<string, number> = {
  cr39: 1.49,
  mid_index: 1.56,
  polycarbonate: 1.59,
  high_index_1_60: 1.6,
  high_index_1_67: 1.67,
  high_index_1_74: 1.74,
  trivex: 1.53,
  glass: 1.52,
};

export const DEFAULT_TREATMENT_PRICES = {
  anti_reflective: { price: 15000, enabled: true },
  blue_light_filter: { price: 20000, enabled: true },
  uv_protection: { price: 10000, enabled: true },
  scratch_resistant: { price: 12000, enabled: true },
  anti_fog: { price: 8000, enabled: true },
  photochromic: { price: 35000, enabled: true },
  polarized: { price: 25000, enabled: true },
  tint: { price: 15000, enabled: true },
};

export const DEFAULT_QUOTE_SETTINGS = {
  treatment_prices: DEFAULT_TREATMENT_PRICES,
  default_labor_cost: 15000,
  default_tax_percentage: 19.0,
  default_expiration_days: 30,
  labor_cost_includes_tax: true,
  lens_cost_includes_tax: true,
  treatments_cost_includes_tax: true,
  volume_discounts: [],
  currency: "CLP",
};

export const DEFAULT_EXPIRATION_DAYS = 30;
export const DEFAULT_LABOR_COST = 15000;
export const DEFAULT_TAX_PERCENTAGE = 19.0;

export const DEFAULT_TREATMENTS = [
  {
    value: "anti_reflective",
    label: "Anti-reflejante",
    cost: 15000,
    enabled: true,
  },
  {
    value: "scratch_resistant",
    label: "Anti-rayas",
    cost: 12000,
    enabled: true,
  },
  { value: "tint", label: "Tinte", cost: 15000, enabled: true },
  { value: "prism_extra", label: "Prisma (extra)", cost: 0, enabled: true },
];

export const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Formatea un monto como moneda CLP */
export function formatPrice(amount: number): string {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    minimumFractionDigits: 0,
  }).format(amount);
}

/** Redondea a 2 decimales (precisión monetaria) */
export function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}
