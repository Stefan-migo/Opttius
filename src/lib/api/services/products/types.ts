/**
 * Products Service Types
 * Type definitions for Products business logic layer
 */

import { Database } from "@/types/supabase";

// Product row type from database
export type ProductRow = Database["public"]["Tables"]["products"]["Row"];
export type ProductInsert = Database["public"]["Tables"]["products"]["Insert"];
export type ProductUpdate = Database["public"]["Tables"]["products"]["Update"];

// Extended product with relations
export interface ProductWithRelations extends ProductRow {
  categories?: {
    id: string;
    name: string;
    slug: string;
  } | null;
  product_variants?: Array<{
    id: string;
    title: string;
    price: number;
    inventory_quantity: number;
    option1: string | null;
    option2: string | null;
    option3: string | null;
    is_default: boolean;
  }> | null;
  product_branch_stock?: Array<{
    quantity: number;
    reserved_quantity: number;
    low_stock_threshold: number;
    branch_id: string;
  }> | null;
}

// Query parameters for listing products
export interface ProductListParams {
  limit?: number;
  offset?: number;
  page?: number;
  category?: string;
  search?: string;
  skinType?: string;
  minPrice?: string;
  maxPrice?: string;
  featured?: string;
  inStock?: string;
  lowStockOnly?: boolean;
  status?: string;
  includeArchived?: boolean;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  branchId?: string | null;
  organizationId?: string;
  isSuperAdmin?: boolean;
}

// Response type for paginated products
export interface ProductListResponse {
  products: ProductWithRelations[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

// Stock calculation result
export interface ProductStockInfo {
  totalQuantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  isLowStock: boolean;
  branchStock: Array<{
    branchId: string;
    quantity: number;
    reservedQuantity: number;
    availableQuantity: number;
    isLowStock: boolean;
  }>;
}

// Service context for authorization and filtering
export interface ProductServiceContext {
  userId: string;
  organizationId?: string;
  isSuperAdmin: boolean;
  branchId?: string | null;
  accessibleBranches: Array<{ id: string; name: string }>;
}
