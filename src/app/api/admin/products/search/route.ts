import { NextRequest } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getBranchContext, addBranchFilter } from "@/lib/api/branch-middleware";
import { appLogger as logger } from "@/lib/logger";
import type { IsAdminParams, IsAdminResult } from "@/types/supabase-rpc";
import { withRateLimit, rateLimitConfigs } from "@/lib/api/middleware";
import { RateLimitError, APIError } from "@/lib/api/errors";
import {
  createApiSuccessResponse,
  createApiErrorResponse,
} from "@/lib/api/response";

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
          return createApiErrorResponse(
            new APIError("Unauthorized", 401, "UNAUTHORIZED"),
          );
        }

        const { data: isAdmin } = (await supabase.rpc("is_admin", {
          user_id: user.id,
        } as IsAdminParams)) as {
          data: IsAdminResult | null;
          error: Error | null;
        };
        if (!isAdmin) {
          return createApiErrorResponse(
            new APIError("Admin access required", 403, "FORBIDDEN"),
          );
        }

        // Get branch context
        const branchContext = await getBranchContext(request, user.id);

        const { searchParams } = new URL(request.url);
        const query = searchParams.get("q") || "";
        const type = searchParams.get("type") || "";
        const limit = parseInt(searchParams.get("limit") || "20");

        if (!query || query.trim().length === 0) {
          return createApiSuccessResponse([]);
        }

        const trimmedQuery = query.trim();

        // Build search conditions - search by name, description, SKU, or barcode
        let searchConditions = `name.ilike.%${trimmedQuery}%,description.ilike.%${trimmedQuery}%`;

        if (/^[A-Z0-9]+$/i.test(trimmedQuery)) {
          searchConditions += `,sku.ilike.%${trimmedQuery}%,barcode.ilike.%${trimmedQuery}%`;
        }

        const currentBranchId = branchContext.branchId;
        const selectFields = currentBranchId
          ? `id, name, price, price_includes_tax, status, featured_image, sku, barcode, product_type, category_id, inventory_quantity, frame_brand, frame_model, frame_color, frame_size,
           product_branch_stock (
             quantity,
             available_quantity,
             reserved_quantity,
             low_stock_threshold,
             branch_id
           )`
          : "id, name, price, price_includes_tax, category_id, inventory_quantity, status, featured_image, sku, barcode, product_type, frame_brand, frame_model, frame_color, frame_size";

        const baseQuery: any = supabase.from("products");
        const selectedQuery: any = baseQuery.select(selectFields);
        let productsQuery: any = selectedQuery.eq("status", "active");

        if (branchContext.organizationId) {
          productsQuery = productsQuery.eq(
            "organization_id",
            branchContext.organizationId,
          );

          if (currentBranchId) {
            productsQuery = productsQuery.or(
              `branch_id.is.null,branch_id.eq.${currentBranchId}`,
            );
          }
        } else if (!branchContext.isSuperAdmin) {
          return createApiSuccessResponse([]);
        }

        productsQuery = productsQuery.or(searchConditions);

        if (type && type !== "frame") {
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
          });
          return createApiErrorResponse(
            new Error(`Failed to search products: ${searchError.message}`),
          );
        }

        let filteredProducts = products || [];
        if (type === "frame") {
          const { data: marcosCategory } = await supabase
            .from("categories")
            .select("id")
            .eq("slug", "marcos")
            .eq("is_active", true)
            .single();

          filteredProducts = (products || []).filter((product: any) => {
            return (
              product.product_type === "frame" ||
              (marcosCategory && product.category_id === marcosCategory.id)
            );
          });
        }

        if (currentBranchId) {
          logger.info("Product search branch context", {
            currentBranchId,
            organizationId: branchContext.organizationId,
            isSuperAdmin: branchContext.isSuperAdmin,
          });
        }

        const processedProducts = filteredProducts.map((product: any) => {
          let processedProduct = { ...product };

          if (currentBranchId && product.product_branch_stock) {
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
                inventory_quantity: branchStock.quantity ?? 0,
              };
            } else {
              // Fallback to global inventory if no branch-specific entry found
              processedProduct = {
                ...product,
                available_quantity: product.inventory_quantity || 0,
                quantity: product.inventory_quantity || 0,
                reserved_quantity: 0,
                inventory_quantity: product.inventory_quantity || 0,
              };
            }
            delete processedProduct.product_branch_stock;
          } else if (!currentBranchId) {
            processedProduct.inventory_quantity =
              product.inventory_quantity || 0;
            processedProduct.available_quantity =
              product.inventory_quantity || 0;
          } else {
            processedProduct.inventory_quantity =
              product.inventory_quantity || 0;
            processedProduct.available_quantity =
              product.inventory_quantity || 0;
          }

          return processedProduct;
        });

        logger.info("Processed search results", {
          count: processedProducts.length,
          hasBranchStock: processedProducts.some(
            (p: any) => p.available_quantity > 0,
          ),
        });

        return createApiSuccessResponse(processedProducts);
      } catch (error) {
        if (error instanceof RateLimitError) {
          return createApiErrorResponse(error);
        }
        logger.error("Product search API error", error);
        return createApiErrorResponse(
          error instanceof Error ? error : new Error("Internal server error"),
        );
      }
    },
  );
}
