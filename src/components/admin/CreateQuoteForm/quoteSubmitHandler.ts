/**
 * Quote submission logic and form validation.
 * Extracted from CreateQuoteForm.tsx.
 */
import type { QuoteFormData, QuoteSettings } from "./CreateQuoteForm.types";
import { getBranchAndOperativoHeaders } from "@/lib/utils/branch";

// ─── Payload preparation ─────────────────────────────────────────────────────

export interface NearFramePayload {
  near_frame_product_id: string | null;
  near_frame_name: string | null;
  near_frame_brand: string | null;
  near_frame_model: string | null;
  near_frame_color: string | null;
  near_frame_size: string | null;
  near_frame_sku: string | null;
  near_frame_price: number;
  near_frame_price_includes_tax: boolean;
  near_frame_cost: number;
  customer_own_near_frame: boolean;
}

export function buildNearFramePayload(
  presbyopiaSolution: string,
  formData: QuoteFormData,
  selectedNearFrame: {
    id: string;
    name: string;
    price: number;
    frame_brand?: string;
    frame_model?: string;
    frame_color?: string;
    frame_size?: string;
    sku?: string;
    price_includes_tax?: boolean;
  } | null,
  customerOwnNearFrame: boolean,
): NearFramePayload {
  if (presbyopiaSolution !== "two_separate") {
    return {
      near_frame_product_id: null,
      near_frame_name: null,
      near_frame_brand: null,
      near_frame_model: null,
      near_frame_color: null,
      near_frame_size: null,
      near_frame_sku: null,
      near_frame_price: 0,
      near_frame_price_includes_tax: false,
      near_frame_cost: 0,
      customer_own_near_frame: false,
    };
  }

  return {
    near_frame_product_id: selectedNearFrame?.id || null,
    near_frame_name:
      formData.near_frame_name || selectedNearFrame?.name || null,
    near_frame_brand:
      formData.near_frame_brand || selectedNearFrame?.frame_brand || null,
    near_frame_model:
      formData.near_frame_model || selectedNearFrame?.frame_model || null,
    near_frame_color:
      formData.near_frame_color || selectedNearFrame?.frame_color || null,
    near_frame_size:
      formData.near_frame_size || selectedNearFrame?.frame_size || null,
    near_frame_sku: formData.near_frame_sku || selectedNearFrame?.sku || null,
    near_frame_price:
      formData.near_frame_price || selectedNearFrame?.price || 0,
    near_frame_price_includes_tax:
      formData.near_frame_price_includes_tax ??
      selectedNearFrame?.price_includes_tax ??
      false,
    near_frame_cost: formData.near_frame_cost || selectedNearFrame?.price || 0,
    customer_own_near_frame: customerOwnNearFrame || false,
  };
}

export interface QuotePayload {
  customer_id: string;
  status: string;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  valid_until: string;
  notes: string;
  branch_id?: string;
  field_operation_id?: string;
  prescription_id: string;
  frame_product_id?: string;
  customer_own_frame: boolean;
  frame_name: string;
  frame_brand: string;
  frame_model: string;
  frame_color: string;
  frame_size: string;
  frame_sku: string;
  frame_price: number;
  [key: string]: unknown; // for near frame spread and other fields
}

