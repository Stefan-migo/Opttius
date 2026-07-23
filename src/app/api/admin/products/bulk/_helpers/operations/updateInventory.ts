/**
 * Bulk products API — Update inventory operation handler.
 *
 * @module app/api/admin/products/bulk/_helpers/operations/updateInventory
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getBranchContext } from "@/lib/api/branch-middleware";
import { appLogger as logger } from "@/lib/logger";

export async function handleUpdateInventory(
  supabase: SupabaseClient,
  product_ids: string[],
  updates: Record<string, unknown>,
  request: NextRequest,
  userId: string,
): Promise<unknown[] | NextResponse> {
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
    !["set", "add"].includes(updates.adjustment_type as string)
  ) {
    return NextResponse.json(
      { error: "El tipo de ajuste debe ser 'set' o 'add'" },
      { status: 400 },
    );
  }

  // Get branch context for stock updates
  const branchContext = await getBranchContext(request, userId);
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

  // Get current stock from product_branch_stock
  const { data: currentStock, error: stockFetchError } = await supabase
    .from("product_branch_stock")
    .select("product_id, quantity")
    .in("product_id", product_ids)
    .eq("branch_id", branchId)
    .returns<{ product_id: string; quantity: number }[]>();

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
        const { error: updateError } = await supabase.rpc(
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
      const { data: product } = await supabase
        .from("products")
        .select("id, name")
        .eq("id", productId)
        .single<{ id: string; name: string }>();

      return {
        id: productId,
        name: product?.name,
        quantity: Math.max(0, newQuantity),
      };
    },
  );

  const inventoryResults = await Promise.all(inventoryUpdatePromises);
  return inventoryResults.filter(Boolean) as unknown[];
}
