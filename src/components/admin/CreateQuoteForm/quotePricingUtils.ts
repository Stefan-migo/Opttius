/**
 * Lens matrix calculations, pricing formulas, treatment pricing utilities.
 * Extracted from CreateQuoteForm.tsx — pure-ish functions for quote pricing.
 */
import type {
  QuoteFormData,
  QuoteSettings,
  TreatmentOption,
} from "./CreateQuoteForm.types";
import { MATERIAL_INDICES, UUID_REGEX } from "./CreateQuoteForm.constants";
import { calculatePriceWithTax } from "@/lib/utils/tax";

// ─── Treatment helpers ───────────────────────────────────────────────────────

export function getTreatmentPrice(value: unknown): number {
  if (typeof value === "number") return value;
  if (
    value &&
    typeof value === "object" &&
    "price" in (value as Record<string, unknown>)
  )
    return (value as Record<string, unknown>).price as number;
  return 0;
}

export function isTreatmentEnabled(value: unknown): boolean {
  if (typeof value === "number") return true;
  if (
    value &&
    typeof value === "object" &&
    "enabled" in (value as Record<string, unknown>)
  )
    return !!(value as Record<string, unknown>).enabled;
  return true;
}

export function buildAvailableTreatments(
  quoteSettings: QuoteSettings | null,
): TreatmentOption[] {
  if (!quoteSettings) {
    return [
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
  }

  const treatmentPrices = quoteSettings.treatment_prices ?? {};
  const treatments: TreatmentOption[] = [
    {
      value: "anti_reflective",
      label: "Anti-reflejante",
      cost: getTreatmentPrice(treatmentPrices.anti_reflective) || 15000,
      enabled: isTreatmentEnabled(treatmentPrices.anti_reflective),
    },
    {
      value: "scratch_resistant",
      label: "Anti-rayas",
      cost: getTreatmentPrice(treatmentPrices.scratch_resistant) || 12000,
      enabled: isTreatmentEnabled(treatmentPrices.scratch_resistant),
    },
    {
      value: "tint",
      label: "Tinte",
      cost: getTreatmentPrice(treatmentPrices.tint) || 15000,
      enabled: isTreatmentEnabled(treatmentPrices.tint),
    },
    // Servicio personalizado
    ...(treatmentPrices.custom_service?.enabled
      ? [
          {
            value: "custom_service" as const,
            label: treatmentPrices.custom_service.name || "Servicio Extra",
            cost: treatmentPrices.custom_service.price || 0,
            enabled: true,
          },
        ]
      : []),
    // Prisma siempre disponible
    {
      value: "prism_extra" as const,
      label: "Prisma (extra)",
      cost: 0,
      enabled: true,
    },
  ];

  return treatments.filter((t) => t.enabled);
}

// ─── Lens family helpers ─────────────────────────────────────────────────────

export function inheritFamilyProperties(
  family: { lens_type?: string; lens_material?: string } | undefined,
): Partial<QuoteFormData> {
  if (!family) return {};
  const materialIndex = family.lens_material
    ? MATERIAL_INDICES[family.lens_material] || null
    : null;
  return {
    lens_type: family.lens_type || "",
    lens_material: family.lens_material || "",
    lens_index: materialIndex,
    lens_treatments: [],
    treatments_cost: 0,
  };
}

// ─── Total calculation ───────────────────────────────────────────────────────

export interface CalculateTotalInput {
  formData: QuoteFormData;
  quoteSettings: QuoteSettings | null;
  taxPercentage: number;
  discountType: "percentage" | "amount";
  lensType: string;
  presbyopiaSolution: string;
  customerOwnFrame: boolean;
  customerOwnNearFrame: boolean;
}

export function calculateTotal(input: CalculateTotalInput): {
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  discount_percentage: number;
  total_amount: number;
} {
  const {
    formData,
    quoteSettings,
    taxPercentage,
    discountType,
    lensType,
    presbyopiaSolution,
    customerOwnFrame,
    customerOwnNearFrame,
  } = input;

  const effectiveTaxRate =
    quoteSettings?.default_tax_percentage || taxPercentage;

  const lensIncludesTax =
    lensType === "contact"
      ? true
      : (quoteSettings?.lens_cost_includes_tax ?? true);
  const treatmentsIncludeTax =
    quoteSettings?.treatments_cost_includes_tax ?? true;
  const laborIncludesTax = quoteSettings?.labor_cost_includes_tax ?? true;

  // Use frame_price (precio de venta) for calculation, but if customer brings frame, use 0
  const framePriceForCalculation = customerOwnFrame
    ? 0
    : formData.frame_price || 0;

  // Calculate frame price with tax consideration
  const framePriceBreakdown = calculatePriceWithTax(
    framePriceForCalculation,
    formData.frame_price_includes_tax || false,
    effectiveTaxRate,
  );

  // Calculate second frame price (for two separate lenses - near vision)
  const nearFramePriceForCalculation =
    presbyopiaSolution === "two_separate" && !customerOwnNearFrame
      ? formData.near_frame_price || 0
      : 0;
  const nearFramePriceBreakdown = calculatePriceWithTax(
    nearFramePriceForCalculation,
    formData.near_frame_price_includes_tax || false,
    effectiveTaxRate,
  );

  // Calculate lens, treatments, and labor with tax consideration
  const effectiveLensCost =
    lensType === "contact"
      ? formData.contact_lens_price || formData.contact_lens_cost || 0
      : presbyopiaSolution === "two_separate"
        ? (formData.far_lens_cost || 0) + (formData.near_lens_cost || 0)
        : formData.lens_cost || 0;

  const lensBreakdown = calculatePriceWithTax(
    effectiveLensCost,
    lensIncludesTax,
    effectiveTaxRate,
  );

  const treatmentsBreakdown = calculatePriceWithTax(
    formData.treatments_cost || 0,
    treatmentsIncludeTax,
    effectiveTaxRate,
  );

  const laborBreakdown = calculatePriceWithTax(
    formData.labor_cost || 0,
    laborIncludesTax,
    effectiveTaxRate,
  );

  // Subtotal is the sum of all base prices (without tax)
  const subtotal =
    framePriceBreakdown.subtotal +
    nearFramePriceBreakdown.subtotal +
    lensBreakdown.subtotal +
    treatmentsBreakdown.subtotal +
    laborBreakdown.subtotal;

  // Calculate total tax from all items
  const taxFromItemsWithTax =
    framePriceBreakdown.tax +
    nearFramePriceBreakdown.tax +
    (lensIncludesTax ? lensBreakdown.tax : 0) +
    (treatmentsIncludeTax ? treatmentsBreakdown.tax : 0) +
    (laborIncludesTax ? laborBreakdown.tax : 0);

  // Calculate tax for items without tax
  const itemsWithoutTax =
    (lensIncludesTax ? 0 : lensBreakdown.subtotal) +
    (treatmentsIncludeTax ? 0 : treatmentsBreakdown.subtotal) +
    (laborIncludesTax ? 0 : laborBreakdown.subtotal) +
    (formData.frame_price_includes_tax ? 0 : framePriceBreakdown.subtotal) +
    (formData.near_frame_price_includes_tax
      ? 0
      : nearFramePriceBreakdown.subtotal);

  const taxOnItemsWithoutTax = itemsWithoutTax * (effectiveTaxRate / 100);

  // Total tax is the sum of both
  const totalTax = taxFromItemsWithTax + taxOnItemsWithoutTax;

  // Total with tax (before discount)
  const totalWithTax = subtotal + totalTax;

  // Calculate discount based on type - apply to total with tax
  let discount = 0;
  let discountPercentage = 0;

  if (discountType === "percentage") {
    // Apply discount to total with tax
    discount = totalWithTax * (formData.discount_percentage / 100);
    discountPercentage = formData.discount_percentage;
  } else {
    // Discount by amount
    discount = formData.discount_amount || 0;
    // Calculate percentage for display (based on total with tax)
    if (totalWithTax > 0) {
      discountPercentage = (discount / totalWithTax) * 100;
    }
  }

  // Ensure discount doesn't exceed total with tax
  if (discount > totalWithTax) {
    discount = totalWithTax;
    if (discountType === "amount") {
      discountPercentage = 100;
    }
  }

  // Total is: total with tax minus discount
  const total = totalWithTax - discount;

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    tax_amount: Math.round(totalTax * 100) / 100,
    discount_amount: Math.round(discount * 100) / 100,
    discount_percentage: Math.round(discountPercentage * 100) / 100,
    total_amount: Math.round(total * 100) / 100,
  };
}