export function buildQuotePayload(
  formData: QuoteFormData,
  selectedCustomer: { id: string },
  selectedPrescription: {
    id: string;
    od_sphere?: number | null;
    od_cylinder?: number | null;
    od_axis?: number | null;
    od_add?: number | null;
    os_sphere?: number | null;
    os_cylinder?: number | null;
    os_axis?: number | null;
    os_add?: number | null;
  },
  selectedFrame: { id: string } | null,
  nearFramePayload: NearFramePayload,
  lensType: string,
  presbyopiaSolution: string,
  farLensFamilyId: string,
  nearLensFamilyId: string,
  farLensCost: number,
  nearLensCost: number,
  customerOwnFrame: boolean,
  effectiveBranchId?: string,
  initialFieldOperationId?: string,
): QuotePayload {
  const expirationDate = new Date();
  expirationDate.setDate(expirationDate.getDate() + formData.expiration_days);

  return {
    customer_id: selectedCustomer.id,
    status: "draft",
    subtotal: formData.subtotal,
    tax_amount: formData.tax_amount,
    discount_amount: formData.discount_amount,
    total_amount: formData.total_amount,
    valid_until: expirationDate.toISOString().split("T")[0],
    notes: formData.notes,
    branch_id: effectiveBranchId || undefined,
    field_operation_id: initialFieldOperationId || undefined,
    prescription_id: selectedPrescription.id,
    frame_product_id: selectedFrame?.id,
    customer_own_frame: customerOwnFrame,
    frame_name: formData.frame_name,
    frame_brand: formData.frame_brand,
    frame_model: formData.frame_model,
    frame_color: formData.frame_color,
    frame_size: formData.frame_size,
    frame_sku: formData.frame_sku,
    frame_price: formData.frame_price,
    ...nearFramePayload,
    lens_family_id:
      presbyopiaSolution === "two_separate"
        ? null
        : formData.lens_family_id || null,
    lens_type:
      lensType === "contact"
        ? "Lentes de contacto"
        : formData.lens_type || null,
    lens_material: formData.lens_material || null,
    lens_index:
      formData.lens_index !== null && formData.lens_index !== undefined
        ? formData.lens_index
        : null,
    lens_treatments: lensType === "contact" ? [] : formData.lens_treatments,
    lens_tint_color: formData.lens_tint_color || null,
    lens_tint_percentage: formData.lens_tint_percentage || null,
    lens_sourcing_type: formData.lens_sourcing_type || "surfaced",
    presbyopia_solution: formData.presbyopia_solution || "none",
    far_lens_family_id:
      presbyopiaSolution === "two_separate" ? farLensFamilyId || null : null,
    near_lens_family_id:
      presbyopiaSolution === "two_separate" ? nearLensFamilyId || null : null,
    far_lens_cost:
      presbyopiaSolution === "two_separate" ? farLensCost || 0 : undefined,
    near_lens_cost:
      presbyopiaSolution === "two_separate" ? nearLensCost || 0 : undefined,
    contact_lens_family_id:
      lensType === "contact" ? formData.contact_lens_family_id || null : null,
    contact_lens_rx_sphere_od:
      lensType === "contact" && selectedPrescription
        ? (selectedPrescription.od_sphere ?? null)
        : null,
    contact_lens_rx_cylinder_od:
      lensType === "contact" && selectedPrescription
        ? (selectedPrescription.od_cylinder ?? null)
        : null,
    contact_lens_rx_axis_od:
      lensType === "contact" && selectedPrescription
        ? (selectedPrescription.od_axis ?? null)
        : null,
    contact_lens_rx_add_od:
      lensType === "contact" && selectedPrescription
        ? (selectedPrescription.od_add ?? null)
        : null,
    contact_lens_rx_base_curve_od:
      lensType === "contact" ? formData.contact_lens_rx_base_curve_od : null,
    contact_lens_rx_diameter_od:
      lensType === "contact" ? formData.contact_lens_rx_diameter_od : null,
    contact_lens_rx_sphere_os:
      lensType === "contact" && selectedPrescription
        ? (selectedPrescription.os_sphere ?? null)
        : null,
    contact_lens_rx_cylinder_os:
      lensType === "contact" && selectedPrescription
        ? (selectedPrescription.os_cylinder ?? null)
        : null,
    contact_lens_rx_axis_os:
      lensType === "contact" && selectedPrescription
        ? (selectedPrescription.os_axis ?? null)
        : null,
    contact_lens_rx_add_os:
      lensType === "contact" && selectedPrescription
        ? (selectedPrescription.os_add ?? null)
        : null,
    contact_lens_rx_base_curve_os:
      lensType === "contact" ? formData.contact_lens_rx_base_curve_os : null,
    contact_lens_rx_diameter_os:
      lensType === "contact" ? formData.contact_lens_rx_diameter_os : null,
    contact_lens_quantity:
      lensType === "contact" ? formData.contact_lens_quantity || 1 : 1,
    contact_lens_cost:
      lensType === "contact" ? formData.contact_lens_cost || 0 : 0,
    contact_lens_price:
      lensType === "contact" ? formData.contact_lens_price || 0 : 0,
    frame_cost: formData.frame_cost,
    lens_cost: lensType === "contact" ? 0 : formData.lens_cost,
    treatments_cost: lensType === "contact" ? 0 : formData.treatments_cost,
    labor_cost: formData.labor_cost,
  };
}

// ─── Validation ──────────────────────────────────────────────────────────────

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export function validateQuoteForm(
  selectedCustomer: unknown,
  selectedPrescription: unknown,
  formData: QuoteFormData,
  lensType: string,
  presbyopiaSolution: string,
  farLensFamilyId: string,
  nearLensFamilyId: string,
): ValidationResult {
  if (!selectedCustomer) {
    return { valid: false, error: "Selecciona un cliente" };
  }

  if (!selectedPrescription) {
    return { valid: false, error: "Selecciona una receta" };
  }

  if (lensType === "contact") {
    if (!formData.contact_lens_family_id && formData.contact_lens_cost === 0) {
      return {
        valid: false,
        error:
          "Selecciona una familia de lentes de contacto o ingresa el precio manualmente",
      };
    }
  } else {
    if (presbyopiaSolution === "two_separate") {
      if (!farLensFamilyId && !nearLensFamilyId && formData.lens_cost === 0) {
        return {
          valid: false,
          error:
            "Selecciona familias de lentes o ingresa el precio manualmente",
        };
      }
    } else {
      if (!formData.lens_family_id && formData.lens_cost === 0) {
        return {
          valid: false,
          error:
            "Selecciona una familia de lentes o ingresa el precio manualmente",
        };
      }
    }
  }

  return { valid: true };
}

// ─── API calls ───────────────────────────────────────────────────────────────

export async function submitQuote(
  payload: QuotePayload,
  effectiveBranchId: string | undefined,
  initialFieldOperationId: string | undefined,
): Promise<void> {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...getBranchAndOperativoHeaders(
      effectiveBranchId ?? null,
      initialFieldOperationId ?? undefined,
    ),
  };

  const response = await fetch("/api/admin/quotes", {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(
      errorData?.error || `Failed to create quote: ${response.status}`,
    );
  }
}
