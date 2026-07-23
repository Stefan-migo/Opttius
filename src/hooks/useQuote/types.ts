export interface Quote {
  id: string;
  quote_number: string;
  quote_date: string;
  expiration_date?: string;
  customer: {
    id: string;
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
  };
  prescription?: unknown;
  frame_product?: unknown;
  frame_name?: string;
  frame_brand?: string;
  frame_model?: string;
  frame_color?: string;
  frame_size?: string;
  frame_sku?: string;
  frame_price: number;
  lens_type?: string;
  lens_material?: string;
  lens_index?: number;
  lens_treatments?: string[];
  lens_tint_color?: string;
  lens_tint_percentage?: number;
  presbyopia_solution?:
    | "none"
    | "progressive"
    | "bifocal"
    | "trifocal"
    | "two_separate";
  far_lens_family_id?: string;
  near_lens_family_id?: string;
  far_lens_cost?: number;
  near_lens_cost?: number;
  lens_family?: { id: string; name: string } | null;
  far_lens_family?: { id: string; name: string } | null;
  near_lens_family?: { id: string; name: string } | null;
  near_frame_product_id?: string;
  near_frame_name?: string;
  near_frame_brand?: string;
  near_frame_model?: string;
  near_frame_color?: string;
  near_frame_size?: string;
  near_frame_sku?: string;
  near_frame_price?: number;
  near_frame_price_includes_tax?: boolean;
  near_frame_cost?: number;
  customer_own_near_frame?: boolean;
  frame_cost: number;
  lens_cost: number;
  treatments_cost: number;
  labor_cost: number;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  discount_percentage: number;
  total_amount: number;
  currency: string;
  status: string;
  notes?: string;
  customer_notes?: string;
  terms_and_conditions?: string;
  created_at: string;
  converted_to_work_order_id?: string;
}