// ─── Treatment toggle ────────────────────────────────────────────────────────

export function toggleTreatment(
  currentTreatments: string[],
  currentCost: number,
  treatment: TreatmentOption,
): { lens_treatments: string[]; treatments_cost: number } {
  const isSelected = currentTreatments.includes(treatment.value);
  if (isSelected) {
    return {
      lens_treatments: currentTreatments.filter((t) => t !== treatment.value),
      treatments_cost: currentCost - treatment.cost,
    };
  }
  return {
    lens_treatments: [...currentTreatments, treatment.value],
    treatments_cost: currentCost + treatment.cost,
  };
}

// ─── Frame selection ─────────────────────────────────────────────────────────

export interface FrameData {
  id: string;
  name: string;
  frame_brand?: string;
  frame_model?: string;
  frame_color?: string;
  frame_size?: string;
  sku?: string;
  price?: number;
  price_includes_tax?: boolean;
}

export function mapFrameToFormData(frame: FrameData) {
  return {
    frame_product_id: frame.id,
    frame_name: frame.name,
    frame_brand: frame.frame_brand || "",
    frame_model: frame.frame_model || "",
    frame_color: frame.frame_color || "",
    frame_size: frame.frame_size || "",
    frame_sku: frame.sku || "",
    frame_price: frame.price || 0,
    frame_price_includes_tax: frame.price_includes_tax || false,
    frame_cost: frame.price || 0,
  };
}

