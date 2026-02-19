/**
 * Shared types for POS components and hooks
 */

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
  product_type?: string;
  category?: { id: string; name: string };
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
  rut?: string | null;
  business_name?: string;
  address?: string;
  phone?: string | null;
}

export type PaymentMethod = "cash" | "debit_card" | "credit_card" | "transfer";
