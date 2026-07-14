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
import { appLogger as logger } from "@/lib/logger";
import { createServiceRoleClient } from "@/utils/supabase/server";
import { buildProductPayload, handleProductStock, VALID_PRODUCT_COLUMNS } from "./productsCreateHelpers";

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

          // Generate unique slug
          let productSlug = validatedBody.slug?.trim();
          if (!productSlug) {
            productSlug = validatedBody.name.toLowerCase().normalize("NFD")
              .replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-")
              .replace(/(^-|-$)/g, "") || `product-${Date.now()}`;
          }
          const { data: existingSlug } = await supabase.from("products").select("id").eq("slug", productSlug).limit(1);
          if (existingSlug && existingSlug.length > 0) productSlug = `${productSlug}-${Date.now()}`;

          const filteredProductData = buildProductPayload(validatedBody, body as Record<string, any>, productBranchId, organizationId, productSlug);

          logger.debug("Prepared product data (sample)", {
            name: filteredProductData.name,
            product_type: filteredProductData.product_type,
            sku: filteredProductData.sku,
            filteredKeys: Object.keys(filteredProductData).length,
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

          // Handle stock creation
          await handleProductStock(createdProduct, body as Record<string, any>, productBranchId, branchContext, organizationId);

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