export function mapNearFrameToFormData(frame: FrameData) {
  const nearFrameCost = frame.price || 0;
  return {
    near_frame_product_id: frame.id,
    near_frame_name: frame.name,
    near_frame_brand: frame.frame_brand || "",
    near_frame_model: frame.frame_model || "",
    near_frame_color: frame.frame_color || "",
    near_frame_size: frame.frame_size || "",
    near_frame_sku: frame.sku || "",
    near_frame_price: frame.price || 0,
    near_frame_price_includes_tax: frame.price_includes_tax || false,
    near_frame_cost: nearFrameCost,
  };
}

// ─── Lens price calculation helpers ──────────────────────────────────────────

export interface LensPriceCalcParams {
  lens_family_id: string;
  sphere: number;
  cylinder: number;
  addition?: number;
}

export async function calculateLensPriceFromApi(
  calculateLensPrice: (
    params: LensPriceCalcParams,
  ) => Promise<{ price?: number } | null>,
  params: LensPriceCalcParams,
): Promise<number | null> {
  try {
    const result = await calculateLensPrice(params);
    if (result && result.price) {
      return result.price;
    }
  } catch {
    console.warn("Could not calculate lens price from matrix");
  }
  return null;
}

export function shouldCalculateLensPrice(
  lensFamilyId: string,
  presbyopiaSolution: string,
): boolean {
  if (!lensFamilyId) return false;
  if (presbyopiaSolution === "two_separate") return false;
  if (!UUID_REGEX.test(lensFamilyId)) return false;
  return true;
}

export const LENS_FAMILY_TREATMENTS_BLOCKED = [
  "anti_reflective",
  "blue_light_filter",
  "uv_protection",
  "scratch_resistant",
  "anti_fog",
  "photochromic",
  "polarized",
];

export function isTreatmentDisabled(
  treatmentValue: string,
  hasLensFamily: boolean,
): boolean {
  if (!hasLensFamily) return false;
  return LENS_FAMILY_TREATMENTS_BLOCKED.includes(treatmentValue);
}
