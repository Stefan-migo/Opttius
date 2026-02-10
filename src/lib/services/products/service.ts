/**
 * Products Service
 * Business logic layer for Products operations with proper separation of concerns
 */

import { SupabaseClient } from "@supabase/supabase-js";
import { appLogger as logger } from "@/lib/logger";
import { Database } from "@/types/supabase";
import { 
  ProductWithRelations, 
  ProductListParams, 
  ProductListResponse,
  ProductServiceContext,
  ProductInsert,
  ProductUpdate
} from "./types";
import { ValidationError, NotFoundError } from "@/lib/api/errors";

export class ProductsService {
  private supabase: SupabaseClient<Database>;

  constructor(supabase: SupabaseClient<Database>) {
    this.supabase = supabase;
  }

  /**
   * List products with filters, pagination, and proper multi-tenancy
   */
  async listProducts(
    params: ProductListParams,
    context: ProductServiceContext
  ): Promise<ProductListResponse> {
    try {
      const {
        limit = 12,
        offset = 0,
        page = 1,
        category,
        search,
        skinType,
        minPrice,
        maxPrice,
        featured,
        inStock,
        lowStockOnly = false,
        status,
        includeArchived = false,
        sortBy = "created_at",
        sortOrder = "desc",
        branchId,
        organizationId,
        isSuperAdmin
      } = params;

      // Build base query with count
      let selectString = `
        *,
        categories:category_id (
          id,
          name,
          slug
        ),
        product_variants (
          id,
          title,
          price,
          inventory_quantity,
          option1,
          option2,
          option3,
          is_default
        )`;

      // Add product_branch_stock with branch filter if branch is selected
      if (branchId) {
        selectString += `,
          product_branch_stock (
            quantity,
            reserved_quantity,
            low_stock_threshold,
            branch_id
          )`;
      }

      let query = this.supabase
        .from("products")
        .select(selectString, { count: "exact" });

      // Apply organization filter for multi-tenancy
      if (organizationId && !isSuperAdmin) {
        query = query.eq("organization_id", organizationId);
        logger.debug("Filtering by organization_id", { organizationId });

        // Apply branch filter when no search is present
        if (branchId && !search) {
          try {
            query = query.or(`branch_id.is.null,branch_id.eq.${branchId}`);
            logger.debug("Filtering by branch_id in query", { branchId });
          } catch (error) {
            logger.warn("Error using .or() filter, will filter in post-processing", { error });
          }
        }
      } else if (isSuperAdmin) {
        if (branchId) {
          try {
            query = query.or(`branch_id.is.null,branch_id.eq.${branchId}`);
          } catch (error) {
            logger.warn("Error using .or() filter, will filter in post-processing", { error });
          }
        } else if (organizationId) {
          query = query.eq("organization_id", organizationId);
        }
      }

      // Apply filters
      if (category) {
        query = query.eq("category_id", category);
      }

      if (skinType) {
        query = query.contains("skin_type", [skinType]);
      }

      if (minPrice) {
        query = query.gte("price", parseFloat(minPrice));
      }

      if (maxPrice) {
        query = query.lte("price", parseFloat(maxPrice));
      }

      if (featured) {
        query = query.eq("featured", featured === "true");
      }

      if (status && status !== "all") {
        query = query.eq("status", status);
      }

      if (!includeArchived) {
        query = query.neq("status", "archived");
      }

      // Handle search with proper branch filtering
      if (search) {
        const searchTerm = `%${search}%`;
        query = query.or(
          `name.ilike.${searchTerm},description.ilike.${searchTerm},sku.ilike.${searchTerm}`
        );

        // Apply branch filter in post-processing when searching
        if (branchId) {
          // We'll filter by branch in the results processing
        }
      }

      // Apply sorting
      const sortColumn = this.validateSortColumn(sortBy);
      query = query.order(sortColumn, { ascending: sortOrder === "asc" });

      // Apply pagination
      query = query.range(offset, offset + limit - 1);

      const { data: products, error, count } = await query;

      if (error) {
        logger.error("Error fetching products", { error });
        throw new Error(`Failed to fetch products: ${error.message}`);
      }

      // Post-process results for branch filtering when needed
      let filteredProducts = products || [];
      
      if (search && branchId) {
        filteredProducts = this.filterProductsByBranch(filteredProducts, branchId);
      }

      // Apply low stock filtering
      if (lowStockOnly) {
        filteredProducts = this.filterLowStockProducts(filteredProducts, branchId);
      }

      // Apply in-stock filtering
      if (inStock === "true") {
        filteredProducts = this.filterInStockProducts(filteredProducts, branchId);
      } else if (inStock === "false") {
        filteredProducts = this.filterOutOfStockProducts(filteredProducts, branchId);
      }

      const totalCount = count || 0;
      const currentPage = page;
      const totalPages = Math.ceil(totalCount / limit);

      return {
        products: filteredProducts as ProductWithRelations[],
        totalCount,
        currentPage,
        totalPages,
        hasNextPage: currentPage < totalPages,
        hasPrevPage: currentPage > 1
      };

    } catch (error) {
      logger.error("Error in listProducts service", { error });
      throw error;
    }
  }

