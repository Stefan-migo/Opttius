import { NextRequest, NextResponse } from "next/server";

import { getBranchContext } from "@/lib/api/branch-middleware";
import { appLogger as logger } from "@/lib/logger";
import type {
  IsAdminParams,
  IsAdminResult,
  LogAdminActivityParams,
} from "@/types/supabase-rpc";
import { createClient, createServiceRoleClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { operation, product_ids, updates } = body;

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

    if (!Array.isArray(product_ids) || product_ids.length === 0) {
      return NextResponse.json(
        { error: "Product IDs are required" },
        { status: 400 },
      );
    }

    let results = [];

    switch (operation) {
      case "update_status":
        if (!updates.status) {
          return NextResponse.json(
            { error: "Status is required" },
            { status: 400 },
          );
        }

        const { data: statusUpdated, error: statusError } = await supabase
          .from("products")
          .update({
            status: updates.status,
            updated_at: new Date().toISOString(),
          })
          .in("id", product_ids)
          .select("id, name, status");

        if (statusError) {
          throw statusError;
        }
        results = statusUpdated;
        break;

      case "update_category":
        if (!updates.category_id) {
          return NextResponse.json(
            { error: "Category ID is required" },
            { status: 400 },
          );
        }

        const { data: categoryUpdated, error: categoryError } = await supabase
          .from("products")
          .update({
            category_id: updates.category_id,
            updated_at: new Date().toISOString(),
          })
          .in("id", product_ids)
          .select("id, name, category_id");

        if (categoryError) {
          throw categoryError;
        }
        results = categoryUpdated;
        break;

      case "update_pricing":
        if (!updates.price_adjustment) {
          return NextResponse.json(
            { error: "Price adjustment is required" },
            { status: 400 },
          );
        }

        // Get current products to calculate new prices
        const { data: currentProducts, error: fetchError } = await supabase
          .from("products")
          .select("id, price")
          .in("id", product_ids);

        if (fetchError) {
          throw fetchError;
        }

        // Calculate new prices based on adjustment
        const priceUpdates =
          currentProducts?.map((product) => {
            let newPrice = product.price;

            if (updates.adjustment_type === "percentage") {
              newPrice = product.price * (1 + updates.price_adjustment / 100);
            } else if (updates.adjustment_type === "fixed") {
              newPrice = product.price + updates.price_adjustment;
            }

            return {
              id: product.id,
              price: Math.max(0, newPrice), // Ensure price doesn't go below 0
            };
          }) || [];

        // Update prices
        const priceUpdatePromises = priceUpdates.map(({ id, price }) =>
          supabase
            .from("products")
            .update({
              price,
              updated_at: new Date().toISOString(),
            })
            .eq("id", id)
            .select("id, name, price"),
        );

        const priceResults = await Promise.all(priceUpdatePromises);
        results = priceResults
          .map((result) => result.data?.[0])
          .filter(Boolean);
        break;

      case "update_inventory":
        // Validate inventory_adjustment
        if (
          updates.inventory_adjustment === undefined ||
          updates.inventory_adjustment === null ||
          isNaN(Number(updates.inventory_adjustment))
        ) {
          return NextResponse.json(
            {
              error:
                "El ajuste de inventario es requerido y debe ser un número válido",
            },
            { status: 400 },
          );
        }

        // Validate adjustment_type
        if (
          !updates.adjustment_type ||
          !["set", "add"].includes(updates.adjustment_type)
        ) {
          return NextResponse.json(
            { error: "El tipo de ajuste debe ser 'set' o 'add'" },
            { status: 400 },
          );
        }

        // Get branch context for stock updates
        const branchContext = await getBranchContext(request, user.id);
        let branchId = branchContext.branchId;

        // If superadmin in global view, try to get first accessible branch
        if (!branchId && branchContext.isSuperAdmin) {
          if (branchContext.accessibleBranches.length > 0) {
            branchId = branchContext.accessibleBranches[0].id;
            logger.warn(
              "SuperAdmin in global view - using first accessible branch for stock update",
              {
                branchId,
              },
            );
          } else {
            return NextResponse.json(
              {
                error:
                  "Debe seleccionar una sucursal para actualizar inventario. No hay sucursales disponibles.",
              },
              { status: 400 },
            );
          }
        }

        if (!branchId) {
          return NextResponse.json(
            {
              error: "Debe seleccionar una sucursal para actualizar inventario",
            },
            { status: 400 },
          );
        }

        const serviceSupabase = createServiceRoleClient();

        // Get current stock from product_branch_stock
        const { data: currentStock, error: stockFetchError } =
          await serviceSupabase
            .from("product_branch_stock")
            .select("product_id, quantity")
            .in("product_id", product_ids)
            .eq("branch_id", branchId);

        if (stockFetchError) {
          logger.error("Error fetching stock", stockFetchError);
          throw stockFetchError;
        }

        // Create a map of current stock
        const stockMap = new Map(
          currentStock?.map((s) => [s.product_id, s.quantity || 0]) || [],
        );

        // Parse inventory_adjustment as number
        const inventoryAdjustment = Number(updates.inventory_adjustment);
        if (isNaN(inventoryAdjustment)) {
          return NextResponse.json(
            { error: "El ajuste de inventario debe ser un número válido" },
            { status: 400 },
          );
        }

        // Calculate new inventory and update using update_product_stock function
        const inventoryUpdatePromises = product_ids.map(
          async (productId: string) => {
            const currentQuantity = stockMap.get(productId) || 0;
            let newQuantity = currentQuantity;

            if (updates.adjustment_type === "set") {
              newQuantity = Math.max(0, inventoryAdjustment);
            } else if (updates.adjustment_type === "add") {
              newQuantity = Math.max(0, currentQuantity + inventoryAdjustment);
            }

            const quantityChange = newQuantity - currentQuantity;

            if (quantityChange !== 0) {
              // Use update_product_stock function
              const { error: updateError } = await serviceSupabase.rpc(
                "update_product_stock",
                {
                  p_product_id: productId,
                  p_branch_id: branchId,
                  p_quantity_change: quantityChange,
                  p_reserve: false,
                },
              );

              if (updateError) {
                logger.error(
                  `Error updating stock for product ${productId}`,
                  updateError,
                );
                return null;
              }
            }

            // Get product name for response
            const { data: product } = await serviceSupabase
              .from("products")
              .select("id, name")
              .eq("id", productId)
              .single();

            return {
              id: productId,
              name: product?.name,
              quantity: Math.max(0, newQuantity),
            };
          },
        );

        const inventoryResults = await Promise.all(inventoryUpdatePromises);
        results = inventoryResults.filter(Boolean);
        break;

      case "delete":
        // Soft delete by setting status to archived
        const { data: deletedProducts, error: deleteError } = await supabase
          .from("products")
          .update({
            status: "archived",
            updated_at: new Date().toISOString(),
          })
          .in("id", product_ids)
          .select("id, name, status");

        if (deleteError) {
          throw deleteError;
        }
        results = deletedProducts;
        break;

      case "hard_delete":
        // Hard delete - permanently remove from database
        try {
          const serviceSupabase = createServiceRoleClient();

          // First, get the products to be deleted for logging
          const { data: productsToDelete, error: fetchError } =
            await serviceSupabase
              .from("products")
              .select("id, name")
              .in("id", product_ids);

          if (fetchError) {
            logger.error("Error fetching products for hard delete", {
              error: fetchError,
            });
            throw new Error(`Failed to fetch products: ${fetchError.message}`);
          }

          // Check if any products have orders (foreign key constraint)
          const { data: orderItems, error: orderCheckError } =
            await serviceSupabase
              .from("order_items")
              .select("product_id")
              .in("product_id", product_ids)
              .limit(1);

          if (orderCheckError) {
            logger.error("Error checking order items", {
              error: orderCheckError,
            });
            throw new Error(
              `Failed to check order dependencies: ${orderCheckError.message}`,
            );
          }

          if (orderItems && orderItems.length > 0) {
            // Products have orders - check if force delete is requested
            const forceDelete = updates?.force_delete === true;

            if (!forceDelete) {
              // Products have orders - cannot hard delete without force
              const orderedProductIds = orderItems.map(
                (item) => item.product_id,
              );
              const orderedProducts =
                productsToDelete?.filter((p) =>
                  orderedProductIds.includes(p.id),
                ) || [];

              return NextResponse.json(
                {
                  error: `Cannot hard delete products that have been ordered: ${orderedProducts.map((p) => p.name).join(", ")}. Use soft delete (archive) instead, or enable force delete to remove orders and products.`,
                  success: false,
                  operation: "hard_delete",
                  affected_count: 0,
                  results: [],
                },
                { status: 400 },
              );
            }

            // Force delete: First delete order items, then products
            logger.info("Force deleting products with orders", {
              productIds: product_ids,
            });

            // Delete order items first
            const { error: orderItemsDeleteError } = await serviceSupabase
              .from("order_items")
              .delete()
              .in("product_id", product_ids);

            if (orderItemsDeleteError) {
              logger.error("Error deleting order items", {
                error: orderItemsDeleteError,
              });
              throw new Error(
                `Failed to delete order items: ${orderItemsDeleteError.message}`,
              );
            }

            logger.info("Order items deleted successfully", {
              productIds: product_ids,
            });
          }

          // Perform the hard delete (no foreign key constraints)
          const { data: hardDeletedProducts, error: hardDeleteError } =
            await serviceSupabase
              .from("products")
              .delete()
              .in("id", product_ids)
              .select("id, name");

          if (hardDeleteError) {
            logger.error("Error during hard delete", {
              error: hardDeleteError,
            });
            throw new Error(
              `Failed to delete products: ${hardDeleteError.message}`,
            );
          }

          results = hardDeletedProducts || productsToDelete || [];
        } catch (hardDeleteErr) {
          logger.error("Hard delete operation failed", {
            error: hardDeleteErr,
          });
          throw new Error(
            `Hard delete failed: ${hardDeleteErr instanceof Error ? hardDeleteErr.message : "Unknown error"}`,
          );
        }
        break;

      case "duplicate":
        // Get products to duplicate
        const { data: productsToDuplicate, error: duplicatesFetchError } =
          await supabase.from("products").select("*").in("id", product_ids);

        if (duplicatesFetchError) {
          throw duplicatesFetchError;
        }

        // Create duplicates
        const duplicatePromises =
          productsToDuplicate?.map((product) => {
            const duplicateProduct = {
              ...product,
              id: undefined, // Let Supabase generate new ID
              name: `${product.name} (Copia)`,
              slug: `${product.slug}-copy-${Date.now()}`,
              status: "draft",
              // inventory_quantity removed - stock managed in product_branch_stock
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };

            return supabase
              .from("products")
              .insert(duplicateProduct)
              .select("id, name, status");
          }) || [];

        const duplicateResults = await Promise.all(duplicatePromises);
        results = duplicateResults
          .map((result) => result.data?.[0])
          .filter(Boolean);
        break;

      default:
        return NextResponse.json(
          { error: "Invalid bulk operation" },
          { status: 400 },
        );
    }

    // Log admin activity
    const logParams: LogAdminActivityParams = {
      p_action: `bulk_${operation}`,
      p_resource_type: "product",
      p_resource_id: product_ids.join(","),
      p_details: JSON.stringify({
        operation,
        product_count: product_ids.length,
        updates,
      }),
    };
    await supabase.rpc("log_admin_activity", logParams);

    // Extract IDs from results for frontend compatibility
    const successIds = (results as { id?: string; product_id?: string }[])
      .map((r) => r.id ?? r.product_id)
      .filter(Boolean) as string[];

    return NextResponse.json({
      success: true,
      data: {
        success: successIds,
        failed: [] as { id?: string; error: string }[],
      },
    });
  } catch (error) {
    logger.error("Error in bulk operations API", { error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// Export products to CSV
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") || "csv";
    const category_id = searchParams.get("category_id");
    const status = searchParams.get("status");

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

    // Get branch context for stock
    const branchContext = await getBranchContext(request, user.id);
    const branchId = branchContext.branchId;

    // Build query - include stock from product_branch_stock if branch is selected
    const selectFields = branchId
      ? `id,
        name,
        slug,
        description,
        price,
        compare_at_price,
        status,
        is_featured,
        sku,
        weight,
        skin_type,
        benefits,
        certifications,
        usage_instructions,
        category:categories(name),
        created_at,
        updated_at,
        product_branch_stock!inner (
          quantity,
          available_quantity
        )`
      : `id,
        name,
        slug,
        description,
        price,
        compare_at_price,
        inventory_quantity,
        status,
        is_featured,
        sku,
        weight,
        skin_type,
        benefits,
        certifications,
        usage_instructions,
        category:categories(name),
        created_at,
        updated_at`;

    let query = supabase
      .from("products")
      .select(selectFields as unknown) as unknown;

    if (branchId) {
      query = query.eq("product_branch_stock.branch_id", branchId);
    }

    if (category_id && category_id !== "all") {
      query = query.eq("category_id", category_id);
    }

    if (status && status !== "all") {
      query = query.eq("status", status);
    }

    const { data: products, error } = await query.order("created_at", {
      ascending: false,
    });

    if (error) {
      throw error;
    }

    if (format === "csv") {
      // Generate CSV
      const headers = [
        "ID",
        "Nombre",
        "Slug",
        "Descripción",
        "Precio",
        "Precio Comparación",
        "Stock",
        "Estado",
        "Destacado",
        "SKU",
        "Peso",
        "Tipos de Piel",
        "Beneficios",
        "Certificaciones",
        "Instrucciones",
        "Categoría",
        "Fecha Creación",
      ];

      const csvRows = [
        headers.join(","),
        ...(products || []).map((product: unknown) =>
          [
            product.id,
            `"${product.name || ""}"`,
            `"${product.slug || ""}"`,
            `"${(product.description || "").replace(/"/g, '""')}"`,
            product.price || 0,
            product.compare_at_price || "",
            // Use stock from product_branch_stock if available, otherwise fallback to deprecated inventory_quantity
            (() => {
              const stock = (product as unknown).product_branch_stock?.[0];
              return (
                stock?.available_quantity ??
                stock?.quantity ??
                product.inventory_quantity ??
                0
              );
            })(),
            product.status || "",
            product.is_featured ? "Sí" : "No",
            `"${product.sku || ""}"`,
            product.weight || "",
            `"${Array.isArray(product.skin_type) ? product.skin_type.join("; ") : ""}"`,
            `"${Array.isArray(product.benefits) ? product.benefits.join("; ") : ""}"`,
            `"${Array.isArray(product.certifications) ? product.certifications.join("; ") : ""}"`,
            `"${(product.usage_instructions || "").replace(/"/g, '""')}"`,
            `"${(() => {
              if (Array.isArray(product.category)) {
                return product.category.length > 0
                  ? (product.category[0] as unknown)?.name || ""
                  : "";
              }
              return (product.category as unknown)?.name || "";
            })()}"`,
            new Date(product.created_at).toLocaleDateString("es-AR"),
          ].join(","),
        ),
      ];

      const csvContent = csvRows.join("\n");

      return new Response(csvContent, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="productos-${new Date().toISOString().split("T")[0]}.csv"`,
        },
      });
    }

    // Return JSON format
    if (format === "json") {
      const jsonString = JSON.stringify(products, null, 2);

      return new Response(jsonString, {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Disposition": `attachment; filename="productos-${new Date().toISOString().split("T")[0]}.json"`,
        },
      });
    }

    return NextResponse.json({ products });
  } catch (error) {
    logger.error("Error in export products API", { error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
