/**
 * Products Service — Business logic layer for Products operations.
 */
import { SupabaseClient } from "@supabase/supabase-js";

import { NotFoundError, ValidationError } from "@/lib/api/errors";
import { appLogger as logger } from "@/lib/logger";
import { Database } from "@/types/supabase";

import {
  applyProductFilters, buildProductSelectString, ensureUniqueSlug, filterInStockProducts,
  filterLowStockProducts, filterOutOfStockProducts, filterProductsByBranch, generateSlug, validateSortColumn,
} from "./_helpers";
import { ProductInsert, ProductListParams, ProductListResponse, ProductServiceContext, ProductUpdate, ProductWithRelations } from "./types";

export class ProductsService {
  private supabase: SupabaseClient<Database>;
  constructor(supabase: SupabaseClient<Database>) { this.supabase = supabase; }

  async listProducts(params: ProductListParams, context: ProductServiceContext): Promise<ProductListResponse> {
    try {
      const { limit = 12, offset = 0, page = 1, search, branchId, organizationId, isSuperAdmin, sortBy = "created_at", sortOrder = "desc", lowStockOnly, inStock } = params;
      let query = this.supabase.from("products").select(buildProductSelectString(branchId || undefined), { count: "exact" });

      if (organizationId && !isSuperAdmin) {
        query = query.eq("organization_id", organizationId);
        if (branchId && !search) {
          try { query = query.or(`branch_id.is.null,branch_id.eq.${branchId}`); } catch { logger.warn("Error using .or() filter"); }
        }
      } else if (isSuperAdmin) {
        if (branchId) { try { query = query.or(`branch_id.is.null,branch_id.eq.${branchId}`); } catch {} }
        else if (organizationId) query = query.eq("organization_id", organizationId);
      }

      query = applyProductFilters(query, params);
      query = query.order(validateSortColumn(sortBy), { ascending: sortOrder === "asc" });
      query = query.range(offset, offset + limit - 1);

      const { data: products, error, count } = await query;
      if (error) { logger.error("Error fetching products", { error }); throw new Error(`Failed to fetch products: ${error.message}`); }

      let filteredProducts = products || [];
      if (search && branchId) filteredProducts = filterProductsByBranch(filteredProducts, branchId);
      if (lowStockOnly) filteredProducts = filterLowStockProducts(filteredProducts, branchId || null);
      if (inStock === "true") filteredProducts = filterInStockProducts(filteredProducts, branchId || null);
      else if (inStock === "false") filteredProducts = filterOutOfStockProducts(filteredProducts, branchId || null);

      const totalCount = count || 0;
      const totalPages = Math.ceil(totalCount / limit);
      return { products: filteredProducts as ProductWithRelations[], totalCount, currentPage: page, totalPages, hasNextPage: page < totalPages, hasPrevPage: page > 1 };
    } catch (error) { logger.error("Error in listProducts service", { error }); throw error; }
  }

  async getProductById(id: string, context: ProductServiceContext): Promise<ProductWithRelations> {
    try {
      let query = this.supabase.from("products").select(buildProductSelectString()).eq("id", id);
      if (context.organizationId && !context.isSuperAdmin) query = query.eq("organization_id", context.organizationId);
      const { data: product, error } = await query.single();
      if (error) { if (error.code === "PGRST116") throw new NotFoundError("Product not found"); throw new Error(`Failed to fetch product: ${error.message}`); }
      return product as ProductWithRelations;
    } catch (error) { logger.error("Error in getProductById service", { error, productId: id }); throw error; }
  }

  async createProduct(productData: ProductInsert, context: ProductServiceContext): Promise<ProductWithRelations> {
    try {
      if (!productData.name?.trim()) throw new ValidationError("Product name is required");
      if (productData.price === undefined || productData.price === null || isNaN(Number(productData.price))) throw new ValidationError("Valid price is required");
      if (context.organizationId) productData.organization_id = context.organizationId;
      if (!productData.slug?.trim()) productData.slug = generateSlug(productData.name);
      productData.slug = await ensureUniqueSlug(this.supabase, productData.slug);
      const { data: product, error } = await this.supabase.from("products").insert(productData).select(buildProductSelectString()).single();
      if (error) { logger.error("Error creating product", { error }); throw new Error(`Failed to create product: ${error.message}`); }
      return product as ProductWithRelations;
    } catch (error) { logger.error("Error in createProduct service", { error }); throw error; }
  }

  async updateProduct(id: string, productData: ProductUpdate, context: ProductServiceContext): Promise<ProductWithRelations> {
    try {
      const existing = await this.getProductById(id, context);
      if (productData.name && productData.name !== existing.name) {
        productData.slug = await ensureUniqueSlug(this.supabase, productData.slug?.trim() || generateSlug(productData.name), id);
      }
      const { data: product, error } = await this.supabase.from("products").update(productData).eq("id", id).select(buildProductSelectString()).single();
      if (error) { logger.error("Error updating product", { error, productId: id }); throw new Error(`Failed to update product: ${error.message}`); }
      return product as ProductWithRelations;
    } catch (error) { logger.error("Error in updateProduct service", { error, productId: id }); throw error; }
  }

  async deleteProduct(id: string, context: ProductServiceContext): Promise<void> {
    try {
      await this.getProductById(id, context);
      const { error } = await this.supabase.from("products").delete().eq("id", id);
      if (error) { logger.error("Error deleting product", { error, productId: id }); throw new Error(`Failed to delete product: ${error.message}`); }
    } catch (error) { logger.error("Error in deleteProduct service", { error, productId: id }); throw error; }
  }
}
