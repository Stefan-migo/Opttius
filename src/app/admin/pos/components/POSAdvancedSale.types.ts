/**
 * POSAdvancedSale — Shared types for the Optical Sale form.
 */

// Using Product from productService in the parent file
export interface POSProduct {
  id: string;
  name: string;
  price: number;
  price_includes_tax?: boolean;
  sku?: string;
  barcode?: string;
  brand?: string;
  inventory_quantity?: number;
  featured_image?: string;
  product_type?: string;
  category_id?: string;
}

export interface OrderFormData {
  lens_family_id: string | null;
  lens_family_name: string | null;
  near_lens_family_id: string | null;
  near_lens_family_name: string | null;
  lens_type: "vision" | "contact";
  lens_sourcing_type: "stock" | "surfaced";
  presbyopia_solution: "single" | "two_separate" | "progressive";
  treatment_ids: string[];
  labor_cost: number;
  frame_name: string;
  frame_sku: string;
  near_frame_name: string;
  near_frame_sku: string;
  customer_own_frame: boolean;
  notes: string;
}

export interface ExternalPrescriptionData {
  prescription_date: string;
  expiration_date: string;
  prescription_number: string;
  issued_by: string;
  issued_by_license: string;
  od_sphere: string;
  od_cylinder: string;
  od_axis: string;
  od_add: string;
  os_sphere: string;
  os_cylinder: string;
  os_axis: string;
  os_add: string;
  pd: string;
  near_pd: string;
  frame_pd: string;
  height_segmentation: string;
}

export interface Treatment {
  id: string;
  label: string;
  value: string;
  cost: number;
  category: string;
  editable?: boolean; // Allow price editing for extra services
}

export interface POSAdvancedSaleProps {
  // Customer
  customer: {
    id: string;
    name?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    email?: string | null;
    rut?: string | null;
    business_name?: string | null;
  } | null;
  onCustomerChange: (customer: POSAdvancedSaleProps["customer"]) => void;

  // Quick customer (non-registered customer data)
  quickCustomerName?: string | null;
  quickCustomerRUT?: string | null;
  quickCustomerEmail?: string | null;
  quickCustomerPhone?: string | null;

  // Quote (loaded from customer search)
  selectedQuote?: {
    id: string;
    quote_number: string;
    total_amount: number;
    frame_name?: string;
    frame_product_id?: string;
    frame_price?: number;
    lens_type?: string;
    lens_material?: string;
    lens_cost?: number;
    labor_cost?: number;
    treatments_cost?: number;
  } | null;

  // Cart actions
  onAddToCart: (
    items: Array<{
      product: POSProduct;
      quantity: number;
      unitPrice: number;
      metadata?: Record<string, unknown>;
    }>,
  ) => void;

  // Branch
  branchId: string | null;
}
