export interface Product {
  id: string; name: string; slug: string; short_description?: string; description?: string;
  price: number; cost_price?: number; compare_at_price?: number; price_includes_tax?: boolean;
  category_id?: string; category?: { id: string; name: string; slug: string };
  categories?: { id: string; name: string; slug: string };
  featured_image?: string; gallery?: string[]; tags?: string[]; inventory_quantity?: number;
  stock_quantity?: number; is_featured?: boolean; status?: string;
  product_type?: "frame" | "lens" | "accessory" | "other"; sku?: string; barcode?: string;
  brand?: string; manufacturer?: string; model_number?: string;
  frame_type?: string; frame_material?: string; frame_shape?: string; frame_color?: string;
  frame_colors?: string[]; frame_brand?: string; frame_model?: string; frame_sku?: string;
  frame_gender?: string; frame_age_group?: string; frame_size?: string; frame_features?: string[];
  frame_measurements?: { lens_width?: string; bridge_width?: string; temple_length?: string; lens_height?: string; total_width?: string };
  lens_type?: string; lens_material?: string; lens_index?: string; lens_coatings?: string[];
  lens_tint_options?: string[]; uv_protection?: boolean; blue_light_filter?: boolean;
  blue_light_filter_percentage?: number; photochromic?: boolean; prescription_available?: boolean;
  requires_prescription?: boolean;
  contact_lens_family_id?: string; contact_lens_rx_sphere_od?: string; contact_lens_rx_cylinder_od?: string;
  contact_lens_rx_axis_od?: string; contact_lens_rx_sphere_os?: string; contact_lens_rx_cylinder_os?: string;
  contact_lens_rx_axis_os?: string; contact_lens_rx_add?: string; contact_lens_diameter?: string;
  contact_lens_curvature?: string; contact_lens_axis?: string; contact_lens_color?: string;
  contact_lens_replacement_schedule?: string; contact_lens_water_content?: string;
  prescription_range?: { sphere_min?: number; sphere_max?: number; cylinder_min?: number; cylinder_max?: number; sph_min?: string; sph_max?: string; cyl_min?: string; cyl_max?: string; add_min?: string; add_max?: string };
  is_customizable?: boolean;
  product_branch_stock?: { branch_id: string; branch_name?: string; quantity: number; reserved_quantity: number; available_quantity?: number; low_stock_threshold?: number | null }[];
  warranty_months?: number; warranty_details?: string; created_at: string; updated_at: string;
}

export interface CreateProductData {
  name: string; slug?: string; short_description?: string; description?: string;
  price: number; cost_price?: number; price_includes_tax?: boolean; category_id?: string;
  featured_image?: string; tags?: string[]; stock_quantity?: number; is_featured?: boolean; status?: string;
  product_type?: "frame" | "lens" | "accessory" | "other"; sku?: string; barcode?: string;
  brand?: string; manufacturer?: string; model_number?: string;
  frame_type?: string; frame_material?: string; frame_shape?: string; frame_color?: string;
  frame_colors?: string[]; frame_brand?: string; frame_model?: string; frame_sku?: string;
  frame_gender?: string; frame_age_group?: string; frame_size?: string; frame_features?: string[];
  frame_measurements?: { lens_width?: string; bridge_width?: string; temple_length?: string; lens_height?: string; total_width?: string };
  lens_type?: string; lens_material?: string; lens_coatings?: string[];
  prescription_range?: { sphere_min?: number; sphere_max?: number; cylinder_min?: number; cylinder_max?: number };
  warranty_months?: number; warranty_details?: string;
}

export interface UpdateProductData extends Partial<CreateProductData> {}

export interface ProductSearchParams {
  page?: number; limit?: number; search?: string; category?: string; status?: string;
  product_type?: string; branch_id?: string;
}

export interface ProductListResponse {
  data: Product[]; pagination: { page: number; limit: number; total: number; totalPages: number };
}

export interface BulkProductData { products: Partial<Product>[]; action: "create" | "update" | "delete"; }
export interface BulkProductOperationData { operation: string; product_ids: string[]; updates?: Record<string, unknown>; force_delete?: boolean; }
