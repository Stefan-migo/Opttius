import { NextRequest, NextResponse } from "next/server";

import { getBranchContext } from "@/lib/api/branch-middleware";
import { appLogger as logger } from "@/lib/logger";
import type {
  IsAdminParams,
  IsAdminResult,
  LogAdminActivityParams,
} from "@/types/supabase-rpc";
import { createClient, createServiceRoleClient } from "@/utils/supabase/server";

import { CSV_COLUMN_MAPPINGS, generateSlug, parseArray, parseBoolean, parseCSVLine, parseIngredients } from "./_helpers/csvHelpers";

export const dynamic = "force-dynamic";
// ponytail: this file is still 485 lines, the remaining logic is tightly coupled to the route handler
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const mode = (formData.get("mode") as string) || "create"; // 'create', 'update', 'upsert'

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

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
    } as IsAdminParams)) as { data: IsAdminResult | null; error: Error | null };
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 },
      );
    }

    // Read and parse CSV file
    const text = await file.text();
    const lines = text.split("\n").filter((line) => line.trim());

    if (lines.length < 2) {
      return NextResponse.json(
        { error: "CSV file must contain headers and at least one data row" },
        { status: 400 },
      );
    }

    // Parse headers
    const headers = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""));

    const columnMappings = CSV_COLUMN_MAPPINGS;

    // Get categories for mapping
    const { data: categories } = await supabase
      .from("categories")
      .select("id, name, slug");

    const categoryMap: Record<string, string> =
      categories?.reduce((acc, cat) => {
        acc[cat.name.toLowerCase()] = cat.id;
        acc[cat.slug.toLowerCase()] = cat.id;
        return acc;
      }, {} as Record<string, string>) || {};

    // Parse data rows
    const products: unknown[] = [];
    const errors = [];
    const warnings = [];

    for (let i = 1; i < lines.length; i++) {
      try {
        const values = parseCSVLine(lines[i]);
        if (values.length !== headers.length) {
          errors.push(`Línea ${i + 1}: Número de columnas incorrecto`);
          continue;
        }

        const rowData: Record<string, string> = {};
        headers.forEach((header, index) => {
          const mappedField = columnMappings[header.toLowerCase()];
          if (mappedField) {
            rowData[mappedField] = values[index];
          }
        });

        // Process and validate product data
        const product: Record<string, unknown> = {
          name: rowData.name?.trim(),
          slug: rowData.slug?.trim() || generateSlug(rowData.name || ""),
          short_description: rowData.short_description?.trim(),
          description: rowData.description?.trim(),
          price: parseFloat(rowData.price) || 0,
          compare_at_price: rowData.compare_at_price
            ? parseFloat(rowData.compare_at_price)
            : null,
          // Stock quantity will be handled separately in product_branch_stock
          stock_quantity:
            parseInt(
              rowData.stock_quantity || rowData.inventory_quantity || "0",
            ) || 0,
          status: rowData.status?.toLowerCase() || "draft",
          is_featured: parseBoolean(rowData.is_featured),
          sku: rowData.sku?.trim(),
          weight: rowData.weight ? parseFloat(rowData.weight) : null,
          dimensions: rowData.dimensions?.trim(),
          skin_type: parseArray(rowData.skin_type),
          benefits: parseArray(rowData.benefits),
          certifications: parseArray(rowData.certifications),
          ingredients: parseIngredients(rowData.ingredients),
          usage_instructions: rowData.usage_instructions?.trim(),
          precautions: rowData.precautions?.trim(),
          package_characteristics: rowData.package_characteristics?.trim(),
          featured_image: rowData.featured_image?.trim(),
          gallery: [
            rowData.gallery_1?.trim(),
            rowData.gallery_2?.trim(),
            rowData.gallery_3?.trim(),
            rowData.gallery_4?.trim(),
          ].filter(Boolean),
          // track_inventory removed - managed in product_branch_stock
          vendor: "OPTTIUS OPTTIUS",
          currency: "ARS",
        };

        // Handle category
        if (rowData.category_name) {
          const categoryId = categoryMap[rowData.category_name.toLowerCase()];
          if (categoryId) {
            product.category_id = categoryId;
          } else {
            warnings.push(
              `Línea ${i + 1}: Categoría '${rowData.category_name}' no encontrada`,
            );
          }
        }

        // Validation
        if (!product.name) {
          errors.push(`Línea ${i + 1}: Nombre es requerido`);
          continue;
        }

        if (product.price < 0) {
          errors.push(`Línea ${i + 1}: Precio no puede ser negativo`);
          continue;
        }

        if (!["draft", "active", "archived"].includes(product.status)) {
          warnings.push(
            `Línea ${i + 1}: Estado '${product.status}' inválido, usando 'draft'`,
          );
          product.status = "draft";
        }

        products.push({
          ...product,
          line_number: i + 1,
          original_data: rowData,
        });
      } catch (error) {
        errors.push(`Línea ${i + 1}: Error de formato - ${error}`);
      }
    }

    if (errors.length > 0 && products.length === 0) {
      return NextResponse.json(
        {
          error: "No se pudieron procesar los productos",
          errors,
          warnings,
        },
        { status: 400 },
      );
    }

    // Get branch context for stock management
    const branchContext = await getBranchContext(request, user.id);
    const branchId = branchContext.branchId;
    const serviceSupabase = createServiceRoleClient();

    // Process products based on mode
    const results = {
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [...errors],
      warnings: [...warnings],
      details: [] as Array<Record<string, unknown>>,
    };

    for (const product of products) {
      // Extract stock_quantity before inserting/updating product
      const stockQuantity = product.stock_quantity || 0;
      // Remove stock_quantity from product data (it's not a column in products table)
      const { stock_quantity, ...productData } = product;
      try {
        if (mode === "create") {
          // Always create new products
          const { data, error } = await supabase
            .from("products")
            .insert({
              ...productData,
              line_number: undefined,
              original_data: undefined,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .select("id, name, slug")
            .single();

          if (error) {
            if (error.code === "23505") {
              // Unique constraint violation
              results.errors.push(
                `Línea ${product.line_number}: Producto con slug '${product.slug}' ya existe`,
              );
              results.skipped++;
            } else {
              results.errors.push(
                `Línea ${product.line_number}: ${error.message}`,
              );
              results.skipped++;
            }
          } else {
            results.created++;
            results.details.push({ action: "created", product: data });

            // Create stock in product_branch_stock if branch_id and stock_quantity are provided
            if (branchId && stockQuantity > 0 && data?.id) {
              const { error: stockError } = await serviceSupabase.rpc(
                "update_product_stock",
                {
                  p_product_id: data.id,
                  p_branch_id: branchId,
                  p_quantity_change: stockQuantity,
                  p_reserve: false,
                },
              );

              if (stockError) {
                logger.warn(
                  `Failed to create stock for product ${data.id}`,
                  stockError,
                );
                results.warnings.push(
                  `Línea ${product.line_number}: Stock no pudo ser creado para '${product.name}'`,
                );
              }
            }
          }
        } else if (mode === "update") {
          // Update existing products by SKU or slug
          const identifier = product.sku || product.slug;
          const { data: existing } = await supabase
            .from("products")
            .select("id")
            .or(`sku.eq.${identifier},slug.eq.${identifier}`)
            .single();

          if (existing) {
            const { data, error } = await supabase
              .from("products")
              .update({
                ...productData,
                line_number: undefined,
                original_data: undefined,
                updated_at: new Date().toISOString(),
              })
              .eq("id", existing.id)
              .select("id, name, slug")
              .single();

            if (error) {
              results.errors.push(
                `Línea ${product.line_number}: ${error.message}`,
              );
              results.skipped++;
            } else {
              results.updated++;
              results.details.push({ action: "updated", product: data });

              // Update stock in product_branch_stock if branch_id and stock_quantity are provided
              if (branchId && stockQuantity >= 0 && data?.id) {
                // Get current stock to calculate difference
                const { data: currentStock } = await serviceSupabase
                  .from("product_branch_stock")
                  .select("quantity")
                  .eq("product_id", data.id)
                  .eq("branch_id", branchId)
                  .single();

                const currentQty = currentStock?.quantity || 0;
                const quantityChange = stockQuantity - currentQty;

                if (quantityChange !== 0) {
                  const { error: stockError } = await serviceSupabase.rpc(
                    "update_product_stock",
                    {
                      p_product_id: data.id,
                      p_branch_id: branchId,
                      p_quantity_change: quantityChange,
                      p_reserve: false,
                    },
                  );

                  if (stockError) {
                    logger.warn(
                      `Failed to update stock for product ${data.id}`,
                      stockError,
                    );
                    results.warnings.push(
                      `Línea ${product.line_number}: Stock no pudo ser actualizado para '${product.name}'`,
                    );
                  }
                }
              }
            }
          } else {
            results.warnings.push(
              `Línea ${product.line_number}: Producto no encontrado para actualizar`,
            );
            results.skipped++;
          }
        } else if (mode === "upsert") {
          // Update if exists, create if not
          const identifier = product.sku || product.slug;
          const { data: existing } = await supabase
            .from("products")
            .select("id")
            .or(`sku.eq.${identifier},slug.eq.${identifier}`)
            .single();

          if (existing) {
            // Update existing
            const { data, error } = await supabase
              .from("products")
              .update({
                ...productData,
                line_number: undefined,
                original_data: undefined,
                updated_at: new Date().toISOString(),
              })
              .eq("id", existing.id)
              .select("id, name, slug")
              .single();

            if (error) {
              results.errors.push(
                `Línea ${product.line_number}: ${error.message}`,
              );
              results.skipped++;
            } else {
              results.updated++;
              results.details.push({ action: "updated", product: data });

              // Update stock in product_branch_stock if branch_id and stock_quantity are provided
              if (branchId && stockQuantity >= 0 && data?.id) {
                const { data: currentStock } = await serviceSupabase
                  .from("product_branch_stock")
                  .select("quantity")
                  .eq("product_id", data.id)
                  .eq("branch_id", branchId)
                  .single();

                const currentQty = currentStock?.quantity || 0;
                const quantityChange = stockQuantity - currentQty;

                if (quantityChange !== 0) {
                  const { error: stockError } = await serviceSupabase.rpc(
                    "update_product_stock",
                    {
                      p_product_id: data.id,
                      p_branch_id: branchId,
                      p_quantity_change: quantityChange,
                      p_reserve: false,
                    },
                  );

                  if (stockError) {
                    logger.warn(
                      `Failed to update stock for product ${data.id}`,
                      stockError,
                    );
                  }
                }
              }
            }
          } else {
            // Create new
            const { data, error } = await supabase
              .from("products")
              .insert({
                ...productData,
                line_number: undefined,
                original_data: undefined,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })
              .select("id, name, slug")
              .single();

            if (error) {
              results.errors.push(
                `Línea ${product.line_number}: ${error.message}`,
              );
              results.skipped++;
            } else {
              results.created++;
              results.details.push({ action: "created", product: data });

              // Create stock in product_branch_stock if branch_id and stock_quantity are provided
              if (branchId && stockQuantity > 0 && data?.id) {
                const { error: stockError } = await serviceSupabase.rpc(
                  "update_product_stock",
                  {
                    p_product_id: data.id,
                    p_branch_id: branchId,
                    p_quantity_change: stockQuantity,
                    p_reserve: false,
                  },
                );

                if (stockError) {
                  logger.warn(
                    `Failed to create stock for product ${data.id}`,
                    stockError,
                  );
                }
              }
            }
          }
        }
      } catch (error) {
        results.errors.push(
          `Línea ${product.line_number}: Error inesperado - ${error}`,
        );
        results.skipped++;
      }
    }

    // Log admin activity
    const logParams: LogAdminActivityParams = {
      p_action: "import_products",
      p_resource_type: "product",
      p_resource_id: "bulk_import",
      p_details: JSON.stringify({
        mode,
        total_rows: products.length,
        created: results.created,
        updated: results.updated,
        skipped: results.skipped,
        errors_count: results.errors.length,
      }),
    };
    await supabase.rpc("log_admin_activity", logParams);

    return NextResponse.json({
      success: true,
      summary: {
        total_processed: products.length,
        created: results.created,
        updated: results.updated,
        skipped: results.skipped,
        errors_count: results.errors.length,
        warnings_count: results.warnings.length,
      },
      results,
    });
  } catch (error) {
    logger.error("Error in import products API", { error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

