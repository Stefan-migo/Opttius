import type { SupabaseClient } from "@supabase/supabase-js";

import { appLogger as logger } from "@/lib/logger";

import { DEFAULT_LOW_STOCK_THRESHOLD } from "./constants";

/**
 * Get product stock for a specific branch
 * @param productId - Product ID
 * @param branchId - Branch ID
 * @param supabase - Supabase client
 * @returns Stock record or null if not found
 */
export async function getProductStock(
  productId: string,
  branchId: string,
  supabase: SupabaseClient,
): Promise<{
  id?: string;
  product_id: string;
  branch_id: string;
  quantity: number;
  reserved_quantity: number;
  low_stock_threshold: number;
  created_at?: string;
  updated_at?: string;
} | null> {
  try {
    const { data, error } = await supabase
      .from("product_branch_stock")
      .select("*")
      .eq("product_id", productId)
      .eq("branch_id", branchId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // No rows returned - stock doesn't exist for this product/branch
        logger.debug("No stock record found", { productId, branchId });
        return null;
      }
      logger.error("Error fetching product stock", {
        error,
        productId,
        branchId,
      });
      return null;
    }

    return data;
  } catch (error) {
    logger.error("Exception in getProductStock", {
      error,
      productId,
      branchId,
    });
    return null;
  }
}

/**
 * Get available quantity for stock validation (quantity - reserved_quantity).
 * Uses get_product_stock RPC when available, or getProductStock + calculation.
 */
export async function getAvailableQuantity(
  productId: string,
  branchId: string,
  supabase: SupabaseClient,
): Promise<number> {
  try {
    const { data, error } = await supabase.rpc("get_product_stock", {
      p_product_id: productId,
      p_branch_id: branchId,
    });

    if (error) {
      logger.debug(
        "get_product_stock RPC failed, falling back to getProductStock",
        {
          error: error.message,
          productId,
          branchId,
        },
      );
      const stock = await getProductStock(productId, branchId, supabase);
      if (!stock) return 0;
      return Math.max(
        0,
        (stock.quantity || 0) - (stock.reserved_quantity || 0),
      );
    }

    const row = Array.isArray(data) ? data[0] : data;
    return row?.available_quantity ?? 0;
  } catch (error) {
    logger.error("Exception in getAvailableQuantity", {
      error,
      productId,
      branchId,
    });
    return 0;
  }
}

/**
 * Update product stock for a specific branch using RPC for consistency
 * @param productId - Product ID
 * @param branchId - Branch ID
 * @param quantityChange - Change in quantity (positive = increase, negative = decrease)
 * @param isReserved - Whether the change is in reserved_quantity (true) or quantity (false)
 * @param supabase - Supabase client
 * @returns Success status and updated stock or error
 */
export async function updateProductStock(
  productId: string,
  branchId: string,
  quantityChange: number,
  isReserved: boolean,
  supabase: SupabaseClient,
): Promise<{
  success: boolean;
  stock?: {
    id?: string;
    product_id: string;
    branch_id: string;
    quantity: number;
    reserved_quantity: number;
    low_stock_threshold: number;
  };
  error?: string;
}> {
  try {
    const { data: rpcResult, error } = await supabase.rpc(
      "update_product_stock",
      {
        p_product_id: productId,
        p_branch_id: branchId,
        p_quantity_change: quantityChange,
        p_reserve: isReserved,
      },
    );

    if (error) {
      logger.error("Error in update_product_stock RPC", {
        error,
        productId,
        branchId,
      });
      return {
        success: false,
        error: error.message,
      };
    }

    if (rpcResult === false) {
      return {
        success: false,
        error: "update_product_stock returned false",
      };
    }

    const stock = await getProductStock(productId, branchId, supabase);
    return {
      success: true,
      stock: stock ?? undefined,
    };
  } catch (error) {
    logger.error("Exception in updateProductStock", {
      error,
      productId,
      branchId,
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Create or update product stock (upsert) - uses RPC for consistency
 * Sets quantity to a specific value by calculating the delta from current stock
 * @param productId - Product ID
 * @param branchId - Branch ID
 * @param quantity - Quantity to set
 * @param reservedQuantity - Reserved quantity to set
 * @param supabase - Supabase client
 * @returns Success status and stock record
 */
export async function upsertProductStock(
  productId: string,
  branchId: string,
  quantity: number,
  reservedQuantity: number = 0,
  supabase: SupabaseClient,
): Promise<{
  success: boolean;
  stock?: {
    id?: string;
    product_id: string;
    branch_id: string;
    quantity: number;
    reserved_quantity: number;
    low_stock_threshold: number;
  };
  error?: string;
}> {
  try {
    const currentStock = await getProductStock(productId, branchId, supabase);
    const currentQty = currentStock?.quantity ?? 0;
    const currentReserved = currentStock?.reserved_quantity ?? 0;

    const quantityChange = Math.max(0, quantity) - currentQty;
    const reservedChange = Math.max(0, reservedQuantity) - currentReserved;

    if (quantityChange !== 0) {
      const result = await updateProductStock(
        productId,
        branchId,
        quantityChange,
        false,
        supabase,
      );
      if (!result.success) return result;
    }

    if (reservedChange !== 0) {
      const result = await updateProductStock(
        productId,
        branchId,
        reservedChange,
        true,
        supabase,
      );
      if (!result.success) return result;
    }

    const stock = await getProductStock(productId, branchId, supabase);
    return {
      success: true,
      stock: stock ?? undefined,
    };
  } catch (error) {
    logger.error("Exception in upsertProductStock", {
      error,
      productId,
      branchId,
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export { DEFAULT_LOW_STOCK_THRESHOLD };
