/**
 * Stock Reduction Helpers for POS Legacy Sale
 * Extracted from processLegacyHandler.ts
 */
import { DEFAULT_LOW_STOCK_THRESHOLD } from "@/lib/inventory/constants";
import {
  reduceOperativoMobileStock,
} from "@/lib/inventory/operativo-mobile-stock-helpers";
import { appLogger as logger } from "@/lib/logger";

import type { ProcessSaleContext } from "./processSaleTypes";

export async function reduceStock(ctx: ProcessSaleContext, orderId: string): Promise<boolean> {
  const useMobileStock = !!ctx.fieldOperationId;

  for (const item of ctx.items) {
    const pid = item.product_id as string | undefined;
    if (!pid || pid.includes("frame-manual") || pid.includes("lens-") ||
        pid.includes("treatments-") || pid.includes("labor-") || pid.includes("discount-")) {
      continue;
    }

    const product = ctx.productsForStockCheck.find((p: Record<string, unknown>) => p.id === pid);
    if ((product as Record<string, unknown> | undefined)?.product_type === "service") {
      logger.info("Skipping stock update for service product", { product_id: pid });
      continue;
    }

    if (useMobileStock && ctx.fieldOperationId) {
      const reduceResult = await reduceOperativoMobileStock(pid, ctx.fieldOperationId, item.quantity as number, ctx.supabase);
      if (!reduceResult.success) {
        logger.error(`Error reducing operativo mobile stock for product ${pid}`, { error: reduceResult.error });
        return false;
      }
      logger.info("Operativo mobile stock reduced", { product_id: pid, quantity_decreased: item.quantity });
    } else {
      const branchId = ctx.effectiveBranchId;
      if (!branchId) {
        logger.warn(`Cannot update inventory: no branch_id for product ${pid}`);
        continue;
      }

      const { data: currentStock } = await ctx.supabase
        .from("product_branch_stock").select("quantity").eq("product_id", pid).eq("branch_id", branchId).maybeSingle();
      const currentQuantity = (currentStock as { quantity?: number } | null)?.quantity || 0;

      if (!currentStock && currentQuantity === 0) {
        await ctx.supabase.from("product_branch_stock").insert({
          product_id: pid, branch_id: branchId, quantity: 0, reserved_quantity: 0, low_stock_threshold: DEFAULT_LOW_STOCK_THRESHOLD,
        });
      }

      const { error: inventoryError } = await ctx.supabase.rpc("update_product_stock", {
        p_product_id: pid, p_branch_id: branchId, p_quantity_change: -(item.quantity as number),
        p_reserve: false, p_movement_type: "sale", p_reference_type: "order", p_reference_id: orderId, p_created_by: ctx.user.id,
      });
      if (inventoryError) {
        logger.error(`Error updating inventory for product ${pid}`, { error: inventoryError });
      }
    }
  }
  return true;
}

export async function reduceContactLensStock(ctx: ProcessSaleContext): Promise<void> {
  if (!ctx.contact_lens_family_id || !(ctx.contact_lens_quantity || 0)) return;

  const branchId = ctx.effectiveBranchId;
  if (ctx.contact_lens_rx_sphere_od != null) {
    const odReduction = await ctx.supabase.rpc("reduce_contact_lens_stock", {
      p_contact_lens_family_id: ctx.contact_lens_family_id, p_branch_id: branchId,
      p_sphere: ctx.contact_lens_rx_sphere_od, p_cylinder: ctx.contact_lens_rx_cylinder_od || 0,
      p_quantity: ctx.contact_lens_quantity,
    });
    if (odReduction.error) logger.error("Error reducing contact lens stock (OD)", { error: odReduction.error });
  }
  if (ctx.contact_lens_rx_sphere_os != null) {
    const osReduction = await ctx.supabase.rpc("reduce_contact_lens_stock", {
      p_contact_lens_family_id: ctx.contact_lens_family_id, p_branch_id: branchId,
      p_sphere: ctx.contact_lens_rx_sphere_os, p_cylinder: ctx.contact_lens_rx_cylinder_os || 0,
      p_quantity: ctx.contact_lens_quantity,
    });
    if (osReduction.error) logger.error("Error reducing contact lens stock (OS)", { error: osReduction.error });
  }
}
