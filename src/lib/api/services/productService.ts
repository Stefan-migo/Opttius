/**
 * Product Service
 *
 * Service layer for product-related API operations.
 * Provides type-safe methods for CRUD operations on products.
 */

import { ApiClient, isSuccess, unwrapData } from "../client-helpers";
import { handleApiError } from "@/lib/services/errorService";
import { getBranchAndOperativoHeaders } from "@/lib/utils/branch";

// Types
export interface Product {
  id: string;
  name: string;
  slug: string;
  short_description?: string;
  description?: string;
  price: number;
  cost_price?: number;
  compare_at_price?: number;
  price_includes_tax?: boolean;
  category_id?: string;
  category?: { id: string; name: string; slug: string };
  categories?: { id: string; name: string; slug: string };
  featured_image?: string;
  gallery?: string[];
  tags?: string[];
  inventory_quantity?: number;
  stock_quantity?: number;
  is_featured?: boolean;
  status?: string;
  // Optical product fields
  product_type?: "frame" | "lens" | "accessory" | "other";
  sku?: string;
  barcode?: string;
  brand?: string;
  manufacturer?: string;
  model_number?: string;
  // Frame fields
  frame_type?: string;
  frame_material?: string;
  frame_shape?: string;
  frame_color?: string;
  frame_colors?: string[];
  frame_brand?: string;
  frame_model?: string;
  frame_sku?: string;
  frame_gender?: string;
  frame_age_group?: string;
  frame_size?: string;
  frame_features?: string[];
  frame_measurements?: {
    lens_width?: string;
    bridge_width?: string;
    temple_length?: string;
    lens_height?: string;
    total_width?: string;
  };
  // Lens fields
  lens_type?: string;
  lens_material?: string;
  lens_index?: string;
  lens_coatings?: string[];
  lens_tint_options?: string[];
  uv_protection?: boolean;
  blue_light_filter?: boolean;
  blue_light_filter_percentage?: number;
  photochromic?: boolean;
  prescription_available?: boolean;
  requires_prescription?: boolean;
  // Contact lens fields
  contact_lens_family_id?: string;
  contact_lens_rx_sphere_od?: string;
  contact_lens_rx_cylinder_od?: string;
  contact_lens_rx_axis_od?: string;
  contact_lens_rx_sphere_os?: string;
  contact_lens_rx_cylinder_os?: string;
  contact_lens_rx_axis_os?: string;
  contact_lens_rx_add?: string;
  contact_lens_diameter?: string;
  contact_lens_curvature?: string;
  contact_lens_axis?: string;
  contact_lens_color?: string;
  contact_lens_replacement_schedule?: string;
  contact_lens_water_content?: string;
  // Prescription range (for both lenses and contacts)
  prescription_range?: {
    sphere_min?: number;
    sphere_max?: number;
    cylinder_min?: number;
    cylinder_max?: number;
    sph_min?: string;
    sph_max?: string;
    cyl_min?: string;
    cyl_max?: string;
    add_min?: string;
    add_max?: string;
  };
  // Customization
  is_customizable?: boolean;
  // Branch stock
  product_branch_stock?: {
    branch_id: string;
    branch_name?: string;
    quantity: number;
    reserved_quantity: number;
    available_quantity?: number;
    low_stock_threshold?: number | null;
  }[];
  // Warranty
  warranty_months?: number;
  warranty_details?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateProductData {
  name: string;
  slug?: string;
  short_description?: string;
  description?: string;
  price: number;
  cost_price?: number;
  price_includes_tax?: boolean;
  category_id?: string;
  featured_image?: string;
  tags?: string[];
  stock_quantity?: number;
  is_featured?: boolean;
  status?: string;
  // Optical product fields
  product_type?: "frame" | "lens" | "accessory" | "other";
  sku?: string;
  barcode?: string;
  brand?: string;
  manufacturer?: string;
  model_number?: string;
  // Frame fields
  frame_type?: string;
  frame_material?: string;
  frame_shape?: string;
  frame_color?: string;
  frame_colors?: string[];
  frame_brand?: string;
  frame_model?: string;
  frame_sku?: string;
  frame_gender?: string;
  frame_age_group?: string;
  frame_size?: string;
  frame_features?: string[];
  frame_measurements?: {
    lens_width?: string;
    bridge_width?: string;
    temple_length?: string;
    lens_height?: string;
    total_width?: string;
  };
  // Lens fields
  lens_type?: string;
  lens_material?: string;
  lens_coatings?: string[];
  prescription_range?: {
    sphere_min?: number;
    sphere_max?: number;
    cylinder_min?: number;
    cylinder_max?: number;
  };
  // Warranty
  warranty_months?: number;
  warranty_details?: string;
}

export interface UpdateProductData extends Partial<CreateProductData> {}

export interface ProductSearchParams {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  status?: string;
  product_type?: string;
  branch_id?: string;
}

export interface ProductListResponse {
  data: Product[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// API Client instance
const client = new ApiClient();

/**
 * Get all products with optional filters
 */
export async function getProducts(
  params: ProductSearchParams = {},
): Promise<ProductListResponse> {
  try {
    const queryString = new URLSearchParams(
      Object.entries(params)
        .filter(([_, v]) => v !== undefined)
        .map(([k, v]) => [k, String(v)]) as [string, string][],
    ).toString();

    const response = await client.get<Product[]>(
      `/api/admin/products${queryString ? `?${queryString}` : ""}`,
    );

    if (isSuccess(response)) {
      return {
        data: response.data,
        pagination: response.meta?.pagination || {
          page: params.page || 1,
          limit: params.limit || 10,
          total: response.data.length,
          totalPages: 1,
        },
      };
    }

    const errorMessage =
      response.success === false && response.error?.message
        ? response.error.message
        : "An unknown error occurred";
    throw new Error(errorMessage);
  } catch (error) {
    handleApiError(error, "getProducts");
    throw error;
  }
}

/**
 * Get a single product by ID
 */
function extractProductFromResponse(response: unknown): Product {
  const r = response as Record<string, unknown>;
  if (r?.success === true && r?.data) return r.data as Product;
  if (r?.product) return r.product as Product;
  throw new Error("Invalid response format");
}

export async function getProduct(
  id: string,
  branchId?: string,
): Promise<Product> {
  try {
    const headers: HeadersInit = {};
    if (branchId) {
      headers["x-branch-id"] = branchId;
    }
    const response = await client.get(`/api/admin/products/${id}`, {
      headers,
    });
    return extractProductFromResponse(response);
  } catch (error) {
    handleApiError(error, "getProduct");
    throw error;
  }
}

/**
 * Create a new product
 */
export async function createProduct(data: CreateProductData): Promise<Product> {
  try {
    const response = await client.post("/api/admin/products", data);
    return extractProductFromResponse(response);
  } catch (error) {
    handleApiError(error, "createProduct");
    throw error;
  }
}

/**
 * Update an existing product
 * @param branchId - Optional branch ID for stock updates (sent as x-branch-id header)
 */
export async function updateProduct(
  id: string,
  data: UpdateProductData,
  branchId?: string | null,
): Promise<Product> {
  try {
    const headers: HeadersInit = {};
    if (branchId) {
      headers["x-branch-id"] = branchId;
    }
    const response = await client.put(`/api/admin/products/${id}`, data, {
      ...(Object.keys(headers).length && { headers }),
    });
    return extractProductFromResponse(response);
  } catch (error) {
    handleApiError(error, "updateProduct");
    throw error;
  }
}

/**
 * Delete a product
 */
export async function deleteProduct(id: string): Promise<void> {
  try {
    const response = await client.delete(`/api/admin/products/${id}`);
    // Handle both response formats - delete may not return data
    if (isSuccess(response)) {
      return;
    }
    // For delete, we don't need to check for product property
    if (response && typeof response === "object" && "error" in response) {
      throw new Error(response.error?.message || "Failed to delete product");
    }
  } catch (error) {
    handleApiError(error, "deleteProduct");
    throw error;
  }
}

/**
 * Search products by query
 * @param fieldOperationId - When in operativo context, filters to products in bodega móvil
 */
export async function searchProducts(
  query: string,
  branchId?: string,
  type?: string,
  fieldOperationId?: string | null,
): Promise<Product[]> {
  try {
    const params = new URLSearchParams({
      q: query,
      ...(branchId && { branch_id: branchId }),
      ...(type && { type }),
    });

    const headers = getBranchAndOperativoHeaders(
      branchId ?? null,
      fieldOperationId ?? undefined,
    );

    const response = await client.get<Product[]>(
      `/api/admin/products/search?${params.toString()}`,
      { headers: { "Content-Type": "application/json", ...headers } },
    );
    const data = unwrapData(response);
    return Array.isArray(data) ? data : [];
  } catch (error) {
    handleApiError(error, "searchProducts");
    throw error;
  }
}

/**
 * Update product stock
 */
export async function updateProductStock(
  id: string,
  quantity: number,
  branch_id?: string,
): Promise<Product> {
  try {
    const response = await client.put<Product>(
      `/api/admin/products/${id}/stock`,
      {
        quantity,
        branch_id,
      },
    );
    return unwrapData(response);
  } catch (error) {
    handleApiError(error, "updateProductStock");
    throw error;
  }
}

/**
 * Bulk operations on products
 */
export interface BulkProductData {
  products: Partial<Product>[];
  action: "create" | "update" | "delete";
}

/**
 * Bulk operations by product IDs
 */
export interface BulkProductOperationData {
  operation: string;
  product_ids: string[];
  updates?: Record<string, any>;
  force_delete?: boolean;
}

export async function bulkProducts(data: BulkProductData): Promise<{
  success: string[];
  failed: { id?: string; error: string }[];
}> {
  try {
    const response = await client.post<{
      success: string[];
      failed: { id?: string; error: string }[];
    }>("/api/admin/products/bulk", data);
    return unwrapData(response);
  } catch (error) {
    handleApiError(error, "bulkProducts");
    throw error;
  }
}

/**
 * Bulk operations on products by IDs (update, delete, etc.)
 */
export async function bulkProductOperations(
  data: BulkProductOperationData,
): Promise<{
  success: string[];
  failed: { id?: string; error: string }[];
}> {
  try {
    const response = await client.post<{
      success: string[];
      failed: { id?: string; error: string }[];
    }>("/api/admin/products/bulk", data);
    return unwrapData(response);
  } catch (error) {
    handleApiError(error, "bulkProductOperations");
    throw error;
  }
}

/**
 * Import products from JSON
 */
export async function importProductsJson(
  products: Partial<Product>[],
  options?: { updateExisting?: boolean },
): Promise<{
  imported: number;
  updated: number;
  errors: string[];
}> {
  try {
    const response = await client.post<{
      imported: number;
      updated: number;
      errors: string[];
    }>("/api/admin/products/import-json", {
      products,
      ...options,
    });
    return unwrapData(response);
  } catch (error) {
    handleApiError(error, "importProductsJson");
    throw error;
  }
}

/**
 * Get product by slug (public API)
 */
export async function getProductBySlug(slug: string): Promise<Product> {
  try {
    const response = await client.get(`/api/products/${slug}`);
    return extractProductFromResponse(response);
  } catch (error) {
    handleApiError(error, "getProductBySlug");
    throw error;
  }
}

/**
 * Export products to CSV/JSON format
 */
export async function exportProducts(
  format: "csv" | "json" = "csv",
  filters?: {
    category?: string;
    status?: string;
  },
): Promise<Blob> {
  const params = new URLSearchParams({
    format: format === "csv" ? "csv" : "json",
    ...(filters?.category &&
      filters.category !== "all" && { category_id: filters.category }),
    ...(filters?.status &&
      filters.status !== "all" && { status: filters.status }),
  });

  const response = await fetch(`/api/admin/products/bulk?${params}`);

  if (!response.ok) {
    throw new Error("Failed to export products");
  }

  return response.blob();
}

/**
 * Import products from file (CSV/XLSX)
 */
export async function importProductsFile(
  file: File,
  mode: "create" | "update" | "skip" = "create",
): Promise<{
  success: boolean;
  summary: {
    total_processed: number;
    created: number;
    updated: number;
    skipped: number;
    errors_count: number;
  };
}> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("mode", mode);

  const response = await fetch("/api/admin/products/import", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to import products");
  }

  return response.json();
}

// Export service object for convenience
export const productService = {
  getProducts,
  getProduct,
  getProductBySlug,
  createProduct,
  updateProduct,
  deleteProduct,
  searchProducts,
  updateProductStock,
  bulkProducts,
  importProductsJson,
  importProductsFile,
  exportProducts,
};
