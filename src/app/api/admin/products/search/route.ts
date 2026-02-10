import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getBranchContext, addBranchFilter } from "@/lib/api/branch-middleware";
import { appLogger as logger } from "@/lib/logger";
import type { IsAdminParams, IsAdminResult } from "@/types/supabase-rpc";
import { withRateLimit, rateLimitConfigs } from "@/lib/api/middleware";
import { RateLimitError } from "@/lib/api/errors";

export async function GET(request: NextRequest) {
  return await (withRateLimit(rateLimitConfigs.search) as any)(
    request,
    async () => {
      try {
        const supabase = await createClient();

        // Check admin authorization
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();
        if (userError || !user) {
          return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { data: isAdmin } = (await supabase.rpc("is_admin", {
          user_id: user.id,
        } as IsAdminParams)) as {
          data: IsAdminResult | null;
          error: Error | null;
        };
        if (!isAdmin) {
          return NextResponse.json(
            { error: "Admin access required" },
            { status: 403 },
          );
        }

        // Get branch context
        const branchContext = await getBranchContext(request, user.id);

        // Build branch filter function
        const applyBranchFilter = (query: ReturnType<typeof supabase.from>) => {
          return addBranchFilter(
            query,
            branchContext.branchId,
            branchContext.isSuperAdmin,
            branchContext.organizationId,
          );
        };

        const { searchParams } = new URL(request.url);
        const query = searchParams.get("q") || "";
        const type = searchParams.get("type") || "";
        const limit = parseInt(searchParams.get("limit") || "20");

        if (!query || query.trim().length === 0) {
          return NextResponse.json({
            success: true,
            products: [],
          });
        }

        const trimmedQuery = query.trim();

        // Build search conditions - search by name, description, SKU, or barcode
        // For exact matches (SKU/barcode), prioritize them
        let searchConditions = `name.ilike.%${trimmedQuery}%,description.ilike.%${trimmedQuery}%`;

        // Add SKU and barcode search if query looks like a code (numbers or alphanumeric)
        if (/^[A-Z0-9]+$/i.test(trimmedQuery)) {
          searchConditions += `,sku.ilike.%${trimmedQuery}%,barcode.ilike.%${trimmedQuery}%`;
        }

        // Build query - Products are global (catalog), not filtered by branch_id
        // Only stock is branch-specific
        const currentBranchId = branchContext.branchId;
        // Use left join (without !inner) to include products even if they don't have stock
        const selectFields = currentBranchId
          ? `id, name, price, price_includes_tax, status, featured_image, sku, barcode, product_type, category_id, frame_brand, frame_model, frame_color, frame_size,
           product_branch_stock (
             quantity,
             available_quantity,
             reserved_quantity,
             low_stock_threshold,
             branch_id
           )`
          : "id, name, price, price_includes_tax, category_id, inventory_quantity, status, featured_image, sku, barcode, product_type, frame_brand, frame_model, frame_color, frame_size";

        // CRITICAL: Filter by organization_id FIRST to ensure multi-tenancy isolation
        // Products must be filtered by organization_id before search to prevent cross-organization data leakage
        const baseQuery: any = supabase.from("products");
        const selectedQuery: any = baseQuery.select(selectFields);
        let productsQuery: any = selectedQuery.eq("status", "active");

        // Apply organization filter - CRITICAL for multi-tenancy
        if (branchContext.organizationId) {
          productsQuery = productsQuery.eq(
            "organization_id",
            branchContext.organizationId,
          );

          // Apply branch filter: global products (branch_id is null) OR current branch products
          if (currentBranchId) {
            productsQuery = productsQuery.or(
              `branch_id.is.null,branch_id.eq.${currentBranchId}`,
            );
          }

          logger.debug("Filtering products by organization and branch", {
            organizationId: branchContext.organizationId,
            currentBranchId,
          });
        } else if (!branchContext.isSuperAdmin) {
          // If no organization_id and not super admin, return empty results
          // This prevents data leakage
          return NextResponse.json({
            success: true,
            products: [],
          });
        }

        // Apply search conditions after organization filter
        productsQuery = productsQuery.or(searchConditions);

        // Filter by product type if provided
        // For "frame" type, also search by category "Marcos" as fallback
        if (type === "frame") {
          // Get the "Marcos" category ID
          const { data: marcosCategory } = await supabase
            .from("categories")
            .select("id")
            .eq("slug", "marcos")
            .eq("is_active", true)
            .single();

          // For frames, we'll search without type filter first, then filter in post-processing
          // This ensures we catch products that might only have category_id set
          // We'll filter after getting results to handle both product_type and category_id
        } else if (type) {
          productsQuery = productsQuery.eq("product_type", type);
        }

        const { data: products, error: searchError } = await productsQuery
          .order("name", { ascending: true })
          .limit(limit);

        if (searchError) {
          logger.error("Error searching products", {
            error: searchError,
            query: trimmedQuery,
            type,
            searchConditions,
          });
          return NextResponse.json(
            {
              error: "Failed to search products",
              details: searchError.message,
            },
            { status: 500 },
          );
        }

        // Log for debugging
        logger.info("Product search completed", {
          query: trimmedQuery,
          type,
          resultsCount: products?.length || 0,
          currentBranchId,
        });

        // For frame type, filter by product_type OR category_id in post-processing
        let filteredProducts = products || [];
        if (type === "frame") {
          const { data: marcosCategory } = await supabase
            .from("categories")
            .select("id")
            .eq("slug", "marcos")
            .eq("is_active", true)
            .single();

          filteredProducts = (products || []).filter((product: any) => {
            // Include if product_type is 'frame' OR category_id matches "Marcos"
            return (
              product.product_type === "frame" ||
              (marcosCategory && product.category_id === marcosCategory.id)
            );
          });
        }

        // Process products to extract stock information for the current branch
        const processedProducts = filteredProducts.map((product: any) => {
          // Always ensure inventory_quantity and available_quantity are present
          let processedProduct = { ...product };

          if (currentBranchId && product.product_branch_stock) {
            // Find stock for the current branch
            const branchStock = Array.isArray(product.product_branch_stock)
              ? product.product_branch_stock.find(
                  (stock: any) => stock.branch_id === currentBranchId,
                )
              : product.product_branch_stock.branch_id === currentBranchId
                ? product.product_branch_stock
                : null;

            if (branchStock) {
              processedProduct = {
                ...product,
                available_quantity: branchStock.available_quantity ?? 0,
                quantity: branchStock.quantity ?? 0,
                reserved_quantity: branchStock.reserved_quantity ?? 0,
                inventory_quantity: branchStock.quantity ?? 0, // For backward compatibility
              };
            } else {
              // Product exists but has no stock in this branch
              processedProduct = {
                ...product,
                available_quantity: 0,
                quantity: 0,
                reserved_quantity: 0,
                inventory_quantity: 0,
              };
            }
            // Remove nested stock data
            delete processedProduct.product_branch_stock;
          } else if (!currentBranchId) {
            // No branch context - use legacy inventory_quantity if available
            processedProduct.inventory_quantity =
              product.inventory_quantity || 0;
            processedProduct.available_quantity =
              product.inventory_quantity || 0;
          } else {
            // Has branch context but no stock data - default to 0
            processedProduct.inventory_quantity =
              processedProduct.inventory_quantity || 0;
            processedProduct.available_quantity =
              processedProduct.available_quantity || 0;
          }

          return processedProduct;
        });

        return NextResponse.json({
          success: true,
          products: processedProducts,
        });
      } catch (error) {
        if (error instanceof RateLimitError) {
          logger.warn("Rate limit exceeded for product search", {
            error: error.message,
          });
          return NextResponse.json({ error: error.message }, { status: 429 });
        }
        logger.error("Product search API error", error);
        return NextResponse.json(
          { error: "Internal server error" },
          { status: 500 },
        );
      }
    },
  );
}
