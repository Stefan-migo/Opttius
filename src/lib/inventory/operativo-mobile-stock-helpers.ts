import type { SupabaseClient } from "@supabase/supabase-js";
import { appLogger as logger } from "@/lib/logger";

/**
 * Get available quantity for a product in the operativo mobile stock.
 * Returns quantity - reserved_quantity. Returns 0 if no record exists.
 */
export async function getOperativoMobileAvailableQuantity(
  productId: string,
  fieldOperationId: string,
  supabase: SupabaseClient,
): Promise<number> {
  try {
    const { data, error } = await supabase
      .from("operativo_mobile_stock")
      .select("quantity, reserved_quantity")
      .eq("field_operation_id", fieldOperationId)
      .eq("product_id", productId)
      .maybeSingle();

    if (error) {
      logger.error("Error fetching operativo mobile stock", {
        error,
        productId,
        fieldOperationId,
      });
      return 0;
    }

    if (!data) return 0;

    const qty = data.quantity ?? 0;
    const reserved = data.reserved_quantity ?? 0;
    return Math.max(0, qty - reserved);
  } catch (err) {
    logger.error("Exception in getOperativoMobileAvailableQuantity", {
      error: err,
      productId,
      fieldOperationId,
    });
    return 0;
  }
}

/**
 * Reduce operativo mobile stock by the given quantity.
 * Validates that sufficient stock exists before reducing.
 * Returns success status and error message if failed.
 */
export async function reduceOperativoMobileStock(
  productId: string,
  fieldOperationId: string,
  quantity: number,
  supabase: SupabaseClient,
): Promise<{ success: boolean; error?: string }> {
  if (quantity <= 0) {
    return { success: true };
  }

  try {
    const { data: current, error: fetchError } = await supabase
      .from("operativo_mobile_stock")
      .select("id, quantity, reserved_quantity")
      .eq("field_operation_id", fieldOperationId)
      .eq("product_id", productId)
      .single();

    if (fetchError || !current) {
      return {
        success: false,
        error: "Producto no encontrado en bodega móvil del operativo",
      };
    }

    const available = Math.max(
      0,
      (current.quantity ?? 0) - (current.reserved_quantity ?? 0),
    );
    if (quantity > available) {
      return {
        success: false,
        error: `Stock insuficiente en bodega móvil. Disponible: ${available}, solicitado: ${quantity}`,
      };
    }

    const newQuantity = Math.max(0, (current.quantity ?? 0) - quantity);

    const { error: updateError } = await supabase
      .from("operativo_mobile_stock")
      .update({
        quantity: newQuantity,
        updated_at: new Date().toISOString(),
      })
      .eq("id", current.id);

    if (updateError) {
      logger.error("Error reducing operativo mobile stock", {
        error: updateError,
        productId,
        fieldOperationId,
      });
      return {
        success: false,
        error: updateError.message,
      };
    }

    return { success: true };
  } catch (err) {
    logger.error("Exception in reduceOperativoMobileStock", {
      error: err,
      productId,
      fieldOperationId,
    });
    return {
      success: false,
      error: err instanceof Error ? err.message : "Error desconocido",
    };
  }
}
