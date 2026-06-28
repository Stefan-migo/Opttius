import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

import { getBranchContext } from "@/lib/api/branch-middleware";
import { createPaginatedResponse } from "@/lib/api/response";
import { DEFAULT_LOW_STOCK_THRESHOLD } from "@/lib/inventory/constants";
import { appLogger as logger } from "@/lib/logger";

export async function listProducts(
  request: NextRequest,
  supabase: SupabaseClient,
  organizationId: string,
): Promise<NextResponse> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    const { searchParams } = new URL(request.url);

    // Check if branch_id was explicitly requested in the request
    const requestedBranchId =
      request.headers.get("x-branch-id") || searchParams.get("branch_id");

    // Get branch context
    const branchContext = await getBranchContext(request, user!.id, supabase);

    // Pagination - Accept both page and offset parameters
    const limit = parseInt(searchParams.get("limit") || "12");
    const offsetParam = searchParams.get("offset");
    const pageParam = searchParams.get("page");

    // Use offset if provided, otherwise calculate from page
    const offset = offsetParam
      ? parseInt(offsetParam)
      : (parseInt(pageParam || "1") - 1) * limit;
    const page = offsetParam
      ? Math.floor(offset / limit) + 1
      : parseInt(pageParam || "1");

    // Filters
    const category = searchParams.get("category");
    const search = searchParams.get("search");
    const skinType = searchParams.get("skin_type");
    const minPrice = searchParams.get("min_price");
    const maxPrice = searchParams.get("max_price");
    const featured = searchParams.get("featured");
    const inStock = searchParams.get("in_stock");
    const lowStockOnly = searchParams.get("low_stock_only") === "true";
    const status = searchParams.get("status");
    const includeArchived = searchParams.get("include_archived") === "true";

    // Sort
    const sortBy = searchParams.get("sort_by") || "created_at";
    const sortOrder = searchParams.get("sort_order") || "desc";

    // Build query with count option
    // Include stock from product_branch_stock for the current branch
    // IMPORTANT: Only use currentBranchId for filtering if branch_id was explicitly requested
    // When searching without branch_id, we want to show all products from the organization
    // This ensures that search results include products from all branches within the organization
    const currentBranchId = requestedBranchId ? branchContext.branchId : null;

    // Build select string with proper filtering for nested relations
    // Note: Use left join syntax (!inner) to avoid errors when no stock exists
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
    // Note: Without !inner, this is a left join - products without stock will still be returned
    // We'll filter by branch_id in post-processing since Supabase doesn't support filtering nested relations directly
    // Note: product_branch_stock table only has: id, product_id, branch_id, quantity, reserved_quantity, low_stock_threshold, created_at, updated_at
    if (currentBranchId) {
      selectString += `,
        product_branch_stock (
          quantity,
          reserved_quantity,
          low_stock_threshold,
          branch_id
        )`;
    }

    let query = supabase
      .from("products")
      .select(selectString, { count: "exact" });

    // IMPORTANT: Apply organization filter BEFORE search to ensure multi-tenancy isolation
    // Product visibility by branch:
    // - Regular admin + branch selected: only products where branch_id = that branch (branch-local)
    // - Super admin + branch selected: products where branch_id = branch OR branch_id IS NULL (branch-local + org-wide)
    // - Super admin + global view: all products of the organization
    if (organizationId && !branchContext.isSuperAdmin) {
      query = query.eq("organization_id", organizationId);
      logger.debug("Filtering by organization_id", { organizationId });

      // Regular admin with branch selected: only products created in that branch (branch-local catalog)
      if (currentBranchId) {
        query = query.eq("branch_id", currentBranchId);
        logger.debug("Filtering by branch_id (branch-local)", {
          currentBranchId,
        });
      }
    } else if (branchContext.isSuperAdmin) {
      if (currentBranchId) {
        // Super admin with branch selected: branch-local + org-wide products
        const orgId = branchContext.organizationId;
        let resolvedOrgId = orgId;
        if (!resolvedOrgId) {
          const { data: branchData } = await supabase
            .from("branches")
            .select("organization_id")
            .eq("id", currentBranchId)
            .single();
          resolvedOrgId =
            branchData?.organization_id ??
            "00000000-0000-0000-0000-000000000000";
        }
        query = query.eq("organization_id", resolvedOrgId);
        query = query.or(`branch_id.eq.${currentBranchId},branch_id.is.null`);
        logger.debug("Filtering by branch (super admin)", {
          currentBranchId,
          filter: "branch_id = branch OR branch_id IS NULL",
        });
      } else if (branchContext.organizationId) {
        // Super admin in global view: all products of the organization
        query = query.eq("organization_id", branchContext.organizationId);
        logger.debug("Filtering by organization (super admin global)", {
          organizationId: branchContext.organizationId,
        });
      }
    } else {
      // Fallback: no organization_id - get org from branch when branch selected
      if (currentBranchId) {
        const { data: branchData } = await supabase
          .from("branches")
          .select("organization_id")
          .eq("id", currentBranchId)
          .single();
        query = query.eq(
          "organization_id",
          branchData?.organization_id ?? "00000000-0000-0000-0000-000000000000",
        );
      } else {
        // Regular admin without branch selected - show only their accessible branches
        const accessibleBranchIds = branchContext.accessibleBranches.map(
          (b) => b.id,
        );
        if (accessibleBranchIds.length > 0) {
          // Show global products OR products from accessible branches
          const branchConditions = accessibleBranchIds
            .map((id) => `branch_id.eq.${id}`)
            .join(",");
          try {
            query = query.or(`branch_id.is.null,${branchConditions}`);
          } catch (error) {
            logger.warn(
              "Error using .or() filter, will filter in post-processing",
              { error },
            );
          }
        } else {
          // No accessible branches - return empty
          return createPaginatedResponse([], {
            page: 1,
            limit: parseInt(searchParams.get("limit") || "12"),
            total: 0,
          });
        }
      }
    }

    // Apply filters
    if (category && category !== "all") {
      query = query.eq("category_id", category);
    }

    if (search) {
      // Apply search filter - must be applied after organization filter
      // Use ilike for case-insensitive search
      // Supabase PostgREST syntax: field.ilike.pattern (pattern should include %)
      // Escape special characters in search term to prevent SQL injection
      // Note: We escape % and _ because they are special characters in SQL LIKE patterns
      const escapedSearch = search.replace(/%/g, "\\%").replace(/_/g, "\\_");
      // Build OR condition for search across multiple fields
      // Note: .or() creates an OR condition between the specified fields
      // IMPORTANT: This .or() will override any previous .or() (like branch_id filter)
      // That's why we apply branch_id filter in post-processing when search is present
      // IMPORTANT: The .eq() filters (like organization_id) are NOT overridden by .or()
      // They are combined with AND, so organization_id filter remains active
      const searchCondition = `name.ilike.%${escapedSearch}%,description.ilike.%${escapedSearch}%,sku.ilike.%${escapedSearch}%,barcode.ilike.%${escapedSearch}%`;
      query = query.or(searchCondition);

      // Re-apply organization filter after search to ensure it's not lost
      // This is a safety measure - .eq() filters should persist, but we ensure it here
      if (organizationId && !branchContext.isSuperAdmin) {
        query = query.eq("organization_id", organizationId);
      }

      // Shared catalog: no branch_id filter - search returns all org products

      logger.debug("Applied search filter", {
        search,
        escapedSearch,
        searchCondition,
        hasBranchFilter: !!currentBranchId,
        organizationId,
        organizationFilterReapplied: !!(
          organizationId && !branchContext.isSuperAdmin
        ),
      });
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

    if (featured === "true") {
      query = query.eq("is_featured", true);
    }

    // Stock filtering - will be done in post-processing since we can't filter nested relations directly
    // Store filter flags for post-processing
    const stockFilters = {
      inStock: inStock === "true",
      lowStockOnly: lowStockOnly,
    };

    // Status filtering - Admin can see all products
    // IMPORTANT: When searching, don't apply default status filter to avoid filtering out products
    // that might match the search but have a different status
    if (status && status !== "all") {
      query = query.eq("status", status);
    } else if (!includeArchived && !search) {
      // Default to active products if no specific status requested
      // BUT: Skip this default filter when searching to ensure search results are not limited
      query = query.eq("status", "active");
    }
    // If includeArchived is true, show all products regardless of status

    // Apply sorting
    const sortColumn = getSortColumn(sortBy);
    const order = getSortOrder(sortBy);
    query = query.order(sortColumn, { ascending: order === "asc" });

    // Execute query with pagination and get count
    // Note: range() must come AFTER select() for count to work properly
    const {
      data: products,
      count,
      error,
    } = await query.range(offset, offset + limit - 1);

    // Debug logging for search queries
    if (search) {
      logger.debug("Search query results - BEFORE post-processing", {
        search,
        productsCount: products?.length || 0,
        totalCount: count,
        currentBranchId,
        requestedBranchId,
        organizationId,
        productIds:
          products?.map((p: unknown) => ({
            id: p.id,
            name: p.name,
            branch_id: p.branch_id,
            organization_id: p.organization_id,
            status: p.status,
            nameMatches: p.name?.toLowerCase().includes(search.toLowerCase()),
          })) || [],
      });
    }

    if (error) {
      // Log error with all available information
      const errorInfo = {
        message: error.message,
        code: error.code,
        hint: error.hint,
        details: error.details,
        status: error.status,
      };

      logger.error("Database error fetching products", {
        error: errorInfo,
        selectString,
        currentBranchId,
        branchContext: {
          branchId: branchContext.branchId,
          isSuperAdmin: branchContext.isSuperAdmin,
        },
        queryString: query.toString ? query.toString() : "N/A",
      });

      // Return detailed error in development, generic in production
      const isDevelopment = process.env.NODE_ENV === "development";
      return NextResponse.json(
        {
          error: "Failed to fetch products",
          details: isDevelopment ? error.message : "Database error occurred",
          code: error.code,
          hint: isDevelopment ? error.hint : undefined,
          ...(isDevelopment && { fullError: errorInfo }),
        },
        { status: 500 },
      );
    }

    // Post-process products to handle stock data and apply stock filters
    // If branch is selected and we have stock data, filter and format it properly
    // Also filter products by branch_id and organization_id (we do this in post-processing to avoid conflicts with search .or())
    let processedProducts =
      products
        ?.map((product: unknown) => {
          // CRITICAL: Filter by organization_id in post-processing when there's a search query
          // This ensures multi-tenancy isolation even if the .or() search filter somehow interferes
          // with the organization filter in the query
          if (search && organizationId && !branchContext.isSuperAdmin) {
            if (product.organization_id !== organizationId) {
              return null; // Filter out products from other organizations
            }
          }

          // Shared catalog: when branch is selected, show ALL products of the organization
          // (no branch_id filter - Providencia sees same products as Casa Matriz)
          // Stock is filtered by branch via product_branch_stock below
          // This ensures that when searching without a specific branch, we see all products from the organization

          if (currentBranchId) {
            // Filter stock by branch_id - ONLY use this branch's stock (no fallback to other branches)
            let stockData = null;
            if (product.product_branch_stock) {
              if (Array.isArray(product.product_branch_stock)) {
                stockData = product.product_branch_stock.find(
                  (s: unknown) => s.branch_id === currentBranchId,
                );
              } else if (
                product.product_branch_stock.branch_id === currentBranchId
              ) {
                stockData = product.product_branch_stock;
              }
            }

            if (stockData) {
              const quantity = stockData.quantity || 0;
              const reservedQuantity = stockData.reserved_quantity || 0;
              // Calculate available_quantity as quantity - reserved_quantity
              const availableQuantity = Math.max(
                0,
                quantity - reservedQuantity,
              );

              product.total_inventory_quantity = quantity;
              product.total_available_quantity = availableQuantity;
              product.total_reserved_quantity = reservedQuantity;
              product.total_low_stock_threshold =
                stockData.low_stock_threshold ?? DEFAULT_LOW_STOCK_THRESHOLD;
            } else {
              // No stock record for this branch - check if product has legacy inventory_quantity
              // This handles products that were created before the stock refactor
              const legacyQuantity = product.inventory_quantity || 0;
              product.total_inventory_quantity = legacyQuantity;
              product.total_available_quantity = legacyQuantity;
              product.total_reserved_quantity = 0;
              product.total_low_stock_threshold = DEFAULT_LOW_STOCK_THRESHOLD;
            }
          } else {
            // No branch selected - use legacy inventory_quantity if available
            const legacyQuantity = product.inventory_quantity || 0;
            product.total_inventory_quantity = legacyQuantity;
            product.total_available_quantity = legacyQuantity;
            product.total_reserved_quantity = 0;
            product.total_low_stock_threshold = DEFAULT_LOW_STOCK_THRESHOLD;
          }
          return product;
        })
        .filter((p: unknown) => p !== null) || [];

    // Debug logging for search queries after post-processing
    if (search) {
      logger.debug("Search query results - AFTER post-processing", {
        search,
        processedProductsCount: processedProducts.length,
        processedProductIds: processedProducts.map((p: unknown) => ({
          id: p.id,
          name: p.name,
          branch_id: p.branch_id,
          organization_id: p.organization_id,
          nameMatches: p.name?.toLowerCase().includes(search.toLowerCase()),
        })),
      });
    }

    // Apply stock filters in post-processing
    if (stockFilters.inStock && currentBranchId) {
      processedProducts = processedProducts.filter(
        (p: unknown) => (p.total_available_quantity || 0) > 0,
      );
    }

    if (stockFilters.lowStockOnly && currentBranchId) {
      processedProducts = processedProducts.filter(
        (p: unknown) =>
          (p.total_available_quantity || 0) <=
          (p.total_low_stock_threshold ?? DEFAULT_LOW_STOCK_THRESHOLD),
      );
    }

    // Adjust count if we filtered in post-processing
    // Note: This is not perfect but necessary since we can't filter nested relations in Supabase
    let adjustedCount = count;
    if (
      (stockFilters.inStock || stockFilters.lowStockOnly) &&
      currentBranchId
    ) {
      // We filtered after fetching, so the count is now the filtered array length
      // For accurate pagination, we'd need to do a separate count query, but for now
      // we'll use the filtered length as an approximation
      adjustedCount = processedProducts.length;
    }

    // Calculate pagination info
    const totalPages = Math.ceil((adjustedCount || 0) / limit);
    const hasMore = page < totalPages;

    return createPaginatedResponse(processedProducts, {
      page,
      limit,
      total: adjustedCount || 0,
    });
  } catch (error) {
    logger.error("API error in products GET", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

function getSortColumn(sortBy: string): string {
  switch (sortBy) {
    case "price_asc":
    case "price_desc":
      return "price";
    case "name":
      return "name";
    case "newest":
      return "created_at";
    case "featured":
      return "is_featured";
    default:
      return "created_at";
  }
}

function getSortOrder(sort: string) {
  switch (sort) {
    case "price_asc":
      return "asc";
    case "price_desc":
      return "desc";
    case "name":
      return "asc";
    case "newest":
      return "desc";
    case "featured":
      return "desc";
    default:
      return "desc";
  }
}
