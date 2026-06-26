/**
 * Process Sale Validation — pure functions for request validation and data extraction.
 *
 * Extracted from process-sale/route.ts T-121. All functions are pure
 * (no side effects, no DB calls) — just shape transformations and boolean logic.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface FrameInfo {
  frame_product_id: string | null;
  frame_name: string;
  frame_brand: string | null;
  frame_model: string | null;
  frame_color: string | null;
  frame_size: string | null;
  frame_sku: string | null;
  frame_cost: number;
  customer_own_frame: boolean;
}

export interface LensInfo {
  lens_family_id: string | null;
  lens_type: string;
  lens_material: string;
  lens_index: number | null;
  lens_treatments: string[];
  lens_tint_color: string | null;
  lens_tint_percentage: number | null;
  lens_cost: number;
  prescription_id: string | null;
}

export interface WorkOrderDecisionParams {
  hasTemporaryLensItems: boolean;
  hasFrameInItems: boolean;
  hasLensDataForMounting: boolean;
  customerId: string | null;
  hasOnlyNonWorkOrderProducts: boolean;
}

export interface Item {
  product_id?: string;
  product_name: string;
  unit_price: number;
  quantity: number;
  [key: string]: unknown;
}

export interface FrameData {
  frame_product_id?: string | null;
  frame_name?: string | null;
  frame_brand?: string | null;
  frame_model?: string | null;
  frame_color?: string | null;
  frame_size?: string | null;
  frame_sku?: string | null;
  customer_own_frame?: boolean | null;
  [key: string]: unknown;
}

export interface LensData {
  lens_family_id?: string | null;
  lens_type?: string | null;
  lens_material?: string | null;
  lens_index?: number | null;
  lens_treatments?: string[];
  lens_tint_color?: string | null;
  lens_tint_percentage?: number | null;
  prescription_id?: string | null;
  [key: string]: unknown;
}

// ─── Frame Info Extraction ───────────────────────────────────────────────────

export function extractFrameInfo(
  frameData: FrameData | null | undefined,
  items: Item[],
): FrameInfo {
  const result: FrameInfo = {
    frame_product_id: null,
    frame_name: "Marco",
    frame_brand: null,
    frame_model: null,
    frame_color: null,
    frame_size: null,
    frame_sku: null,
    frame_cost: 0,
    customer_own_frame: false,
  };

  // Use structured data if available (preferred method)
  if (frameData) {
    result.frame_product_id = frameData.frame_product_id || null;
    result.frame_name = frameData.frame_name || "Marco";
    result.frame_brand = frameData.frame_brand || null;
    result.frame_model = frameData.frame_model || null;
    result.frame_color = frameData.frame_color || null;
    result.frame_size = frameData.frame_size || null;
    result.frame_sku = frameData.frame_sku || null;
    result.frame_cost = 0; // Will be extracted from items
    result.customer_own_frame = frameData.customer_own_frame || false;
  }

  // Extract cost and fallback data from items
  for (const item of items) {
    const itemName = item.product_name.toLowerCase();
    const itemId = item.product_id || "";

    if (
      itemId.includes("frame") ||
      itemName.includes("marco") ||
      itemName.includes("frame")
    ) {
      if (!frameData) {
        result.frame_name = item.product_name;
        result.frame_cost = item.unit_price;
        if (
          item.product_id &&
          !item.product_id.includes("frame-manual") &&
          !item.product_id.includes("-")
        ) {
          result.frame_product_id = item.product_id;
        }
      } else {
        result.frame_cost = item.unit_price;
      }
    }
  }

  return result;
}

// ─── Lens Info Extraction ────────────────────────────────────────────────────

export function extractLensInfo(
  lensData: LensData | null | undefined,
  items: Item[],
): LensInfo {
  const result: LensInfo = {
    lens_family_id: null,
    lens_type: "single_vision",
    lens_material: "cr39",
    lens_index: null,
    lens_treatments: [],
    lens_tint_color: null,
    lens_tint_percentage: null,
    lens_cost: 0,
    prescription_id: null,
  };

  if (lensData) {
    result.lens_family_id = lensData.lens_family_id || null;
    result.lens_type = lensData.lens_type || "single_vision";
    result.lens_material = lensData.lens_material || "cr39";
    result.lens_index = lensData.lens_index || null;
    result.lens_treatments = lensData.lens_treatments || [];
    result.lens_tint_color = lensData.lens_tint_color || null;
    result.lens_tint_percentage = lensData.lens_tint_percentage || null;
    result.lens_cost = 0; // Will be extracted from items
    result.prescription_id = lensData.prescription_id || null;
  }

  for (const item of items) {
    const itemName = item.product_name.toLowerCase();
    const itemId = item.product_id || "";

    if (
      itemId.includes("lens") ||
      itemName.includes("lente") ||
      itemName.includes("lens")
    ) {
      if (!lensData) {
        result.lens_cost = item.unit_price;
        const lensMatch = item.product_name.match(/lente\s+(\w+)\s+(\w+)/i);
        if (lensMatch) {
          result.lens_type = lensMatch[1];
          result.lens_material = lensMatch[2];
        }
      } else {
        result.lens_cost = item.unit_price;
      }
    }
  }

  return result;
}

// ─── Cost Extractors ─────────────────────────────────────────────────────────

export function extractTreatmentsCost(items: Item[]): number {
  return items.reduce((sum, item) => {
    const itemId = item.product_id || "";
    const itemName = item.product_name.toLowerCase();
    if (
      itemId.includes("treatments") ||
      itemName.includes("tratamiento") ||
      itemName.includes("treatment")
    ) {
      return sum + item.unit_price;
    }
    return sum;
  }, 0);
}

export function extractLaborCost(items: Item[]): number {
  return items.reduce((sum, item) => {
    const itemId = item.product_id || "";
    const itemName = item.product_name.toLowerCase();
    if (
      itemId.includes("labor") ||
      itemName.includes("mano de obra") ||
      itemName.includes("montaje")
    ) {
      return sum + item.unit_price;
    }
    return sum;
  }, 0);
}

// ─── Order Number Generation ─────────────────────────────────────────────────

export function computeOrderNumber(
  lastOrderNumber: string | null,
  now: Date = new Date(),
): string {
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
  if (lastOrderNumber) {
    const match = lastOrderNumber.match(/-(\d+)$/);
    const lastNum = match ? parseInt(match[1], 10) : 0;
    return `ORD-${dateStr}-${String(lastNum + 1).padStart(4, "0")}`;
  }
  return `ORD-${dateStr}-0001`;
}

// ─── Work Order Decision ─────────────────────────────────────────────────────

export function computeWorkOrderDecision(
  params: WorkOrderDecisionParams,
): boolean {
  const {
    hasTemporaryLensItems,
    hasFrameInItems,
    hasLensDataForMounting,
    hasOnlyNonWorkOrderProducts,
  } = params;

  return (
    !hasOnlyNonWorkOrderProducts &&
    (hasTemporaryLensItems || (hasFrameInItems && hasLensDataForMounting))
  );
}

// ─── Min Deposit ─────────────────────────────────────────────────────────────

export function computeMinDepositFallback(totalAmount: number): number {
  return totalAmount * 0.5;
}

// ponytail: order_total based 50% fallback, per-branch config if custom thresholds needed

// ─── Non-Work-Order Product Types ────────────────────────────────────────────

const NON_WORK_ORDER_TYPES = ["accessory", "sunglasses", "service", "lens"];

export function isNonWorkOrderItem(
  productType: string | undefined | null,
): boolean {
  if (!productType) return false;
  return NON_WORK_ORDER_TYPES.includes(productType);
}

export function haveOnlyNonWorkOrderProducts(
  productTypesInItems: string[],
): boolean {
  return (
    productTypesInItems.length > 0 &&
    productTypesInItems.every((type) => !type || isNonWorkOrderItem(type))
  );
}

export function hasLensDataForMounting(
  lensData: LensData | null | undefined,
  contactLensFamilyId: string | null | undefined,
  contactLensCost: number | null | undefined,
  presbyopiaSolution: string | null | undefined,
): boolean {
  return !!(
    (lensData &&
      (lensData.lens_family_id ||
        lensData.lens_type ||
        lensData.lens_material ||
        lensData.prescription_id)) ||
    presbyopiaSolution !== "none" ||
    contactLensFamilyId ||
    contactLensCost
  );
}
