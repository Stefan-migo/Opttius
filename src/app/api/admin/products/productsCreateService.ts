import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { getBranchContext } from "@/lib/api/branch-middleware";
import { RateLimitError, ValidationError } from "@/lib/api/errors";
import { rateLimitConfigs, withRateLimit } from "@/lib/rate-limiting";
import {
  validateBody,
  validationErrorResponse,
} from "@/lib/api/validation/zod-helpers";
import { createProductSchema } from "@/lib/api/validation/zod-schemas";
import { DEFAULT_LOW_STOCK_THRESHOLD } from "@/lib/inventory/constants";
import { appLogger as logger } from "@/lib/logger";
import { createServiceRoleClient } from "@/utils/supabase/server";

export async function createProduct(
  request: NextRequest,
  supabase: SupabaseClient,
  organizationId: string,
): Promise<NextResponse> {
  try {
    return await (withRateLimit(rateLimitConfigs.modification) as unknown)(
      request,
      async () => {
        try {
          const { data: { user } } = await supabase.auth.getUser();

          // Get branch context
          const branchContext = await getBranchContext(
            request,
            user!.id,
            supabase,
          );

          // Get request body first (needed for fields not in Zod schema)
          let body: unknown;
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
            organizationId,
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
            frame_colors: (body as unknown).frame_colors || [],
            frame_brand: (body as unknown).frame_brand || null,
            frame_model: (body as unknown).frame_model || null,
            frame_sku: (body as unknown).frame_sku || null,
            frame_gender: (body as unknown).frame_gender || null,
            frame_age_group: (body as unknown).frame_age_group || null,
            frame_features: (body as unknown).frame_features || [],
            frame_measurements: (body as unknown).frame_measurements || null,
            lens_index: (body as unknown).lens_index
              ? parseFloat((body as unknown).lens_index)
              : null,
            lens_coatings: (body as unknown).lens_coatings || [],
            lens_tint_options: (body as unknown).lens_tint_options || [],
            uv_protection: (body as unknown).uv_protection || null,
            blue_light_filter: (body as unknown).blue_light_filter || false,
            blue_light_filter_percentage: (body as unknown)
              .blue_light_filter_percentage
              ? parseInt((body as unknown).blue_light_filter_percentage)
              : null,
            photochromic: (body as unknown).photochromic || false,
            prescription_available:
              (body as unknown).prescription_available || false,
            prescription_range: (body as unknown).prescription_range || null,
            requires_prescription:
              (body as unknown).requires_prescription || false,
            is_customizable: (body as unknown).is_customizable || false,
            warranty_months: (body as unknown).warranty_months
              ? parseInt((body as unknown).warranty_months)
              : null,
            warranty_details: (body as unknown).warranty_details || null,
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
          filteredProductData.organization_id = organizationId;

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

          // Create stock entry in product_branch_stock if branch_id and stock_quantity or low_stock_threshold are provided
          const stockQty = parseInt(String(body.stock_quantity)) || 0;
          const lowStockThreshold =
            body.low_stock_threshold !== undefined
              ? parseInt(String(body.low_stock_threshold)) ||
                DEFAULT_LOW_STOCK_THRESHOLD
              : DEFAULT_LOW_STOCK_THRESHOLD;

          if (
            productBranchId &&
            (body.stock_quantity !== undefined ||
              body.low_stock_threshold !== undefined)
          ) {
            const serviceSupabase = createServiceRoleClient();

            if (stockQty > 0) {
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
                      low_stock_threshold: lowStockThreshold,
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
                }
              }
            }

            // Set low_stock_threshold (creates record with qty 0 if needed, or updates existing)
            if (
              lowStockThreshold !== DEFAULT_LOW_STOCK_THRESHOLD ||
              stockQty === 0
            ) {
              const { error: thresholdError } = await serviceSupabase
                .from("product_branch_stock")
                .upsert(
                  {
                    product_id: createdProduct.id,
                    branch_id: productBranchId,
                    quantity: stockQty,
                    reserved_quantity: 0,
                    low_stock_threshold: lowStockThreshold,
                  },
                  {
                    onConflict: "product_id,branch_id",
                  },
                );

              if (thresholdError) {
                logger.warn("Could not set low_stock_threshold", {
                  productId: createdProduct.id,
                  branchId: productBranchId,
                  error: thresholdError,
                });
              }
            }
          }

          // Super admin in global view: create product_branch_stock with qty 0 for each branch of the org
          if (!productBranchId && branchContext.isSuperAdmin) {
            const serviceSupabase = createServiceRoleClient();
            const { data: orgBranches } = await serviceSupabase
              .from("branches")
              .select("id")
              .eq("organization_id", organizationId);

            if (orgBranches && orgBranches.length > 0) {
              const lowStockThreshold =
                body.low_stock_threshold !== undefined
                  ? parseInt(String(body.low_stock_threshold)) ||
                    DEFAULT_LOW_STOCK_THRESHOLD
                  : DEFAULT_LOW_STOCK_THRESHOLD;

              for (const branch of orgBranches) {
                const { error: insertError } = await serviceSupabase
                  .from("product_branch_stock")
                  .upsert(
                    {
                      product_id: createdProduct.id,
                      branch_id: branch.id,
                      quantity: 0,
                      reserved_quantity: 0,
                      low_stock_threshold: lowStockThreshold,
                    },
                    { onConflict: "product_id,branch_id" },
                  );

                if (insertError) {
                  logger.warn(
                    "Could not create stock for branch (org-wide product)",
                    {
                      productId: createdProduct.id,
                      branchId: branch.id,
                      error: insertError,
                    },
                  );
                }
              }
              logger.info(
                "Created product_branch_stock for all org branches",
                {
                  productId: createdProduct.id,
                  branchCount: orgBranches.length,
                },
              );
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
            return NextResponse.json(
              { error: error.message },
              { status: 429 },
            );
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
        error:
          error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}
