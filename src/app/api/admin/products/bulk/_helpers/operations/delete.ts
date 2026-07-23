/**
 * Bulk products API — Delete (soft / hard / force) operation handler.
 *
 * @module app/api/admin/products/bulk/_helpers/operations/delete
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { appLogger as logger } from "@/lib/logger";

export async function handleDelete(
  supabase: SupabaseClient,
  product_ids: string[],
): Promise<unknown[]> {
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
  return (deletedProducts ?? []) as unknown[];
}

export async function handleHardDelete(
  supabase: SupabaseClient,
  product_ids: string[],
  updates: Record<string, unknown>,
): Promise<unknown[] | NextResponse> {
  // Hard delete - permanently remove from database
  try {
    // First, get the products to be deleted for logging
    const { data: productsToDelete, error: fetchError } =
      await supabase
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
    const { data: orderItems, error: orderCheckError } = await supabase
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
      const { error: orderItemsDeleteError } = await supabase
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
      await supabase
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

    return (hardDeletedProducts || productsToDelete || []) as unknown[];
  } catch (hardDeleteErr) {
    logger.error("Hard delete operation failed", {
      error: hardDeleteErr,
    });
    throw new Error(
      `Hard delete failed: ${hardDeleteErr instanceof Error ? hardDeleteErr.message : "Unknown error"}`,
    );
  }
}
