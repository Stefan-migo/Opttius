import { NextRequest, NextResponse } from "next/server";
import {
  createClientFromRequest,
  createServiceRoleClient,
} from "@/utils/supabase/server";
import { getBranchContext } from "@/lib/api/branch-middleware";
import { appLogger as logger } from "@/lib/logger";
import type { IsAdminParams, IsAdminResult } from "@/types/supabase-rpc";
import { withRateLimit, rateLimitConfigs } from "@/lib/api/middleware";
import { RateLimitError, ValidationError } from "@/lib/api/errors";
import { z } from "zod";
import {
  createProductSchema,
  searchProductSchema,
  paginationSchema,
} from "@/lib/api/validation/zod-schemas";
import {
  parseAndValidateBody,
  parseAndValidateQuery,
  validateBody,
  validationErrorResponse,
} from "@/lib/api/validation/zod-helpers";

export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  try {
    const { client: supabase, getUser } =
      await createClientFromRequest(request);

    // Check authentication
    const { data, error: userError } = await getUser();
    const user = data?.user;
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check admin status
    const { data: isAdmin } = (await supabase.rpc("is_admin", {
      user_id: user.id,
    } as IsAdminParams)) as { data: IsAdminResult | null; error: Error | null };
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 },
      );
    }

    // Get user's organization_id for filtering
    const { data: adminUser } = await supabase
      .from("admin_users")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    const userOrganizationId = (adminUser as { organization_id?: string })
      ?.organization_id;

    const { searchParams } = new URL(request.url);

    // Check if branch_id was explicitly requested in the request
    const requestedBranchId =
      request.headers.get("x-branch-id") || searchParams.get("branch_id");

    // Get branch context
    const branchContext = await getBranchContext(request, user.id, supabase);

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
    // Filter by organization_id first (multi-tenancy isolation)
    // Similar to customers API: filter by organization_id, then optionally by branch_id
    if (userOrganizationId && !branchContext.isSuperAdmin) {
      // Filter by organization_id - this ensures multi-tenancy isolation
      // This MUST be applied before search to ensure it's combined correctly with .or()
      query = query.eq("organization_id", userOrganizationId);
      logger.debug("Filtering by organization_id", { userOrganizationId });

      // When a branch is selected: show ALL products of the organization (shared catalog)
      // Stock is per-branch via product_branch_stock - no branch_id filter on products
      // If no branch selected, show all products from organization (no branch_id filter)
      // If search is present, branch filter will be applied in post-processing
    } else if (branchContext.isSuperAdmin) {
      // Super admin: branch selected = all products of that branch's org (shared catalog)
      // Vision Global = only user's organization
      if (currentBranchId) {
        // Need org - from context or fetch from branch
        const orgId = branchContext.organizationId;
        if (orgId) {
          query = query.eq("organization_id", orgId);
        } else {
          const { data: branchData } = await supabase
            .from("branches")
            .select("organization_id")
            .eq("id", currentBranchId)
            .single();
          query = query.eq(
            "organization_id",
            branchData?.organization_id ??
              "00000000-0000-0000-0000-000000000000",
          );
        }
      } else if (branchContext.organizationId) {
        query = query.eq("organization_id", branchContext.organizationId);
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
          return NextResponse.json({
            products: [],
            pagination: {
              page: 1,
              limit: parseInt(searchParams.get("limit") || "12"),
              total: 0,
              totalPages: 0,
              hasMore: false,
            },
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
      if (userOrganizationId && !branchContext.isSuperAdmin) {
        query = query.eq("organization_id", userOrganizationId);
      }

      // Shared catalog: no branch_id filter - search returns all org products

      logger.debug("Applied search filter", {
        search,
        escapedSearch,
        searchCondition,
        hasBranchFilter: !!currentBranchId,
        userOrganizationId,
        organizationFilterReapplied: !!(
          userOrganizationId && !branchContext.isSuperAdmin
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
        userOrganizationId,
        productIds:
          products?.map((p: any) => ({
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
        ?.map((product: any) => {
          // CRITICAL: Filter by organization_id in post-processing when there's a search query
          // This ensures multi-tenancy isolation even if the .or() search filter somehow interferes
          // with the organization filter in the query
          if (search && userOrganizationId && !branchContext.isSuperAdmin) {
            if (product.organization_id !== userOrganizationId) {
              return null; // Filter out products from other organizations
            }
          }

          // Shared catalog: when branch is selected, show ALL products of the organization
          // (no branch_id filter - Providencia sees same products as Casa Matriz)
          // Stock is filtered by branch via product_branch_stock below
          // This ensures that when searching without a specific branch, we see all products from the organization

          if (currentBranchId) {
            // Filter stock by branch_id and take the first match
            let stockData = null;
            if (product.product_branch_stock) {
              if (Array.isArray(product.product_branch_stock)) {
                stockData =
                  product.product_branch_stock.find(
                    (s: any) => s.branch_id === currentBranchId,
                  ) || product.product_branch_stock[0]; // Fallback to first if no match
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
            } else {
              // No stock record for this branch - check if product has legacy inventory_quantity
              // This handles products that were created before the stock refactor
              const legacyQuantity = product.inventory_quantity || 0;
              product.total_inventory_quantity = legacyQuantity;
              product.total_available_quantity = legacyQuantity;
              product.total_reserved_quantity = 0;
            }
          } else {
            // No branch selected - use legacy inventory_quantity if available
            const legacyQuantity = product.inventory_quantity || 0;
            product.total_inventory_quantity = legacyQuantity;
            product.total_available_quantity = legacyQuantity;
            product.total_reserved_quantity = 0;
          }
          return product;
        })
        .filter((p: any) => p !== null) || [];

    // Debug logging for search queries after post-processing
    if (search) {
      logger.debug("Search query results - AFTER post-processing", {
        search,
        processedProductsCount: processedProducts.length,
        processedProductIds: processedProducts.map((p: any) => ({
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
        (p: any) => (p.total_available_quantity || 0) > 0,
      );
    }

    if (stockFilters.lowStockOnly && currentBranchId) {
      processedProducts = processedProducts.filter(
        (p: any) => (p.total_available_quantity || 0) <= 5,
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

    return NextResponse.json({
      products: processedProducts,
      pagination: {
        page,
        limit,
        total: adjustedCount,
        totalPages,
        hasMore,
      },
    });
  } catch (error) {
    logger.error("API error in products GET", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// POST method for creating products
export async function POST(request: NextRequest) {
  try {
    return await (withRateLimit(rateLimitConfigs.modification) as any)(
      request,
      async () => {
        try {
          const { client: supabase, getUser } =
            await createClientFromRequest(request);

          // Check authentication
          const { data: userData, error: userError } = await getUser();
          const user = userData?.user;
          if (userError || !user) {
            return NextResponse.json(
              { error: "Unauthorized" },
              { status: 401 },
            );
          }

          // Check admin status
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
          const branchContext = await getBranchContext(
            request,
            user.id,
            supabase,
          );

          // Get user's organization_id from admin_users table
          const { data: adminUser, error: adminUserError } = await supabase
            .from("admin_users")
            .select("organization_id")
            .eq("id", user.id)
            .single();

          if (adminUserError || !adminUser?.organization_id) {
            logger.error("Error getting user organization", adminUserError);
            return NextResponse.json(
              { error: "User organization not found" },
              { status: 500 },
            );
          }

          const userOrganizationId = adminUser.organization_id;

          // Get request body first (needed for fields not in Zod schema)
          let body: any;
          try {
            body = await request.json();
            logger.debug("Request body parsed successfully for product", {
              bodyKeys: Object.keys(body || {}),
              bodyType: typeof body,
              hasName: !!body.name,
              hasPrice: !!body.price,
            });
          } catch (error) {
            logger.error(
              "Failed to parse request body",
              error instanceof Error ? error : new Error(String(error)),
            );
            return NextResponse.json(
              { error: "Invalid JSON in request body" },
              { status: 400 },
            );
          }

          // Validate request body with Zod (body already parsed)
          let validatedBody;
          try {
            logger.debug("Starting Zod validation for product", {
              bodyKeys: Object.keys(body || {}),
              price: body.price,
              priceType: typeof body.price,
              name: body.name,
            });
            validatedBody = validateBody(body, createProductSchema);
            logger.debug("Zod validation successful for product");
          } catch (error: unknown) {
            if (error instanceof ValidationError) {
              logger.warn("ValidationError detected", {
                message: error.message,
                details: error.details,
              });
              return validationErrorResponse(error);
            }
            // For ZodError that wasn't caught as ValidationError
            if (error instanceof z.ZodError) {
              logger.warn("ZodError not wrapped in ValidationError", {
                errors: error.errors.map((e) => ({
                  path: e.path.join("."),
                  message: e.message,
                  code: e.code,
                })),
              });
              const errors = error.errors.map((err: z.ZodIssue) => ({
                field: err.path.join("."),
                message: err.message,
              }));
              return NextResponse.json(
                {
                  error: "Validation failed",
                  details: errors,
                },
                { status: 400 },
              );
            }
            // Log and re-throw unexpected errors
            logger.error(
              "Unexpected error in validation",
              error instanceof Error ? error : new Error(String(error)),
            );
            throw error;
          }

          // Debug: Log branch context
          logger.debug("Branch context for product creation", {
            body_branch_id: validatedBody.branch_id,
            context_branch_id: branchContext.branchId,
            is_super_admin: branchContext.isSuperAdmin,
            accessible_branches: branchContext.accessibleBranches.map(
              (b) => b.id,
            ),
          });

          // Use branch_id from body, or current branch context, or null for super admin
          const productBranchId =
            validatedBody.branch_id || branchContext.branchId || null;

          // Validate branch_id is provided (required for product creation, except for super admins)
          if (!productBranchId && !branchContext.isSuperAdmin) {
            logger.warn(
              "Validation failed: No branch_id provided and user is not super admin",
            );
            return NextResponse.json(
              {
                error:
                  "branch_id is required. Debes seleccionar una sucursal para crear productos.",
                field: "branch_id",
              },
              { status: 400 },
            );
          }

          // If not super admin, validate they have access to the branch
          if (!branchContext.isSuperAdmin && productBranchId) {
            const hasAccess = branchContext.accessibleBranches.some(
              (b) => b.id === productBranchId,
            );
            if (!hasAccess) {
              return NextResponse.json(
                {
                  error: "No tienes acceso a esta sucursal",
                  field: "branch_id",
                },
                { status: 403 },
              );
            }
          }

          // Validar límite de productos del tier
          const { validateTierLimit } = await import(
            "@/lib/saas/tier-validator"
          );
          const productLimit = await validateTierLimit(
            userOrganizationId,
            "products",
          );
          if (!productLimit.allowed) {
            return NextResponse.json(
              {
                error:
                  productLimit.reason ??
                  "Límite de productos alcanzado para tu plan. Considera actualizar tu suscripción.",
                code: "TIER_LIMIT",
                currentCount: productLimit.currentCount,
                maxAllowed: productLimit.maxAllowed,
              },
              { status: 403 },
            );
          }

          logger.debug("Creating product with data", {
            name: validatedBody.name,
            product_type: validatedBody.product_type,
            has_optical_fields: !!validatedBody.optical_category,
            has_frame_fields: !!validatedBody.frame_type,
            has_lens_fields: !!validatedBody.lens_type,
          });

          // Price ya está validado por Zod
          logger.debug("Price validation", {
            price: validatedBody.price,
            type: typeof validatedBody.price,
          });

          // Generate slug if not provided
          let slug = validatedBody.slug?.trim();
          if (!slug) {
            slug = validatedBody.name
              .toLowerCase()
              .normalize("NFD")
              .replace(/[\u0300-\u036f]/g, "") // Remove accents
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/(^-|-$)/g, "");

            // Ensure slug is not empty
            if (!slug) {
              slug = `product-${Date.now()}`;
            }
          }

          // Always check if slug already exists and append timestamp if needed
          const { data: existing } = await supabase
            .from("products")
            .select("id")
            .eq("slug", slug)
            .limit(1);

          if (existing && existing.length > 0) {
            slug = `${slug}-${Date.now()}`;
          }

          // Prepare product data with defaults
          // Usar validatedBody para campos validados por Zod, y body para campos adicionales opcionales
          const productData: Record<string, unknown> = {
            name: validatedBody.name.trim(),
            slug: slug,
            description: validatedBody.description || null,
            short_description: validatedBody.short_description || null,
            price:
              typeof validatedBody.price === "number"
                ? validatedBody.price
                : parseFloat(String(validatedBody.price)),
            compare_at_price: validatedBody.compare_at_price || null,
            cost_price: validatedBody.cost_price || null,
            price_includes_tax: validatedBody.price_includes_tax ?? false,
            category_id: validatedBody.category_id || null,
            branch_id: productBranchId, // Associate product with branch
            // inventory_quantity removed - managed in product_branch_stock table
            status: validatedBody.status || "draft",
            featured_image: validatedBody.featured_image || null,
            gallery: validatedBody.gallery || [],
            tags: validatedBody.tags || [],
            is_featured: validatedBody.is_featured || false,
            published_at:
              validatedBody.published_at ||
              (validatedBody.status === "active"
                ? new Date().toISOString()
                : null),
            // Optical product fields
            product_type: validatedBody.product_type || "frame",
            optical_category: validatedBody.optical_category || null,
            sku: validatedBody.sku || null,
            barcode: validatedBody.barcode || null,
            brand: validatedBody.brand || null,
            manufacturer: validatedBody.manufacturer || null,
            model_number: validatedBody.model_number || null,
            // Frame fields (only include fields that exist in the database)
            frame_type: validatedBody.frame_type || null,
            frame_material: validatedBody.frame_material || null,
            frame_shape: validatedBody.frame_shape || null,
            frame_color: validatedBody.frame_color || null,
            frame_size: validatedBody.frame_size || null,
            // Note: frame_bridge_width, frame_temple_length, frame_lens_width, frame_lens_height
            // are not in the products table schema, so they are excluded
            // Lens fields (only include fields that exist in the database)
            lens_type: validatedBody.lens_type || null,
            lens_material: validatedBody.lens_material || null,
            // Note: lens_coating, lens_prescription_type are not in the products table schema
            // Additional optional fields from body (not in schema yet)
            frame_colors: (body as any).frame_colors || [],
            frame_brand: (body as any).frame_brand || null,
            frame_model: (body as any).frame_model || null,
            frame_sku: (body as any).frame_sku || null,
            frame_gender: (body as any).frame_gender || null,
            frame_age_group: (body as any).frame_age_group || null,
            frame_features: (body as any).frame_features || [],
            frame_measurements: (body as any).frame_measurements || null,
            lens_index: (body as any).lens_index
              ? parseFloat((body as any).lens_index)
              : null,
            lens_coatings: (body as any).lens_coatings || [],
            lens_tint_options: (body as any).lens_tint_options || [],
            uv_protection: (body as any).uv_protection || null,
            blue_light_filter: (body as any).blue_light_filter || false,
            blue_light_filter_percentage: (body as any)
              .blue_light_filter_percentage
              ? parseInt((body as any).blue_light_filter_percentage)
              : null,
            photochromic: (body as any).photochromic || false,
            prescription_available:
              (body as any).prescription_available || false,
            prescription_range: (body as any).prescription_range || null,
            requires_prescription: (body as any).requires_prescription || false,
            is_customizable: (body as any).is_customizable || false,
            warranty_months: (body as any).warranty_months
              ? parseInt((body as any).warranty_months)
              : null,
            warranty_details: (body as any).warranty_details || null,
          };

          // Add optional fields only if they exist (and are valid DB columns)
          if (
            body.weight !== undefined &&
            body.weight !== null &&
            body.weight !== ""
          ) {
            productData.weight = parseFloat(body.weight) || null;
          }
          if (
            body.dimensions !== undefined &&
            body.dimensions !== null &&
            typeof body.dimensions === "object"
          ) {
            productData.dimensions = body.dimensions;
          }
          if (
            body.shelf_life_months !== undefined &&
            body.shelf_life_months !== null
          ) {
            productData.shelf_life_months =
              parseInt(String(body.shelf_life_months)) || null;
          }
          if (body.sku !== undefined && body.sku !== null && body.sku !== "") {
            productData.sku = body.sku;
          }
          if (
            body.barcode !== undefined &&
            body.barcode !== null &&
            body.barcode !== ""
          ) {
            productData.barcode = body.barcode;
          }
          if (
            body.video_url !== undefined &&
            body.video_url !== null &&
            body.video_url !== ""
          ) {
            productData.video_url = body.video_url;
          }
          if (
            body.meta_title !== undefined &&
            body.meta_title !== null &&
            body.meta_title !== ""
          ) {
            productData.meta_title = body.meta_title;
          }
          if (
            body.meta_description !== undefined &&
            body.meta_description !== null &&
            body.meta_description !== ""
          ) {
            productData.meta_description = body.meta_description;
          }
          if (
            body.search_keywords !== undefined &&
            body.search_keywords !== null &&
            Array.isArray(body.search_keywords)
          ) {
            productData.search_keywords = body.search_keywords;
          }
          if (
            body.collections !== undefined &&
            body.collections !== null &&
            Array.isArray(body.collections)
          ) {
            productData.collections = body.collections;
          }
          if (
            body.vendor !== undefined &&
            body.vendor !== null &&
            body.vendor !== ""
          ) {
            productData.vendor = body.vendor;
          }

          // Convert empty strings to null for all string fields to avoid database constraint issues
          Object.keys(productData).forEach((key) => {
            if (
              typeof productData[key] === "string" &&
              productData[key].trim() === ""
            ) {
              productData[key] = null;
            }
          });

          // List of valid columns in the products table (to avoid PGRST204 errors)
          // Remove any fields that don't exist in the database schema
          const validProductColumns = [
            "name",
            "slug",
            "description",
            "short_description",
            "price",
            "compare_at_price",
            "cost_price",
            "price_includes_tax",
            "category_id",
            "branch_id",
            // inventory_quantity removed
            "status",
            "featured_image",
            "gallery",
            "tags",
            "is_featured",
            "published_at",
            "product_type",
            "optical_category",
            "sku",
            "barcode",
            "brand",
            "manufacturer",
            "model_number",
            "frame_type",
            "frame_material",
            "frame_shape",
            "frame_color",
            "frame_size",
            "lens_type",
            "lens_material",
            "weight",
            "dimensions",
            "package_characteristics",
            "shelf_life_months",
            "video_url",
            "meta_title",
            "meta_description",
            "search_keywords",
            "collections",
            "vendor",
            "currency",
            "track_inventory",
            "created_at",
            "updated_at",
          ];

          // Filter productData to only include valid columns
          const filteredProductData: Record<string, unknown> = {};
          Object.keys(productData).forEach((key) => {
            if (validProductColumns.includes(key)) {
              filteredProductData[key] = productData[key];
            } else {
              logger.debug(`Skipping invalid column: ${key}`);
            }
          });

          // Add organization_id for multi-tenancy
          filteredProductData.organization_id = userOrganizationId;

          logger.debug("Prepared product data (sample)", {
            name: filteredProductData.name,
            product_type: filteredProductData.product_type,
            sku: filteredProductData.sku,
            frame_type: filteredProductData.frame_type,
            lens_type: filteredProductData.lens_type,
            filteredKeys: Object.keys(filteredProductData).length,
            originalKeys: Object.keys(productData).length,
          });

          // Try with regular client first, fallback to service role if it fails
          let data, error;
          const result = await supabase
            .from("products")
            .insert([filteredProductData])
            .select();

          data = result.data;
          error = result.error;

          // If any error occurs, try with service role client (RLS, PGRST204, etc.)
          if (error) {
            logger.debug(
              "Error with regular client, retrying with service role client",
              {
                code: error.code,
                message: error.message,
              },
            );
            const serviceSupabase = createServiceRoleClient();
            const serviceResult = await serviceSupabase
              .from("products")
              .insert([filteredProductData])
              .select();

            data = serviceResult.data;
            error = serviceResult.error;
          }

          if (error) {
            logger.error("Database error creating product", error, {
              code: error.code,
              details: error.details,
              hint: error.hint,
              productData: filteredProductData,
            });
            return NextResponse.json(
              {
                error: error.message || "Failed to create product",
                details: error.details,
                hint: error.hint,
              },
              { status: 500 },
            );
          }

          if (!data || data.length === 0) {
            return NextResponse.json(
              { error: "Product was not created - no data returned" },
              { status: 500 },
            );
          }

          const createdProduct = data[0];

          // Create stock entry in product_branch_stock if branch_id and stock_quantity are provided
          if (productBranchId && body.stock_quantity !== undefined) {
            const stockQty = parseInt(String(body.stock_quantity)) || 0;
            if (stockQty > 0) {
              const serviceSupabase = createServiceRoleClient();

              // Use the update_product_stock function for consistency
              const { error: stockError } = await serviceSupabase.rpc(
                "update_product_stock",
                {
                  p_product_id: createdProduct.id,
                  p_branch_id: productBranchId,
                  p_quantity_change: stockQty,
                  p_reserve: false,
                },
              );

              if (stockError) {
                logger.error("Error creating product stock", stockError);
                // Fallback to direct insert if function fails
                const { error: fallbackError } = await serviceSupabase
                  .from("product_branch_stock")
                  .upsert(
                    {
                      product_id: createdProduct.id,
                      branch_id: productBranchId,
                      quantity: stockQty,
                      reserved_quantity: 0,
                      low_stock_threshold: 5,
                    },
                    {
                      onConflict: "product_id,branch_id",
                    },
                  );

                if (fallbackError) {
                  logger.error(
                    "Error in fallback stock creation",
                    fallbackError,
                  );
                  // Don't fail the product creation, just log the error
                  // The stock can be added later
                }
              }
            }
          }

          logger.info("Product created successfully", {
            productId: createdProduct?.id,
          });
          return NextResponse.json(
            { product: createdProduct },
            { status: 201 },
          );
        } catch (error) {
          logger.error(
            "Error in product creation handler",
            error instanceof Error ? error : new Error(String(error)),
          );
          if (error instanceof RateLimitError) {
            logger.warn("Rate limit exceeded for product creation", {
              error: error.message,
            });
            return NextResponse.json({ error: error.message }, { status: 429 });
          }

          // Log full error details for debugging
          if (error instanceof Error) {
            logger.error("API error creating product", error, {
              message: error.message,
              stack: error.stack,
              name: error.name,
            });
          } else {
            logger.error(
              "API error creating product",
              new Error(String(error)),
              {
                error: String(error),
              },
            );
          }

          return NextResponse.json(
            {
              error:
                error instanceof Error
                  ? error.message
                  : "Internal server error",
              ...(process.env.NODE_ENV === "development" &&
              error instanceof Error
                ? { details: error.stack }
                : {}),
            },
            { status: 500 },
          );
        }
      },
    );
  } catch (error) {
    // Catch any errors from withRateLimit itself (e.g., RateLimitError thrown before try-catch)
    if (error instanceof RateLimitError) {
      logger.warn("Rate limit exceeded", { error: error.message });
      return NextResponse.json({ error: error.message }, { status: 429 });
    }

    // Log and return error response for any other unexpected errors
    logger.error(
      "Unexpected error in POST handler",
      error instanceof Error ? error : new Error(String(error)),
    );
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
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
