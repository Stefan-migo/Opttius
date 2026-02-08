export interface CreateQuoteFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  initialCustomerId?: string;
  initialPrescriptionId?: string;
}

export interface Customer {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
  rut?: string;
}

export interface Prescription {
  id: string;
  prescription_date: string;
  prescription_type: string;
  is_current?: boolean;
  od_sphere?: number;
  od_cylinder?: number;
  od_axis?: number;
  od_add?: number;
  os_sphere?: number;
  os_cylinder?: number;
  os_axis?: number;
  os_add?: number;
}

export interface Frame {
  id: string;
  name: string;
  brand?: string;
  model?: string;
  color?: string;
  size?: string;
  sku?: string;
  price: number;
  cost?: number;
  quantity?: number;
}

export interface LensFamily {
  id: string;
  name: string;
  lens_type?: string;
  lens_material?: string;
  description?: string;
}

export interface ContactLensFamily {
  id: string;
  name: string;
  brand?: string;
  material?: string;
  description?: string;
}

export interface QuoteFormData {
  // Frame fields
  frame_name: string;
  frame_brand: string;
  frame_model: string;
  frame_color: string;
  frame_size: string;
  frame_sku: string;
  frame_price: number;
  frame_price_includes_tax: boolean;
  customer_own_frame: boolean;

  // Lens fields
  lens_family_id: string;
  lens_type: string;
  lens_material: string;
  lens_index: number | null;
  lens_treatments: string[];
  lens_tint_color: string;
  lens_tint_percentage: number;

  // Cost fields
  frame_cost: number;
  lens_cost: number;
  treatments_cost: number;
  labor_cost: number;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  discount_percentage: number;
  total_amount: number;

  // Other fields
  notes: string;
  customer_notes: string;
  expiration_days: number;
  presbyopia_solution: PresbyopiaSolution;

  // Progressive/Bifocal fields
  far_lens_family_id: string;
  near_lens_family_id: string;
  far_lens_cost: number;
  near_lens_cost: number;

  // Contact lens fields
  contact_lens_family_id: string;
  contact_lens_rx_sphere_od: number | null;
  contact_lens_rx_cylinder_od: number | null;
  contact_lens_rx_axis_od: number | null;
  contact_lens_rx_add_od: number | null;
  contact_lens_rx_base_curve_od: number | null;
  contact_lens_rx_diameter_od: number | null;
  contact_lens_rx_sphere_os: number | null;
  contact_lens_rx_cylinder_os: number | null;
  contact_lens_rx_axis_os: number | null;
  contact_lens_rx_add_os: number | null;
  contact_lens_rx_base_curve_os: number | null;
  contact_lens_rx_diameter_os: number | null;
  contact_lens_quantity: number;
  contact_lens_cost: number;
  contact_lens_price: number;

  // Near frame fields (for two separate lenses)
  near_frame_product_id: string;
  near_frame_name: string;
  near_frame_brand: string;
  near_frame_model: string;
  near_frame_color: string;
  near_frame_size: string;
  near_frame_sku: string;
  near_frame_price: number;
  near_frame_price_includes_tax: boolean;
  near_frame_cost: number;
}

export type PresbyopiaSolution =
  | "none"
  | "progressive"
  | "bifocal"
  | "trifocal"
  | "two_separate";

export interface QuoteSettings {
  default_expiration_days?: number;
  default_tax_percentage?: number;
  default_labor_cost?: number;
  [key: string]: any;
}

export interface SearchState<T> {
  search: string;
  results: T[];
  selected: T | null;
  loading: boolean;
}
