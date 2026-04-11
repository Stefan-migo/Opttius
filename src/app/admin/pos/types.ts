/**
 * Shared types for POS components and hooks
 * Consolidated from page.tsx and component-specific types
 */

// ============================================
// Core POS Types
// ============================================

export interface POSProduct {
  id: string;
  name: string;
  price: number;
  price_includes_tax?: boolean;
  inventory_quantity: number;
  sku?: string;
  barcode?: string;
  featured_image?: string;
  brand?: string;
  product_type?: string; // frame, accessory, sunglasses, service, lens, etc.
  category?: {
    id: string;
    name: string;
  };
}

export interface POSCartItem {
  product: POSProduct;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  priceIncludesTax: boolean;
}

export interface POSCustomer {
  id: string;
  email?: string | null;
  first_name?: string;
  last_name?: string;
  name?: string;
  rut?: string | null | undefined;
  business_name?: string;
  address?: string;
  phone?: string | null;
  is_convenio_client?: boolean;
}

export interface POSQuote {
  id: string;
  quote_number: string;
  total_amount: number;
  status: string;
  created_at: string;
  frame_name?: string;
  frame_product_id?: string;
  frame_price?: number;
  frame_sku?: string;
  lens_type?: string;
  lens_material?: string;
  lens_cost?: number;
  lens_treatments?: string[];
  treatments_cost?: number;
  labor_cost?: number;
}

export type POSPaymentMethod =
  | "cash"
  | "debit_card"
  | "credit_card"
  | "transfer"
  | "agreement";

// ============================================
// Backward Compatibility Aliases (deprecated)
// Use POS* prefixed types above
// ============================================

/**
 * @deprecated Use POSProduct instead
 */
export type Product = POSProduct;

/**
 * @deprecated Use POSCartItem instead
 */
export type CartItem = POSCartItem;

/**
 * @deprecated Use POSCustomer instead
 */
export type Customer = POSCustomer;

/**
 * @deprecated Use POSQuote instead
 */
export type Quote = POSQuote;

/**
 * @deprecated Use POSPaymentMethod instead
 */
export type PaymentMethod = POSPaymentMethod;