  /**
   * Get product by ID with relations
   */
  async getProductById(id: string, context: ProductServiceContext): Promise<ProductWithRelations> {
    try {
      let query = this.supabase
        .from("products")
        .select(`
          *,
          categories:category_id (
            id,
            name,
            slug
          ),
          product_variants (
            id,
            title,
            price,
            inventory_quantity,
            option1,
            option2,
            option3,
            is_default
          ),
          product_branch_stock (
            quantity,
            reserved_quantity,
            low_stock_threshold,
            branch_id
          )
        `)
        .eq("id", id)
        .single();

      // Apply organization filter for non-super admins
      if (context.organizationId && !context.isSuperAdmin) {
        query = query.eq("organization_id", context.organizationId);
      }

      const { data: product, error } = await query;

      if (error) {
        if (error.code === "PGRST116") {
          throw new NotFoundError("Product not found");
        }
        throw new Error(`Failed to fetch product: ${error.message}`);
      }

      if (!product) {
        throw new NotFoundError("Product not found");
      }

      return product as ProductWithRelations;

    } catch (error) {
      logger.error("Error in getProductById service", { error, productId: id });
      throw error;
    }
  }

  /**
   * Create new product
   */
  async createProduct(productData: ProductInsert, context: ProductServiceContext): Promise<ProductWithRelations> {
    try {
      // Validate required fields
      if (!productData.name?.trim()) {
        throw new ValidationError("Product name is required");
      }

      if (productData.price === undefined || productData.price === null || isNaN(Number(productData.price))) {
        throw new ValidationError("Valid price is required");
      }

      // Set organization_id from context
      if (context.organizationId) {
        productData.organization_id = context.organizationId;
      }

      // Generate slug if not provided
      let slug = productData.slug?.trim();
      if (!slug) {
        slug = this.generateSlug(productData.name);
        productData.slug = slug;
      }

      // Ensure unique slug
      const uniqueSlug = await this.ensureUniqueSlug(slug);
      productData.slug = uniqueSlug;

      const { data: product, error } = await this.supabase
        .from("products")
        .insert(productData)
        .select(`
          *,
          categories:category_id (
            id,
            name,
            slug
          ),
          product_variants (
            id,
            title,
            price,
            inventory_quantity,
            option1,
            option2,
            option3,
            is_default
          )
        `)
        .single();

      if (error) {
        logger.error("Error creating product", { error, productData });
        throw new Error(`Failed to create product: ${error.message}`);
      }

      return product as ProductWithRelations;

    } catch (error) {
      logger.error("Error in createProduct service", { error });
      throw error;
    }
  }

  /**
   * Update existing product
   */
  async updateProduct(
    id: string, 
    productData: ProductUpdate, 
    context: ProductServiceContext
  ): Promise<ProductWithRelations> {
    try {
      // Validate product exists and user has access
      const existingProduct = await this.getProductById(id, context);

      // Generate new slug if name changed
      if (productData.name && productData.name !== existingProduct.name) {
        let slug = productData.slug?.trim() || this.generateSlug(productData.name);
        const uniqueSlug = await this.ensureUniqueSlug(slug, id);
        productData.slug = uniqueSlug;
      }

      const { data: product, error } = await this.supabase
        .from("products")
        .update(productData)
        .eq("id", id)
        .select(`
          *,
          categories:category_id (
            id,
            name,
            slug
          ),
          product_variants (
            id,
            title,
            price,
            inventory_quantity,
            option1,
            option2,
            option3,
            is_default
          )
        `)
        .single();

      if (error) {
        logger.error("Error updating product", { error, productId: id, productData });
        throw new Error(`Failed to update product: ${error.message}`);
      }

      return product as ProductWithRelations;

    } catch (error) {
      logger.error("Error in updateProduct service", { error, productId: id });
      throw error;
    }
  }

  /**
   * Delete product
   */
  async deleteProduct(id: string, context: ProductServiceContext): Promise<void> {
    try {
      // Validate product exists and user has access
      await this.getProductById(id, context);

      const { error } = await this.supabase
        .from("products")
        .delete()
        .eq("id", id);

      if (error) {
        logger.error("Error deleting product", { error, productId: id });
        throw new Error(`Failed to delete product: ${error.message}`);
      }

    } catch (error) {
      logger.error("Error in deleteProduct service", { error, productId: id });
      throw error;
    }
  }

  // === Private Helper Methods ===

  private validateSortColumn(sortBy: string): string {
    const validColumns = [
      "created_at", "updated_at", "name", "price", "sku", 
      "status", "featured", "inventory_quantity"
    ];
    
    return validColumns.includes(sortBy) ? sortBy : "created_at";
  }

  private filterProductsByBranch(products: any[], branchId: string): any[] {
    return products.filter(product => {
      // Include products where branch_id is null (global) or matches the branch
      return !product.branch_id || product.branch_id === branchId;
    });
  }

  private filterLowStockProducts(products: any[], branchId: string | null): any[] {
    return products.filter(product => {
      if (branchId && product.product_branch_stock) {
        const branchStock = product.product_branch_stock.find(
          (stock: any) => stock.branch_id === branchId
        );
        if (branchStock) {
          return branchStock.quantity <= branchStock.low_stock_threshold;
        }
      }
      return false;
    });
  }

  private filterInStockProducts(products: any[], branchId: string | null): any[] {
    return products.filter(product => {
      if (branchId && product.product_branch_stock) {
        const branchStock = product.product_branch_stock.find(
          (stock: any) => stock.branch_id === branchId
        );
        if (branchStock) {
          return branchStock.quantity > 0;
        }
      }
      return false;
    });
  }

  private filterOutOfStockProducts(products: any[], branchId: string | null): any[] {
    return products.filter(product => {
      if (branchId && product.product_branch_stock) {
        const branchStock = product.product_branch_stock.find(
          (stock: any) => stock.branch_id === branchId
        );
        if (branchStock) {
          return branchStock.quantity <= 0;
        }
      }
      // If no branch stock data, consider as out of stock
      return true;
    });
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || `product-${Date.now()}`;
  }

  private async ensureUniqueSlug(slug: string, excludeId?: string): Promise<string> {
    let uniqueSlug = slug;
    let counter = 1;
    
    while (true) {
      let query = this.supabase
        .from("products")
        .select("id")
        .eq("slug", uniqueSlug);
      
      if (excludeId) {
        query = query.neq("id", excludeId);
      }
      
      const { data: existing } = await query.limit(1);
      
      if (!existing || existing.length === 0) {
        break;
      }
      
      uniqueSlug = `${slug}-${counter++}`;
    }
    
    return uniqueSlug;
  }
}